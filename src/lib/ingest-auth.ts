import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";

function bearerToken(req: Request): string | null {
  const header = req.headers.get("authorization") ?? "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
}

/**
 * Gate the machine (generator) ingest endpoints behind the shared INGEST_TOKEN.
 * 500 if the server is misconfigured (no token set), 401 on a missing/wrong token.
 */
export function requireIngestToken(req: Request): { ok: boolean; error: NextResponse | null } {
  const expected = process.env.INGEST_TOKEN;
  if (!expected) {
    return {
      ok: false,
      error: NextResponse.json({ error: "INGEST_TOKEN is not configured on the server" }, { status: 500 }),
    };
  }
  if (bearerToken(req) !== expected) {
    return { ok: false, error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  return { ok: true, error: null };
}

/**
 * Read access for the module-doc endpoints: a logged-in UI session OR a valid ingest
 * token (so the generator can read back what it wrote). 401 if neither.
 */
export async function authorizeRead(req: Request): Promise<{ ok: boolean; error: NextResponse | null }> {
  const user = await getSessionUser();
  if (user) return { ok: true, error: null };
  if (process.env.INGEST_TOKEN && bearerToken(req) === process.env.INGEST_TOKEN) {
    return { ok: true, error: null };
  }
  return { ok: false, error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
}
