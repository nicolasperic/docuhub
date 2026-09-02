import { NextResponse } from "next/server";
import { requireIngestToken } from "@/lib/ingest-auth";
import { resolveOrgId, resolveSpaceId } from "@/lib/module-doc";
import { ingestOne } from "@/lib/module-ingest";

// POST /api/docs/ingest — generator upserts one module's generated doc + wiring.
// Touches only the generated/doc/edges fields; manual content is left untouched.
export async function POST(req: Request) {
  const { error } = requireIngestToken(req);
  if (error) return error;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const sp = new URL(req.url).searchParams;
  const force = sp.get("force") === "true";
  const orgId = await resolveOrgId();
  const spaceId = await resolveSpaceId(orgId, sp.get("space"));
  const result = await ingestOne(body, { force, orgId, spaceId });

  const { httpStatus, ...payload } = result;
  return NextResponse.json(payload, { status: httpStatus });
}
