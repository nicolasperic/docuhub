"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useParams, usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronRight, ChevronDown, Circle, FileText, Search, Loader2, Plus, Package } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type TreeNode = {
  id: string;
  title: string;
  slug: string;
  status: string;
  children?: TreeNode[];
};

type TreeData = {
  spaceName: string;
  spaceSlug: string;
  documents: TreeNode[];
};

function findAncestorIds(nodes: TreeNode[], targetSlug: string): string[] | null {
  for (const node of nodes) {
    if (node.slug === targetSlug) return [node.id];
    if (node.children?.length) {
      const path = findAncestorIds(node.children, targetSlug);
      if (path) return [node.id, ...path];
    }
  }
  return null;
}

function filterTree(nodes: TreeNode[], query: string): TreeNode[] {
  const lower = query.toLowerCase();
  const results: TreeNode[] = [];

  for (const node of nodes) {
    const childMatches = node.children?.length
      ? filterTree(node.children, query)
      : [];
    const selfMatches = node.title.toLowerCase().includes(lower);

    if (selfMatches || childMatches.length > 0) {
      results.push({
        ...node,
        children: selfMatches ? node.children : childMatches,
      });
    }
  }

  return results;
}

function collectIds(nodes: TreeNode[]): string[] {
  const ids: string[] = [];
  for (const node of nodes) {
    ids.push(node.id);
    if (node.children?.length) ids.push(...collectIds(node.children));
  }
  return ids;
}

function TreeNodeItem({
  node,
  spaceSlug,
  currentDocSlug,
  expanded,
  onToggle,
  onCreateChild,
  depth,
}: {
  node: TreeNode;
  spaceSlug: string;
  currentDocSlug: string | undefined;
  expanded: Set<string>;
  onToggle: (id: string) => void;
  onCreateChild: (nodeId: string, nodeTitle: string) => void;
  depth: number;
}) {
  const hasChildren = node.children && node.children.length > 0;
  const isExpanded = expanded.has(node.id);
  const isActive = node.slug === currentDocSlug;

  return (
    <div>
      <div
        className={cn(
          "group flex items-center gap-1 overflow-hidden rounded-md px-1 py-1 text-sm transition-colors",
          isActive
            ? "bg-accent text-accent-foreground font-medium"
            : "text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground"
        )}
        style={{ paddingLeft: `${depth * 12 + 4}px` }}
      >
        {hasChildren ? (
          <button
            onClick={() => onToggle(node.id)}
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded hover:bg-accent"
          >
            {isExpanded ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
          </button>
        ) : (
          <span className="flex w-5 shrink-0 items-center justify-center">
            <Circle className="h-1.5 w-1.5 fill-muted-foreground text-muted-foreground" />
          </span>
        )}
        <Link
          href={`/spaces/${spaceSlug}/${node.slug}`}
          className="flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden"
          title={node.title}
        >
          {hasChildren ? (
            <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          ) : (
            null
          )}
          <span className="truncate">{node.title}</span>
        </Link>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onCreateChild(node.id, node.title);
          }}
          className="hidden h-5 w-5 shrink-0 items-center justify-center rounded hover:bg-accent group-hover:flex"
          title="Create sub-page"
        >
          <Plus className="h-3 w-3" />
        </button>
      </div>
      {hasChildren && isExpanded && (
        <div>
          {node.children!.map((child) => (
            <TreeNodeItem
              key={child.id}
              node={child}
              spaceSlug={spaceSlug}
              currentDocSlug={currentDocSlug}
              expanded={expanded}
              onToggle={onToggle}
              onCreateChild={onCreateChild}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function SpaceDocTree() {
  const params = useParams();
  const pathname = usePathname();
  const router = useRouter();
  const [treeData, setTreeData] = useState<TreeData | null>(null);
  const [moduleCount, setModuleCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const spaceSlug = (params?.slug as string) || pathname.split("/")[2];
  const docSlug = params?.docSlug as string | undefined;

  useEffect(() => {
    if (!spaceSlug) return;

    setLoading(true);
    fetch(`/api/spaces/${spaceSlug}/tree`)
      .then((r) => {
        if (!r.ok) throw new Error("Failed to fetch");
        return r.json();
      })
      .then((data: TreeData) => {
        setTreeData(data);
        if (docSlug) {
          const ancestorPath = findAncestorIds(data.documents, docSlug);
          if (ancestorPath) setExpanded(new Set(ancestorPath));
        }
      })
      .catch(() => setTreeData(null))
      .finally(() => setLoading(false));
  }, [spaceSlug, docSlug]);

  useEffect(() => {
    if (!spaceSlug) return;
    fetch(`/api/docs/tree?space=${encodeURIComponent(spaceSlug)}`)
      .then((r) => (r.ok ? r.json() : { groups: [] }))
      .then((data: { groups?: { items: { moduleName: string }[] }[] }) => {
        const names = new Set(
          (data.groups ?? []).flatMap((g) => g.items.map((m) => m.moduleName))
        );
        setModuleCount(names.size);
      })
      .catch(() => setModuleCount(0));
  }, [spaceSlug]);

  const onToggle = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const onCreateChild = useCallback((nodeId: string, nodeTitle: string) => {
    router.push(`/spaces/${spaceSlug}/new?parentId=${nodeId}&parentTitle=${encodeURIComponent(nodeTitle)}`);
  }, [router, spaceSlug]);

  const displayedTree = useMemo(() => {
    if (!treeData) return [];
    if (!search.trim()) return treeData.documents;
    return filterTree(treeData.documents, search.trim());
  }, [treeData, search]);

  useEffect(() => {
    if (search.trim() && treeData) {
      const filtered = filterTree(treeData.documents, search.trim());
      setExpanded(new Set(collectIds(filtered)));
    } else if (treeData && docSlug) {
      const ancestorPath = findAncestorIds(treeData.documents, docSlug);
      if (ancestorPath) setExpanded(new Set(ancestorPath));
    }
  }, [search, treeData, docSlug]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!treeData) return null;

  return (
    <div className="flex min-w-0 flex-col gap-2 overflow-hidden">
      <div className="px-1">
        <p className="mb-2 truncate px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {treeData.spaceName}
        </p>

        <nav className="mb-2 space-y-0.5">
          <Link
            href={`/spaces/${treeData.spaceSlug}/documents`}
            className={cn(
              "flex items-center gap-2 rounded-md px-2 py-1 text-sm transition-colors",
              pathname === `/spaces/${treeData.spaceSlug}/documents`
                ? "bg-accent text-accent-foreground font-medium"
                : "text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground"
            )}
          >
            <FileText className="h-3.5 w-3.5 shrink-0" />
            Documents
          </Link>
          {moduleCount > 0 && (
            <Link
              href={`/spaces/${treeData.spaceSlug}/modules`}
              className={cn(
                "flex items-center gap-2 rounded-md px-2 py-1 text-sm transition-colors",
                pathname.startsWith(`/spaces/${treeData.spaceSlug}/modules`)
                  ? "bg-accent text-accent-foreground font-medium"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground"
              )}
            >
              <Package className="h-3.5 w-3.5 shrink-0" />
              Modules
              <span className="ml-auto text-xs text-muted-foreground">{moduleCount}</span>
            </Link>
          )}
        </nav>

        <div className="relative">
          <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search pages..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-7 pl-7 text-xs"
          />
        </div>
      </div>
      <div className="max-h-[calc(100vh-20rem)] overflow-y-auto overflow-x-hidden">
        <div className="px-1">
          {displayedTree.length === 0 ? (
            <p className="px-2 py-2 text-xs text-muted-foreground">
              No pages found
            </p>
          ) : (
            displayedTree.map((node) => (
              <TreeNodeItem
                key={node.id}
                node={node}
                spaceSlug={treeData.spaceSlug}
                currentDocSlug={docSlug}
                expanded={expanded}
                onToggle={onToggle}
                onCreateChild={onCreateChild}
                depth={0}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
