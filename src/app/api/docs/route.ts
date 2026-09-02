import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { ModuleKind, Prisma } from "@/generated/prisma/client";
import { authorizeRead } from "@/lib/ingest-auth";

const DEPENDS_KINDS = ["depends", "dependency", "dependsOn"];
const PLUGIN_KINDS = ["plugin", "plugs"];
const OBSERVER_KINDS = ["observer", "observes", "event"];

function snippet(text: string | null, q: string | null): string {
  if (!text) return "";
  if (q) {
    const i = text.toLowerCase().indexOf(q.toLowerCase());
    if (i >= 0) {
      const start = Math.max(0, i - 60);
      return (start > 0 ? "…" : "") + text.slice(start, start + 160).trim() + "…";
    }
  }
  return text.slice(0, 160).trim() + (text.length > 160 ? "…" : "");
}

// GET /api/docs?q=&kind=&depends_on=&plugs=&observes=
// Full-text-ish search over title/generated/manual plus structured edge filters.
export async function GET(req: Request) {
  const { error } = await authorizeRead(req);
  if (error) return error;

  const sp = new URL(req.url).searchParams;
  const q = sp.get("q");
  const kind = sp.get("kind");
  const space = sp.get("space");
  const component = sp.get("component");
  const dependsOn = sp.get("depends_on");
  const plugs = sp.get("plugs");
  const observes = sp.get("observes");

  const and: Prisma.ModuleDocWhereInput[] = [];

  if (space) {
    and.push({ space: { slug: space } });
  }

  if (component) {
    and.push({ components: { some: { type: component } } });
  }

  if (q) {
    and.push({
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        { moduleName: { contains: q, mode: "insensitive" } },
        { generatedMarkdown: { contains: q, mode: "insensitive" } },
        { manualMarkdown: { contains: q, mode: "insensitive" } },
      ],
    });
  }

  if (kind) {
    and.push({ kind: kind.toUpperCase() as ModuleKind });
  }

  // Structured filters resolve to a set of module ids via the normalized edge table.
  const edgeFilters: { kinds: string[]; value: string; on: "toRef" | "either" }[] = [];
  if (dependsOn) edgeFilters.push({ kinds: DEPENDS_KINDS, value: dependsOn, on: "toRef" });
  if (plugs) edgeFilters.push({ kinds: PLUGIN_KINDS, value: plugs, on: "toRef" });
  if (observes) edgeFilters.push({ kinds: OBSERVER_KINDS, value: observes, on: "either" });

  for (const f of edgeFilters) {
    const edges = await db.moduleEdge.findMany({
      where: {
        kind: { in: f.kinds },
        ...(f.on === "either"
          ? { OR: [{ toRef: f.value }, { fromRef: f.value }] }
          : { toRef: f.value }),
      },
      select: { moduleDocId: true },
    });
    and.push({ id: { in: [...new Set(edges.map((e) => e.moduleDocId))] } });
  }

  const results = await db.moduleDoc.findMany({
    where: and.length ? { AND: and } : undefined,
    select: {
      moduleName: true,
      title: true,
      kind: true,
      vendor: true,
      generatedMarkdown: true,
      manualMarkdown: true,
    },
    orderBy: { title: "asc" },
    take: 100,
  });

  const hits = results.map((r) => ({
    moduleName: r.moduleName,
    title: r.title,
    kind: r.kind,
    vendor: r.vendor,
    snippet: snippet(r.generatedMarkdown || r.manualMarkdown, q),
  }));

  return NextResponse.json({ count: hits.length, hits });
}
