"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText } from "lucide-react";

interface RelatedDoc {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  space: { name: string; slug: string };
  score: number;
  sharedTeams: string[];
  sharedRoles: string[];
  sharedClients: string[];
  sharedTags: string[];
}

interface RelatedContentProps {
  documentId: string;
}

export function RelatedContent({ documentId }: RelatedContentProps) {
  const [docs, setDocs] = useState<RelatedDoc[]>([]);
  const [loaded, setLoaded] = useState(false);

  const fetchRelated = useCallback(async () => {
    const res = await fetch(`/api/documents/${documentId}/related`);
    if (res.ok) {
      setDocs(await res.json());
    }
    setLoaded(true);
  }, [documentId]);

  useEffect(() => {
    fetchRelated();
  }, [fetchRelated]);

  if (!loaded || docs.length === 0) return null;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Related Content</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {docs.map((doc) => (
          <Link
            key={doc.id}
            href={`/spaces/${doc.space.slug}/${doc.slug}`}
          >
            <Card className="h-full transition-colors hover:bg-muted/50">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-start gap-2 text-sm font-medium">
                  <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="line-clamp-2">{doc.title}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {doc.excerpt && (
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {doc.excerpt}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">{doc.space.name}</p>
                <div className="flex flex-wrap gap-1">
                  {doc.sharedTeams.length > 0 && (
                    <Badge variant="secondary" className="text-[10px]">
                      {doc.sharedTeams.length} shared team{doc.sharedTeams.length > 1 ? "s" : ""}
                    </Badge>
                  )}
                  {doc.sharedRoles.length > 0 && (
                    <Badge variant="secondary" className="text-[10px]">
                      {doc.sharedRoles.length} shared role{doc.sharedRoles.length > 1 ? "s" : ""}
                    </Badge>
                  )}
                  {doc.sharedClients.length > 0 && (
                    <Badge variant="secondary" className="text-[10px]">
                      {doc.sharedClients.length} shared client{doc.sharedClients.length > 1 ? "s" : ""}
                    </Badge>
                  )}
                  {doc.sharedTags.length > 0 && (
                    <Badge variant="secondary" className="text-[10px]">
                      {doc.sharedTags.length} shared tag{doc.sharedTags.length > 1 ? "s" : ""}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
