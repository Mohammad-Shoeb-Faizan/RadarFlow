import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, organizations, organizationMembers, projects } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { hashPassword, createToken } from "@/lib/auth";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const { name, email, password, organizationName } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: "Name, email, and password are required" }, { status: 400 });
    }

    const existingUser = (
      await db.select().from(users).where(eq(users.email, email.toLowerCase().trim())).limit(1)
    )[0];

    if (existingUser) {
      return NextResponse.json({ error: "User with this email already exists" }, { status: 400 });
    }

    const userId = `usr_${crypto.randomUUID().replace(/-/g, "").substring(0, 16)}`;
    const orgId = `org_${crypto.randomUUID().replace(/-/g, "").substring(0, 16)}`;
    const projectId = `prj_${crypto.randomUUID().replace(/-/g, "").substring(0, 16)}`;

    const passwordHash = await hashPassword(password);
    const orgSlug = (organizationName || `${name}'s Team`)
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "-")
      .replace(/-+/g, "-");

    await db.insert(users).values({
      id: userId,
      email: email.toLowerCase().trim(),
      passwordHash,
      name,
      role: "owner",
    });

    await db.insert(organizations).values({
      id: orgId,
      name: organizationName || `${name}'s Team`,
      slug: `${orgSlug}-${crypto.randomBytes(3).toString("hex")}`,
    });

    await db.insert(organizationMembers).values({
      id: `mem_${crypto.randomUUID().replace(/-/g, "").substring(0, 16)}`,
      organizationId: orgId,
      userId,
      role: "owner",
    });

    await db.insert(projects).values({
      id: projectId,
      organizationId: orgId,
      name: "Production App",
      slug: "production-app",
      description: "Default primary monitoring project",
    });

    const token = createToken({
      id: userId,
      email: email.toLowerCase().trim(),
      name,
      role: "owner",
    });

    const response = NextResponse.json({
      user: { id: userId, email: email.toLowerCase().trim(), name, role: "owner" },
      token,
    }, { status: 201 });

    response.cookies.set({
      name: "rf_session",
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
    });

    return response;
  } catch (error) {
    console.error("[Register Error]", error);
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}
