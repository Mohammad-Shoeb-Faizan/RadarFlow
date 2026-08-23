import { RadarFlow } from "@radarflow/sdk";
import dotenv from "dotenv";

dotenv.config();

const apiKey = process.env.RADARFLOW_API_KEY || "rf_live_demo_12345";
const endpoint = process.env.RADARFLOW_ENDPOINT || "http://localhost:3000";

const radar = new RadarFlow({
  apiKey,
  endpoint,
  service: "store-api",
  environment: "production",
});

console.log("RadarFlow Demo App running and instrumented.");
console.log("Press Ctrl+C to stop.");

// Periodic background telemetry
setInterval(async () => {
  const duration = 25 + Math.floor(Math.random() * 30);
  radar.trackMetric("http.request.duration", duration, { unit: "ms", tags: { route: "/health" } });
  radar.info("Service health check OK");
}, 5000);
