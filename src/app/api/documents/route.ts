import { db } from "@/lib/db";
import { requireAuth } from "@/lib/session";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { user, error } = await requireAuth();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const spaceSlug = searchParams.get("spaceSlug");
  const slug = searchParams.get("slug");

  if (!spaceSlug || !slug) {
    return NextResponse.json(
      { error: "spaceSlug and slug query params are required" },
      { status: 400 }
    );
  }

  const space = await db.space.findFirst({
    where: { slug: spaceSlug, organizationId: user!.organizationId },
    select: { id: true },
  });

  if (!space) {
    return NextResponse.json({ error: "Space not found" }, { status: 404 });
  }

  const doc = await db.document.findUnique({
    where: { spaceId_slug: { spaceId: space.id, slug } },
    select: { id: true, title: true, slug: true, spaceId: true },
  });

  if (!doc) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  return NextResponse.json(doc);
}

export async function POST(req: Request) {
  const { user, error } = await requireAuth();
  if (error) return error;

  const { title, content, spaceId, status, parentId, excerpt, teamIds, roleIds, clientIds, tagIds } = await req.json();

  if (!title || !spaceId) {
    return NextResponse.json({ error: "Title and spaceId are required" }, { status: 400 });
  }

  // Verify space belongs to user's org
  const space = await db.space.findFirst({
    where: { id: spaceId, organizationId: user!.organizationId },
  });

  if (!space) {
    return NextResponse.json({ error: "Space not found" }, { status: 404 });
  }

  // Generate slug
  const baseSlug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  let slug = baseSlug;
  let counter = 0;
  while (
    await db.document.findUnique({
      where: { spaceId_slug: { spaceId, slug } },
    })
  ) {
    counter++;
    slug = `${baseSlug}-${counter}`;
  }

  const doc = await db.document.create({
    data: {
      title,
      content: content || null,
      slug,
      excerpt: excerpt || null,
      status: status || "DRAFT",
      spaceId,
      authorId: user!.id,
      parentId: parentId || null,
      documentTeams: teamIds?.length
        ? { create: teamIds.map((teamId: string) => ({ teamId })) }
        : undefined,
      documentRoles: roleIds?.length
        ? { create: roleIds.map((roleId: string) => ({ roleId })) }
        : undefined,
      documentClients: clientIds?.length
        ? { create: clientIds.map((clientId: string) => ({ clientId })) }
        : undefined,
      documentTags: tagIds?.length
        ? { create: tagIds.map((tagId: string) => ({ tagId })) }
        : undefined,
    },
  });

  // Track activity
  await db.activity.create({
    data: { type: "CREATE", userId: user!.id, documentId: doc.id },
  });

  return NextResponse.json(doc, { status: 201 });
}
