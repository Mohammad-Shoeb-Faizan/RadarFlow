import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logs } from "@/lib/db/schema";
import { and, eq, gte, lte, desc, like, or } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const service = searchParams.get("service");
    const environment = searchParams.get("environment");
    const level = searchParams.get("level");
    const search = searchParams.get("search");
    const traceId = searchParams.get("traceId");
    const limit = Math.min(200, parseInt(searchParams.get("limit") || "100", 10));
    const offset = parseInt(searchParams.get("offset") || "0", 10);
    const timeRange = searchParams.get("timeRange") || "1h";

    let rangeMs = 60 * 60 * 1000;
    if (timeRange === "15m") rangeMs = 15 * 60 * 1000;
    else if (timeRange === "6h") rangeMs = 6 * 60 * 60 * 1000;
    else if (timeRange === "24h") rangeMs = 24 * 60 * 60 * 1000;
    else if (timeRange === "7d") rangeMs = 7 * 24 * 60 * 60 * 1000;

    const fromTimestamp = Date.now() - rangeMs;

    const conditions = [gte(logs.timestamp, fromTimestamp)];

    if (service && service !== "all") {
      conditions.push(eq(logs.serviceId, service));
    }
    if (environment && environment !== "all") {
      conditions.push(eq(logs.environment, environment));
    }
    if (level && level !== "all") {
      conditions.push(eq(logs.level, level.toLowerCase()));
    }
    if (traceId) {
      conditions.push(eq(logs.traceId, traceId));
    }
    if (search && search.trim()) {
      conditions.push(
        or(
          like(logs.message, `%${search}%`),
          like(logs.attributes, `%${search}%`)
        )!
      );
    }

    const results = await db
      .select()
      .from(logs)
      .where(and(...conditions))
      .orderBy(desc(logs.timestamp))
      .limit(limit)
      .offset(offset);

    return NextResponse.json({
      logs: results.map((l) => ({
        ...l,
        attributes: l.attributes ? JSON.parse(l.attributes) : {},
      })),
      total: results.length,
    });
  } catch (error) {
    console.error("[Logs Query Error]", error);
    return NextResponse.json({ error: "Failed to fetch logs" }, { status: 500 });
  }
}
