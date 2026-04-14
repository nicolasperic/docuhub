import { db } from "@/lib/db";
import { requireAuth } from "@/lib/session";
import { NextResponse } from "next/server";

export async function GET() {
  const { user, error } = await requireAuth();
  if (error) return error;

  const spaces = await db.space.findMany({
    where: { organizationId: user!.organizationId },
    include: {
      team: { select: { name: true } },
      _count: { select: { documents: true } },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(spaces);
}

export async function POST(req: Request) {
  const { user, error } = await requireAuth();
  if (error) return error;

  const { name, description, type, teamId, icon } = await req.json();

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  // Generate slug
  const baseSlug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  let slug = baseSlug;
  let counter = 0;
  while (
    await db.space.findUnique({
      where: { organizationId_slug: { organizationId: user!.organizationId, slug } },
    })
  ) {
    counter++;
    slug = `${baseSlug}-${counter}`;
  }

  const space = await db.space.create({
    data: {
      name,
      description,
      slug,
      type: type || "ORG_WIDE",
      icon,
      organizationId: user!.organizationId,
      teamId: teamId || null,
    },
  });

  return NextResponse.json(space, { status: 201 });
}
