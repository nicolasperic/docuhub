"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface TeamDoc {
  id: string;
  title: string;
  slug: string;
  updatedAt: Date;
  author: { name: string | null };
  space: { name: string; slug: string };
}

export function TeamUpdates({ documents }: { documents: TeamDoc[] }) {
  if (documents.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Team Updates</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No team updates yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Team Updates</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {documents.map((doc) => (
          <Link
            key={doc.id}
            href={`/spaces/${doc.space.slug}/${doc.slug}`}
            className="block"
          >
            <p className="text-sm font-medium hover:underline truncate">
              {doc.title}
            </p>
            <p className="text-xs text-muted-foreground">
              {doc.author.name} in {doc.space.name} &middot;{" "}
              {new Date(doc.updatedAt).toLocaleDateString()}
            </p>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
