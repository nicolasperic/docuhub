import { db } from "@/lib/db";
import { requireAuth } from "@/lib/session";
import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;

  // Fetch current doc with its metadata
  const doc = await db.document.findFirst({
    where: { id, space: { organizationId: user!.organizationId } },
    include: {
      documentTeams: { select: { teamId: true } },
      documentRoles: { select: { roleId: true } },
      documentClients: { select: { clientId: true } },
      documentTags: { select: { tagId: true } },
      space: { select: { name: true, slug: true } },
    },
  });

  if (!doc) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  const teamIds = doc.documentTeams.map((dt) => dt.teamId);
  const roleIds = doc.documentRoles.map((dr) => dr.roleId);
  const clientIds = doc.documentClients.map((dc) => dc.clientId);
  const tagIds = doc.documentTags.map((dt) => dt.tagId);

  // No metadata to match against
  if (teamIds.length === 0 && roleIds.length === 0 && clientIds.length === 0 && tagIds.length === 0) {
    return NextResponse.json([]);
  }

  // Build OR conditions for matching documents
  const orConditions = [];
  if (teamIds.length > 0) {
    orConditions.push({ documentTeams: { some: { teamId: { in: teamIds } } } });
  }
  if (roleIds.length > 0) {
    orConditions.push({ documentRoles: { some: { roleId: { in: roleIds } } } });
  }
  if (clientIds.length > 0) {
    orConditions.push({ documentClients: { some: { clientId: { in: clientIds } } } });
  }
  if (tagIds.length > 0) {
    orConditions.push({ documentTags: { some: { tagId: { in: tagIds } } } });
  }

  const candidates = await db.document.findMany({
    where: {
      id: { not: id },
      space: { organizationId: user!.organizationId },
      OR: orConditions,
    },
    include: {
      space: { select: { name: true, slug: true } },
      documentTeams: { select: { teamId: true } },
      documentRoles: { select: { roleId: true } },
      documentClients: { select: { clientId: true } },
      documentTags: { select: { tagId: true } },
    },
  });

  // Score each candidate by overlap count
  const scored = candidates.map((c) => {
    let score = 0;
    score += c.documentTeams.filter((dt) => teamIds.includes(dt.teamId)).length;
    score += c.documentRoles.filter((dr) => roleIds.includes(dr.roleId)).length;
    score += c.documentClients.filter((dc) => clientIds.includes(dc.clientId)).length;
    score += c.documentTags.filter((dt) => tagIds.includes(dt.tagId)).length;

    // Collect shared metadata names for badges
    const sharedTeams = c.documentTeams.filter((dt) => teamIds.includes(dt.teamId)).map((dt) => dt.teamId);
    const sharedRoles = c.documentRoles.filter((dr) => roleIds.includes(dr.roleId)).map((dr) => dr.roleId);
    const sharedClients = c.documentClients.filter((dc) => clientIds.includes(dc.clientId)).map((dc) => dc.clientId);
    const sharedTags = c.documentTags.filter((dt) => tagIds.includes(dt.tagId)).map((dt) => dt.tagId);

    return {
      id: c.id,
      title: c.title,
      slug: c.slug,
      excerpt: c.excerpt,
      space: c.space,
      score,
      sharedTeams,
      sharedRoles,
      sharedClients,
      sharedTags,
    };
  });

  // Sort by score descending, take top 6
  scored.sort((a, b) => b.score - a.score);

  return NextResponse.json(scored.slice(0, 6));
}
