import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { projects, services, incidents } from "@/lib/db/schema";
import { processTelemetryBatch } from "@/lib/telemetry-processor";
import { generateTraceId, generateSpanId } from "@radarflow/sdk";
import { inArray } from "drizzle-orm";

export async function POST() {
  try {
    const defaultProject = (await db.select().from(projects).limit(1))[0];
    const projectId = defaultProject ? defaultProject.id : "prj_default";
    const now = Date.now();

    // 1. Reset all services to healthy status
    await db.update(services).set({ status: "healthy", lastHeartbeatAt: now, updatedAt: now });

    // 2. Resolve existing unresolved incidents for coherent healthy state
    await db
      .update(incidents)
      .set({ status: "resolved", resolvedAt: now })
      .where(inArray(incidents.status, ["investigating", "triggered", "acknowledged"]));

    const routes = [
      { path: "/api/products", method: "GET", svc: "api", baseLatency: 35 },
      { path: "/api/cart/items", method: "POST", svc: "api", baseLatency: 45 },
      { path: "/checkout/session", method: "POST", svc: "payments", baseLatency: 110 },
      { path: "/dashboard/overview", method: "GET", svc: "web", baseLatency: 22 },
      { path: "process_webhook_event", method: "QUEUE", svc: "worker", baseLatency: 65 },
    ];

    let totalSpans = 0;
    let totalLogs = 0;
    let totalMetrics = 0;

    for (let i = 0; i < 20; i++) {
      const route = routes[i % routes.length];
      const traceId = generateTraceId();
      const rootSpanId = generateSpanId();
      const dbSpanId = generateSpanId();
      const cacheSpanId = generateSpanId();

      const jitter = Math.floor(Math.random() * 15);
      const rootDuration = route.baseLatency + jitter;
      const dbDuration = Math.round(rootDuration * 0.55);
      const cacheDuration = Math.round(rootDuration * 0.15);

      const timestamp = now - (20 - i) * 3000;

      const batch = {
        service: route.svc,
        environment: "production",
        metrics: [
          {
            name: "http.request.duration",
            value: rootDuration,
            unit: "ms",
            tags: { route: route.path, method: route.method, status: "200" },
            timestamp,
          },
          {
            name: "http.error.rate",
            value: 0.1,
            unit: "%",
            tags: { service: route.svc },
            timestamp,
          },
          {
            name: "http.request.count",
            value: 1,
            tags: { route: route.path, status: "200" },
            timestamp,
          },
          {
            name: "cpu.usage",
            value: 18 + Math.random() * 10,
            unit: "%",
            tags: { service: route.svc },
            timestamp,
          },
        ],
        logs: [
          {
            level: "info" as const,
            message: `Completed ${route.method} ${route.path} - 200 OK (${rootDuration}ms)`,
            attributes: { "http.status_code": 200, "http.duration_ms": rootDuration },
            traceId,
            spanId: rootSpanId,
            timestamp,
          },
        ],
        spans: [
          {
            traceId,
            spanId: rootSpanId,
            name: `${route.method} ${route.path}`,
            kind: "server",
            startTime: timestamp,
            endTime: timestamp + rootDuration,
            durationMs: rootDuration,
            statusCode: "ok",
            attributes: { "http.method": route.method, "http.route": route.path, "http.status_code": 200 },
          },
          {
            traceId,
            spanId: cacheSpanId,
            parentSpanId: rootSpanId,
            name: "redis.get",
            kind: "client",
            startTime: timestamp + 2,
            endTime: timestamp + 2 + cacheDuration,
            durationMs: cacheDuration,
            statusCode: "ok",
            attributes: { "db.system": "redis", "db.operation": "GET" },
          },
          {
            traceId,
            spanId: dbSpanId,
            parentSpanId: rootSpanId,
            name: "postgres.query",
            kind: "client",
            startTime: timestamp + 2 + cacheDuration + 1,
            endTime: timestamp + 2 + cacheDuration + 1 + dbDuration,
            durationMs: dbDuration,
            statusCode: "ok",
            attributes: { "db.system": "postgresql", "db.statement": `SELECT * FROM ${route.path.split("/")[2] || "entities"}` },
          },
        ],
      };

      await processTelemetryBatch(projectId, batch);
      totalSpans += batch.spans.length;
      totalLogs += batch.logs.length;
      totalMetrics += batch.metrics.length;
    }

    return NextResponse.json({
      success: true,
      message: "Generated healthy demo telemetry (all services healthy, 0 incidents)",
      stats: { totalSpans, totalLogs, totalMetrics },
    });
  } catch (error) {
    console.error("[Generate Traffic Error]", error);
    return NextResponse.json({ error: "Failed to generate demo traffic" }, { status: 500 });
  }
}
