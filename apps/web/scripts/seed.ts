import { db, ensureDbInitialized } from "../src/lib/db";
import {
  users,
  organizations,
  organizationMembers,
  projects,
  services,
  apiKeys,
  alertRules,
  deployments,
} from "../src/lib/db/schema";
import { hashPassword } from "../src/lib/auth";
import { hashApiKey } from "../src/lib/api-keys";
import { processTelemetryBatch } from "../src/lib/telemetry-processor";
import { generateTraceId, generateSpanId } from "@radarflow/sdk";

async function main() {
  console.log("🌱 Seeding RadarFlow database with realistic baseline telemetry...");
  await ensureDbInitialized();

  const now = Date.now();
  const userId = "usr_admin";
  const orgId = "org_radarflow";
  const projectId = "prj_default";

  // 1. Create Default User
  const passwordHash = await hashPassword("admin123");
  await db.insert(users).values({
    id: userId,
    email: "admin@radarflow.io",
    passwordHash,
    name: "Alex Dev",
    role: "owner",
  }).onConflictDoNothing();

  // 2. Organization & Membership
  await db.insert(organizations).values({
    id: orgId,
    name: "RadarFlow Team",
    slug: "radarflow-team",
  }).onConflictDoNothing();

  await db.insert(organizationMembers).values({
    id: "mem_owner",
    organizationId: orgId,
    userId,
    role: "owner",
  }).onConflictDoNothing();

  // 3. Project
  await db.insert(projects).values({
    id: projectId,
    organizationId: orgId,
    name: "Production Cloud",
    slug: "production-cloud",
    description: "Core e-commerce and microservices infrastructure",
  }).onConflictDoNothing();

  // 4. API Key
  const rawKey = "rf_live_radarflow_master_key_1042";
  await db.insert(apiKeys).values({
    id: "key_master",
    projectId,
    name: "Production Ingestion Master",
    keyPrefix: "rf_live_ra",
    keyHash: hashApiKey(rawKey),
    lastUsedAt: now,
  }).onConflictDoNothing();

  // 5. Monitored Services
  const initialServices = [
    { id: "svc_web", name: "web", framework: "Next.js", language: "typescript" },
    { id: "svc_api", name: "api", framework: "Express", language: "typescript" },
    { id: "svc_worker", name: "worker", framework: "BullMQ", language: "typescript" },
    { id: "svc_payments", name: "payments", framework: "Gin", language: "go" },
  ];

  for (const svc of initialServices) {
    await db.insert(services).values({
      id: svc.id,
      projectId,
      name: svc.name,
      environment: "production",
      status: "healthy",
      framework: svc.framework,
      language: svc.language,
      lastHeartbeatAt: now,
    }).onConflictDoNothing();
  }

  // 6. Alert Rules
  await db.insert(alertRules).values([
    {
      id: "rule_err_rate",
      projectId,
      serviceId: "api",
      environment: "production",
      name: "High API Error Rate (> 5%)",
      metricName: "http.error.rate",
      condition: "gt",
      threshold: 5.0,
      severity: "critical",
      durationSeconds: 300,
      isEnabled: 1,
    },
    {
      id: "rule_latency",
      projectId,
      serviceId: "api",
      environment: "production",
      name: "Elevated p95 Latency (> 500ms)",
      metricName: "http.request.duration",
      condition: "gt",
      threshold: 500,
      severity: "high",
      durationSeconds: 300,
      isEnabled: 1,
    },
  ]).onConflictDoNothing();

  // 7. Recent Deployments
  await db.insert(deployments).values([
    {
      id: "dep_481",
      projectId,
      serviceId: "api",
      environment: "production",
      version: "v2.13.0 (#481)",
      commitHash: "3f9a20b1",
      commitMessage: "Refactor session cache middleware",
      deployedBy: "ci/github-actions",
      status: "success",
      deployedAt: now - 3 * 60 * 60 * 1000,
    },
  ]).onConflictDoNothing();

  // 8. Generate baseline telemetry for the past 30 minutes in compact steps
  console.log("-> Populating baseline telemetry...");
  const routes = [
    { path: "/api/products", method: "GET", svc: "api", baseLatency: 32 },
    { path: "/api/orders", method: "GET", svc: "api", baseLatency: 48 },
    { path: "/checkout/session", method: "POST", svc: "payments", baseLatency: 110 },
    { path: "/dashboard", method: "GET", svc: "web", baseLatency: 22 },
  ];

  for (let i = 15; i >= 0; i--) {
    const time = now - i * 2 * 60 * 1000;
    for (const route of routes) {
      const traceId = generateTraceId();
      const rootSpanId = generateSpanId();
      const dbSpanId = generateSpanId();
      const latency = route.baseLatency + Math.floor(Math.random() * 15);

      await processTelemetryBatch(projectId, {
        service: route.svc,
        environment: "production",
        metrics: [
          {
            name: "http.request.duration",
            value: latency,
            unit: "ms",
            tags: { route: route.path, method: route.method },
            timestamp: time,
          },
          {
            name: "http.error.rate",
            value: 0.2,
            unit: "%",
            tags: { service: route.svc },
            timestamp: time,
          },
          {
            name: "http.request.count",
            value: 20,
            tags: { service: route.svc },
            timestamp: time,
          },
        ],
        logs: [
          {
            level: "info",
            message: `${route.method} ${route.path} completed in ${latency}ms`,
            attributes: { "http.status": 200, "http.duration_ms": latency },
            traceId,
            spanId: rootSpanId,
            timestamp: time,
          },
        ],
        spans: [
          {
            traceId,
            spanId: rootSpanId,
            name: `${route.method} ${route.path}`,
            kind: "server",
            startTime: time,
            endTime: time + latency,
            durationMs: latency,
            statusCode: "ok",
            attributes: { "http.route": route.path, "http.method": route.method },
          },
          {
            traceId,
            spanId: dbSpanId,
            parentSpanId: rootSpanId,
            name: "postgres.query",
            kind: "client",
            startTime: time + 5,
            endTime: time + 5 + Math.round(latency * 0.6),
            durationMs: Math.round(latency * 0.6),
            statusCode: "ok",
            attributes: { "db.system": "postgresql" },
          },
        ],
      });
    }
  }

  console.log("✓ Database seed complete!");
  console.log(`Login credentials: admin@radarflow.io / admin123`);
  console.log(`Master API Key: ${rawKey}`);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
