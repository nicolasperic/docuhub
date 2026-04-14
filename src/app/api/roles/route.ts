import { db } from "@/lib/db";
import { requireAdmin, requireAuth } from "@/lib/session";
import { NextResponse } from "next/server";

export async function GET() {
  const { user, error } = await requireAuth();
  if (error) return error;

  const roles = await db.role.findMany({
    where: { organizationId: user!.organizationId },
    include: { _count: { select: { userRoles: true } } },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(roles);
}

export async function POST(req: Request) {
  const { user, error } = await requireAdmin();
  if (error) return error;

  const { name, description } = await req.json();

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const role = await db.role.create({
    data: { name, description, organizationId: user!.organizationId },
  });

  return NextResponse.json(role, { status: 201 });
}
