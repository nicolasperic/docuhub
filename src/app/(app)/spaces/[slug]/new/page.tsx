"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { DocumentEditor } from "@/components/documents/document-editor";
import { toast } from "sonner";

interface Team { id: string; name: string }
interface Role { id: string; name: string }
interface Tag { id: string; name: string; color: string | null }

export default function NewDocumentPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const parentId = searchParams.get("parentId");
  const parentTitle = searchParams.get("parentTitle");

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [status, setStatus] = useState("DRAFT");
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [spaceId, setSpaceId] = useState("");
  const [saving, setSaving] = useState(false);

  const [teams, setTeams] = useState<Team[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);

  useEffect(() => {
    // Load space to get its ID
    fetch(`/api/spaces/${params.slug}`)
      .then((r) => r.json())
      .then((s) => setSpaceId(s.id));

    Promise.all([
      fetch("/api/teams").then((r) => r.json()),
      fetch("/api/roles").then((r) => r.json()),
      fetch("/api/tags").then((r) => r.json()),
    ]).then(([t, r, tg]) => {
      setTeams(t);
      setRoles(r);
      setTags(tg);
    });
  }, [params.slug]);

  function toggle(arr: string[], id: string) {
    return arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id];
  }

  async function onSave() {
    if (!title || !spaceId) {
      toast.error("Title is required");
      return;
    }

    setSaving(true);
    const res = await fetch("/api/documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        content: content || null,
        spaceId,
        status,
        excerpt: excerpt || null,
        parentId: parentId || undefined,
        teamIds: selectedTeams,
        roleIds: selectedRoles,
        tagIds: selectedTags,
      }),
    });

    if (res.ok) {
      const doc = await res.json();
      toast.success("Document created");
      router.push(`/spaces/${params.slug}/${doc.slug}`);
    } else {
      toast.error("Failed to create document");
    }
    setSaving(false);
  }

  return (
    <div className="space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/spaces">Spaces</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href={`/spaces/${params.slug}`}>{params.slug}</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>New Document</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">New Document</h1>
        <div className="flex gap-2">
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="DRAFT">Draft</SelectItem>
              <SelectItem value="PUBLISHED">Published</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={onSave} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {parentTitle && (
          <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
            Creating sub-page of <span className="font-semibold text-foreground">{parentTitle}</span>
          </div>
        )}
        <Input
          placeholder="Document title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="text-lg font-semibold"
        />
        <Input
          placeholder="Short excerpt (optional)"
          value={excerpt}
          onChange={(e) => setExcerpt(e.target.value)}
        />

        <DocumentEditor onChange={setContent} />

        <div className="rounded-md border p-4 space-y-4">
          <h3 className="font-medium">Document Targeting</h3>
          <p className="text-sm text-muted-foreground">
            Select which teams, roles, and tags this document is relevant to.
          </p>

          {teams.length > 0 && (
            <div className="space-y-2">
              <Label>Teams</Label>
              <div className="flex flex-wrap gap-2">
                {teams.map((t) => (
                  <Badge
                    key={t.id}
                    variant={selectedTeams.includes(t.id) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => setSelectedTeams(toggle(selectedTeams, t.id))}
                  >
                    {t.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {roles.length > 0 && (
            <div className="space-y-2">
              <Label>Roles</Label>
              <div className="flex flex-wrap gap-2">
                {roles.map((r) => (
                  <Badge
                    key={r.id}
                    variant={selectedRoles.includes(r.id) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => setSelectedRoles(toggle(selectedRoles, r.id))}
                  >
                    {r.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {tags.length > 0 && (
            <div className="space-y-2">
              <Label>Tags</Label>
              <div className="flex flex-wrap gap-2">
                {tags.map((t) => (
                  <Badge
                    key={t.id}
                    variant={selectedTags.includes(t.id) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => setSelectedTags(toggle(selectedTags, t.id))}
                    style={t.color ? { borderColor: t.color } : undefined}
                  >
                    {t.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
