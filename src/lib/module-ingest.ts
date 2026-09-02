import { z } from "zod";
import { db } from "@/lib/db";
import type { ModuleKind, Prisma } from "@/generated/prisma/client";
import { deriveVendor, normalizeEdges, resolveSpaceId } from "@/lib/module-doc";

export const ingestSchema = z.object({
  moduleName: z.string().min(1),
  dirName: z.string().nullish(),
  title: z.string().min(1),
  kind: z.enum(["module", "runbook", "concept"]).nullish(),
  markdown: z.string(),
  generatedHash: z.string().nullish(),
  generatedAt: z.string().min(1),
  space: z.string().nullish(), // space slug; overrides the ?space= / INGEST_SPACE_SLUG default
  doc: z.unknown().optional(),
  edges: z.unknown().optional(),
  components: z.unknown().optional(), // [{ type, name, target?, meta? }]
  labels: z.unknown().optional(), // structure labels: ["Checkout"] or [{ name, color? }]
});

type NormalizedComponent = { type: string; name: string; target: string | null; meta: unknown };
type NormalizedLabel = { name: string; color: string | null };

/**
 * Normalize the generator's `components` array into ModuleComponent rows.
 * Requires `type` + `name`; tolerates missing target/meta.
 */
function normalizeComponents(components: unknown): NormalizedComponent[] {
  if (!Array.isArray(components)) return [];
  const out: NormalizedComponent[] = [];
  for (const c of components) {
    if (!c || typeof c !== "object") continue;
    const r = c as Record<string, unknown>;
    const type = typeof r.type === "string" ? r.type.trim() : null;
    const name = typeof r.name === "string" ? r.name.trim() : null;
    if (!type || !name) continue;
    out.push({
      type,
      name,
      target: typeof r.target === "string" ? r.target : null,
      meta: r.meta ?? undefined,
    });
  }
  return out;
}

/**
 * Normalize the generator's `labels` array (structure labels) into {name, color} rows.
 * Accepts plain strings or objects; color is optional (drives the UI group accent).
 * Deduplicates by name (a name maps to a single org-scoped ModuleLabel).
 */
function normalizeLabels(labels: unknown): NormalizedLabel[] {
  if (!Array.isArray(labels)) return [];
  const out: NormalizedLabel[] = [];
  const seen = new Set<string>();
  for (const l of labels) {
    let name: string | null = null;
    let color: string | null = null;
    if (typeof l === "string") {
      name = l.trim();
    } else if (l && typeof l === "object") {
      const r = l as Record<string, unknown>;
      name = typeof r.name === "string" ? r.name.trim() : null;
      color = typeof r.color === "string" ? r.color.trim() : null;
    }
    if (!name || seen.has(name)) continue;
    seen.add(name);
    out.push({ name, color });
  }
  return out;
}

export type IngestResult = {
  moduleName: string | null;
  status: "created" | "updated" | "stale" | "invalid";
  httpStatus: 200 | 201 | 409 | 422;
  version?: number;
  storedAt?: Date;
  incomingAt?: Date;
  error?: unknown;
};

/**
 * Upsert a single module's generated block + structured data, honoring the timestamp
 * guard. Never touches the manual (human) fields. `orgId` is resolved once by the
 * caller so a bulk run doesn't re-query the org per item.
 */
export async function ingestOne(
  input: unknown,
  opts: { force: boolean; orgId: string | null; spaceId: string | null }
): Promise<IngestResult> {
  const parsed = ingestSchema.safeParse(input);
  if (!parsed.success) {
    const name =
      input && typeof input === "object" && typeof (input as Record<string, unknown>).moduleName === "string"
        ? ((input as Record<string, unknown>).moduleName as string)
        : null;
    return { moduleName: name, status: "invalid", httpStatus: 422, error: parsed.error.flatten() };
  }

  const p = parsed.data;
  const generatedAt = new Date(p.generatedAt);
  if (isNaN(generatedAt.getTime())) {
    return { moduleName: p.moduleName, status: "invalid", httpStatus: 422, error: "generatedAt is not a valid date" };
  }

  const existing = await db.moduleDoc.findUnique({
    where: { moduleName: p.moduleName },
    select: { id: true, generatedAt: true, manualVersion: true },
  });

  if (existing && !opts.force && generatedAt <= existing.generatedAt) {
    return {
      moduleName: p.moduleName,
      status: "stale",
      httpStatus: 409,
      storedAt: existing.generatedAt,
      incomingAt: generatedAt,
    };
  }

  const kind = ((p.kind ?? "module").toUpperCase()) as ModuleKind;
  const edges = normalizeEdges(p.edges);
  // Prefer explicit components; otherwise bootstrap plugin/observer facets from edges so
  // the capability filters work before the generator emits a `components` array.
  let components = normalizeComponents(p.components);
  if (components.length === 0) {
    components = edges
      .filter((e) => e.kind === "plugin" || e.kind === "observer")
      .map((e) => ({ type: e.kind, name: e.toRef || e.fromRef, target: e.fromRef || null, meta: undefined }));
  }
  const labels = normalizeLabels(p.labels);
  // Per-item `space` slug overrides the request default; otherwise keep the default.
  const spaceId = p.space ? await resolveSpaceId(opts.orgId, p.space) : opts.spaceId;

  // Only the generated + structured fields. `manual*` is deliberately absent.
  const generatedFields = {
    dirName: p.dirName ?? null,
    title: p.title,
    kind,
    vendor: deriveVendor(p.moduleName),
    generatedMarkdown: p.markdown,
    generatedHash: p.generatedHash ?? null,
    generatedAt,
    doc: (p.doc ?? undefined) as Prisma.InputJsonValue | undefined,
    edges: (p.edges ?? undefined) as Prisma.InputJsonValue | undefined,
    organizationId: opts.orgId,
    spaceId,
  };

  await db.$transaction(async (tx) => {
    const saved = existing
      ? await tx.moduleDoc.update({ where: { id: existing.id }, data: generatedFields })
      : await tx.moduleDoc.create({ data: { moduleName: p.moduleName, ...generatedFields } });

    // Rebuild the normalized edge rows that power search + graph.
    await tx.moduleEdge.deleteMany({ where: { moduleDocId: saved.id } });
    if (edges.length) {
      await tx.moduleEdge.createMany({
        data: edges.map((e) => ({ moduleDocId: saved.id, kind: e.kind, fromRef: e.fromRef, toRef: e.toRef })),
      });
    }

    // Rebuild the component rows that power capability facets.
    await tx.moduleComponent.deleteMany({ where: { moduleDocId: saved.id } });
    if (components.length) {
      await tx.moduleComponent.createMany({
        data: components.map((c) => ({
          moduleDocId: saved.id,
          type: c.type,
          name: c.name,
          target: c.target,
          meta: (c.meta ?? undefined) as Prisma.InputJsonValue | undefined,
        })),
      });
    }

    // Rebuild structure-label assignments (Domain / Integration / Status).
    // Upsert each label by (org, name) so color stays current, then reconnect.
    await tx.moduleLabelAssignment.deleteMany({ where: { moduleDocId: saved.id } });
    if (opts.orgId && labels.length) {
      for (const l of labels) {
        const label = await tx.moduleLabel.upsert({
          where: { organizationId_name: { organizationId: opts.orgId, name: l.name } },
          update: l.color ? { color: l.color } : {},
          create: { organizationId: opts.orgId, name: l.name, color: l.color },
        });
        await tx.moduleLabelAssignment.create({
          data: { moduleDocId: saved.id, labelId: label.id },
        });
      }
    }
  });

  return existing
    ? { moduleName: p.moduleName, status: "updated", httpStatus: 200, version: existing.manualVersion }
    : { moduleName: p.moduleName, status: "created", httpStatus: 201 };
}
