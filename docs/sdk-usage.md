# @radarflow/sdk Usage Guide

The `@radarflow/sdk` is a lightweight, non-blocking TypeScript telemetry client designed to instrument web applications, API services, background workers, and microservices. It buffers metrics, logs, events, and distributed trace spans in memory and dispatches them asynchronously in batches to the RadarFlow ingestion API.

---

## 📦 Installation

Install `@radarflow/sdk` via your preferred package manager:

```bash
# npm
npm install @radarflow/sdk

# pnpm
pnpm add @radarflow/sdk

# yarn
yarn add @radarflow/sdk
```

---

## ⚙️ Initialization

Initialize the `RadarFlow` client once at application startup (or as a singleton module).

```typescript
import { RadarFlow } from "@radarflow/sdk";

export const radar = new RadarFlow({
  apiKey: process.env.RADARFLOW_API_KEY!,
  endpoint: process.env.RADARFLOW_ENDPOINT || "http://localhost:3000",
  service: "api-gateway",
  environment: process.env.NODE_ENV || "production",
  release: "v1.4.2", // Optional: links telemetry to deployments
});
```

### Configuration Options

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `apiKey` | `string` | **Required** | Hashed project API key (`rf_live_...`). |
| `endpoint` | `string` | `"http://localhost:3000"` | Base URL of your RadarFlow server instance. |
| `service` | `string` | `"default-service"` | Logical microservice name identifier. |
| `environment` | `string` | `"development"` | Environment tag (`"production"`, `"staging"`, `"development"`). |
| `release` | `string` | `undefined` | Version / git commit tag (e.g. `"v1.2.0"`). |
| `batchSize` | `number` | `50` | Maximum items buffered in memory before triggering an immediate flush. |
| `flushIntervalMs` | `number` | `2000` | Timer interval (in ms) to flush buffered telemetry in the background. |
| `enabled` | `boolean` | `true` | Set to `false` to disable telemetry collection in testing environments. |
| `debug` | `boolean` | `false` | Enable verbose console logs for SDK diagnostic troubleshooting. |
| `onError` | `(err: Error) => void` | `undefined` | Callback hook when an ingestion network error occurs. |

---

## 📊 1. Metric Tracking

Track numerical time-series values such as latencies, counters, pool sizes, and custom business KPIs using `trackMetric`:

```typescript
// Track response latency
radar.trackMetric("http.request.duration", 342, {
  unit: "ms",
  tags: { route: "/api/checkout", status: "200" },
});

// Track database connection pool saturation
radar.trackMetric("db.pool.active_connections", 84, {
  unit: "connections",
  tags: { pool: "primary-postgres", host: "db-node-01" },
});

// Track custom business counter
radar.trackMetric("billing.subscription.upgraded", 1, {
  tags: { tier: "enterprise", currency: "USD" },
});
```

---

## 📜 2. Structured Logging

Emit structured logs with multi-level severity (`debug`, `info`, `warn`, `error`, `fatal`). Logs support arbitrary JSON attributes and correlation with trace spans:

```typescript
// Standard structured log
radar.info("User completed checkout", {
  userId: "usr_9410",
  orderId: "ord_5521",
  amount: 149.00,
});

// Warning with context
radar.warn("High memory consumption detected", {
  heapUsedMb: 1420,
  thresholdMb: 1500,
});

// Generic log method with explicit trace correlation
radar.log("error", "Payment gateway timed out", {
  gateway: "stripe",
  attempt: 3,
}, {
  traceId: "tr_8c17b6059d28",
  spanId: "sp_4a12c8e3",
});
```

---

## 🚨 3. Error & Exception Capture

Capture caught exceptions or unhandled rejections using `captureError`. It extracts the error name, message, stack trace, and attaches optional attributes:

```typescript
try {
  await paymentGateway.charge(order);
} catch (error) {
  radar.captureError(error, {
    message: "Payment charge failed during checkout",
    attributes: {
      orderId: order.id,
      customerEmail: order.customerEmail,
      retryCount: 2,
    },
    traceId: currentTraceId,
  });

  throw error;
}
```

---

## ⚡ 4. Event Tracking

Track discrete application and business lifecycle events:

```typescript
radar.trackEvent("user.registered", {
  userId: "usr_102",
  plan: "pro",
  signupSource: "github_oauth",
});

radar.trackEvent("cache.cluster.invalidated", {
  region: "us-east-1",
  keyCount: 4500,
});
```

---

## 🌳 5. Distributed Tracing & Waterfall

RadarFlow provides an OpenTelemetry-compatible tracing model. You can trace operations using the high-level `trace()` wrapper or manually start and end `Span` instances.

### High-Level Tracing (`radar.trace`)

Wraps an async function in an active span, measures execution duration, captures unhandled exceptions, and marks status automatically:

```typescript
const order = await radar.trace("processOrder", async (span) => {
  span.setAttribute("order.id", "ord_9901");
  span.setAttribute("order.amount", 250);

  // Nested child span
  const user = await radar.trace("fetchCustomerProfile", async (childSpan) => {
    childSpan.setAttribute("user.id", "usr_102");
    return await db.users.findById("usr_102");
  }, { parentSpanId: span.spanId, traceId: span.traceId });

  // Charge payment
  await paymentService.charge(order);

  return order;
});
```

### Manual Span Management (`radar.startSpan`)

```typescript
import { generateTraceId, generateSpanId } from "@radarflow/sdk";

const span = radar.startSpan("database.query", {
  kind: "client",
  attributes: {
    "db.system": "postgresql",
    "db.statement": "SELECT * FROM products WHERE in_stock = true",
  },
});

try {
  const result = await db.products.findInStock();
  span.setStatus("ok");
  return result;
} catch (err) {
  span.recordException(err instanceof Error ? err : String(err));
  throw err;
} finally {
  span.end();
}
```

---

## 🌐 6. Framework Integrations

### Express Middleware (`radarflowExpress`)

Automatically records request spans, calculates execution latencies, status codes, and emits `http.request.duration` and `http.request.count` metrics:

```typescript
import express from "express";
import { RadarFlow, radarflowExpress } from "@radarflow/sdk";

const app = express();
const radar = new RadarFlow({
  apiKey: process.env.RADARFLOW_API_KEY!,
  service: "express-api",
});

// Attach middleware at the root
app.use(radarflowExpress(radar, {
  ignorePaths: ["/health", "/favicon.ico"],
}));

app.get("/api/products", (req, res) => {
  res.json({ products: [] });
});

app.listen(4000);
```

---

### Next.js Route Handler Wrapper (`withRadarFlowRoute`)

Wraps Next.js App Router API handlers (`route.ts`) to automatically track HTTP durations, statuses, and exceptions:

```typescript
// app/api/orders/route.ts
import { NextResponse } from "next/server";
import { RadarFlow, withRadarFlowRoute } from "@radarflow/sdk";

const radar = new RadarFlow({
  apiKey: process.env.RADARFLOW_API_KEY!,
  service: "nextjs-web",
});

export const POST = withRadarFlowRoute(
  radar,
  async (request: Request) => {
    const body = await request.json();
    // Process order...
    return NextResponse.json({ success: true, orderId: "ord_101" });
  },
  "API POST /api/orders"
);
```

---

## 🔄 7. Batching & Manual Flush

The SDK maintains an in-memory buffer and flushes automatically when:
1. The buffer reaches `batchSize` items (default: `50`).
2. The periodic timer expires (`flushIntervalMs`: default `2000ms`).

In serverless functions, Lambda handlers, or CLI scripts where the runtime terminates after execution, call `flush()` before exiting:

```typescript
// Serverless / Job handler
export async function handler() {
  try {
    await processJob();
  } finally {
    // Ensure all remaining telemetry is sent before runtime exits
    await radar.flush();
  }
}
```

---

## 🛠️ Troubleshooting

- **Telemetry Not Appearing**: Check that `apiKey` is valid and begins with `rf_live_`. Enable `debug: true` in your configuration to inspect outbound batches.
- **Connection Refused**: Verify that `endpoint` matches the host and port of your RadarFlow server (e.g. `http://localhost:3000` or `https://radarflow.yourcompany.com`).
- **Serverless Early Exits**: Always `await radar.flush()` in serverless teardown hooks or `process.on('beforeExit')`.
