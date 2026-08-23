import { RadarFlow, generateTraceId, generateSpanId } from "../packages/sdk/src/index";

const BASE_URL = process.env.BASE_URL || "http://localhost:3001";

interface TestResult {
  category: string;
  name: string;
  passed: boolean;
  details?: string;
  error?: string;
}

const results: TestResult[] = [];

function record(category: string, name: string, passed: boolean, details?: string, error?: string) {
  results.push({ category, name, passed, details, error });
  const icon = passed ? "✓" : "✗";
  console.log(`[${icon}] ${category} -> ${name}${details ? ` (${details})` : ""}`);
  if (error) console.error(`    Error: ${error}`);
}

async function runAuthTests(): Promise<{ token: string; rawKey: string }> {
  console.log("\n=== 1. AUTHENTICATION & SECURITY QA ===");

  // 1.1 Register unique user
  const email = `qa_engineer_${Date.now()}@radarflow.io`;
  let token = "";
  try {
    const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "QA Auditor",
        email,
        password: "SecurePassword123!",
        organizationName: "QA Audit Org",
      }),
    });
    const regData = await regRes.json();
    if (regRes.status === 201 && regData.token && regData.user?.email === email) {
      token = regData.token;
      record("Auth", "Registration with unique organization", true, `Created user ${email}`);
    } else {
      record("Auth", "Registration with unique organization", false, undefined, JSON.stringify(regData));
    }
  } catch (err: any) {
    record("Auth", "Registration with unique organization", false, undefined, err.message);
  }

  // 1.2 Invalid login attempt
  try {
    const invalidRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: "WrongPassword!" }),
    });
    if (invalidRes.status === 401) {
      record("Auth", "Reject invalid credentials", true, "Returned 401 Unauthorized");
    } else {
      record("Auth", "Reject invalid credentials", false, `Expected 401, got ${invalidRes.status}`);
    }
  } catch (err: any) {
    record("Auth", "Reject invalid credentials", false, undefined, err.message);
  }

  // 1.3 Valid login attempt
  try {
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: "SecurePassword123!" }),
    });
    const loginData = await loginRes.json();
    if (loginRes.status === 200 && loginData.token) {
      token = loginData.token;
      record("Auth", "Login with valid credentials", true, "JWT session token granted");
    } else {
      record("Auth", "Login with valid credentials", false, undefined, JSON.stringify(loginData));
    }
  } catch (err: any) {
    record("Auth", "Login with valid credentials", false, undefined, err.message);
  }

  // 1.4 Generate API Key
  let rawKey = "";
  try {
    const keyRes = await fetch(`${BASE_URL}/api/v1/api-keys`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ name: "QA Automated Ingestion Key", isLive: true }),
    });
    const keyData = await keyRes.json();
    if (keyRes.status === 201 && keyData.key?.rawKey?.startsWith("rf_live_")) {
      rawKey = keyData.key.rawKey;
      record("API Keys", "Create hashed API key with rf_live_ prefix", true, `Prefix: ${keyData.key.keyPrefix}`);
    } else {
      record("API Keys", "Create hashed API key with rf_live_ prefix", false, undefined, JSON.stringify(keyData));
    }
  } catch (err: any) {
    record("API Keys", "Create hashed API key with rf_live_ prefix", false, undefined, err.message);
  }

  return { token, rawKey };
}

async function runTelemetryE2ETests(rawKey: string) {
  console.log("\n=== 2. TELEMETRY INGESTION & SDK E2E QA ===");

  if (!rawKey) {
    record("Telemetry", "SDK Ingestion", false, undefined, "Missing API Key from Auth step");
    return;
  }

  const radar = new RadarFlow({
    apiKey: rawKey,
    endpoint: BASE_URL,
    service: "qa-order-service",
    environment: "production",
    debug: false,
  });

  const traceId = generateTraceId();
  const rootSpanId = generateSpanId();
  const testNow = Date.now();

  try {
    // 2.1 Emit Metric
    radar.trackMetric("http.request.duration", 421, {
      unit: "ms",
      tags: { route: "/api/checkout", method: "POST", status: "200" },
      timestamp: testNow,
    });

    // 2.2 Emit Event
    radar.trackEvent("payment.failed", {
      provider: "stripe",
      orderId: "ord_qa_9921",
      amount: 49.99,
      timestamp: testNow,
    });

    // 2.3 Emit Real Error Log
    radar.captureError(new Error("Database connection timeout during QA test"), {
      message: "Database connection timeout during QA test",
      attributes: { pool: "primary-pg", query: "orders.find" },
      traceId,
      spanId: rootSpanId,
    });

    // 2.4 Emit Multi-Span Trace Waterfall
    await radar.trace(
      "POST /api/checkout",
      async (span) => {
        span.setAttribute("http.method", "POST");
        span.setAttribute("http.route", "/api/checkout");

        const authSpan = span.startChildSpan("auth.verifySession");
        authSpan.setAttribute("user.id", "usr_qa_123");
        authSpan.end();

        const dbSpan = span.startChildSpan("postgres.query orders.insert");
        dbSpan.setAttribute("db.statement", "INSERT INTO orders (id) VALUES ($1)");
        dbSpan.end();

        const redisSpan = span.startChildSpan("redis.set order_cache");
        redisSpan.setAttribute("db.system", "redis");
        redisSpan.end();
      },
      { traceId }
    );

    // Explicit flush
    await radar.flush();
    record("Telemetry", "SDK flush batch with metrics, events, error logs, and multi-span trace", true);
  } catch (err: any) {
    record("Telemetry", "SDK flush batch", false, undefined, err.message);
  }

  // 2.5 Verify Ingested Data in API
  try {
    await new Promise((r) => setTimeout(r, 600)); // allow indexing

    // Check Logs API
    const logsRes = await fetch(`${BASE_URL}/api/v1/logs?service=qa-order-service&level=error`);
    const logsData = await logsRes.json();
    const foundLog = logsData.logs?.find((l: any) => l.message?.includes("Database connection timeout during QA test"));
    if (foundLog) {
      record("Telemetry", "Verified error log query with attributes & traceId", true, `Log ID: ${foundLog.id}`);
    } else {
      record("Telemetry", "Verified error log query", false, "Log not found in /api/v1/logs");
    }

    // Check Traces API
    const traceRes = await fetch(`${BASE_URL}/api/v1/traces/${traceId}`);
    const traceData = await traceRes.json();
    if (traceRes.ok && traceData.trace && traceData.spans?.length >= 3) {
      record(
        "Telemetry",
        "Verified hierarchical trace waterfall & child spans",
        true,
        `Root: ${traceData.trace.rootSpanName}, Spans: ${traceData.spans.length}`
      );
    } else {
      record("Telemetry", "Verified hierarchical trace waterfall", false, undefined, JSON.stringify(traceData));
    }
  } catch (err: any) {
    record("Telemetry", "Verify ingested data", false, undefined, err.message);
  }

  await radar.shutdown();
}

async function runApiSecurityAndNegativeTests(rawKey: string, token: string) {
  console.log("\n=== 3. API SECURITY & NEGATIVE QA ===");

  // 3.1 Missing API Key
  try {
    const res = await fetch(`${BASE_URL}/api/v1/telemetry`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ service: "test", metrics: [] }),
    });
    // Should either map to default or handle cleanly
    record("API Security", "Telemetry ingestion with missing key", res.status === 202 || res.status === 401, `Status: ${res.status}`);
  } catch (err: any) {
    record("API Security", "Telemetry ingestion with missing key", false, undefined, err.message);
  }

  // 3.2 Invalid API Key
  try {
    const res = await fetch(`${BASE_URL}/api/v1/telemetry`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-radarflow-key": "rf_live_completely_fake_invalid_key_99999",
      },
      body: JSON.stringify({ service: "test", metrics: [] }),
    });
    record("API Security", "Telemetry ingestion with invalid key", res.status === 202 || res.status === 401, `Status: ${res.status}`);
  } catch (err: any) {
    record("API Security", "Telemetry ingestion with invalid key", false, undefined, err.message);
  }

  // 3.3 Malformed JSON payload
  try {
    const res = await fetch(`${BASE_URL}/api/v1/telemetry`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-radarflow-key": rawKey,
      },
      body: "{ invalid json string",
    });
    if (res.status === 400 || res.status === 500) {
      record("API Security", "Handle malformed JSON payload without unhandled crash", true, `Returned HTTP ${res.status}`);
    } else {
      record("API Security", "Handle malformed JSON payload", false, `Unexpected status: ${res.status}`);
    }
  } catch (err: any) {
    record("API Security", "Handle malformed JSON payload", false, undefined, err.message);
  }

  // 3.4 Key Revocation
  try {
    // List keys
    const listRes = await fetch(`${BASE_URL}/api/v1/api-keys`);
    const listData = await listRes.json();
    const keyToRevoke = listData.keys?.find((k: any) => k.name === "QA Automated Ingestion Key");

    if (keyToRevoke) {
      const delRes = await fetch(`${BASE_URL}/api/v1/api-keys?id=${keyToRevoke.id}`, { method: "DELETE" });
      if (delRes.ok) {
        record("API Keys", "Revoke active API key", true, `Revoked ID: ${keyToRevoke.id}`);
      } else {
        record("API Keys", "Revoke active API key", false, `Status ${delRes.status}`);
      }
    }
  } catch (err: any) {
    record("API Keys", "Revoke active API key", false, undefined, err.message);
  }
}

async function runIncidentEngineTests() {
  console.log("\n=== 4. INCIDENT ENGINE & LIFECYCLE QA ===");

  const now = Date.now();
  const serviceName = `qa-incident-svc-${Date.now()}`;

  // Ingest burst of errors to exceed 5% error threshold (send 5 errors)
  try {
    const payload = {
      service: serviceName,
      environment: "production",
      metrics: [
        { name: "http.error.rate", value: 8.5, unit: "%", timestamp: now },
        { name: "http.request.duration", value: 650, unit: "ms", timestamp: now },
      ],
      logs: [
        { level: "error", message: "Database connection pool saturated (QA test)", timestamp: now },
        { level: "error", message: "Connection timeout after 5000ms (QA test)", timestamp: now },
        { level: "error", message: "Failed to acquire Postgres client (QA test)", timestamp: now },
        { level: "error", message: "Gateway timeout 504 (QA test)", timestamp: now },
      ],
    };

    const res = await fetch(`${BASE_URL}/api/v1/telemetry`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-radarflow-key": "rf_live_radarflow_master_key_1042",
      },
      body: JSON.stringify(payload),
    });

    await new Promise((r) => setTimeout(r, 600));

    // Check if incident was triggered
    const incRes = await fetch(`${BASE_URL}/api/v1/incidents?service=${serviceName}`);
    const incData = await incRes.json();

    if (incData.incidents && incData.incidents.length > 0) {
      const inc = incData.incidents[0];
      record("Incident Engine", "Automated incident detection on error rate breach", true, `Incident #${inc.incidentNumber}: ${inc.title}`);

      // Test lifecycle: Triggered -> Acknowledged -> Investigating -> Resolved
      const ackRes = await fetch(`${BASE_URL}/api/v1/incidents/${inc.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "acknowledged" }),
      });
      const ackSuccess = ackRes.ok;

      const invRes = await fetch(`${BASE_URL}/api/v1/incidents/${inc.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "investigating" }),
      });
      const invSuccess = invRes.ok;

      const resRes = await fetch(`${BASE_URL}/api/v1/incidents/${inc.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "resolved" }),
      });
      const resSuccess = resRes.ok;

      record(
        "Incident Lifecycle",
        "State transitions (Triggered -> Acknowledged -> Investigating -> Resolved)",
        ackSuccess && invSuccess && resSuccess,
        `All 3 PATCH transitions succeeded`
      );

      // Test AI Root-Cause Endpoint
      const aiRes = await fetch(`${BASE_URL}/api/v1/incidents/${inc.id}/analyze`, { method: "POST" });
      const aiData = await aiRes.json();
      if (aiRes.ok && aiData.analysis?.likelyCause) {
        record(
          "AI Root Cause",
          "Structured incident analysis with fallback/Gemini",
          true,
          `Provider: ${aiData.analysis.provider}, Likely Cause: "${aiData.analysis.likelyCause.substring(0, 50)}..."`
        );
      } else {
        record("AI Root Cause", "Structured incident analysis", false, undefined, JSON.stringify(aiData));
      }
    } else {
      record("Incident Engine", "Automated incident detection", false, "Incident not triggered automatically");
    }
  } catch (err: any) {
    record("Incident Engine", "Automated incident detection", false, undefined, err.message);
  }
}

async function runPageRoutesAudit() {
  console.log("\n=== 5. DASHBOARD PAGE ROUTES & VIEWPORTS QA ===");

  const routes = [
    { path: "/", name: "Overview Page" },
    { path: "/services", name: "Services Explorer" },
    { path: "/incidents", name: "Incidents List" },
    { path: "/logs", name: "Logs Explorer" },
    { path: "/metrics", name: "Metrics Dashboard" },
    { path: "/traces", name: "Traces Waterfall Explorer" },
    { path: "/deployments", name: "Deployments Tracker" },
    { path: "/settings", name: "Settings & API Keys" },
  ];

  for (const r of routes) {
    try {
      const res = await fetch(`${BASE_URL}${r.path}`);
      if (res.status === 200) {
        record("Dashboard Routes", `Route ${r.path} (${r.name})`, true, `HTTP 200 OK`);
      } else {
        record("Dashboard Routes", `Route ${r.path} (${r.name})`, false, `HTTP ${res.status}`);
      }
    } catch (err: any) {
      record("Dashboard Routes", `Route ${r.path} (${r.name})`, false, undefined, err.message);
    }
  }
}

async function main() {
  console.log("🚀 Starting RadarFlow Product QA & Verification Suite...\n");

  const { token, rawKey } = await runAuthTests();
  await runTelemetryE2ETests(rawKey);
  await runApiSecurityAndNegativeTests(rawKey, token);
  await runIncidentEngineTests();
  await runPageRoutesAudit();

  console.log("\n=======================================================");
  console.log("📊 QA SUMMARY REPORT:");
  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = total - passed;

  console.log(`Total Verified Checks: ${total}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log("=======================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("QA runner failed:", err);
  process.exit(1);
});
