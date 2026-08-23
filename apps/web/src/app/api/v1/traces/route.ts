import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { traces } from "@/lib/db/schema";
import { and, eq, gte, desc, like } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const service = searchParams.get("service");
    const environment = searchParams.get("environment");
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const minDuration = parseFloat(searchParams.get("minDuration") || "0");
    const limit = Math.min(100, parseInt(searchParams.get("limit") || "50", 10));
    const offset = parseInt(searchParams.get("offset") || "0", 10);
    const timeRange = searchParams.get("timeRange") || "1h";

    let rangeMs = 60 * 60 * 1000;
    if (timeRange === "15m") rangeMs = 15 * 60 * 1000;
    else if (timeRange === "6h") rangeMs = 6 * 60 * 60 * 1000;
    else if (timeRange === "24h") rangeMs = 24 * 60 * 60 * 1000;
    else if (timeRange === "7d") rangeMs = 7 * 24 * 60 * 60 * 1000;

    const fromTimestamp = Date.now() - rangeMs;
    const conditions = [gte(traces.startTime, fromTimestamp)];

    if (service && service !== "all") {
      conditions.push(eq(traces.serviceId, service));
    }
    if (environment && environment !== "all") {
      conditions.push(eq(traces.environment, environment));
    }
    if (status && status !== "all") {
      conditions.push(eq(traces.statusCode, status));
    }
    if (search && search.trim()) {
      conditions.push(like(traces.rootSpanName, `%${search}%`));
    }
    if (minDuration > 0) {
      conditions.push(gte(traces.durationMs, minDuration));
    }

    const results = await db
      .select()
      .from(traces)
      .where(and(...conditions))
      .orderBy(desc(traces.startTime))
      .limit(limit)
      .offset(offset);

    return NextResponse.json({
      traces: results,
      total: results.length,
    });
  } catch (error) {
    console.error("[Traces Query Error]", error);
    return NextResponse.json({ error: "Failed to fetch traces" }, { status: 500 });
  }
}
