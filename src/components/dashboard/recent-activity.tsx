"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, Edit, Search, Plus } from "lucide-react";

const activityIcons = {
  VIEW: Eye,
  EDIT: Edit,
  SEARCH: Search,
  CREATE: Plus,
};

interface ActivityItem {
  id: string;
  type: "VIEW" | "EDIT" | "SEARCH" | "CREATE";
  createdAt: Date;
  document: {
    title: string;
    slug: string;
    space: { slug: string };
  } | null;
}

export function RecentActivity({ activities }: { activities: ActivityItem[] }) {
  if (activities.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No recent activity</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {activities.map((activity) => {
          const Icon = activityIcons[activity.type];
          return (
            <div key={activity.id} className="flex items-center gap-3">
              <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                {activity.document ? (
                  <Link
                    href={`/spaces/${activity.document.space.slug}/${activity.document.slug}`}
                    className="text-sm font-medium hover:underline truncate block"
                  >
                    {activity.document.title}
                  </Link>
                ) : (
                  <span className="text-sm text-muted-foreground">
                    {activity.type === "SEARCH" ? "Searched" : "Unknown"}
                  </span>
                )}
                <p className="text-xs text-muted-foreground">
                  {new Date(activity.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
