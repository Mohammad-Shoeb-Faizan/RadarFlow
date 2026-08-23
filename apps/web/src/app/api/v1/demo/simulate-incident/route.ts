import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { projects, deployments, incidents, incidentEvents, services } from "@/lib/db/schema";
import { processTelemetryBatch } from "@/lib/telemetry-processor";
import { generateTraceId, generateSpanId } from "@radarflow/sdk";
import crypto from "crypto";
import { eq, and } from "drizzle-orm";

export async function POST() {
  try {
    const defaultProject = (await db.select().from(projects).limit(1))[0];
    const projectId = defaultProject ? defaultProject.id : "prj_default";
    const now = Date.now();

    // 1. Record correlated deployment #482
    const depId = `dep_${crypto.randomUUID().replace(/-/g, "").substring(0, 16)}`;
    await db.insert(deployments).values({
      id: depId,
      projectId,
      serviceId: "api",
      environment: "production",
      version: "v2.14.0 (#482)",
      commitHash: "8f31ac28",
      commitMessage: "Migrate query builder for batch order reconciliation",
      deployedBy: "devops-lead@radarflow.io",
      status: "success",
      deployedAt: now - 8 * 60 * 1000,
    });

    // 2. Ingest high-latency and failing telemetry
    for (let i = 0; i < 15; i++) {
      const traceId = generateTraceId();
      const rootSpanId = generateSpanId();
      const dbSpanId = generateSpanId();
      const timestamp = now - (15 - i) * 10000;

      const isFailing = i >= 6;
      const duration = isFailing ? 612 + Math.floor(Math.random() * 120) : 380 + Math.floor(Math.random() * 80);

      const batch = {
        service: "api",
        environment: "production",
        metrics: [
          {
            name: "http.request.duration",
            value: duration,
            unit: "ms",
            tags: { route: "/api/orders", method: "GET", status: isFailing ? "504" : "200" },
            timestamp,
          },
          {
            name: "db.connection.active",
            value: 94 + Math.floor(Math.random() * 5),
            unit: "connections",
            tags: { pool: "primary-pg", max: "100" },
            timestamp,
          },
          {
            name: "http.error.rate",
            value: 7.2,
            unit: "%",
            tags: { service: "api" },
            timestamp,
          },
        ],
        logs: isFailing
          ? [
              {
                level: "error" as const,
                message: "Database connection timeout: pool exhausted (94/100 active connections in use)",
                attributes: {
                  "db.error": "PoolAcquisitionTimeoutError",
                  "db.timeout_ms": 5000,
                  "http.route": "/api/orders",
                  "order.query": "SELECT * FROM orders WHERE status = 'pending' FOR UPDATE",
                },
                traceId,
                spanId: dbSpanId,
                timestamp,
              },
            ]
          : [
              {
                level: "warn" as const,
                message: "Slow database query detected: 318ms on /api/orders",
                attributes: { "db.duration_ms": 318 },
                traceId,
                spanId: dbSpanId,
                timestamp,
              },
            ],
        spans: [
          {
            traceId,
            spanId: rootSpanId,
            name: "GET /api/orders",
            kind: "server",
            startTime: timestamp,
            endTime: timestamp + duration,
            durationMs: duration,
            statusCode: isFailing ? "error" : "ok",
            statusMessage: isFailing ? "HTTP 504 Gateway Timeout" : undefined,
            attributes: { "http.route": "/api/orders", "http.status_code": isFailing ? 504 : 200 },
          },
          {
            traceId,
            spanId: dbSpanId,
            parentSpanId: rootSpanId,
            name: "postgres.query orders.findPending",
            kind: "client",
            startTime: timestamp + 25,
            endTime: timestamp + 25 + (isFailing ? 5000 : 318),
            durationMs: isFailing ? 5000 : 318,
            statusCode: isFailing ? "error" : "ok",
            statusMessage: isFailing ? "Connection acquisition timeout" : undefined,
            attributes: { "db.system": "postgresql", "db.pool_usage": "94%" },
          },
        ],
      };

      await processTelemetryBatch(projectId, batch);
    }

    // 3. Create Incident #1042
    const existingIncidents = await db.select().from(incidents);
    const incidentNumber = 1042;
    const incidentId = `inc_${crypto.randomUUID().replace(/-/g, "").substring(0, 16)}`;

    await db.insert(incidents).values({
      id: incidentId,
      incidentNumber,
      projectId,
      serviceId: "api",
      environment: "production",
      title: "API latency spike & database connection pool saturation",
      severity: "critical",
      status: "investigating",
      triggerReason: "API response latency rose to 612ms (+312%) and error rate reached 7.2% (+680%) following deployment #482",
      impactedMetrics: JSON.stringify([
        { name: "http.request.duration", value: 612, unit: "ms", baselineValue: 180, deltaPercent: 240 },
        { name: "http.error.rate", value: 7.2, unit: "%", baselineValue: 0.4, deltaPercent: 1700 },
        { name: "db.connection.active", value: 94, unit: "connections", baselineValue: 32, deltaPercent: 193 },
      ]),
      firstDetectedAt: now - 6 * 60 * 1000,
      acknowledgedAt: now - 4 * 60 * 1000,
    });

    // Timeline events
    await db.insert(incidentEvents).values([
      {
        id: `ev_${crypto.randomUUID().replace(/-/g, "").substring(0, 16)}`,
        incidentId,
        eventType: "deployment_correlated",
        message: "Deployment #482 (8f31ac2) completed for api service",
        metadata: JSON.stringify({ version: "v2.14.0 (#482)", commit: "8f31ac28" }),
        createdAt: now - 8 * 60 * 1000,
      },
      {
        id: `ev_${crypto.randomUUID().replace(/-/g, "").substring(0, 16)}`,
        incidentId,
        eventType: "metric_breach",
        message: "p95 response latency exceeded 500ms threshold (measured 612ms)",
        metadata: JSON.stringify({ latency: 612, threshold: 500 }),
        createdAt: now - 6 * 60 * 1000,
      },
      {
        id: `ev_${crypto.randomUUID().replace(/-/g, "").substring(0, 16)}`,
        incidentId,
        eventType: "metric_breach",
        message: "Error rate rose to 7.2% with database pool timeouts",
        metadata: JSON.stringify({ errorRate: 7.2, poolUtilization: "94%" }),
        createdAt: now - 5 * 60 * 1000,
      },
      {
        id: `ev_${crypto.randomUUID().replace(/-/g, "").substring(0, 16)}`,
        incidentId,
        eventType: "status_change",
        message: "Incident escalated to CRITICAL and set to Investigating",
        metadata: JSON.stringify({ status: "investigating" }),
        createdAt: now - 4 * 60 * 1000,
      },
    ]);

    await db
      .update(services)
      .set({ status: "critical", updatedAt: now })
      .where(and(eq(services.name, "api"), eq(services.environment, "production")));

    return NextResponse.json({
      success: true,
      incidentId,
      incidentNumber,
      message: "Realistic incident simulated successfully: Deployment #482 -> DB Pool Saturation -> Latency Spike -> Error Rate Surge",
    });
  } catch (error) {
    console.error("[Simulate Incident Error]", error);
    return NextResponse.json({ error: "Failed to simulate incident" }, { status: 500 });
  }
}
