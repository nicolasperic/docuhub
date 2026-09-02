import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authorizeRead } from "@/lib/ingest-auth";

type TreeItem = { moduleName: string; title: string; dirName: string | null };
type TreeGroup = {
  key: string;
  label: string;
  kind?: "MODULE" | "RUNBOOK" | "CONCEPT";
  color?: string | null;
  items: TreeItem[];
};

const UNLABELED = "__unlabeled";

// GET /api/docs/tree — navigable tree for the module browser.
//   ?space=<slug>        scopes to one space
//   ?groupBy=label       groups by structural label (multi-membership + color);
//                        default groups by vendor (+ Runbooks / Concepts).
export async function GET(req: Request) {
  const { error } = await authorizeRead(req);
  if (error) return error;

  const sp = new URL(req.url).searchParams;
  const spaceSlug = sp.get("space");
  const groupBy = sp.get("groupBy");
  const where = spaceSlug ? { space: { slug: spaceSlug } } : undefined;

  if (groupBy === "label") {
    const mods = await db.moduleDoc.findMany({
      where,
      select: {
        moduleName: true,
        title: true,
        dirName: true,
        labelAssignments: { select: { label: { select: { id: true, name: true, color: true } } } },
      },
      orderBy: { title: "asc" },
    });

    const labelGroups = new Map<string, TreeGroup>();
    const unlabeled: TreeItem[] = [];

    for (const m of mods) {
      const item: TreeItem = { moduleName: m.moduleName, title: m.title, dirName: m.dirName };
      if (m.labelAssignments.length === 0) {
        unlabeled.push(item);
        continue;
      }
      // Multi-membership: a module appears under every label it carries.
      for (const { label } of m.labelAssignments) {
        if (!labelGroups.has(label.id)) {
          labelGroups.set(label.id, { key: label.id, label: label.name, color: label.color, items: [] });
        }
        labelGroups.get(label.id)!.items.push(item);
      }
    }

    const groups = [...labelGroups.values()].sort((a, b) => a.label.localeCompare(b.label));
    if (unlabeled.length) groups.push({ key: UNLABELED, label: "Uncategorized", color: null, items: unlabeled });
    return NextResponse.json({ groups });
  }

  // Default: vendor grouping (+ Runbooks / Concepts).
  const mods = await db.moduleDoc.findMany({
    where,
    select: { moduleName: true, title: true, dirName: true, kind: true, vendor: true },
    orderBy: [{ vendor: "asc" }, { title: "asc" }],
  });

  const vendorGroups = new Map<string, TreeGroup>();
  const runbooks: TreeItem[] = [];
  const concepts: TreeItem[] = [];

  for (const m of mods) {
    const item: TreeItem = { moduleName: m.moduleName, title: m.title, dirName: m.dirName };
    if (m.kind === "RUNBOOK") {
      runbooks.push(item);
    } else if (m.kind === "CONCEPT") {
      concepts.push(item);
    } else {
      const key = m.vendor ?? "Other";
      if (!vendorGroups.has(key)) {
        vendorGroups.set(key, { key, label: key, kind: "MODULE", items: [] });
      }
      vendorGroups.get(key)!.items.push(item);
    }
  }

  const groups: TreeGroup[] = [...vendorGroups.values()].sort((a, b) => a.label.localeCompare(b.label));
  if (runbooks.length) groups.push({ key: "__runbooks", label: "Runbooks", kind: "RUNBOOK", items: runbooks });
  if (concepts.length) groups.push({ key: "__concepts", label: "Concepts", kind: "CONCEPT", items: concepts });

  return NextResponse.json({ groups });
}
