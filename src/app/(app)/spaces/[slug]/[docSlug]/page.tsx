"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { DocumentEditor } from "@/components/documents/document-editor";
import { DocumentReactions } from "@/components/documents/document-reactions";
import { DocumentComments } from "@/components/documents/document-comments";
import { RelatedContent } from "@/components/documents/related-content";
import { MoveDocumentDialog } from "@/components/documents/move-document-dialog";
import { Separator } from "@/components/ui/separator";
import { Pencil, Star, Trash2, FileText, Plus, MoveHorizontal } from "lucide-react";
import { toast } from "sonner";

interface DocDetail {
  id: string;
  title: string;
  slug: string;
  content: string | null;
  excerpt: string | null;
  status: string;
  spaceId: string;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
  author: { name: string | null; email: string };
  space: { name: string; slug: string };
  parent: { id: string; title: string; slug: string } | null;
  children: { id: string; title: string; slug: string; status: string }[];
  documentTeams: { team: { id: string; name: string } }[];
  documentRoles: { role: { id: string; name: string } }[];
  documentClients: { client: { id: string; name: string } }[];
  documentTags: { tag: { id: string; name: string; color: string | null } }[];
  favorites: { id: string }[];
}

export default function DocumentViewPage() {
  const params = useParams<{ slug: string; docSlug: string }>();
  const router = useRouter();
  const [doc, setDoc] = useState<DocDetail | null>(null);
  const [isFavorited, setIsFavorited] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);

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
            setDoc(d);
            setIsFavorited(d.favorites?.length > 0);
          });
      });
  }, [params.slug, params.docSlug]);

  async function toggleFavorite() {
    if (!doc) return;
    const res = await fetch("/api/favorites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentId: doc.id }),
    });
    if (res.ok) {
      const data = await res.json();
      setIsFavorited(data.favorited);
      toast.success(data.favorited ? "Added to favorites" : "Removed from favorites");
    }
  }

  async function onDelete() {
    if (!doc || !confirm("Delete this document?")) return;
    const res = await fetch(`/api/documents/${doc.id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Document deleted");
      router.push(`/spaces/${params.slug}`);
    }
  }

  if (!doc) return <div className="p-4">Loading...</div>;

  return (
    <div className="space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/spaces">Spaces</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href={`/spaces/${doc.space.slug}`}>
              {doc.space.name}
            </BreadcrumbLink>
          </BreadcrumbItem>
          {doc.parent && (
            <>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink href={`/spaces/${doc.space.slug}/${doc.parent.slug}`}>
                  {doc.parent.title}
                </BreadcrumbLink>
              </BreadcrumbItem>
            </>
          )}
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{doc.title}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">{doc.title}</h1>
          <div className="mt-2 flex items-center gap-3 text-sm text-muted-foreground">
            <span>By {doc.author.name || doc.author.email}</span>
            <span>&middot;</span>
            <span>Updated {new Date(doc.updatedAt).toLocaleDateString()}</span>
            <Badge variant={doc.status === "PUBLISHED" ? "default" : "secondary"}>
              {doc.status}
            </Badge>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {doc.documentTeams.map((dt) => (
              <Badge key={dt.team.id} variant="secondary">{dt.team.name}</Badge>
            ))}
            {doc.documentRoles.map((dr) => (
              <Badge key={dr.role.id} variant="outline">{dr.role.name}</Badge>
            ))}
            {doc.documentClients.map((dc) => (
              <Badge key={dc.client.id} variant="outline">{dc.client.name}</Badge>
            ))}
            {doc.documentTags.map((dt) => (
              <Badge
                key={dt.tag.id}
                variant="outline"
                style={dt.tag.color ? { borderColor: dt.tag.color, color: dt.tag.color } : undefined}
              >
                {dt.tag.name}
              </Badge>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" onClick={toggleFavorite}>
            <Star className={`h-4 w-4 ${isFavorited ? "fill-yellow-400 text-yellow-400" : ""}`} />
          </Button>
          <Link href={`/spaces/${params.slug}/new?parentId=${doc.id}&parentTitle=${encodeURIComponent(doc.title)}`}>
            <Button variant="outline" size="icon" title="Create sub-page">
              <Plus className="h-4 w-4" />
            </Button>
          </Link>
          <Button variant="outline" size="icon" title="Move document" onClick={() => setMoveOpen(true)}>
            <MoveHorizontal className="h-4 w-4" />
          </Button>
          <Link href={`/spaces/${params.slug}/${params.docSlug}/edit`}>
            <Button variant="outline" size="icon">
              <Pencil className="h-4 w-4" />
            </Button>
          </Link>
          <Button variant="outline" size="icon" onClick={onDelete}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </div>

      {doc.content && (
        <DocumentEditor initialContent={doc.content} editable={false} />
      )}

      <DocumentReactions documentId={doc.id} />

      <Separator />

      <DocumentComments documentId={doc.id} />

      <Separator />

      <RelatedContent documentId={doc.id} />

      {doc.children.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">Sub-pages</h2>
          {doc.children.map((child) => (
            <Link
              key={child.id}
              href={`/spaces/${params.slug}/${child.slug}`}
              className="flex items-center gap-2 rounded-md border p-3 transition-colors hover:bg-muted/50"
            >
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{child.title}</span>
              <Badge variant="secondary" className="text-xs">{child.status}</Badge>
            </Link>
          ))}
        </div>
      )}

      <MoveDocumentDialog
        open={moveOpen}
        onOpenChange={setMoveOpen}
        documentId={doc.id}
        currentSpaceSlug={doc.space.slug}
        currentSpaceId={doc.spaceId}
        currentParentId={doc.parentId}
        onMoved={(newSpaceSlug, newDocSlug) => {
          toast.success("Document moved");
          router.push(`/spaces/${newSpaceSlug}/${newDocSlug}`);
        }}
      />
    </div>
  );
}
