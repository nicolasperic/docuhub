import { z } from "zod";
import { db } from "@/lib/db";
import type { DocumentStatus } from "@/generated/prisma/client";
import { markdownToTiptap, markdownExcerpt } from "@/lib/markdown-to-tiptap";

export const documentIngestSchema = z.object({
  title: z.string().min(1),
  markdown: z.string().nullish(), // converted to Tiptap JSON
  content: z.unknown().optional(), // OR raw Tiptap JSON (object or string) passthrough
  space: z.string().nullish(), // space slug; else ?space= / INGEST_SPACE_SLUG default
  slug: z.string().nullish(), // stable key → idempotent upsert; omit to always create
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).nullish(),
  excerpt: z.string().nullish(),
  parentSlug: z.string().nullish(), // nest under an existing doc in the same space
  authorEmail: z.string().nullish(), // else the org owner / first user
  tags: z.array(z.string()).nullish(), // tag names, created/connected in the org
});

export type DocumentIngestResult = {
  status: "created" | "updated" | "invalid" | "error";
  httpStatus: 200 | 201 | 404 | 422;
  id?: string;
  slug?: string;
  url?: string;
  title?: string;
  error?: unknown;
};

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

async function resolveSpace(orgId: string, explicit?: string | null) {
  const slug = explicit ?? process.env.INGEST_SPACE_SLUG;
  if (!slug) return null;
  return db.space.findFirst({ where: { slug, organizationId: orgId }, select: { id: true, slug: true } });
}

/** Author for machine-created docs: the given email, else the org OWNER, else any member. */
async function resolveAuthorId(orgId: string, email?: string | null): Promise<string | null> {
  if (email) {
    const u = await db.user.findFirst({ where: { email, organizationId: orgId }, select: { id: true } });
    if (u) return u.id;
  }
  const owner = await db.user.findFirst({
    where: { organizationId: orgId, orgRole: "OWNER" },
    select: { id: true },
  });
  if (owner) return owner.id;
  const anyUser = await db.user.findFirst({ where: { organizationId: orgId }, select: { id: true } });
  return anyUser?.id ?? null;
}

/**
 * Create or (when `slug` is supplied and already exists) update a Document. Only touches
 * the document itself + its tags; comments/reactions/favorites are untouched on update.
 */
export async function ingestDocument(
  input: unknown,
  opts: { orgId: string | null; querySpace?: string | null }
): Promise<DocumentIngestResult> {
  const parsed = documentIngestSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "invalid", httpStatus: 422, error: parsed.error.flatten() };
  }
  const p = parsed.data;

  if (!opts.orgId) {
    return { status: "invalid", httpStatus: 422, error: "Could not resolve an organization (set INGEST_ORG_SLUG)" };
  }

  const space = await resolveSpace(opts.orgId, p.space ?? opts.querySpace);
  if (!space) {
    return { status: "invalid", httpStatus: 422, error: "Space not found (provide `space` slug or set INGEST_SPACE_SLUG)" };
  }

  const authorId = await resolveAuthorId(opts.orgId, p.authorEmail);
  if (!authorId) {
    return { status: "invalid", httpStatus: 422, error: "No user in the organization to attribute authorship to" };
  }

  // Content: explicit Tiptap JSON wins; otherwise convert markdown.
  let content: string | null = null;
  if (p.content !== undefined && p.content !== null) {
    content = typeof p.content === "string" ? p.content : JSON.stringify(p.content);
  } else if (p.markdown) {
    content = JSON.stringify(markdownToTiptap(p.markdown));
  }

  const excerpt = p.excerpt ?? (p.markdown ? markdownExcerpt(p.markdown) : null);
  const status = (p.status ?? "DRAFT") as DocumentStatus;

  // Optional parent (must already exist in this space).
  let parentId: string | null = null;
  if (p.parentSlug) {
    const parent = await db.document.findUnique({
      where: { spaceId_slug: { spaceId: space.id, slug: slugify(p.parentSlug) } },
      select: { id: true },
    });
    if (!parent) {
      return { status: "invalid", httpStatus: 404, error: `parentSlug "${p.parentSlug}" not found in space` };
    }
    parentId = parent.id;
  }

  // Slug + upsert decision. An explicit slug is the stable idempotency key.
  const providedSlug = p.slug ? slugify(p.slug) : null;
  let slug: string;
  let existingId: string | null = null;
  if (providedSlug) {
    slug = providedSlug;
    const existing = await db.document.findUnique({
      where: { spaceId_slug: { spaceId: space.id, slug } },
      select: { id: true },
    });
    existingId = existing?.id ?? null;
  } else {
    const base = slugify(p.title) || "document";
    slug = base;
    let counter = 0;
    while (await db.document.findUnique({ where: { spaceId_slug: { spaceId: space.id, slug } }, select: { id: true } })) {
      counter++;
      slug = `${base}-${counter}`;
    }
  }

  // Resolve tag names → ids (create missing).
  const tagIds: string[] = [];
  for (const name of [...new Set((p.tags ?? []).map((t) => t.trim()).filter(Boolean))]) {
    const tag = await db.tag.upsert({
      where: { organizationId_name: { organizationId: opts.orgId, name } },
      update: {},
      create: { name, organizationId: opts.orgId },
      select: { id: true },
    });
    tagIds.push(tag.id);
  }

  const url = `/spaces/${space.slug}/${slug}`;

  if (existingId) {
    await db.$transaction([
      db.document.update({
        where: { id: existingId },
        data: { title: p.title, content, excerpt, status, parentId },
      }),
      db.documentTag.deleteMany({ where: { documentId: existingId } }),
      ...(tagIds.length
        ? [db.documentTag.createMany({ data: tagIds.map((tagId) => ({ documentId: existingId!, tagId })) })]
        : []),
      db.activity.create({ data: { type: "EDIT", userId: authorId, documentId: existingId } }),
    ]);
    return { status: "updated", httpStatus: 200, id: existingId, slug, url, title: p.title };
  }

  const created = await db.document.create({
    data: {
      title: p.title,
      content,
      slug,
      excerpt,
      status,
      spaceId: space.id,
      authorId,
      parentId,
      documentTags: tagIds.length ? { create: tagIds.map((tagId) => ({ tagId })) } : undefined,
    },
    select: { id: true },
  });
  await db.activity.create({ data: { type: "CREATE", userId: authorId, documentId: created.id } });

  return { status: "created", httpStatus: 201, id: created.id, slug, url, title: p.title };
}
