import { db } from "@/lib/db";
import { requireAuth } from "@/lib/session";
import { NextResponse } from "next/server";

export async function GET() {
  const { user, error } = await requireAuth();
  if (error) return error;

  const favorites = await db.favorite.findMany({
    where: { userId: user!.id },
    include: {
      document: {
        include: {
          author: { select: { name: true } },
          space: { select: { name: true, slug: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(favorites);
}

export async function POST(req: Request) {
  const { user, error } = await requireAuth();
  if (error) return error;

  const { documentId } = await req.json();

  // Toggle favorite
  const existing = await db.favorite.findUnique({
    where: { userId_documentId: { userId: user!.id, documentId } },
  });

  if (existing) {
    await db.favorite.delete({ where: { id: existing.id } });
    return NextResponse.json({ favorited: false });
  }

  await db.favorite.create({
    data: { userId: user!.id, documentId },
  });

  return NextResponse.json({ favorited: true });
}
