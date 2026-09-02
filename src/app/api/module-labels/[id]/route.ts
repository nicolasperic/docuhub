import { db } from "@/lib/db";
import { requireAuth } from "@/lib/session";
import { NextResponse } from "next/server";

// PATCH /api/module-labels/:id — rename / recolor a label.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const label = await db.moduleLabel.findFirst({
    where: { id, organizationId: user!.organizationId },
    select: { id: true },
  });
  if (!label) return NextResponse.json({ error: "Label not found" }, { status: 404 });

  const { name, color } = await req.json();
  const updated = await db.moduleLabel.update({
    where: { id },
    data: {
      ...(typeof name === "string" && name.trim() ? { name: name.trim() } : {}),
      ...(color !== undefined ? { color: color || null } : {}),
    },
    select: { id: true, name: true, color: true },
  });

  return NextResponse.json(updated);
}

// DELETE /api/module-labels/:id — remove the label (assignments cascade away).
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const label = await db.moduleLabel.findFirst({
    where: { id, organizationId: user!.organizationId },
    select: { id: true },
  });
  if (!label) return NextResponse.json({ error: "Label not found" }, { status: 404 });

  await db.moduleLabel.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
