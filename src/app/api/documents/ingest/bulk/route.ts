import { NextResponse } from "next/server";
import { requireIngestToken } from "@/lib/ingest-auth";
import { resolveOrgId } from "@/lib/module-doc";
import { ingestDocument } from "@/lib/document-ingest";

// POST /api/documents/ingest/bulk — array of document payloads (or { items: [...] }).
// Same per-item upsert semantics; returns per-item { status, slug, id }.
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
    return NextResponse.json({ error: "Expected an array of document payloads" }, { status: 400 });
  }

  const querySpace = new URL(req.url).searchParams.get("space");
  const orgId = await resolveOrgId();

  const results = [];
  for (const item of items) {
    const r = await ingestDocument(item, { orgId, querySpace });
    results.push({ status: r.status, title: r.title ?? null, slug: r.slug ?? null, id: r.id ?? null, error: r.error });
  }

  const counts = results.reduce<Record<string, number>>((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1;
    return acc;
  }, {});

  return NextResponse.json({ total: results.length, counts, results });
}
