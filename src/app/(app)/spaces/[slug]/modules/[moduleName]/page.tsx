"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { marked } from "marked";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Pencil, Package, Cable, Plug, Radio, ArrowDownToLine, ArrowUpFromLine, Boxes } from "lucide-react";
import { toast } from "sonner";
import { ModuleLabelsEditor, type ModuleLabel } from "@/components/modules/module-labels-editor";
import { componentLabel, componentOrderIndex } from "@/lib/module-components";

interface ModuleComponent {
  type: string;
  name: string;
  target: string | null;
  meta: Record<string, unknown> | null;
}

interface PageModel {
  moduleName: string;
  dirName: string | null;
  title: string;
  kind: string;
  vendor: string | null;
  generated: { markdown: string; hash: string | null; generatedAt: string };
  manual: { markdown: string | null; version: number; humanUpdatedAt: string | null; updatedBy: string | null };
  labels: ModuleLabel[];
  components: ModuleComponent[];
}

interface GraphModel {
  plugsInto: { target: string; via: string }[];
  observedEvents: string[];
  dependsOn: string[];
  dependedOnBy: { moduleName: string; dirName: string | null; title: string }[];
}

function md(source: string | null | undefined): string {
  if (!source) return "";
  return marked.parse(source, { async: false }) as string;
}

export default function ModuleViewPage() {
  const params = useParams<{ slug: string; moduleName: string }>();
  const moduleName = decodeURIComponent(params.moduleName);

  const [page, setPage] = useState<PageModel | null>(null);
  const [graph, setGraph] = useState<GraphModel | null>(null);
  const [spaceName, setSpaceName] = useState(params.slug);
  const [notFound, setNotFound] = useState(false);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  const loadPage = useCallback(() => {
    fetch(`/api/docs/${encodeURIComponent(moduleName)}`).then((r) => {
      if (!r.ok) {
        setNotFound(true);
        return null;
      }
      return r.json().then(setPage);
    });
  }, [moduleName]);

  useEffect(() => {
    loadPage();
    fetch(`/api/graph/${encodeURIComponent(moduleName)}`).then((r) => (r.ok ? r.json().then(setGraph) : null));
    fetch(`/api/spaces/${params.slug}`).then((r) => (r.ok ? r.json().then((s) => setSpaceName(s.name)) : null));
  }, [moduleName, params.slug, loadPage]);

  function startEdit() {
    setDraft(page?.manual.markdown ?? "");
    setEditing(true);
  }

  async function saveNotes() {
    if (!page) return;
    setSaving(true);
    const res = await fetch(`/api/docs/${encodeURIComponent(moduleName)}/manual`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markdown: draft, baseVersion: page.manual.version }),
    });
    setSaving(false);
    if (res.ok) {
      const data = await res.json();
      setPage({ ...page, manual: { ...page.manual, markdown: draft, version: data.version } });
      setEditing(false);
      toast.success("Team Notes saved");
    } else if (res.status === 409) {
      const conflict = await res.json();
      toast.error("Someone else edited this — reloaded the latest version.");
      setPage({ ...page, manual: { ...page.manual, markdown: conflict.currentMarkdown, version: conflict.currentVersion } });
      setDraft(conflict.currentMarkdown ?? "");
    } else {
      toast.error("Failed to save Team Notes");
    }
  }

  if (notFound) return <div className="p-4 text-muted-foreground">Module not found.</div>;
  if (!page) return <div className="p-4">Loading...</div>;

  const hasWiring =
    graph &&
    (graph.plugsInto.length || graph.observedEvents.length || graph.dependsOn.length || graph.dependedOnBy.length);

  return (
    <div className="space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/spaces">Spaces</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href={`/spaces/${params.slug}`}>{spaceName}</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{page.title}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div>
        <div className="flex items-center gap-2">
          <Package className="h-6 w-6 text-muted-foreground" />
          <h1 className="text-2xl font-bold">{page.title}</h1>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <Badge variant="secondary">{page.kind}</Badge>
          {page.vendor && <Badge variant="outline">{page.vendor}</Badge>}
          <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{page.moduleName}</code>
          <span>&middot;</span>
          <span>Generated {new Date(page.generated.generatedAt).toLocaleString()}</span>
          {page.generated.hash && <span className="font-mono text-xs">#{page.generated.hash}</span>}
        </div>
        <div className="mt-3">
          <ModuleLabelsEditor
            moduleName={page.moduleName}
            labels={page.labels}
            spaceSlug={params.slug}
            onChange={(labels) => setPage((prev) => (prev ? { ...prev, labels } : prev))}
          />
        </div>
      </div>

      {/* What's inside — declared components grouped by type */}
      {page.components.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">What&apos;s inside</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {groupComponents(page.components).map(([type, items]) => (
              <Card key={type}>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Boxes className="h-4 w-4" />
                    {componentLabel(type)}
                    <Badge variant="secondary" className="ml-auto text-xs">{items.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1.5">
                    {items.map((c, i) => (
                      <li key={i} className="min-w-0">
                        <code className="block truncate text-xs" title={c.name}>{c.name}</code>
                        {c.target && (
                          <span className="block truncate text-xs text-muted-foreground" title={c.target}>
                            {c.target}
                          </span>
                        )}
                        {c.meta?.schedule ? (
                          <span className="block font-mono text-[11px] text-muted-foreground">{String(c.meta.schedule)}</span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Generated reference */}
      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Generated Reference
        </h2>
        <div
          className="prose prose-sm dark:prose-invert max-w-none rounded-lg border p-4"
          dangerouslySetInnerHTML={{ __html: md(page.generated.markdown) }}
        />
      </section>

      {/* Human Team Notes */}
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Team Notes
            {page.manual.updatedBy && (
              <span className="ml-2 font-normal normal-case">
                — last edited by {page.manual.updatedBy} (v{page.manual.version})
              </span>
            )}
          </h2>
          {!editing && (
            <Button variant="outline" size="sm" onClick={startEdit}>
              <Pencil className="mr-2 h-3.5 w-3.5" /> Edit
            </Button>
          )}
        </div>
        {editing ? (
          <div className="space-y-2">
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={10}
              placeholder="## Team Notes&#10;- runbooks, gotchas, Slack lore… (markdown)"
              className="font-mono text-sm"
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={saveNotes} disabled={saving}>
                {saving ? "Saving…" : "Save"}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setEditing(false)} disabled={saving}>
                Cancel
              </Button>
            </div>
          </div>
        ) : page.manual.markdown ? (
          <div
            className="prose prose-sm dark:prose-invert max-w-none rounded-lg border p-4"
            dangerouslySetInnerHTML={{ __html: md(page.manual.markdown) }}
          />
        ) : (
          <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            No team notes yet. Click Edit to add runbooks, gotchas, or KT notes.
          </div>
        )}
      </section>

      {/* Wiring graph */}
      {hasWiring ? (
        <section>
          <div className="mb-2 flex items-center gap-2">
            <Cable className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Wiring</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {graph!.plugsInto.length > 0 && (
              <WiringCard icon={<Plug className="h-4 w-4" />} title="Plugs into">
                {graph!.plugsInto.map((p, i) => (
                  <li key={i}>
                    <code className="text-xs">{p.target}</code>
                    {p.via && <span className="text-muted-foreground"> via {p.via}</span>}
                  </li>
                ))}
              </WiringCard>
            )}
            {graph!.observedEvents.length > 0 && (
              <WiringCard icon={<Radio className="h-4 w-4" />} title="Observes events">
                {graph!.observedEvents.map((e) => (
                  <li key={e}><code className="text-xs">{e}</code></li>
                ))}
              </WiringCard>
            )}
            {graph!.dependsOn.length > 0 && (
              <WiringCard icon={<ArrowUpFromLine className="h-4 w-4" />} title="Depends on">
                {graph!.dependsOn.map((d) => (
                  <li key={d}><code className="text-xs">{d}</code></li>
                ))}
              </WiringCard>
            )}
            {graph!.dependedOnBy.length > 0 && (
              <WiringCard icon={<ArrowDownToLine className="h-4 w-4" />} title="Depended on by">
                {graph!.dependedOnBy.map((d) => (
                  <li key={d.moduleName}>
                    <a href={`/spaces/${params.slug}/modules/${encodeURIComponent(d.moduleName)}`} className="hover:underline">
                      {d.title}
                    </a>
                  </li>
                ))}
              </WiringCard>
            )}
          </div>
        </section>
      ) : null}

      <Separator />
      <p className="text-xs text-muted-foreground">
        Generated content is refreshed by the doc generator; Team Notes are yours to edit.
      </p>
    </div>
  );
}

function groupComponents(components: ModuleComponent[]): [string, ModuleComponent[]][] {
  const map = new Map<string, ModuleComponent[]>();
  for (const c of components) {
    if (!map.has(c.type)) map.set(c.type, []);
    map.get(c.type)!.push(c);
  }
  return [...map.entries()].sort((a, b) => componentOrderIndex(a[0]) - componentOrderIndex(b[0]));
}

function WiringCard({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-1">{children}</ul>
      </CardContent>
    </Card>
  );
}
