import { db } from "@/lib/db";
import { requireAuth } from "@/lib/session";
import { NextResponse } from "next/server";

const documentSelect = {
  id: true,
  title: true,
  slug: true,
  status: true,
} as const;

// 5 levels of recursive children
const childrenInclude = (depth: number): object =>
  depth <= 0
    ? { select: documentSelect, orderBy: { updatedAt: "desc" as const } }
    : {
        select: {
          ...documentSelect,
          children: childrenInclude(depth - 1),
        },
        orderBy: { updatedAt: "desc" as const },
      };

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { user, error } = await requireAuth();
  if (error) return error;

  const { slug } = await params;

  const space = await db.space.findUnique({
    where: {
      organizationId_slug: { organizationId: user!.organizationId, slug },
    },
    select: {
      name: true,
      slug: true,
      documents: {
        where: { parentId: null },
        select: {
          ...documentSelect,
          children: childrenInclude(4),
        },
        orderBy: { updatedAt: "desc" },
      },
    },
  });

  if (!space) {
    return NextResponse.json({ error: "Space not found" }, { status: 404 });
  }

  return NextResponse.json({
    spaceName: space.name,
    spaceSlug: space.slug,
    documents: space.documents,
  });
}
