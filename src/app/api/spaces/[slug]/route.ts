import { db } from "@/lib/db";
import { requireAuth } from "@/lib/session";
import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { user, error } = await requireAuth();
  if (error) return error;

  const { slug } = await params;

  const space = await db.space.findUnique({
    where: {
      organizationId_slug: { organizationId: user!.organizationId, slug },
    },
    include: {
      team: { select: { name: true } },
      documents: {
        where: { parentId: null },
        include: {
          author: { select: { name: true } },
          children: { select: { id: true, title: true, slug: true } },
          documentTags: { include: { tag: { select: { name: true, color: true } } } },
        },
        orderBy: { updatedAt: "desc" },
      },
    },
  });

  if (!space) {
    return NextResponse.json({ error: "Space not found" }, { status: 404 });
  }

  return NextResponse.json(space);
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { user, error } = await requireAuth();
  if (error) return error;

  const { slug } = await params;
  const { name, description, icon } = await req.json();

  const space = await db.space.update({
    where: {
      organizationId_slug: { organizationId: user!.organizationId, slug },
    },
    data: { name, description, icon },
  });

  return NextResponse.json(space);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { user, error } = await requireAuth();
  if (error) return error;

  const { slug } = await params;

  await db.space.delete({
    where: {
      organizationId_slug: { organizationId: user!.organizationId, slug },
    },
  });

  return NextResponse.json({ success: true });
}
