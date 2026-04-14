import { db } from "@/lib/db";
import { requireAuth } from "@/lib/session";
import { NextResponse } from "next/server";

export async function GET() {
  const { user, error } = await requireAuth();
  if (error) return error;

  const tags = await db.tag.findMany({
    where: { organizationId: user!.organizationId },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(tags);
}

export async function POST(req: Request) {
  const { user, error } = await requireAuth();
  if (error) return error;

  const { name, color } = await req.json();

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const tag = await db.tag.create({
    data: { name, color, organizationId: user!.organizationId },
  });

  return NextResponse.json(tag, { status: 201 });
}
