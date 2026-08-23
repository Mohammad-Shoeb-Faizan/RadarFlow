import { RadarFlow } from "@radarflow/sdk";
import dotenv from "dotenv";

dotenv.config();

const apiKey = process.env.RADARFLOW_API_KEY || "rf_live_demo_key_12345";
const endpoint = process.env.RADARFLOW_ENDPOINT || "http://localhost:3000";

const mode = process.argv.find((arg) => arg.startsWith("--mode="))?.split("=")[1] || "normal";

console.log(`[RadarFlow Demo Generator] Initializing in ${mode.toUpperCase()} mode...`);
console.log(`[RadarFlow Demo Generator] Target endpoint: ${endpoint}`);

const radar = new RadarFlow({
  apiKey,
  endpoint,
  service: "api",
  environment: "production",
  debug: true,
});

async function runNormalTraffic() {
  console.log("-> Emitting normal traffic across web, api, and worker...");
  for (let i = 0; i < 10; i++) {
    await radar.trace("GET /api/products", async (span) => {
      span.setAttribute("http.method", "GET");
      span.setAttribute("http.route", "/api/products");
      span.setAttribute("http.status_code", 200);

      const child = span.startChildSpan("postgres.query");
      await new Promise((r) => setTimeout(r, 25));
      child.setAttribute("db.statement", "SELECT * FROM products LIMIT 20");
      child.end();
    });

    radar.trackMetric("http.request.duration", 35 + Math.floor(Math.random() * 20), {
      unit: "ms",
      tags: { route: "/api/products", status: "200" },
    });
    radar.info("Processed product listing request", { count: 20 });
  }

  await radar.flush();
  console.log("✓ Normal traffic batch emitted successfully.");
}

async function runIncidentSimulation() {
  console.log("-> Simulating database connection pool saturation incident...");

  for (let i = 0; i < 8; i++) {
    try {
      await radar.trace("POST /api/orders/checkout", async (span) => {
        span.setAttribute("order.id", `ord_${Date.now()}_${i}`);

        const dbSpan = span.startChildSpan("postgres.acquireConnection");
        dbSpan.setAttribute("db.pool_active", 94);
        dbSpan.setAttribute("db.pool_max", 100);

        if (i >= 3) {
          dbSpan.recordException("PoolAcquisitionTimeoutError: Connection pool exhausted");
          dbSpan.end();
          throw new Error("PoolAcquisitionTimeoutError: DB connection timed out after 5000ms");
        } else {
          dbSpan.end();
        }
      });
    } catch (err) {
      radar.captureError(err, {
        message: "Database connection acquisition failure during checkout",
        attributes: { pool: "primary-pg", active: 94, max: 100 },
      });
    }

    radar.trackMetric("http.request.duration", 612 + Math.floor(Math.random() * 80), {
      unit: "ms",
      tags: { route: "/api/orders/checkout", status: i >= 3 ? "504" : "200" },
    });
    radar.trackMetric("db.connection.active", 94, { unit: "connections" });
  }

  await radar.flush();
  console.log("✓ Incident telemetry emitted successfully. Check RadarFlow Incidents dashboard.");
}

async function main() {
  if (mode === "incident") {
    await runIncidentSimulation();
  } else {
    await runNormalTraffic();
  }
  await radar.shutdown();
  process.exit(0);
}

main().catch((err) => {
  console.error("Demo generator failed:", err);
  process.exit(1);
});
