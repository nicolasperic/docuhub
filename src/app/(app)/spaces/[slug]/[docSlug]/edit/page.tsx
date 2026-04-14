"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
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

export default function EditDocumentPage() {
  const params = useParams<{ slug: string; docSlug: string }>();
  const router = useRouter();

  const [docId, setDocId] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [status, setStatus] = useState("DRAFT");
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const [teams, setTeams] = useState<Team[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);

  useEffect(() => {
    // Look up document by space slug + doc slug, then fetch full detail
    fetch(`/api/documents?spaceSlug=${encodeURIComponent(params.slug)}&slug=${encodeURIComponent(params.docSlug)}`)
      .then((r) => {
        if (!r.ok) return null;
        return r.json();
      })
      .then((lookup) => {
        if (!lookup) return;
        return fetch(`/api/documents/${lookup.id}`)
          .then((r) => r.json())
          .then((d) => {
            setDocId(d.id);
            setTitle(d.title);
            setContent(d.content || "");
            setExcerpt(d.excerpt || "");
            setStatus(d.status);
            setSelectedTeams(d.documentTeams?.map((dt: { team: { id: string } }) => dt.team.id) || []);
            setSelectedRoles(d.documentRoles?.map((dr: { role: { id: string } }) => dr.role.id) || []);
            setSelectedTags(d.documentTags?.map((dt: { tag: { id: string } }) => dt.tag.id) || []);
            setLoaded(true);
          });
      });

    Promise.all([
      fetch("/api/teams").then((r) => r.json()),
      fetch("/api/roles").then((r) => r.json()),
      fetch("/api/tags").then((r) => r.json()),
    ]).then(([t, r, tg]) => {
      setTeams(t);
      setRoles(r);
      setTags(tg);
    });
  }, [params.slug, params.docSlug]);

  function toggle(arr: string[], id: string) {
    return arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id];
  }

  async function onSave() {
    if (!title) {
      toast.error("Title is required");
      return;
    }

    setSaving(true);
    const res = await fetch(`/api/documents/${docId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        content: content || null,
        excerpt: excerpt || null,
        status,
        teamIds: selectedTeams,
        roleIds: selectedRoles,
        tagIds: selectedTags,
      }),
    });

    if (res.ok) {
      toast.success("Document saved");
      router.push(`/spaces/${params.slug}/${params.docSlug}`);
    } else {
      toast.error("Failed to save document");
    }
    setSaving(false);
  }

  if (!loaded) return <div className="p-4">Loading...</div>;

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
            <BreadcrumbLink href={`/spaces/${params.slug}/${params.docSlug}`}>
              {title}
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Edit</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Edit Document</h1>
        <div className="flex gap-2">
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="DRAFT">Draft</SelectItem>
              <SelectItem value="PUBLISHED">Published</SelectItem>
              <SelectItem value="ARCHIVED">Archived</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={onSave} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      <div className="space-y-4">
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

        <DocumentEditor initialContent={content} onChange={setContent} />

        <div className="rounded-md border p-4 space-y-4">
          <h3 className="font-medium">Document Targeting</h3>

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
