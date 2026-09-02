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
import { Plus } from "lucide-react";
import { SpaceDocuments, type SpaceDocument } from "@/components/documents/space-documents";

interface SpaceDetail {
  id: string;
  name: string;
  slug: string;
  documents: SpaceDocument[];
}

export default function SpaceDocumentsPage() {
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
            <BreadcrumbLink href={`/spaces/${space.slug}`}>{space.name}</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Documents</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Documents</h1>
          <p className="text-muted-foreground">{space.name}</p>
        </div>
        <Link href={`/spaces/${space.slug}/new`}>
          <Button>
            <Plus className="mr-2 h-4 w-4" /> New Document
          </Button>
        </Link>
      </div>

      <SpaceDocuments spaceSlug={space.slug} documents={space.documents} />
    </div>
  );
}
