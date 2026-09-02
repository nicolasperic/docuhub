import { db } from "@/lib/db";
import type { ModuleDoc } from "@/generated/prisma/client";

/**
 * Derive the vendor/namespace prefix from a Magento-style `Vendor_Module` name.
 * `LittlePassports_AutoCustomerRegistration` → `LittlePassports`. Returns null when
 * there's no underscore (e.g. runbook/concept slugs).
 */
export function deriveVendor(moduleName: string): string | null {
  const idx = moduleName.indexOf("_");
  if (idx <= 0) return null;
  return moduleName.slice(0, idx);
}

export type NormalizedEdge = { kind: string; fromRef: string; toRef: string };

/**
 * Normalize the generator's `edges` array into rows for the ModuleEdge table.
 * Tolerant of both the spec's `{kind, from, to}` shape and `{kind, fromRef, toRef}`.
 * Anything missing a kind or both endpoints is dropped.
 */
export function normalizeEdges(edges: unknown): NormalizedEdge[] {
  if (!Array.isArray(edges)) return [];
  const out: NormalizedEdge[] = [];
  for (const e of edges) {
    if (!e || typeof e !== "object") continue;
    const r = e as Record<string, unknown>;
    const kind = typeof r.kind === "string" ? r.kind : null;
    const fromRef = typeof r.from === "string" ? r.from : typeof r.fromRef === "string" ? r.fromRef : null;
    const toRef = typeof r.to === "string" ? r.to : typeof r.toRef === "string" ? r.toRef : null;
    if (!kind || (!fromRef && !toRef)) continue;
    out.push({ kind, fromRef: fromRef ?? "", toRef: toRef ?? "" });
  }
  return out;
}

/**
 * Shape a ModuleDoc row into the API's Page model (generated/manual nested,
 * `contentUpdatedAt` = the most recent of generated/human timestamps).
 */
export function toPageModel(m: ModuleDoc) {
  const contentUpdatedAt =
    m.humanUpdatedAt && m.humanUpdatedAt > m.generatedAt ? m.humanUpdatedAt : m.generatedAt;
  return {
    id: m.id,
    moduleName: m.moduleName,
    dirName: m.dirName,
    title: m.title,
    kind: m.kind,
    vendor: m.vendor,
    spaceId: m.spaceId,
    generated: {
      markdown: m.generatedMarkdown,
      hash: m.generatedHash,
      generatedAt: m.generatedAt,
    },
    manual: {
      markdown: m.manualMarkdown,
      version: m.manualVersion,
      humanUpdatedAt: m.humanUpdatedAt,
      updatedBy: m.updatedBy,
    },
    doc: m.doc,
    edges: m.edges,
    contentUpdatedAt,
  };
}

/**
 * Resolve the organization module docs should belong to. Uses INGEST_ORG_SLUG when
 * set; otherwise the sole org if exactly one exists; otherwise null (module docs may
 * be global — cross-linking still works within whatever org a document belongs to).
 */
export async function resolveOrgId(): Promise<string | null> {
  const slug = process.env.INGEST_ORG_SLUG;
  if (slug) {
    const org = await db.organization.findUnique({ where: { slug }, select: { id: true } });
    return org?.id ?? null;
  }
  const orgs = await db.organization.findMany({ take: 2, select: { id: true } });
  return orgs.length === 1 ? orgs[0].id : null;
}

/**
 * Resolve the Space (by slug, within the given org) a module doc should live in.
 * `explicitSlug` (from the payload or ?space=) wins over the INGEST_SPACE_SLUG default.
 * Returns null when no slug is provided or no matching space exists (module stays
 * space-agnostic — still browsable via the vendor tree, just not filed under a space).
 */
export async function resolveSpaceId(orgId: string | null, explicitSlug?: string | null): Promise<string | null> {
  const slug = explicitSlug ?? process.env.INGEST_SPACE_SLUG;
  if (!slug) return null;
  const space = await db.space.findFirst({
    where: { slug, ...(orgId ? { organizationId: orgId } : {}) },
    select: { id: true },
  });
  return space?.id ?? null;
}
