"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Package, Search, X, ChevronLeft, ChevronRight } from "lucide-react";
import { componentLabel } from "@/lib/module-components";

interface ModuleItem {
  moduleName: string;
  title: string;
  dirName: string | null;
}
interface ModuleGroup {
  key: string;
  label: string;
  color?: string | null;
  items: ModuleItem[];
}
interface FlatModule extends ModuleItem {
  labelKeys: string[];
}

const UNLABELED = "__unlabeled";
const GROUP_CAP = 15; // cards shown per group before "Show all"
const PAGE_SIZE = 24; // cards per page in focused (search / single-label) mode

export function SpaceModules({ spaceSlug }: { spaceSlug: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const [groups, setGroups] = useState<ModuleGroup[]>([]);
  const [facets, setFacets] = useState<{ type: string; count: number }[]>([]);
  const [componentModules, setComponentModules] = useState<Record<string, string[]>>({});
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [activeGroup, setActiveGroup] = useState<string | null>(searchParams.get("label"));
  const [activeComponent, setActiveComponent] = useState<string | null>(searchParams.get("component"));
  const [page, setPage] = useState(0);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch(`/api/docs/tree?space=${encodeURIComponent(spaceSlug)}&groupBy=label`)
      .then((res) => (res.ok ? res.json() : { groups: [] }))
      .then((data) => setGroups(data.groups ?? []));
    fetch(`/api/docs/components?space=${encodeURIComponent(spaceSlug)}`)
      .then((res) => (res.ok ? res.json() : { facets: [], modules: {} }))
      .then((data) => {
        setFacets(data.facets ?? []);
        setComponentModules(data.modules ?? {});
      });
  }, [spaceSlug]);

  // Keep label + component + search in the URL so a filtered view is shareable/bookmarkable.
  function syncUrl(next: { label?: string | null; component?: string | null; query?: string }) {
    const label = next.label !== undefined ? next.label : activeGroup;
    const component = next.component !== undefined ? next.component : activeComponent;
    const q = next.query !== undefined ? next.query : query;
    const sp = new URLSearchParams();
    if (label) sp.set("label", label);
    if (component) sp.set("component", component);
    if (q.trim()) sp.set("q", q.trim());
    const qs = sp.toString();
    // Sync onto the CURRENT page (space landing or the dedicated /modules page),
    // not a hardcoded base — otherwise filtering on /modules bounces to the root.
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  function setLabelFilter(key: string | null) {
    setActiveGroup(key);
    setPage(0);
    syncUrl({ label: key });
  }
  function setComponentFilter(type: string | null) {
    setActiveComponent(type);
    setPage(0);
    syncUrl({ component: type });
  }
  function setSearch(value: string) {
    setQuery(value);
    setPage(0);
    syncUrl({ query: value });
  }

  // Label metadata + a flat, deduped module list (a module can carry several labels).
  const { labelMeta, allModules } = useMemo(() => {
    const meta = new Map<string, { name: string; color: string | null }>();
    const map = new Map<string, FlatModule>();
    for (const g of groups) {
      if (g.key !== UNLABELED) meta.set(g.key, { name: g.label, color: g.color ?? null });
      for (const it of g.items) {
        const cur = map.get(it.moduleName) ?? { ...it, labelKeys: [] };
        if (g.key !== UNLABELED) cur.labelKeys.push(g.key);
        map.set(it.moduleName, cur);
      }
    }
    return { labelMeta: meta, allModules: [...map.values()] };
  }, [groups]);

  const focused = !!query.trim() || !!activeGroup || !!activeComponent;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allModules
      .filter((m) => {
        if (activeGroup) {
          const inGroup = activeGroup === UNLABELED ? m.labelKeys.length === 0 : m.labelKeys.includes(activeGroup);
          if (!inGroup) return false;
        }
        if (activeComponent && !(componentModules[m.moduleName] ?? []).includes(activeComponent)) return false;
        if (!q) return true;
        if (m.title.toLowerCase().includes(q) || m.moduleName.toLowerCase().includes(q)) return true;
        if (m.labelKeys.some((k) => labelMeta.get(k)?.name.toLowerCase().includes(q))) return true;
        return (componentModules[m.moduleName] ?? []).some((t) => componentLabel(t).toLowerCase().includes(q));
      })
      .sort((a, b) => a.title.localeCompare(b.title));
  }, [allModules, activeGroup, activeComponent, query, labelMeta, componentModules]);

  if (allModules.length === 0) return null;

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageClamped = Math.min(page, totalPages - 1);
  const pageItems = filtered.slice(pageClamped * PAGE_SIZE, pageClamped * PAGE_SIZE + PAGE_SIZE);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Package className="h-5 w-5 text-muted-foreground" />
        <h2 className="text-lg font-semibold">Modules</h2>
        <Badge variant="secondary" className="text-xs">{allModules.length}</Badge>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search modules by name or label…"
          className="pl-8"
        />
        {query && (
          <button
            type="button"
            onClick={() => setSearch("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Label filter chips */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-0.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">Labels</span>
        <button
          type="button"
          onClick={() => setLabelFilter(null)}
          className={`rounded-full border px-2.5 py-0.5 text-xs transition-colors ${
            activeGroup === null ? "bg-foreground text-background" : "hover:bg-muted"
          }`}
        >
          All
        </button>
        {groups.map((group) => {
          const active = activeGroup === group.key;
          return (
            <button
              key={group.key}
              type="button"
              onClick={() => setLabelFilter(active ? null : group.key)}
              title={active ? `Clear ${group.label} filter` : `Show only ${group.label}`}
              className={`flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs transition-colors ${
                active ? (group.color ? "text-background" : "bg-foreground text-background") : "hover:bg-muted"
              }`}
              style={active && group.color ? { backgroundColor: group.color, borderColor: group.color } : undefined}
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: group.color ?? "var(--muted-foreground)" }}
              />
              {group.label}
              {active ? <X className="h-3 w-3 opacity-80" /> : <span className="opacity-60">{group.items.length}</span>}
            </button>
          );
        })}
      </div>

      {/* Capability (component) facet chips */}
      {facets.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-0.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">Declares</span>
          {facets.map((f) => {
            const active = activeComponent === f.type;
            return (
              <button
                key={f.type}
                type="button"
                onClick={() => setComponentFilter(active ? null : f.type)}
                title={active ? `Clear ${componentLabel(f.type)} filter` : `Modules that declare ${componentLabel(f.type)}`}
                className={`flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs transition-colors ${
                  active ? "bg-foreground text-background" : "hover:bg-muted"
                }`}
              >
                {componentLabel(f.type)}
                {active ? <X className="h-3 w-3 opacity-80" /> : <span className="opacity-60">{f.count}</span>}
              </button>
            );
          })}
        </div>
      )}

      {/* Body: grouped browse, or flat paginated when focused */}
      {focused ? (
        <div className="space-y-3">
          {filtered.length === 0 ? (
            <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              No modules match{query.trim() ? ` “${query.trim()}”` : ""}.
            </p>
          ) : (
            <>
              <div className="grid gap-1.5 sm:grid-cols-2">
                {pageItems.map((m) => (
                  <ModuleCard key={m.moduleName} spaceSlug={spaceSlug} m={m} labelMeta={labelMeta} />
                ))}
              </div>
              {totalPages > 1 && (
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>
                    Showing {pageClamped * PAGE_SIZE + 1}–{Math.min((pageClamped + 1) * PAGE_SIZE, filtered.length)} of{" "}
                    {filtered.length}
                  </span>
                  <div className="flex gap-1">
                    <Button variant="outline" size="sm" disabled={pageClamped === 0} onClick={() => setPage(pageClamped - 1)}>
                      <ChevronLeft className="h-4 w-4" /> Prev
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pageClamped >= totalPages - 1}
                      onClick={() => setPage(pageClamped + 1)}
                    >
                      Next <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        groups.map((group) => {
          const isOpen = expanded.has(group.key);
          const shown = isOpen ? group.items : group.items.slice(0, GROUP_CAP);
          return (
            <div
              key={group.key}
              className="space-y-2 rounded-lg border border-l-4 p-3"
              style={group.color ? { borderLeftColor: group.color } : undefined}
            >
              <div className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: group.color ?? "var(--muted-foreground)" }}
                />
                <p className="text-sm font-semibold">{group.label}</p>
                <span className="text-xs text-muted-foreground">{group.items.length}</span>
              </div>
              <div className="grid gap-1.5 sm:grid-cols-2">
                {shown.map((m) => (
                  <ModuleCard key={m.moduleName} spaceSlug={spaceSlug} m={m} />
                ))}
              </div>
              {group.items.length > GROUP_CAP && (
                <button
                  type="button"
                  onClick={() =>
                    setExpanded((prev) => {
                      const next = new Set(prev);
                      if (next.has(group.key)) next.delete(group.key);
                      else next.add(group.key);
                      return next;
                    })
                  }
                  className="text-xs font-medium text-muted-foreground hover:text-foreground"
                >
                  {isOpen ? "Show less" : `Show all ${group.items.length} →`}
                </button>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}

function ModuleCard({
  spaceSlug,
  m,
  labelMeta,
}: {
  spaceSlug: string;
  m: FlatModule | ModuleItem;
  labelMeta?: Map<string, { name: string; color: string | null }>;
}) {
  const labelKeys = "labelKeys" in m ? m.labelKeys : [];
  return (
    <Link
      href={`/spaces/${spaceSlug}/modules/${encodeURIComponent(m.moduleName)}`}
      className="flex items-center gap-2 rounded-md border p-2.5 text-sm transition-colors hover:bg-muted/50"
    >
      <Package className="h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <span className="block truncate font-medium">{m.title}</span>
        <span className="block truncate font-mono text-xs text-muted-foreground">{m.moduleName}</span>
      </div>
      {labelMeta && labelKeys.length > 0 && (
        <div className="flex shrink-0 gap-1">
          {labelKeys.map((k) => (
            <span
              key={k}
              className="h-2 w-2 rounded-full"
              title={labelMeta.get(k)?.name}
              style={{ backgroundColor: labelMeta.get(k)?.color ?? "var(--muted-foreground)" }}
            />
          ))}
        </div>
      )}
    </Link>
  );
}
