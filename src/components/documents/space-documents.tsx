"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { FileText } from "lucide-react";

export interface SpaceDocument {
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

export function SpaceDocuments({
  spaceSlug,
  documents,
}: {
  spaceSlug: string;
  documents: SpaceDocument[];
}) {
  return (
    <div className="space-y-2">
      {documents.map((doc) => (
        <Link
          key={doc.id}
          href={`/spaces/${spaceSlug}/${doc.slug}`}
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
      {documents.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <FileText className="mx-auto mb-2 h-8 w-8" />
          <p>No documents in this space yet.</p>
        </div>
      )}
    </div>
  );
}
