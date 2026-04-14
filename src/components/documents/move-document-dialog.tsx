"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ChevronRight,
  ChevronDown,
  FileText,
  FolderOpen,
  Check,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

type TreeNode = {
  id: string;
  title: string;
  slug: string;
  status: string;
  children?: TreeNode[];
};

type Space = {
  id: string;
  name: string;
  slug: string;
};

function collectDescendantIds(nodes: TreeNode[], targetId: string): Set<string> {
  const ids = new Set<string>();

  function findAndCollect(nodes: TreeNode[]): boolean {
    for (const node of nodes) {
      if (node.id === targetId) {
        collectAll(node.children || []);
        return true;
      }
      if (node.children?.length && findAndCollect(node.children)) return true;
    }
    return false;
  }

  function collectAll(nodes: TreeNode[]) {
    for (const node of nodes) {
      ids.add(node.id);
      if (node.children?.length) collectAll(node.children);
    }
  }

  findAndCollect(nodes);
  return ids;
}

function MoveTreeNode({
  node,
  selectedId,
  disabledIds,
  documentId,
  onSelect,
  expanded,
  onToggle,
  depth,
}: {
  node: TreeNode;
  selectedId: string | null;
  disabledIds: Set<string>;
  documentId: string;
  onSelect: (id: string) => void;
  expanded: Set<string>;
  onToggle: (id: string) => void;
  depth: number;
}) {
  const hasChildren = node.children && node.children.length > 0;
  const isExpanded = expanded.has(node.id);
  const isDisabled = node.id === documentId || disabledIds.has(node.id);
  const isSelected = selectedId === node.id;

  return (
    <div>
      <button
        type="button"
        disabled={isDisabled}
        onClick={() => onSelect(node.id)}
        className={cn(
          "flex w-full items-center gap-1 rounded-md px-1 py-1.5 text-sm transition-colors text-left",
          isDisabled && "opacity-40 cursor-not-allowed",
          !isDisabled && "hover:bg-accent/50 cursor-pointer",
          isSelected && "bg-accent text-accent-foreground font-medium"
        )}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        {hasChildren ? (
          <span
            onClick={(e) => {
              e.stopPropagation();
              onToggle(node.id);
            }}
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded hover:bg-accent"
          >
            {isExpanded ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
          </span>
        ) : (
          <span className="w-5 shrink-0" />
        )}
        <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <span className="truncate flex-1">{node.title}</span>
        {isSelected && <Check className="h-3.5 w-3.5 shrink-0 text-primary" />}
      </button>
      {hasChildren && isExpanded && (
        <div>
          {node.children!.map((child) => (
            <MoveTreeNode
              key={child.id}
              node={child}
              selectedId={selectedId}
              disabledIds={disabledIds}
              documentId={documentId}
              onSelect={onSelect}
              expanded={expanded}
              onToggle={onToggle}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function MoveDocumentDialog({
  open,
  onOpenChange,
  documentId,
  currentSpaceSlug,
  currentSpaceId,
  currentParentId,
  onMoved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentId: string;
  currentSpaceSlug: string;
  currentSpaceId: string;
  currentParentId: string | null;
  onMoved: (newSpaceSlug: string, newDocSlug: string) => void;
}) {
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [selectedSpaceSlug, setSelectedSpaceSlug] = useState(currentSpaceSlug);
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [loadingTree, setLoadingTree] = useState(false);
  const [selectedParentId, setSelectedParentId] = useState<string | null>(currentParentId);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [moving, setMoving] = useState(false);
  const [disabledIds, setDisabledIds] = useState<Set<string>>(new Set());

  // Load spaces on open
  useEffect(() => {
    if (!open) return;
    fetch("/api/spaces")
      .then((r) => r.json())
      .then((data) => setSpaces(data));
  }, [open]);

  // Reset state on open
  useEffect(() => {
    if (open) {
      setSelectedSpaceSlug(currentSpaceSlug);
      setSelectedParentId(currentParentId);
    }
  }, [open, currentSpaceSlug, currentParentId]);

  // Load tree when space changes
  useEffect(() => {
    if (!open || !selectedSpaceSlug) return;
    setLoadingTree(true);
    fetch(`/api/spaces/${selectedSpaceSlug}/tree`)
      .then((r) => r.json())
      .then((data) => {
        const docs = data.documents || [];
        setTree(docs);
        // Expand all by default for visibility
        const allIds = new Set<string>();
        function collect(nodes: TreeNode[]) {
          for (const n of nodes) {
            allIds.add(n.id);
            if (n.children?.length) collect(n.children);
          }
        }
        collect(docs);
        setExpanded(allIds);
        // Calculate disabled nodes (the doc itself + its descendants)
        setDisabledIds(collectDescendantIds(docs, documentId));
      })
      .finally(() => setLoadingTree(false));
  }, [open, selectedSpaceSlug, documentId]);

  const onToggle = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectedSpace = spaces.find((s) => s.slug === selectedSpaceSlug);
  const isRootSelected = selectedParentId === null;

  const hasChanges =
    selectedSpaceSlug !== currentSpaceSlug ||
    selectedParentId !== currentParentId;

  async function handleMove() {
    setMoving(true);
    try {
      const body: Record<string, unknown> = { parentId: selectedParentId };
      if (selectedSpace && selectedSpace.id !== currentSpaceId) {
        body.spaceId = selectedSpace.id;
      }
      const res = await fetch(`/api/documents/${documentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const doc = await res.json();
        onMoved(doc.space?.slug || selectedSpaceSlug, doc.slug);
        onOpenChange(false);
      }
    } finally {
      setMoving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Move document</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Space</label>
            <Select value={selectedSpaceSlug} onValueChange={(v) => {
              setSelectedSpaceSlug(v);
              setSelectedParentId(null);
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Select a space" />
              </SelectTrigger>
              <SelectContent>
                {spaces.map((s) => (
                  <SelectItem key={s.id} value={s.slug}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Location</label>
            {loadingTree ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <ScrollArea className="max-h-64 rounded-md border">
                <div className="p-1">
                  {/* Root level option */}
                  <button
                    type="button"
                    onClick={() => setSelectedParentId(null)}
                    className={cn(
                      "flex w-full items-center gap-1 rounded-md px-2 py-1.5 text-sm transition-colors text-left",
                      "hover:bg-accent/50 cursor-pointer",
                      isRootSelected && "bg-accent text-accent-foreground font-medium"
                    )}
                  >
                    <FolderOpen className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span className="flex-1">Root level</span>
                    {isRootSelected && <Check className="h-3.5 w-3.5 shrink-0 text-primary" />}
                  </button>

                  {tree.map((node) => (
                    <MoveTreeNode
                      key={node.id}
                      node={node}
                      selectedId={selectedParentId}
                      disabledIds={disabledIds}
                      documentId={documentId}
                      onSelect={(id) => setSelectedParentId(id)}
                      expanded={expanded}
                      onToggle={onToggle}
                      depth={0}
                    />
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleMove} disabled={!hasChanges || moving}>
            {moving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Moving...
              </>
            ) : (
              "Move"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
