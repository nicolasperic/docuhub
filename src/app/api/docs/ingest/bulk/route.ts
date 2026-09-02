import { NextResponse } from "next/server";
import { requireIngestToken } from "@/lib/ingest-auth";
import { resolveOrgId, resolveSpaceId } from "@/lib/module-doc";
import { ingestOne } from "@/lib/module-ingest";

// POST /api/docs/ingest/bulk — array of ingest payloads (or { items: [...] }).
// Same per-item timestamp guard; returns per-item { moduleName, status }.
export async function POST(req: Request) {
  const { error } = requireIngestToken(req);
  if (error) return error;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const items = Array.isArray(body)
    ? body
    : body && typeof body === "object" && Array.isArray((body as Record<string, unknown>).items)
      ? ((body as Record<string, unknown>).items as unknown[])
      : null;

  if (!items) {
    return NextResponse.json({ error: "Expected an array of ingest payloads" }, { status: 400 });
  }

  const sp = new URL(req.url).searchParams;
  const force = sp.get("force") === "true";
  const orgId = await resolveOrgId();
  const spaceId = await resolveSpaceId(orgId, sp.get("space"));

  const results = [];
  for (const item of items) {
    const r = await ingestOne(item, { force, orgId, spaceId });
    results.push({
      moduleName: r.moduleName,
      status: r.status,
      ...(r.status === "stale" ? { storedAt: r.storedAt, incomingAt: r.incomingAt } : {}),
    });
  }

  const counts = results.reduce<Record<string, number>>((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1;
    return acc;
  }, {});

  return NextResponse.json({ total: results.length, counts, results });
}
