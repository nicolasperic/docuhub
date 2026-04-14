"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  FolderOpen,
  Star,
  Users,
  Shield,
  Briefcase,
  UserCog,
  FileText,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { SpaceDocTree } from "@/components/layout/space-doc-tree";

const mainNav = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/spaces", label: "Spaces", icon: FolderOpen },
  { href: "/favorites", label: "Favorites", icon: Star },
];

const adminNav = [
  { href: "/admin/teams", label: "Teams", icon: Users },
  { href: "/admin/members", label: "Members", icon: UserCog },
  { href: "/admin/roles", label: "Roles", icon: Shield },
  { href: "/admin/clients", label: "Clients", icon: Briefcase },
];

export function MobileNav() {
  const pathname = usePathname();
  const isSpaceRoute = pathname.startsWith("/spaces/") && pathname !== "/spaces";

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center border-b px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <FileText className="h-4 w-4" />
          </div>
          <span>DocuHub</span>
        </Link>
      </div>
      <ScrollArea className="flex-1 py-4">
        <nav className="space-y-1 px-3">
          {mainNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                pathname === item.href
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>
        {isSpaceRoute && (
          <div className="mt-4 px-3">
            <Separator className="mb-4" />
            <SpaceDocTree />
          </div>
        )}
        <div className="mt-6 px-3">
          <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Admin
          </p>
          <nav className="space-y-1">
            {adminNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                  pathname === item.href
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </ScrollArea>
    </div>
  );
}
