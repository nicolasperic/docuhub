import { db } from "@/lib/db";
import { requireAuth } from "@/lib/session";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { user, error } = await requireAuth();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("mode");
  const query = searchParams.get("q")?.trim();

  // Initial mode: return recent searches + recommendations
  if (mode === "initial") {
    const [searchActivities, recentActivity] = await Promise.all([
      // Recent searches: distinct queries from SEARCH activities
      db.activity.findMany({
        where: { userId: user.id, type: "SEARCH" },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
      // Recent VIEW/EDIT activity for recommendations
      db.activity.findMany({
        where: {
          userId: user.id,
          type: { in: ["VIEW", "EDIT"] },
          documentId: { not: null },
        },
        orderBy: { createdAt: "desc" },
        take: 20,
        include: {
          document: {
            include: {
              space: { select: { name: true, slug: true } },
            },
          },
        },
      }),
    ]);

    // Deduplicate recent searches by query string
    const seenQueries = new Set<string>();
    const recentSearches: { id: string; query: string }[] = [];
    for (const activity of searchActivities) {
      const q = (activity.metadata as { query?: string } | null)?.query;
      if (q && !seenQueries.has(q.toLowerCase())) {
        seenQueries.add(q.toLowerCase());
        recentSearches.push({ id: activity.id, query: q });
        if (recentSearches.length >= 5) break;
      }
    }

    // Deduplicate recommendations by document ID
    const seenDocIds = new Set<string>();
    const recommendations: {
      id: string;
      title: string;
      slug: string;
      spaceName: string;
      spaceSlug: string;
      activityType: string;
      activityDate: string;
    }[] = [];

    for (const activity of recentActivity) {
      if (!activity.document || !activity.documentId) continue;
      if (seenDocIds.has(activity.documentId)) continue;
      seenDocIds.add(activity.documentId);
      recommendations.push({
        id: activity.document.id,
        title: activity.document.title,
        slug: activity.document.slug,
        spaceName: activity.document.space.name,
        spaceSlug: activity.document.space.slug,
        activityType: activity.type,
        activityDate: activity.createdAt.toISOString(),
      });
      if (recommendations.length >= 6) break;
    }

    // Fallback: if no activity, show recent published docs
    if (recommendations.length === 0) {
      const recentDocs = await db.document.findMany({
        where: {
          space: { organizationId: user.organizationId },
          status: "PUBLISHED",
        },
        orderBy: { updatedAt: "desc" },
        take: 6,
        include: {
          space: { select: { name: true, slug: true } },
        },
      });
      for (const doc of recentDocs) {
        recommendations.push({
          id: doc.id,
          title: doc.title,
          slug: doc.slug,
          spaceName: doc.space.name,
          spaceSlug: doc.space.slug,
          activityType: "PUBLISHED",
          activityDate: doc.updatedAt.toISOString(),
        });
      }
    }

    return NextResponse.json({ recentSearches, recommendations });
  }

  // Search mode
  if (!query) {
    return NextResponse.json({ results: [] });
  }

  const results = await db.document.findMany({
    where: {
      space: { organizationId: user.organizationId },
      status: "PUBLISHED",
      title: { contains: query, mode: "insensitive" },
    },
    orderBy: { updatedAt: "desc" },
    take: 10,
    include: {
      space: { select: { name: true, slug: true } },
    },
  });

  // Get user's latest activity for each result document
  const docIds = results.map((r) => r.id);
  const activities = docIds.length
    ? await db.activity.findMany({
        where: {
          userId: user.id,
          documentId: { in: docIds },
          type: { in: ["VIEW", "EDIT"] },
        },
        orderBy: { createdAt: "desc" },
      })
    : [];

  const activityByDoc = new Map<string, { type: string; date: string }>();
  for (const a of activities) {
    if (a.documentId && !activityByDoc.has(a.documentId)) {
      activityByDoc.set(a.documentId, {
        type: a.type,
        date: a.createdAt.toISOString(),
      });
    }
  }

  const searchResults = results.map((doc) => ({
    id: doc.id,
    title: doc.title,
    slug: doc.slug,
    spaceName: doc.space.name,
    spaceSlug: doc.space.slug,
    activityType: activityByDoc.get(doc.id)?.type ?? null,
    activityDate: activityByDoc.get(doc.id)?.date ?? null,
  }));

  // Record search activity (don't await — fire and forget)
  db.activity.create({
    data: {
      type: "SEARCH",
      userId: user.id,
      metadata: { query },
    },
  }).catch(() => {});

  return NextResponse.json({ results: searchResults });
}
