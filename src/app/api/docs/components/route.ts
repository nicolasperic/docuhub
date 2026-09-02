import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authorizeRead } from "@/lib/ingest-auth";
import { componentOrderIndex } from "@/lib/module-components";

// GET /api/docs/components?space=<slug>
// Capability facets: how many modules declare each component type, plus a
// moduleName -> [types] map so the browser can filter client-side.
export async function GET(req: Request) {
  const { error } = await authorizeRead(req);
  if (error) return error;

  const spaceSlug = new URL(req.url).searchParams.get("space");
  const mods = await db.moduleDoc.findMany({
    where: spaceSlug ? { space: { slug: spaceSlug } } : undefined,
    select: { moduleName: true, components: { select: { type: true } } },
  });

  const facetCount: Record<string, number> = {};
  const modules: Record<string, string[]> = {};

  for (const m of mods) {
    const types = [...new Set(m.components.map((c) => c.type))];
    if (types.length === 0) continue;
    modules[m.moduleName] = types;
    for (const t of types) facetCount[t] = (facetCount[t] ?? 0) + 1;
  }

  const facets = Object.entries(facetCount)
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => componentOrderIndex(a.type) - componentOrderIndex(b.type) || b.count - a.count);

  return NextResponse.json({ facets, modules });
}
