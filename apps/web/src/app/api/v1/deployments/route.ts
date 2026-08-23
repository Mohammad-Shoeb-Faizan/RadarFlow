import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { deployments, projects } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import crypto from "crypto";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const service = searchParams.get("service");
    const environment = searchParams.get("environment");

    const allDeployments = await db
      .select()
      .from(deployments)
      .orderBy(desc(deployments.deployedAt));

    let filtered = allDeployments;
    if (service && service !== "all") {
      filtered = filtered.filter((d) => d.serviceId === service);
    }
    if (environment && environment !== "all") {
      filtered = filtered.filter((d) => d.environment === environment);
    }

    return NextResponse.json({ deployments: filtered });
  } catch (error) {
    console.error("[Deployments Query Error]", error);
    return NextResponse.json({ error: "Failed to fetch deployments" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { serviceId, environment, version, commitHash, commitMessage, deployedBy } = body;

    const defaultProject = (await db.select().from(projects).limit(1))[0];
    const projectId = defaultProject ? defaultProject.id : "prj_default";

    const id = `dep_${crypto.randomUUID().replace(/-/g, "").substring(0, 16)}`;
    const now = Date.now();

    await db.insert(deployments).values({
      id,
      projectId,
      serviceId: serviceId || "api",
      environment: environment || "production",
      version: version || "v1.0.0",
      commitHash: commitHash || crypto.randomBytes(4).toString("hex"),
      commitMessage: commitMessage || "Automated deployment update",
      deployedBy: deployedBy || "ci/cd-pipeline",
      status: "success",
      deployedAt: now,
    });

    return NextResponse.json({ success: true, id }, { status: 201 });
  } catch (error) {
    console.error("[Deployment Record Error]", error);
    return NextResponse.json({ error: "Failed to record deployment" }, { status: 500 });
  }
}
