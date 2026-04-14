import { auth } from "./auth";
import { NextResponse } from "next/server";

export async function getSessionUser() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const user = session.user as {
    id: string;
    name?: string | null;
    email: string;
    organizationId?: string | null;
    orgRole?: string;
  };

  return user;
}

export async function requireAuth() {
  const user = await getSessionUser();
  if (!user) {
    return { user: null, error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (!user.organizationId) {
    return { user: null, error: NextResponse.json({ error: "No organization" }, { status: 403 }) };
  }
  return { user: user as typeof user & { organizationId: string }, error: null };
}

export async function requireAdmin() {
  const { user, error } = await requireAuth();
  if (error) return { user: null, error };
  if (user!.orgRole !== "OWNER" && user!.orgRole !== "ADMIN") {
    return { user: null, error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { user: user!, error: null };
}
