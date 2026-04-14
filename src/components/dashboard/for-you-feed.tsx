"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText } from "lucide-react";

interface FeedDocument {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  updatedAt: Date;
  author: { name: string | null; email: string };
  space: { name: string; slug: string };
  documentTeams: { team: { name: string } }[];
  documentTags: { tag: { name: string; color: string | null } }[];
}

export function ForYouFeed({ documents }: { documents: FeedDocument[] }) {
  if (documents.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">For You</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
            <FileText className="mb-2 h-8 w-8" />
            <p>No documents yet. Create one to get started!</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">For You</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {documents.map((doc) => (
          <Link
            key={doc.id}
            href={`/spaces/${doc.space.slug}/${doc.slug}`}
            className="block rounded-lg border p-4 transition-colors hover:bg-muted/50"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <h3 className="font-medium truncate">{doc.title}</h3>
                {doc.excerpt && (
                  <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                    {doc.excerpt}
                  </p>
                )}
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {doc.space.name}
                  </span>
                  {doc.documentTeams.map((dt) => (
                    <Badge key={dt.team.name} variant="secondary" className="text-xs">
                      {dt.team.name}
                    </Badge>
                  ))}
                  {doc.documentTags.map((dt) => (
                    <Badge
                      key={dt.tag.name}
                      variant="outline"
                      className="text-xs"
                      style={
                        dt.tag.color
                          ? { borderColor: dt.tag.color, color: dt.tag.color }
                          : undefined
                      }
                    >
                      {dt.tag.name}
                    </Badge>
                  ))}
                </div>
              </div>
              <span className="shrink-0 text-xs text-muted-foreground">
                {new Date(doc.updatedAt).toLocaleDateString()}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              by {doc.author.name || doc.author.email}
            </p>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
