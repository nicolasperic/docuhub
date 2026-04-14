"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
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
import { Plus, FileText } from "lucide-react";

interface Document {
  id: string;
  title: string;
  slug: string;
  status: string;
  excerpt: string | null;
  updatedAt: string;
  author: { name: string | null };
  children: { id: string; title: string; slug: string }[];
  documentTags: { tag: { name: string; color: string | null } }[];
}

interface SpaceDetail {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  type: string;
  documents: Document[];
}

export default function SpaceDetailPage() {
  const params = useParams<{ slug: string }>();
  const [space, setSpace] = useState<SpaceDetail | null>(null);

  useEffect(() => {
    fetch(`/api/spaces/${params.slug}`)
      .then((res) => res.json())
      .then(setSpace);
  }, [params.slug]);

  if (!space) return <div className="p-4">Loading...</div>;

  return (
    <div className="space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/spaces">Spaces</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{space.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{space.name}</h1>
          {space.description && (
            <p className="text-muted-foreground">{space.description}</p>
          )}
        </div>
        <Link href={`/spaces/${space.slug}/new`}>
          <Button>
            <Plus className="mr-2 h-4 w-4" /> New Document
          </Button>
        </Link>
      </div>

      <div className="space-y-2">
        {space.documents.map((doc) => (
          <Link
            key={doc.id}
            href={`/spaces/${space.slug}/${doc.slug}`}
            className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted/50"
          >
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">{doc.title}</p>
                {doc.excerpt && (
                  <p className="text-sm text-muted-foreground line-clamp-1">{doc.excerpt}</p>
                )}
                <div className="mt-1 flex items-center gap-2">
                  <Badge
                    variant={doc.status === "PUBLISHED" ? "default" : "secondary"}
                    className="text-xs"
                  >
                    {doc.status}
                  </Badge>
                  {doc.documentTags.map((dt) => (
                    <Badge
                      key={dt.tag.name}
                      variant="outline"
                      className="text-xs"
                      style={dt.tag.color ? { borderColor: dt.tag.color, color: dt.tag.color } : undefined}
                    >
                      {dt.tag.name}
                    </Badge>
                  ))}
                  {doc.children.length > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {doc.children.length} sub-page{doc.children.length !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="text-right text-xs text-muted-foreground">
              <p>{doc.author.name}</p>
              <p>{new Date(doc.updatedAt).toLocaleDateString()}</p>
            </div>
          </Link>
        ))}
        {space.documents.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <FileText className="mx-auto mb-2 h-8 w-8" />
            <p>No documents in this space yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
