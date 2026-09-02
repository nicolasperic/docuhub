import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authorizeRead } from "@/lib/ingest-auth";

const DEPENDS_KINDS = ["depends", "dependency", "dependsOn"];
const PLUGIN_KINDS = ["plugin", "plugs"];
const OBSERVER_KINDS = ["observer", "observes", "event"];

// GET /api/graph/:moduleName — inbound/outbound wiring neighbors.
export async function GET(req: Request, { params }: { params: Promise<{ moduleName: string }> }) {
  const { error } = await authorizeRead(req);
  if (error) return error;

  const { moduleName } = await params;
  const moduleDoc = await db.moduleDoc.findUnique({
    where: { moduleName },
    select: { id: true, moduleName: true, dirName: true, moduleEdges: true },
  });
  if (!moduleDoc) {
    return NextResponse.json({ error: "Module doc not found" }, { status: 404 });
  }

  const edges = moduleDoc.moduleEdges;
  const plugsInto = edges
    .filter((e) => PLUGIN_KINDS.includes(e.kind))
    .map((e) => ({ target: e.toRef, via: e.fromRef }));
  const observedEvents = [
    ...new Set(edges.filter((e) => OBSERVER_KINDS.includes(e.kind)).map((e) => e.toRef || e.fromRef)),
  ];
  const dependsOn = [
    ...new Set(edges.filter((e) => DEPENDS_KINDS.includes(e.kind)).map((e) => e.toRef)),
  ];

  // dependedOnBy — reverse edges computed across all ingested modules. depends edges
  // reference a module by its dirName (or moduleName), so match against both.
  const selfRefs = [moduleDoc.dirName, moduleDoc.moduleName].filter((v): v is string => !!v);
  const reverse = await db.moduleEdge.findMany({
    where: { kind: { in: DEPENDS_KINDS }, toRef: { in: selfRefs }, NOT: { moduleDocId: moduleDoc.id } },
    select: { moduleDocId: true },
  });
  const dependents = await db.moduleDoc.findMany({
    where: { id: { in: [...new Set(reverse.map((r) => r.moduleDocId))] } },
    select: { moduleName: true, dirName: true, title: true },
  });

  return NextResponse.json({
    moduleName: moduleDoc.moduleName,
    plugsInto,
    observedEvents,
    dependsOn,
    dependedOnBy: dependents,
  });
}
