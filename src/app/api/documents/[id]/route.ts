import { db } from "@/lib/db";
import { requireAuth } from "@/lib/session";
import { NextResponse } from "next/server";

/** Walk up the parentId chain from candidateParentId to check if ancestorId is an ancestor */
async function checkIsDescendant(ancestorId: string, candidateParentId: string): Promise<boolean> {
  let currentId: string | null = candidateParentId;
  const visited = new Set<string>();
  while (currentId) {
    if (currentId === ancestorId) return true;
    if (visited.has(currentId)) break;
    visited.add(currentId);
    const ancestor: { parentId: string | null } | null = await db.document.findUnique({
      where: { id: currentId },
      select: { parentId: true },
    });
    currentId = ancestor?.parentId ?? null;
  }
  return false;
}

/** Resolve slug conflicts when moving a document to a new space */
async function resolveSlugConflict(baseSlug: string, spaceId: string, excludeDocId: string): Promise<string> {
  let slug = baseSlug;
  let counter = 0;
  while (true) {
    const conflict = await db.document.findUnique({
      where: { spaceId_slug: { spaceId, slug } },
      select: { id: true },
    });
    if (!conflict || conflict.id === excludeDocId) return slug;
    counter++;
    slug = `${baseSlug}-${counter}`;
  }
}

/** Recursively move all descendant documents to a new space, resolving slug conflicts */
async function moveDescendantsToSpace(parentId: string, newSpaceId: string) {
  const children = await db.document.findMany({
    where: { parentId },
    select: { id: true, slug: true },
  });
  for (const child of children) {
    const newSlug = await resolveSlugConflict(child.slug, newSpaceId, child.id);
    await db.document.update({
      where: { id: child.id },
      data: { spaceId: newSpaceId, slug: newSlug },
    });
    await moveDescendantsToSpace(child.id, newSpaceId);
  }
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;

  const doc = await db.document.findFirst({
    where: { id, space: { organizationId: user!.organizationId } },
    include: {
      author: { select: { name: true, email: true } },
      space: { select: { name: true, slug: true } },
      parent: { select: { id: true, title: true, slug: true } },
      children: {
        select: { id: true, title: true, slug: true, status: true },
        orderBy: { createdAt: "asc" },
      },
      documentTeams: { include: { team: { select: { id: true, name: true } } } },
      documentRoles: { include: { role: { select: { id: true, name: true } } } },
      documentClients: { include: { client: { select: { id: true, name: true } } } },
      documentTags: { include: { tag: { select: { id: true, name: true, color: true } } } },
      favorites: { where: { userId: user!.id }, select: { id: true } },
    },
  });

  if (!doc) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  // Track view activity
  await db.activity.create({
    data: { type: "VIEW", userId: user!.id, documentId: doc.id },
  });

  return NextResponse.json(doc);
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const body = await req.json();
  const { title, content, excerpt, status, teamIds, roleIds, clientIds, tagIds, parentId, spaceId } = body;

  // Verify doc belongs to user's org
  const existing = await db.document.findFirst({
    where: { id, space: { organizationId: user!.organizationId } },
  });

  if (!existing) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  // Handle move: validate parentId change
  if (parentId !== undefined && parentId !== null) {
    if (parentId === id) {
      return NextResponse.json({ error: "A document cannot be its own parent" }, { status: 400 });
    }
    // Check for circular reference: walk up from candidate parent
    const isDescendant = await checkIsDescendant(id, parentId);
    if (isDescendant) {
      return NextResponse.json({ error: "Cannot move a document under one of its own descendants" }, { status: 400 });
    }
  }

  // Handle move: validate spaceId change
  let newSpaceId = existing.spaceId;
  if (spaceId !== undefined && spaceId !== existing.spaceId) {
    const newSpace = await db.space.findFirst({
      where: { id: spaceId, organizationId: user!.organizationId },
    });
    if (!newSpace) {
      return NextResponse.json({ error: "Target space not found" }, { status: 404 });
    }
    newSpaceId = spaceId;
  }

  // Handle slug conflict when moving to a different space
  let newSlug = existing.slug;
  if (newSpaceId !== existing.spaceId) {
    newSlug = await resolveSlugConflict(existing.slug, newSpaceId, id);
  }

  // Update the document
  const doc = await db.document.update({
    where: { id },
    data: {
      ...(title !== undefined && { title }),
      ...(content !== undefined && { content }),
      ...(excerpt !== undefined && { excerpt }),
      ...(status !== undefined && { status }),
      ...(parentId !== undefined && { parentId: parentId || null }),
      ...(newSpaceId !== existing.spaceId && { spaceId: newSpaceId, slug: newSlug }),
    },
    include: {
      space: { select: { slug: true } },
    },
  });

  // If space changed, recursively move all descendants
  if (newSpaceId !== existing.spaceId) {
    await moveDescendantsToSpace(id, newSpaceId);
  }

  // Update relevance tags if provided
  if (teamIds !== undefined) {
    await db.documentTeam.deleteMany({ where: { documentId: id } });
    if (teamIds.length > 0) {
      await db.documentTeam.createMany({
        data: teamIds.map((teamId: string) => ({ documentId: id, teamId })),
      });
    }
  }

  if (roleIds !== undefined) {
    await db.documentRole.deleteMany({ where: { documentId: id } });
    if (roleIds.length > 0) {
      await db.documentRole.createMany({
        data: roleIds.map((roleId: string) => ({ documentId: id, roleId })),
      });
    }
  }

  if (clientIds !== undefined) {
    await db.documentClient.deleteMany({ where: { documentId: id } });
    if (clientIds.length > 0) {
      await db.documentClient.createMany({
        data: clientIds.map((clientId: string) => ({ documentId: id, clientId })),
      });
    }
  }

  if (tagIds !== undefined) {
    await db.documentTag.deleteMany({ where: { documentId: id } });
    if (tagIds.length > 0) {
      await db.documentTag.createMany({
        data: tagIds.map((tagId: string) => ({ documentId: id, tagId })),
      });
    }
  }

  // Track edit activity
  await db.activity.create({
    data: { type: "EDIT", userId: user!.id, documentId: doc.id },
  });

  return NextResponse.json(doc);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;

  const existing = await db.document.findFirst({
    where: { id, space: { organizationId: user!.organizationId } },
  });

  if (!existing) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  await db.document.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
