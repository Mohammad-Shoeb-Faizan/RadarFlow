import { db } from "./db";
import {
  services,
  metrics,
  logs,
  traces,
  spans,
} from "./db/schema";
import { eq, and } from "drizzle-orm";
import crypto from "crypto";
import { evaluateTelemetryForIncidents } from "./incident-engine";

export interface TelemetryIngestPayload {
  service: string;
  environment?: string;
  release?: string;
  metrics?: Array<{
    name: string;
    value: number;
    unit?: string;
    tags?: Record<string, any>;
    timestamp?: number;
  }>;
  logs?: Array<{
    level: "debug" | "info" | "warn" | "error" | "fatal";
    message: string;
    attributes?: Record<string, unknown>;
    traceId?: string;
    spanId?: string;
    timestamp?: number;
  }>;
  spans?: Array<{
    traceId: string;
    spanId: string;
    parentSpanId?: string;
    name: string;
    kind?: string;
    startTime: number;
    endTime?: number;
    durationMs?: number;
    statusCode?: string;
    statusMessage?: string;
    attributes?: Record<string, unknown>;
    events?: Array<{ name: string; timestamp: number; attributes?: Record<string, unknown> }>;
  }>;
  events?: Array<{
    name: string;
    attributes?: Record<string, unknown>;
    timestamp?: number;
  }>;
  sentAt?: number;
}

export async function processTelemetryBatch(projectId: string, payload: TelemetryIngestPayload) {
  const serviceName = payload.service || "default-service";
  const environment = payload.environment || "production";
  const now = Date.now();

  // 1. Upsert / heartbeat service
  const existingServices = await db
    .select()
    .from(services)
    .where(
      and(
        eq(services.projectId, projectId),
        eq(services.name, serviceName),
        eq(services.environment, environment)
      )
    )
    .limit(1);

  let serviceId = serviceName;
  if (existingServices.length === 0) {
    const newServiceId = `svc_${crypto.randomUUID().replace(/-/g, "").substring(0, 12)}`;
    await db.insert(services).values({
      id: newServiceId,
      projectId,
      name: serviceName,
      environment,
      status: "healthy",
      lastHeartbeatAt: now,
    });
  } else {
    await db
      .update(services)
      .set({ lastHeartbeatAt: now, updatedAt: now })
      .where(eq(services.id, existingServices[0].id));
  }

  // 2. Ingest Metrics
  if (payload.metrics && payload.metrics.length > 0) {
    for (const m of payload.metrics) {
      await db.insert(metrics).values({
        id: `met_${crypto.randomUUID().replace(/-/g, "").substring(0, 16)}`,
        projectId,
        serviceId: serviceName,
        environment,
        metricName: m.name,
        value: m.value,
        unit: m.unit || "",
        tags: m.tags ? JSON.stringify(m.tags) : null,
        timestamp: m.timestamp || now,
      });
    }
  }

  // 3. Ingest Logs
  if (payload.logs && payload.logs.length > 0) {
    for (const l of payload.logs) {
      await db.insert(logs).values({
        id: `log_${crypto.randomUUID().replace(/-/g, "").substring(0, 16)}`,
        projectId,
        serviceId: serviceName,
        environment,
        level: l.level,
        message: l.message,
        attributes: l.attributes ? JSON.stringify(l.attributes) : null,
        traceId: l.traceId || null,
        spanId: l.spanId || null,
        timestamp: l.timestamp || now,
      });
    }
  }

  // 4. Ingest Spans & Traces
  if (payload.spans && payload.spans.length > 0) {
    // Group spans by traceId
    const tracesMap = new Map<string, typeof payload.spans>();
    for (const span of payload.spans) {
      const list = tracesMap.get(span.traceId) || [];
      list.push(span);
      tracesMap.set(span.traceId, list);

      await db.insert(spans).values({
        id: `spn_${crypto.randomUUID().replace(/-/g, "").substring(0, 16)}`,
        traceId: span.traceId,
        spanId: span.spanId,
        parentSpanId: span.parentSpanId || null,
        projectId,
        serviceId: serviceName,
        environment,
        name: span.name,
        kind: span.kind || "internal",
        startTime: span.startTime,
        endTime: span.endTime || span.startTime + (span.durationMs || 0),
        durationMs: span.durationMs || 0,
        statusCode: span.statusCode || "unset",
        statusMessage: span.statusMessage || null,
        attributes: span.attributes ? JSON.stringify(span.attributes) : null,
        events: span.events ? JSON.stringify(span.events) : null,
      });
    }

    // Upsert parent trace summaries
    for (const [traceId, spanList] of tracesMap.entries()) {
      const rootSpan = spanList.find((s) => !s.parentSpanId) || spanList[0];
      const startTime = Math.min(...spanList.map((s) => s.startTime));
      const endTime = Math.max(...spanList.map((s) => s.endTime || s.startTime + (s.durationMs || 0)));
      const durationMs = Math.max(0, endTime - startTime);
      const errorCount = spanList.filter((s) => s.statusCode === "error").length;

      const existingTrace = await db
        .select()
        .from(traces)
        .where(eq(traces.traceId, traceId))
        .limit(1);

      if (existingTrace.length === 0) {
        await db.insert(traces).values({
          id: `trc_${crypto.randomUUID().replace(/-/g, "").substring(0, 16)}`,
          traceId,
          projectId,
          serviceId: serviceName,
          environment,
          rootSpanName: rootSpan.name,
          startTime,
          endTime,
          durationMs,
          statusCode: errorCount > 0 ? "error" : rootSpan.statusCode || "ok",
          errorCount,
          spanCount: spanList.length,
        });
      }
    }
  }

  // 5. Trigger Real-time Incident Rule Evaluation asynchronously
  evaluateTelemetryForIncidents(projectId, serviceName, environment).catch(() => {});

  return {
    success: true,
    processed: {
      metrics: payload.metrics?.length || 0,
      logs: payload.logs?.length || 0,
      spans: payload.spans?.length || 0,
    },
  };
}
