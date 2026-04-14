import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { name } = await req.json();

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    // Generate slug from name
    const baseSlug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    // Check for slug uniqueness
    let slug = baseSlug;
    let counter = 0;
    while (await db.organization.findUnique({ where: { slug } })) {
      counter++;
      slug = `${baseSlug}-${counter}`;
    }

    const org = await db.organization.create({
      data: {
        name,
        slug,
        users: {
          connect: { id: session.user.id },
        },
      },
    });

    // Update user to be OWNER of the org
    await db.user.update({
      where: { id: session.user.id },
      data: { organizationId: org.id, orgRole: "OWNER" },
    });

    return NextResponse.json(org, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
