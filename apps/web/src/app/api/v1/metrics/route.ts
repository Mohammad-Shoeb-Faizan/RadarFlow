import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { metrics } from "@/lib/db/schema";
import { and, eq, gte, asc } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const metricName = searchParams.get("name") || "http.request.duration";
    const service = searchParams.get("service");
    const environment = searchParams.get("environment");
    const timeRange = searchParams.get("timeRange") || "1h";

    let rangeMs = 60 * 60 * 1000;
    let bucketCount = 30;

    if (timeRange === "15m") {
      rangeMs = 15 * 60 * 1000;
      bucketCount = 15;
    } else if (timeRange === "6h") {
      rangeMs = 6 * 60 * 60 * 1000;
      bucketCount = 36;
    } else if (timeRange === "24h") {
      rangeMs = 24 * 60 * 60 * 1000;
      bucketCount = 48;
    } else if (timeRange === "7d") {
      rangeMs = 7 * 24 * 60 * 60 * 1000;
      bucketCount = 56;
    }

    const fromTimestamp = Date.now() - rangeMs;
    const bucketInterval = rangeMs / bucketCount;

    const conditions = [
      eq(metrics.metricName, metricName),
      gte(metrics.timestamp, fromTimestamp),
    ];

    if (service && service !== "all") {
      conditions.push(eq(metrics.serviceId, service));
    }
    if (environment && environment !== "all") {
      conditions.push(eq(metrics.environment, environment));
    }

    const rawData = await db
      .select()
      .from(metrics)
      .where(and(...conditions))
      .orderBy(asc(metrics.timestamp));

    // Aggregate into regular time buckets for smooth charts
    const buckets: Array<{
      timestamp: number;
      time: string;
      value: number;
      min: number;
      max: number;
      count: number;
      p95: number;
    }> = [];

    for (let i = 0; i < bucketCount; i++) {
      const bStart = fromTimestamp + i * bucketInterval;
      const bEnd = bStart + bucketInterval;
      const pointsInBucket = rawData.filter((d) => d.timestamp >= bStart && d.timestamp < bEnd);

      const d = new Date(bStart);
      const timeLabel =
        timeRange === "7d"
          ? `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:00`
          : `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

      if (pointsInBucket.length === 0) {
        buckets.push({
          timestamp: bStart,
          time: timeLabel,
          value: 0,
          min: 0,
          max: 0,
          count: 0,
          p95: 0,
        });
      } else {
        const values = pointsInBucket.map((p) => p.value).sort((a, b) => a - b);
        const sum = values.reduce((a, b) => a + b, 0);
        const avg = sum / values.length;
        const p95Idx = Math.floor(values.length * 0.95);

        buckets.push({
          timestamp: bStart,
          time: timeLabel,
          value: Number(avg.toFixed(1)),
          min: Number(values[0].toFixed(1)),
          max: Number(values[values.length - 1].toFixed(1)),
          count: values.length,
          p95: Number(values[p95Idx].toFixed(1)),
        });
      }
    }

    // Summary statistics
    const allValues = rawData.map((d) => d.value).sort((a, b) => a - b);
    const summary = {
      avg: allValues.length ? Number((allValues.reduce((a, b) => a + b, 0) / allValues.length).toFixed(1)) : 0,
      p50: allValues.length ? Number(allValues[Math.floor(allValues.length * 0.5)].toFixed(1)) : 0,
      p95: allValues.length ? Number(allValues[Math.floor(allValues.length * 0.95)].toFixed(1)) : 0,
      p99: allValues.length ? Number(allValues[Math.floor(allValues.length * 0.99)].toFixed(1)) : 0,
      max: allValues.length ? Number(allValues[allValues.length - 1].toFixed(1)) : 0,
      totalDataPoints: allValues.length,
    };

    return NextResponse.json({
      metricName,
      timeRange,
      series: buckets,
      summary,
    });
  } catch (error) {
    console.error("[Metrics Query Error]", error);
    return NextResponse.json({ error: "Failed to fetch metrics" }, { status: 500 });
  }
}
