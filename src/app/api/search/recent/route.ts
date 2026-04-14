import { db } from "@/lib/db";
import { requireAuth } from "@/lib/session";
import { NextResponse } from "next/server";

export async function DELETE(req: Request) {
  const { user, error } = await requireAuth();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  // Only allow deleting own SEARCH activities
  await db.activity.deleteMany({
    where: { id, userId: user.id, type: "SEARCH" },
  });

  return NextResponse.json({ success: true });
}
