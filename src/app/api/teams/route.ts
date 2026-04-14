import { db } from "@/lib/db";
import { requireAdmin, requireAuth } from "@/lib/session";
import { NextResponse } from "next/server";

export async function GET() {
  const { user, error } = await requireAuth();
  if (error) return error;

  const teams = await db.team.findMany({
    where: { organizationId: user!.organizationId },
    include: {
      parent: { select: { id: true, name: true } },
      _count: { select: { members: true, children: true } },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(teams);
}

export async function POST(req: Request) {
  const { user, error } = await requireAdmin();
  if (error) return error;

  const { name, description, parentId } = await req.json();

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const team = await db.team.create({
    data: {
      name,
      description,
      parentId: parentId || null,
      organizationId: user!.organizationId,
    },
  });

  return NextResponse.json(team, { status: 201 });
}
