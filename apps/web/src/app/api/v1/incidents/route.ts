import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { incidents } from "@/lib/db/schema";
import { and, eq, desc } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const service = searchParams.get("service");
    const environment = searchParams.get("environment");
    const status = searchParams.get("status");
    const severity = searchParams.get("severity");

    const conditions = [];

    if (service && service !== "all") {
      conditions.push(eq(incidents.serviceId, service));
    }
    if (environment && environment !== "all") {
      conditions.push(eq(incidents.environment, environment));
    }
    if (status && status !== "all") {
      conditions.push(eq(incidents.status, status));
    }
    if (severity && severity !== "all") {
      conditions.push(eq(incidents.severity, severity));
    }

    const results = await db
      .select()
      .from(incidents)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(incidents.firstDetectedAt));

    return NextResponse.json({
      incidents: results.map((inc) => ({
        ...inc,
        impactedMetrics: inc.impactedMetrics ? JSON.parse(inc.impactedMetrics) : [],
      })),
      total: results.length,
    });
  } catch (error) {
    console.error("[Incidents Query Error]", error);
    return NextResponse.json({ error: "Failed to fetch incidents" }, { status: 500 });
  }
}
