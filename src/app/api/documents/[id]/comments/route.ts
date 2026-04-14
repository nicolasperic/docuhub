import { db } from "@/lib/db";
import { requireAuth } from "@/lib/session";
import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;

  // Verify doc belongs to user's org
  const doc = await db.document.findFirst({
    where: { id, space: { organizationId: user!.organizationId } },
    select: { id: true },
  });

  if (!doc) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  const comments = await db.comment.findMany({
    where: { documentId: id, parentId: null },
    include: {
      user: { select: { id: true, name: true, email: true, image: true } },
      replies: {
        include: {
          user: { select: { id: true, name: true, email: true, image: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(comments);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const { content, parentId } = await req.json();

  if (!content?.trim()) {
    return NextResponse.json({ error: "Content is required" }, { status: 400 });
  }

  // Verify doc belongs to user's org
  const doc = await db.document.findFirst({
    where: { id, space: { organizationId: user!.organizationId } },
    select: { id: true },
  });

  if (!doc) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  // If replying, verify parent comment exists and belongs to this doc
  if (parentId) {
    const parent = await db.comment.findFirst({
      where: { id: parentId, documentId: id, parentId: null },
    });
    if (!parent) {
      return NextResponse.json({ error: "Parent comment not found" }, { status: 404 });
    }
  }

  const comment = await db.comment.create({
    data: {
      content: content.trim(),
      userId: user!.id,
      documentId: id,
      parentId: parentId || null,
    },
    include: {
      user: { select: { id: true, name: true, email: true, image: true } },
      replies: {
        include: {
          user: { select: { id: true, name: true, email: true, image: true } },
        },
      },
    },
  });

  return NextResponse.json(comment, { status: 201 });
}
