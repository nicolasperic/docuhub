"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
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
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { SpaceDocTree } from "@/components/layout/space-doc-tree";

const MIN_WIDTH = 200;
const MAX_WIDTH = 480;
const DEFAULT_WIDTH = 256;

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

export function Sidebar() {
  const pathname = usePathname();
  const isSpaceRoute =
    pathname.startsWith("/spaces/") && pathname !== "/spaces";

  const [collapsed, setCollapsed] = useState(false);
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [isDragging, setIsDragging] = useState(false);
  const sidebarRef = useRef<HTMLElement>(null);

  // Persist width before collapsing so we can restore it
  const widthBeforeCollapse = useRef(DEFAULT_WIDTH);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      if (!prev) {
        widthBeforeCollapse.current = width;
      } else {
        setWidth(widthBeforeCollapse.current);
      }
      return !prev;
    });
  }, [width]);

  // Drag-to-resize handler
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (collapsed) return;
      e.preventDefault();
      setIsDragging(true);
    },
    [collapsed]
  );

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, e.clientX));
      setWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

  return (
    <aside
      ref={sidebarRef}
      style={{ width: collapsed ? 56 : width }}
      className={cn(
        "relative hidden overflow-hidden md:flex md:flex-col md:border-r bg-muted/30 transition-[width] shrink-0",
        isDragging ? "duration-0 select-none" : "duration-200"
      )}
    >
      {/* Header */}
      <div
        className={cn(
          "border-b",
          collapsed
            ? "flex flex-col items-center gap-1 px-1.5 py-2"
            : "flex h-14 items-center justify-between px-3"
        )}
      >
        <Link
          href="/"
          className="flex items-center gap-2 font-semibold overflow-hidden"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <FileText className="h-4 w-4" />
          </div>
          {!collapsed && <span className="whitespace-nowrap">Aztec&apos;s Docs</span>}
        </Link>
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleCollapsed}
              className="h-7 w-7 shrink-0"
            >
              {collapsed ? (
                <PanelLeftOpen className="h-4 w-4" />
              ) : (
                <PanelLeftClose className="h-4 w-4" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side={collapsed ? "right" : "bottom"}>
            {collapsed ? "Expand sidebar" : "Collapse sidebar"}
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden py-4">
        <nav className={cn("space-y-1", collapsed ? "px-1.5" : "px-3")}>
          {mainNav.map((item) => {
            const linkContent = (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                  collapsed
                    ? "justify-center px-2 py-2"
                    : "gap-3 px-3 py-2",
                  pathname === item.href
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground"
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {!collapsed && item.label}
              </Link>
            );

            if (collapsed) {
              return (
                <Tooltip key={item.href} delayDuration={0}>
                  <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                  <TooltipContent side="right">{item.label}</TooltipContent>
                </Tooltip>
              );
            }

            return linkContent;
          })}
        </nav>

        {isSpaceRoute && !collapsed && (
          <div className="mt-4 px-3">
            <Separator className="mb-4" />
            <SpaceDocTree />
          </div>
        )}

        <div className={cn("mt-6", collapsed ? "px-1.5" : "px-3")}>
          {!collapsed && (
            <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Admin
            </p>
          )}
          {collapsed && <Separator className="mb-3" />}
          <nav className="space-y-1">
            {adminNav.map((item) => {
              const linkContent = (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                    collapsed
                      ? "justify-center px-2 py-2"
                      : "gap-3 px-3 py-2",
                    pathname === item.href
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground"
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {!collapsed && item.label}
                </Link>
              );

              if (collapsed) {
                return (
                  <Tooltip key={item.href} delayDuration={0}>
                    <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                    <TooltipContent side="right">{item.label}</TooltipContent>
                  </Tooltip>
                );
              }

              return linkContent;
            })}
          </nav>
        </div>
      </div>

      {/* Drag handle */}
      {!collapsed && (
        <div
          onMouseDown={handleMouseDown}
          className={cn(
            "absolute top-0 right-0 h-full w-1 cursor-col-resize transition-colors hover:bg-primary/20",
            isDragging && "bg-primary/30"
          )}
        />
      )}
    </aside>
  );
}
