import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authorizeRead } from "@/lib/ingest-auth";
import { toPageModel } from "@/lib/module-doc";
import { renderHtml } from "@/lib/module-render";

// GET /api/docs/:moduleName — full Page model. ?render=html returns the stitched
// generated+manual markdown rendered to HTML (generated block first).
export async function GET(req: Request, { params }: { params: Promise<{ moduleName: string }> }) {
  const { error } = await authorizeRead(req);
  if (error) return error;

  const { moduleName } = await params;
  const moduleDoc = await db.moduleDoc.findUnique({
    where: { moduleName },
    include: {
      labelAssignments: { select: { label: { select: { id: true, name: true, color: true } } } },
      components: { select: { type: true, name: true, target: true, meta: true }, orderBy: { name: "asc" } },
    },
  });

  if (!moduleDoc) {
    return NextResponse.json({ error: "Module doc not found" }, { status: 404 });
  }

  if (new URL(req.url).searchParams.get("render") === "html") {
    return new NextResponse(renderHtml(moduleDoc), {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  return NextResponse.json({
    ...toPageModel(moduleDoc),
    labels: moduleDoc.labelAssignments.map((a) => a.label),
    components: moduleDoc.components,
  });
}
