"use client";

import { useState } from "react";
import { marked } from "marked";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Pencil, LayoutTemplate } from "lucide-react";
import { toast } from "sonner";

function md(source: string | null | undefined): string {
  if (!source) return "";
  return marked.parse(source, { async: false }) as string;
}

export function SpaceOverview({
  spaceSlug,
  overview,
  onChange,
}: {
  spaceSlug: string;
  overview: string | null;
  onChange: (overview: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(overview ?? "");
  const [saving, setSaving] = useState(false);

  function startEdit() {
    setDraft(overview ?? "");
    setEditing(true);
  }

  async function save() {
    setSaving(true);
    const res = await fetch(`/api/spaces/${spaceSlug}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ overview: draft }),
    });
    setSaving(false);
    if (res.ok) {
      onChange(draft);
      setEditing(false);
      toast.success("Overview saved");
    } else {
      toast.error("Failed to save overview");
    }
  }

  if (editing) {
    return (
      <div className="space-y-2">
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={14}
          placeholder={"## Magento\n- [Sales](/spaces/…/…)\n- [Refunds](/spaces/…/…)\n\n## SMS\n- …\n\n(markdown — headings, lists, links, tables)"}
          className="font-mono text-sm"
        />
        <div className="flex gap-2">
          <Button size="sm" onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setEditing(false)} disabled={saving}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  if (!overview || !overview.trim()) {
    return (
      <button
        type="button"
        onClick={startEdit}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed p-6 text-sm text-muted-foreground transition-colors hover:bg-muted/50"
      >
        <LayoutTemplate className="h-4 w-4" />
        Add a landing overview — curate the key docs, sections, and links for this space
      </button>
    );
  }

  return (
    <div className="group relative rounded-lg border p-5">
      <Button
        variant="ghost"
        size="icon"
        onClick={startEdit}
        className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100"
        title="Edit overview"
      >
        <Pencil className="h-4 w-4" />
      </Button>
      <div
        className="prose prose-sm dark:prose-invert max-w-none"
        dangerouslySetInnerHTML={{ __html: md(overview) }}
      />
    </div>
  );
}
