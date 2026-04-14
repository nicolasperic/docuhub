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
  const { name, description } = await req.json();

  const role = await db.role.update({
    where: { id },
    data: { name, description },
  });

  return NextResponse.json(role);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  await db.role.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
