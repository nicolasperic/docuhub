import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { NextResponse } from "next/server";

// Update member's teams and roles
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const { teamIds, roleIds, orgRole } = await req.json();

  // Update org role if provided
  if (orgRole) {
    await db.user.update({ where: { id }, data: { orgRole } });
  }

  // Update team memberships if provided
  if (teamIds !== undefined) {
    await db.teamMember.deleteMany({ where: { userId: id } });
    if (teamIds.length > 0) {
      await db.teamMember.createMany({
        data: teamIds.map((teamId: string) => ({ userId: id, teamId })),
      });
    }
  }

  // Update role assignments if provided
  if (roleIds !== undefined) {
    await db.userRole.deleteMany({ where: { userId: id } });
    if (roleIds.length > 0) {
      await db.userRole.createMany({
        data: roleIds.map((roleId: string) => ({ userId: id, roleId })),
      });
    }
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;

  // Remove from organization, don't delete the user
  await db.user.update({
    where: { id },
    data: { organizationId: null, orgRole: "MEMBER" },
  });

  // Remove team memberships and role assignments
  await db.teamMember.deleteMany({ where: { userId: id } });
  await db.userRole.deleteMany({ where: { userId: id } });

  return NextResponse.json({ success: true });
}
