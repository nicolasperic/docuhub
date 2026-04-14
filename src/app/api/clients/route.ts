import { db } from "@/lib/db";
import { requireAdmin, requireAuth } from "@/lib/session";
import { NextResponse } from "next/server";

export async function GET() {
  const { user, error } = await requireAuth();
  if (error) return error;

  const clients = await db.client.findMany({
    where: { organizationId: user!.organizationId },
    include: { _count: { select: { teamClients: true } } },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(clients);
}

export async function POST(req: Request) {
  const { user, error } = await requireAdmin();
  if (error) return error;

  const { name, description } = await req.json();

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const client = await db.client.create({
    data: { name, description, organizationId: user!.organizationId },
  });

  return NextResponse.json(client, { status: 201 });
}
