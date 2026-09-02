import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { authorizeRead } from "@/lib/ingest-auth";
import { getSessionUser } from "@/lib/session";

const manualSchema = z.object({
  markdown: z.string(),
  baseVersion: z.number().int().nonnegative(),
  updatedBy: z.string().nullish(),
});

// PUT /api/docs/:moduleName/manual — UI saves the human Team Notes section.
// Optimistic guard: a save based on a stale baseVersion is rejected (409) so two
// editors can't silently overwrite each other.
export async function PUT(req: Request, { params }: { params: Promise<{ moduleName: string }> }) {
  const { error } = await authorizeRead(req);
  if (error) return error;

  const { moduleName } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = manualSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body", details: parsed.error.flatten() }, { status: 422 });
  }

  const existing = await db.moduleDoc.findUnique({
    where: { moduleName },
    select: { id: true, manualVersion: true, manualMarkdown: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Module doc not found" }, { status: 404 });
  }

  if (parsed.data.baseVersion !== existing.manualVersion) {
    return NextResponse.json(
      {
        status: "conflict",
        currentVersion: existing.manualVersion,
        currentMarkdown: existing.manualMarkdown,
      },
      { status: 409 }
    );
  }

  const sessionUser = await getSessionUser();
  const updatedBy = sessionUser?.email ?? parsed.data.updatedBy ?? null;

  const saved = await db.moduleDoc.update({
    where: { id: existing.id },
    data: {
      manualMarkdown: parsed.data.markdown,
      manualVersion: existing.manualVersion + 1,
      humanUpdatedAt: new Date(),
      updatedBy,
    },
    select: { manualVersion: true },
  });

  return NextResponse.json({ status: "saved", version: saved.manualVersion });
}
