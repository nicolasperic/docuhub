import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { NextResponse } from "next/server";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const { name, description, parentId } = await req.json();

  const team = await db.team.update({
    where: { id },
    data: { name, description, parentId: parentId || null },
  });

  return NextResponse.json(team);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  await db.team.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
