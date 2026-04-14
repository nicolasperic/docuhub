import { db } from "@/lib/db";
import { requireAuth } from "@/lib/session";
import { NextResponse } from "next/server";

const ALLOWED_EMOJIS = ["thumbsUp", "heart", "celebrate", "thinking", "eyes", "rocket"];

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;

  // Verify doc belongs to user's org
  const doc = await db.document.findFirst({
    where: { id, space: { organizationId: user!.organizationId } },
    select: { id: true },
  });

  if (!doc) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  const reactions = await db.reaction.findMany({
    where: { documentId: id },
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  // Group by emoji
  const grouped: Record<string, { emoji: string; count: number; users: { id: string; name: string | null; email: string }[]; reacted: boolean }> = {};

  for (const r of reactions) {
    if (!grouped[r.emoji]) {
      grouped[r.emoji] = { emoji: r.emoji, count: 0, users: [], reacted: false };
    }
    grouped[r.emoji].count++;
    grouped[r.emoji].users.push(r.user);
    if (r.userId === user!.id) {
      grouped[r.emoji].reacted = true;
    }
  }

  return NextResponse.json(Object.values(grouped));
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const { emoji } = await req.json();

  if (!ALLOWED_EMOJIS.includes(emoji)) {
    return NextResponse.json({ error: "Invalid emoji" }, { status: 400 });
  }

  // Verify doc belongs to user's org
  const doc = await db.document.findFirst({
    where: { id, space: { organizationId: user!.organizationId } },
    select: { id: true },
  });

  if (!doc) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  // Toggle reaction
  const existing = await db.reaction.findUnique({
    where: {
      userId_documentId_emoji: {
        userId: user!.id,
        documentId: id,
        emoji,
      },
    },
  });

  if (existing) {
    await db.reaction.delete({ where: { id: existing.id } });
    return NextResponse.json({ reacted: false });
  }

  await db.reaction.create({
    data: { emoji, userId: user!.id, documentId: id },
  });

  return NextResponse.json({ reacted: true });
}
