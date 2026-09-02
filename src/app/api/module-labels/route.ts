import { db } from "@/lib/db";
import { requireAuth } from "@/lib/session";
import { NextResponse } from "next/server";

// GET /api/module-labels — all labels in the org, with how many modules carry each.
export async function GET() {
  const { user, error } = await requireAuth();
  if (error) return error;

  const labels = await db.moduleLabel.findMany({
    where: { organizationId: user!.organizationId },
    select: { id: true, name: true, color: true, _count: { select: { assignments: true } } },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(
    labels.map((l) => ({ id: l.id, name: l.name, color: l.color, count: l._count.assignments }))
  );
}

// POST /api/module-labels — create a structural label (name + optional color).
export async function POST(req: Request) {
  const { user, error } = await requireAuth();
  if (error) return error;

  const { name, color } = await req.json();
  if (!name || typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const existing = await db.moduleLabel.findUnique({
    where: { organizationId_name: { organizationId: user!.organizationId, name: name.trim() } },
    select: { id: true },
  });
  if (existing) {
    return NextResponse.json({ error: "A label with that name already exists" }, { status: 409 });
  }

  const label = await db.moduleLabel.create({
    data: { name: name.trim(), color: color || null, organizationId: user!.organizationId },
    select: { id: true, name: true, color: true },
  });

  return NextResponse.json({ ...label, count: 0 }, { status: 201 });
}
