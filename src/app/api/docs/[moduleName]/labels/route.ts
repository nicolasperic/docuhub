import { db } from "@/lib/db";
import { requireAuth } from "@/lib/session";
import { NextResponse } from "next/server";

// PUT /api/docs/:moduleName/labels — replace the module's label set with { labelIds: [] }.
// Session-guarded (this is a human UI action, not a generator one).
export async function PUT(req: Request, { params }: { params: Promise<{ moduleName: string }> }) {
  const { user, error } = await requireAuth();
  if (error) return error;

  const { moduleName } = await params;
  const body = await req.json().catch(() => null);
  const labelIds: unknown = body?.labelIds;
  if (!Array.isArray(labelIds)) {
    return NextResponse.json({ error: "labelIds must be an array" }, { status: 422 });
  }

  const moduleDoc = await db.moduleDoc.findUnique({ where: { moduleName }, select: { id: true } });
  if (!moduleDoc) return NextResponse.json({ error: "Module doc not found" }, { status: 404 });

  // Keep only labels that actually belong to this org (defensive against stale ids).
  const validLabels = await db.moduleLabel.findMany({
    where: { id: { in: labelIds as string[] }, organizationId: user!.organizationId },
    select: { id: true, name: true, color: true },
  });

  await db.$transaction([
    db.moduleLabelAssignment.deleteMany({ where: { moduleDocId: moduleDoc.id } }),
    db.moduleLabelAssignment.createMany({
      data: validLabels.map((l) => ({ moduleDocId: moduleDoc.id, labelId: l.id })),
    }),
  ]);

  return NextResponse.json({ labels: validLabels });
}
