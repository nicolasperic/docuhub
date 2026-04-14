import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ForYouFeed } from "@/components/dashboard/for-you-feed";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { TeamUpdates } from "@/components/dashboard/team-updates";

export default async function DashboardPage() {
  const session = await auth();
  const user = session?.user as { id: string; organizationId?: string | null; name?: string | null };

  if (!user?.organizationId) {
    return <div>Loading...</div>;
  }

  // Fetch user's team IDs, role IDs, client IDs for the feed
  const [teamMembers, userRoles, teamClients] = await Promise.all([
    db.teamMember.findMany({
      where: { userId: user.id },
      select: { teamId: true },
    }),
    db.userRole.findMany({
      where: { userId: user.id },
      select: { roleId: true },
    }),
    db.teamClient.findMany({
      where: {
        teamId: {
          in: (
            await db.teamMember.findMany({
              where: { userId: user.id },
              select: { teamId: true },
            })
          ).map((tm) => tm.teamId),
        },
      },
      select: { clientId: true },
    }),
  ]);

  const teamIds = teamMembers.map((tm) => tm.teamId);
  const roleIds = userRoles.map((ur) => ur.roleId);
  const clientIds = teamClients.map((tc) => tc.clientId);

  // Fetch relevant documents for the feed
  const feedDocs = await db.document.findMany({
    where: {
      status: "PUBLISHED",
      space: { organizationId: user.organizationId },
      OR: [
        { space: { type: "ORG_WIDE" } },
        { documentTeams: { some: { teamId: { in: teamIds } } } },
        { documentRoles: { some: { roleId: { in: roleIds } } } },
        { documentClients: { some: { clientId: { in: clientIds } } } },
      ],
    },
    include: {
      author: { select: { name: true, email: true } },
      space: { select: { name: true, slug: true } },
      documentTeams: { include: { team: { select: { name: true } } } },
      documentTags: { include: { tag: { select: { name: true, color: true } } } },
    },
    orderBy: { updatedAt: "desc" },
    take: 20,
  });

  // Recent activity
  const recentActivity = await db.activity.findMany({
    where: { userId: user.id },
    include: {
      document: {
        select: { title: true, slug: true, space: { select: { slug: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  // Team updates - recent docs from teammates
  const teamUpdates = await db.document.findMany({
    where: {
      authorId: { not: user.id },
      status: "PUBLISHED",
      space: { organizationId: user.organizationId },
      OR: [
        { documentTeams: { some: { teamId: { in: teamIds } } } },
        { space: { type: "ORG_WIDE" } },
      ],
    },
    include: {
      author: { select: { name: true } },
      space: { select: { name: true, slug: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 10,
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Welcome back, {user.name?.split(" ")[0] || "there"}</h1>
        <p className="text-muted-foreground">Here&apos;s what&apos;s relevant to you today</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <ForYouFeed documents={feedDocs} />
        </div>
        <div className="space-y-6">
          <RecentActivity activities={recentActivity} />
          <TeamUpdates documents={teamUpdates} />
        </div>
      </div>
    </div>
  );
}
