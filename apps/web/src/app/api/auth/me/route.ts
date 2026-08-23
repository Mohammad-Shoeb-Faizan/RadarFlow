import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { db } from "@/lib/db";
import { projects, organizations, organizationMembers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const sessionUser = await authenticateRequest(req);

    if (!sessionUser) {
      return NextResponse.json(
        { user: null, isAuthenticated: false, error: "Unauthenticated" },
        { status: 401 }
      );
    }

    const currentProjects = await db.select().from(projects);
    const memberOrgs = await db
      .select({
        id: organizations.id,
        name: organizations.name,
        slug: organizations.slug,
        role: organizationMembers.role,
      })
      .from(organizationMembers)
      .innerJoin(organizations, eq(organizationMembers.organizationId, organizations.id))
      .where(eq(organizationMembers.userId, sessionUser.id));

    const activeOrg = memberOrgs[0] || {
      id: "org_default",
      name: "RadarFlow Team",
      slug: "radarflow-team",
      role: sessionUser.role || "owner",
    };

    return NextResponse.json({
      user: sessionUser,
      organization: activeOrg,
      isAuthenticated: true,
      projects: currentProjects,
      activeProject: currentProjects[0] || null,
    });
  } catch (error) {
    console.error("[Me API Error]", error);
    return NextResponse.json({ error: "Failed to get user session" }, { status: 500 });
  }
}
