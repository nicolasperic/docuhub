"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Check, Plus, Tag } from "lucide-react";
import { toast } from "sonner";

export interface ModuleLabel {
  id: string;
  name: string;
  color: string | null;
}

const PALETTE = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899"];

export function ModuleLabelsEditor({
  moduleName,
  labels,
  onChange,
  spaceSlug,
}: {
  moduleName: string;
  labels: ModuleLabel[];
  onChange: (labels: ModuleLabel[]) => void;
  spaceSlug?: string;
}) {
  const [all, setAll] = useState<ModuleLabel[]>([]);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(PALETTE[5]);

  useEffect(() => {
    if (open && all.length === 0) {
      fetch("/api/module-labels").then((r) => (r.ok ? r.json().then(setAll) : null));
    }
  }, [open, all.length]);

  const assignedIds = new Set(labels.map((l) => l.id));

  async function save(labelIds: string[]) {
    setSaving(true);
    const res = await fetch(`/api/docs/${encodeURIComponent(moduleName)}/labels`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ labelIds }),
    });
    setSaving(false);
    if (res.ok) {
      const data = await res.json();
      onChange(data.labels);
    } else {
      toast.error("Failed to update labels");
    }
  }

  function toggle(label: ModuleLabel) {
    const next = assignedIds.has(label.id)
      ? labels.filter((l) => l.id !== label.id).map((l) => l.id)
      : [...labels.map((l) => l.id), label.id];
    save(next);
  }

  async function createLabel() {
    const name = newName.trim();
    if (!name) return;
    setSaving(true);
    const res = await fetch("/api/module-labels", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, color: newColor }),
    });
    setSaving(false);
    if (res.ok) {
      const label: ModuleLabel = await res.json();
      setAll((prev) => [...prev, label].sort((a, b) => a.name.localeCompare(b.name)));
      setNewName("");
      save([...labels.map((l) => l.id), label.id]); // auto-assign the new label
    } else if (res.status === 409) {
      toast.error("A label with that name already exists");
    } else {
      toast.error("Failed to create label");
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {labels.map((l) => {
        const badge = (
          <Badge
            variant="outline"
            className={spaceSlug ? "cursor-pointer transition-opacity hover:opacity-70" : undefined}
            style={l.color ? { borderColor: l.color, color: l.color } : undefined}
          >
            {l.name}
          </Badge>
        );
        return spaceSlug ? (
          <Link key={l.id} href={`/spaces/${spaceSlug}/modules?label=${l.id}`} title={`View ${l.name} modules`}>
            {badge}
          </Link>
        ) : (
          <span key={l.id}>{badge}</span>
        );
      })}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-6 gap-1 px-2 text-xs text-muted-foreground">
            <Tag className="h-3.5 w-3.5" />
            {labels.length ? "Edit labels" : "Add labels"}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-64 p-2">
          <div className="max-h-56 space-y-0.5 overflow-y-auto">
            {all.map((label) => {
              const checked = assignedIds.has(label.id);
              return (
                <button
                  key={label.id}
                  type="button"
                  disabled={saving}
                  onClick={() => toggle(label)}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted disabled:opacity-50"
                >
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: label.color ?? "var(--muted-foreground)" }}
                  />
                  <span className="flex-1 text-left">{label.name}</span>
                  {checked && <Check className="h-3.5 w-3.5" />}
                </button>
              );
            })}
            {all.length === 0 && <p className="px-2 py-1.5 text-xs text-muted-foreground">No labels yet.</p>}
          </div>

          <div className="mt-2 border-t pt-2">
            <div className="flex items-center gap-1.5">
              <div className="flex gap-1">
                {PALETTE.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setNewColor(c)}
                    className={`h-4 w-4 rounded-full ${newColor === c ? "ring-2 ring-offset-1" : ""}`}
                    style={{ backgroundColor: c }}
                    aria-label={`color ${c}`}
                  />
                ))}
              </div>
            </div>
            <div className="mt-1.5 flex gap-1.5">
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && createLabel()}
                placeholder="New label…"
                className="h-8 text-sm"
              />
              <Button size="sm" className="h-8 px-2" onClick={createLabel} disabled={saving || !newName.trim()}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
