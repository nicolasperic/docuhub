import { db } from "@/lib/db";
import { requireAdmin, requireAuth } from "@/lib/session";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

export async function GET() {
  const { user, error } = await requireAuth();
  if (error) return error;

  const members = await db.user.findMany({
    where: { organizationId: user!.organizationId },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      orgRole: true,
      createdAt: true,
      teamMembers: {
        include: { team: { select: { id: true, name: true } } },
      },
      userRoles: {
        include: { role: { select: { id: true, name: true } } },
      },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(members);
}

// Invite a new member (create user with temp password)
export async function POST(req: Request) {
  const { user, error } = await requireAdmin();
  if (error) return error;

  const { name, email, password, orgRole } = await req.json();

  if (!email || !name || !password) {
    return NextResponse.json(
      { error: "Name, email, and password are required" },
      { status: 400 }
    );
  }

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: "A user with this email already exists" },
      { status: 409 }
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const member = await db.user.create({
    data: {
      name,
      email,
      passwordHash,
      organizationId: user!.organizationId,
      orgRole: orgRole || "MEMBER",
    },
    select: { id: true, name: true, email: true, orgRole: true },
  });

  return NextResponse.json(member, { status: 201 });
}
