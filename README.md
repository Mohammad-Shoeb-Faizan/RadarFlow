<div align="center">

# RadarFlow

**Open-source observability for modern applications.**

*See what's happening. Find out why.*

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-blue?logo=typescript)](https://www.typescriptlang.org/)
[![OpenTelemetry](https://img.shields.io/badge/OpenTelemetry-Compatible-purple?logo=opentelemetry)](https://opentelemetry.io/)
[![Next.js 15](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker)](https://www.docker.com/)

[Quick Start](#-quick-start) • [Architecture](#-architecture) • [SDK Usage](#-sdk-usage) • [AI Investigation](#-ai-incident-analysis) • [Self-Hosting](#-docker-setup)

</div>

---

## ⚡ Overview

**RadarFlow** is a serious, self-hostable open-source observability platform built for modern engineering teams. It brings together distributed tracing (OpenTelemetry-compatible), structured log exploration, time-series metrics, automated incident breach detection, release correlation, and optional AI-assisted root cause analysis into a cohesive developer-grade dashboard.

### Core Capabilities

- 📊 **Real-Time Metrics**: Time-series charts for throughput, error rates, p50/p95/p99 latency distributions, database connection pool utilization, and CPU.
- 📜 **Structured Log Explorer**: High-density log streaming with multi-level filtering (`DEBUG`, `INFO`, `WARN`, `ERROR`, `FATAL`), free-text & regex search, time range windowing, and JSON attribute inspectors.
- 🌳 **Distributed Tracing & Waterfall**: Hierarchical span execution visualizer with parent/child trees, timing bars, slow query highlights, and deep linking from logs.
- 🚨 **Automated Incident System**: Real-time rule evaluation detects error rate breaches (> 5%) and latency spikes, correlates them with recent code releases, and tracks timeline events.
- 🤖 **Optional AI Root Cause Analysis**: Pluggable provider abstraction with Google Gemini support. Synthesizes anomalous metrics, deployment commits, exception stack traces, and slow spans into structured findings with confidence metrics and actionable investigation steps.
- 📦 **TypeScript SDK (`@radarflow/sdk`)**: Typed, non-blocking telemetry client with automatic memory batching, retries, and Express / Next.js route wrappers.
- 🎮 **Built-in Demo Generator**: Instant "Generate Demo Traffic" and "Simulate Incident" triggers to demonstrate the entire platform immediately without external setup.

---

## 🏗️ Architecture

```
Application / Service
       ↓ (@radarflow/sdk / OTLP)
Ingestion API (/api/v1/telemetry)
       ↓
Rate Limiter & Ingestion Pipeline
       ↓
Relational Storage (PostgreSQL / SQLite via Drizzle ORM)
       ↓
Incident Detection & Release Correlator
       ↓
Developer Dashboard & Optional Gemini AI RCA
```

See [docs/architecture.md](docs/architecture.md) for full architectural design and sequence diagrams.

---

## 🚀 Quick Start

### Option 1: Docker Compose (Recommended for Self-Hosting)

```bash
# 1. Clone repository
git clone https://github.com/radarflow/radarflow.git
cd radarflow

# 2. Copy environment template
cp .env.example .env

# 3. Start full platform with Postgres and Redis
docker compose up -d
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

### Option 2: Local Development

```bash
# 1. Install dependencies
pnpm install

# 2. Seed realistic baseline data
pnpm run db:seed

# 3. Start Next.js development server
pnpm dev
```

Visit [http://localhost:3000](http://localhost:3000).

Default credentials:
- **Email**: `admin@radarflow.io`
- **Password**: `admin123`

---

## 📦 SDK Usage (`@radarflow/sdk`)

Install the official lightweight SDK in your application:

```bash
npm install @radarflow/sdk
# or
pnpm add @radarflow/sdk
```

### Initialize Client

```typescript
import { RadarFlow } from "@radarflow/sdk";

const radar = new RadarFlow({
  apiKey: process.env.RADARFLOW_API_KEY!,
  endpoint: process.env.RADARFLOW_ENDPOINT || "http://localhost:3000",
  service: "api-gateway",
  environment: "production",
});
```

### 1. Tracking Metrics

```typescript
radar.trackMetric("http.request.duration", 421, {
  unit: "ms",
  tags: { route: "/api/orders", status: "200" },
});
```

### 2. Capturing Errors & Exceptions

```typescript
try {
  await database.connect();
} catch (error) {
  radar.captureError(error, {
    message: "Database connection timeout",
    attributes: { pool: "primary-pg", host: "db-1" },
  });
}
```

### 3. Distributed Tracing

```typescript
await radar.trace("processOrder", async (span) => {
  span.setAttribute("order.id", "ord_78912");

  // Child span
  const dbSpan = span.startChildSpan("postgres.query");
  const order = await db.query("SELECT * FROM orders WHERE id = $1", ["ord_78912"]);
  dbSpan.end();

  return order;
});
```

---

## 🤖 AI Incident Analysis

RadarFlow provides optional AI root-cause analysis powered by Google Gemini:

1. Add your key to `.env`:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   ```
2. Navigate to any incident (e.g. **Incident #1042**).
3. Click **"Analyze Root Cause"**.
4. RadarFlow provides:
   - **Likely Technical Cause** (e.g. *"Database connection exhaustion following deployment #482"*).
   - **Confidence Score** (e.g. `87%`).
   - **Concrete Evidence Points** drawn from real metric deltas and error logs.
   - **Recommended Investigation Steps**.

> **Note**: RadarFlow functions completely without an AI key. AI is an enhancement, not a requirement.

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| `⌘ K` or `Ctrl K` | Open Command Palette |
| `G` then `O` | Navigate to Overview |
| `G` then `S` | Navigate to Services |
| `G` then `I` | Navigate to Incidents |
| `G` then `L` | Navigate to Logs Explorer |
| `G` then `M` | Navigate to Metrics |
| `G` then `T` | Navigate to Traces |
| `G` then `D` | Navigate to Deployments |
| `?` | Open Keyboard Shortcuts Help |

---

## 🧪 Testing

```bash
# Run SDK unit tests
pnpm --filter @radarflow/sdk test

# Run type check
pnpm typecheck
```

---

## 📄 License

RadarFlow is open-source software licensed under the [MIT License](LICENSE).
