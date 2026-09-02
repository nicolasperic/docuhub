import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireIngestToken } from "@/lib/ingest-auth";
import { resolveOrgId } from "@/lib/module-doc";
import { ingestDocument } from "@/lib/document-ingest";

// POST /api/documents/ingest — create or upsert one document (bearer INGEST_TOKEN).
export async function POST(req: Request) {
  const { error } = requireIngestToken(req);
  if (error) return error;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const querySpace = new URL(req.url).searchParams.get("space");
  const orgId = await resolveOrgId();
  const result = await ingestDocument(body, { orgId, querySpace });

  const { httpStatus, ...payload } = result;
  return NextResponse.json(payload, { status: httpStatus });
}

// GET /api/documents/ingest?space=<slug>[&slug=<slug>][&q=][&content=1]
//   slug given → the single document (add content=1 for the stored Tiptap JSON);
//   otherwise → a flat list of the space's documents.
export async function GET(req: Request) {
  const { error } = requireIngestToken(req);
  if (error) return error;

  const sp = new URL(req.url).searchParams;
  const spaceSlug = sp.get("space") ?? process.env.INGEST_SPACE_SLUG ?? undefined;
  const slug = sp.get("slug");
  const q = sp.get("q");
  const withContent = sp.get("content") === "1";

  const orgId = await resolveOrgId();
  if (!orgId) return NextResponse.json({ error: "Could not resolve an organization" }, { status: 422 });
  if (!spaceSlug) return NextResponse.json({ error: "space is required" }, { status: 400 });

  const space = await db.space.findFirst({
    where: { slug: spaceSlug, organizationId: orgId },
    select: { id: true, slug: true },
  });
  if (!space) return NextResponse.json({ error: "Space not found" }, { status: 404 });

  if (slug) {
    const doc = await db.document.findUnique({
      where: { spaceId_slug: { spaceId: space.id, slug } },
      select: {
        id: true,
        title: true,
        slug: true,
        status: true,
        excerpt: true,
        parentId: true,
        createdAt: true,
        updatedAt: true,
        author: { select: { name: true, email: true } },
        documentTags: { select: { tag: { select: { name: true, color: true } } } },
        ...(withContent ? { content: true } : {}),
      },
    });
    if (!doc) return NextResponse.json({ error: "Document not found" }, { status: 404 });
    return NextResponse.json({ ...doc, url: `/spaces/${space.slug}/${doc.slug}` });
  }

  const docs = await db.document.findMany({
    where: { spaceId: space.id, ...(q ? { title: { contains: q, mode: "insensitive" } } : {}) },
    select: {
      id: true,
      title: true,
      slug: true,
      status: true,
      excerpt: true,
      parentId: true,
      updatedAt: true,
    },
    orderBy: { updatedAt: "desc" },
    take: 500,
  });
  return NextResponse.json({ count: docs.length, documents: docs });
}

// DELETE /api/documents/ingest?space=<slug>&slug=<slug> — remove one document.
export async function DELETE(req: Request) {
  const { error } = requireIngestToken(req);
  if (error) return error;

  const sp = new URL(req.url).searchParams;
  const spaceSlug = sp.get("space") ?? process.env.INGEST_SPACE_SLUG ?? undefined;
  const slug = sp.get("slug");

  const orgId = await resolveOrgId();
  if (!orgId) return NextResponse.json({ error: "Could not resolve an organization" }, { status: 422 });
  if (!spaceSlug || !slug) return NextResponse.json({ error: "space and slug are required" }, { status: 400 });

  const space = await db.space.findFirst({
    where: { slug: spaceSlug, organizationId: orgId },
    select: { id: true },
  });
  if (!space) return NextResponse.json({ error: "Space not found" }, { status: 404 });

  const doc = await db.document.findUnique({
    where: { spaceId_slug: { spaceId: space.id, slug } },
    select: { id: true },
  });
  if (!doc) return NextResponse.json({ error: "Document not found" }, { status: 404 });

  await db.document.delete({ where: { id: doc.id } });
  return NextResponse.json({ success: true, slug });
}
