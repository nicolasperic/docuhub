"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { SpaceModules } from "@/components/modules/space-modules";

export default function SpaceModulesPage() {
  const params = useParams<{ slug: string }>();
  const [spaceName, setSpaceName] = useState(params.slug);

  useEffect(() => {
    fetch(`/api/spaces/${params.slug}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((s) => s && setSpaceName(s.name));
  }, [params.slug]);

  return (
    <div className="space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/spaces">Spaces</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href={`/spaces/${params.slug}`}>{spaceName}</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Modules</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <SpaceModules spaceSlug={params.slug} />
    </div>
  );
}
