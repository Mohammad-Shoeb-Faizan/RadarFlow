import { db } from "./db";
import {
  incidents,
  incidentEvents,
  deployments,
  logs,
  traces,
  spans,
  metrics,
  services,
  alertRules,
} from "./db/schema";
import { eq, and, desc, gte } from "drizzle-orm";
import crypto from "crypto";

export async function evaluateTelemetryForIncidents(
  projectId: string,
  serviceId: string,
  environment: string
) {
  // Check active rules for this service/environment
  const rules = await db
    .select()
    .from(alertRules)
    .where(
      and(
        eq(alertRules.projectId, projectId),
        eq(alertRules.serviceId, serviceId),
        eq(alertRules.environment, environment),
        eq(alertRules.isEnabled, 1)
      )
    );

  const windowStart = Date.now() - 5 * 60 * 1000; // 5 min window

  // Calculate recent error rate
  const recentLogs = await db
    .select()
    .from(logs)
    .where(
      and(
        eq(logs.projectId, projectId),
        eq(logs.serviceId, serviceId),
        eq(logs.environment, environment),
        gte(logs.timestamp, windowStart)
      )
    );

  const errorCount = recentLogs.filter((l) => l.level === "error" || l.level === "fatal").length;
  const totalLogs = Math.max(1, recentLogs.length);
  const errorRate = (errorCount / totalLogs) * 100;

  // Calculate recent latency metrics
  const latencyMetrics = await db
    .select()
    .from(metrics)
    .where(
      and(
        eq(metrics.projectId, projectId),
        eq(metrics.serviceId, serviceId),
        eq(metrics.environment, environment),
        eq(metrics.metricName, "http.request.duration"),
        gte(metrics.timestamp, windowStart)
      )
    );

  const avgLatency =
    latencyMetrics.length > 0
      ? latencyMetrics.reduce((sum, m) => sum + m.value, 0) / latencyMetrics.length
      : 0;

  // Check if an open incident already exists
  const openIncidents = await db
    .select()
    .from(incidents)
    .where(
      and(
        eq(incidents.projectId, projectId),
        eq(incidents.serviceId, serviceId),
        eq(incidents.environment, environment)
      )
    );

  const activeIncident = openIncidents.find((inc) => inc.status !== "resolved");

  // Threshold 1: Error rate > 5% with at least 3 errors
  if (errorRate >= 5 && errorCount >= 3 && !activeIncident) {
    await createTriggeredIncident({
      projectId,
      serviceId,
      environment,
      title: `${serviceId} elevated error rate (${errorRate.toFixed(1)}%)`,
      severity: errorRate > 20 ? "critical" : "high",
      triggerReason: `Error rate exceeded threshold: ${errorRate.toFixed(1)}% (Total errors: ${errorCount})`,
      impactedMetrics: [
        { name: "http.error.rate", value: Number(errorRate.toFixed(1)), unit: "%" },
        { name: "http.request.duration", value: Number(avgLatency.toFixed(0)), unit: "ms" },
      ],
    });
  } else if (avgLatency > 500 && latencyMetrics.length >= 3 && !activeIncident) {
    // Threshold 2: Latency spike > 500ms
    await createTriggeredIncident({
      projectId,
      serviceId,
      environment,
      title: `${serviceId} high response latency (${avgLatency.toFixed(0)}ms)`,
      severity: avgLatency > 1500 ? "critical" : "high",
      triggerReason: `Average HTTP latency rose to ${avgLatency.toFixed(0)}ms in recent 5-minute window`,
      impactedMetrics: [
        { name: "http.request.duration", value: Number(avgLatency.toFixed(0)), unit: "ms" },
        { name: "http.error.rate", value: Number(errorRate.toFixed(1)), unit: "%" },
      ],
    });
  }
}

export async function createTriggeredIncident(params: {
  projectId: string;
  serviceId: string;
  environment: string;
  title: string;
  severity: "low" | "medium" | "high" | "critical";
  triggerReason: string;
  impactedMetrics: Array<{ name: string; value: number; unit?: string }>;
}) {
  const existingCount = (await db.select().from(incidents)).length;
  const incidentNumber = 1000 + existingCount + 1;
  const incidentId = `inc_${crypto.randomUUID().replace(/-/g, "").substring(0, 16)}`;
  const now = Date.now();

  await db.insert(incidents).values({
    id: incidentId,
    incidentNumber,
    projectId: params.projectId,
    serviceId: params.serviceId,
    environment: params.environment,
    title: params.title,
    severity: params.severity,
    status: "triggered",
    triggerReason: params.triggerReason,
    impactedMetrics: JSON.stringify(params.impactedMetrics),
    firstDetectedAt: now,
  });

  // Add initial timeline event
  await db.insert(incidentEvents).values({
    id: `ev_${crypto.randomUUID().replace(/-/g, "").substring(0, 16)}`,
    incidentId,
    eventType: "metric_breach",
    message: `Incident triggered: ${params.triggerReason}`,
    metadata: JSON.stringify({ severity: params.severity }),
  });

  // Correlate with recent deployments (within last 60 minutes)
  const recentDeployments = await db
    .select()
    .from(deployments)
    .where(
      and(
        eq(deployments.projectId, params.projectId),
        eq(deployments.serviceId, params.serviceId),
        gte(deployments.deployedAt, now - 60 * 60 * 1000)
      )
    )
    .orderBy(desc(deployments.deployedAt))
    .limit(1);

  if (recentDeployments.length > 0) {
    const dep = recentDeployments[0];
    await db.insert(incidentEvents).values({
      id: `ev_${crypto.randomUUID().replace(/-/g, "").substring(0, 16)}`,
      incidentId,
      eventType: "deployment_correlated",
      message: `Correlated recent deployment ${dep.version} (${dep.commitHash.substring(0, 7)}) deployed ${Math.round((now - dep.deployedAt) / 60000)}m ago`,
      metadata: JSON.stringify(dep),
    });
  }

  // Update service health status
  await db
    .update(services)
    .set({
      status: params.severity === "critical" ? "critical" : "degraded",
      updatedAt: now,
    })
    .where(
      and(
        eq(services.projectId, params.projectId),
        eq(services.name, params.serviceId),
        eq(services.environment, params.environment)
      )
    );

  return incidentId;
}
