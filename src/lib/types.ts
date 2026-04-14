import type { OrgRole } from "@/generated/prisma/client";
import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email: string;
      image?: string | null;
      organizationId?: string | null;
      orgRole?: OrgRole;
      organizationSlug?: string | null;
    };
  }

  interface User {
    organizationId?: string | null;
    orgRole?: string;
    organizationSlug?: string | null;
  }
}
