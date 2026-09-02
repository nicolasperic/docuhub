"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Plus, Package, ChevronRight } from "lucide-react";
import { SpaceOverview } from "@/components/spaces/space-overview";
import { SpaceDocuments, type SpaceDocument } from "@/components/documents/space-documents";

interface SpaceDetail {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  overview: string | null;
  type: string;
  documents: SpaceDocument[];
}

export default function SpaceDetailPage() {
  const params = useParams<{ slug: string }>();
  const [space, setSpace] = useState<SpaceDetail | null>(null);
  const [moduleCount, setModuleCount] = useState(0);

  useEffect(() => {
    fetch(`/api/spaces/${params.slug}`)
      .then((res) => res.json())
      .then(setSpace);
    fetch(`/api/docs/tree?space=${encodeURIComponent(params.slug)}`)
      .then((res) => (res.ok ? res.json() : { groups: [] }))
      .then((data: { groups?: { items: { moduleName: string }[] }[] }) => {
        const names = new Set((data.groups ?? []).flatMap((g) => g.items.map((m) => m.moduleName)));
        setModuleCount(names.size);
      })
      .catch(() => setModuleCount(0));
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

      <SpaceOverview
        spaceSlug={space.slug}
        overview={space.overview}
        onChange={(overview) => setSpace((prev) => (prev ? { ...prev, overview } : prev))}
      />

      {moduleCount > 0 && (
        <Link
          href={`/spaces/${space.slug}/modules`}
          className="flex items-center gap-3 rounded-lg border p-4 transition-colors hover:bg-muted/50"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted">
            <Package className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-medium">Modules</p>
            <p className="text-sm text-muted-foreground">
              {moduleCount} module{moduleCount !== 1 ? "s" : ""} — browse, search & filter by label or capability
            </p>
          </div>
          <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
        </Link>
      )}

      <SpaceDocuments spaceSlug={space.slug} documents={space.documents} />
    </div>
  );
}
