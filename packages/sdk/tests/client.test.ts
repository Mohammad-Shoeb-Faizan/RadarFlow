import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { RadarFlow } from "../src/client.js";

describe("@radarflow/sdk RadarFlow Client", () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true }),
    });
    global.fetch = mockFetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should throw error if initialized without API key", () => {
    expect(() => new RadarFlow({ apiKey: "" })).toThrow("API key is required");
  });

  it("should initialize with correct default configuration", () => {
    const radar = new RadarFlow({
      apiKey: "rf_live_test_12345",
      service: "api-gateway",
    });
    expect(radar).toBeDefined();
  });

  it("should buffer and flush metrics accurately", async () => {
    const radar = new RadarFlow({
      apiKey: "rf_live_test_12345",
      endpoint: "http://localhost:3000",
      service: "payment-service",
      batchSize: 2,
    });

    radar.trackMetric("payment.latency", 240, { unit: "ms", tags: { gateway: "stripe" } });
    radar.trackMetric("payment.count", 1);

    // Auto-flush triggered by batchSize = 2
    await new Promise((r) => setTimeout(r, 50));

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe("http://localhost:3000/api/v1/telemetry");
    expect(options.headers["x-radarflow-key"]).toBe("rf_live_test_12345");

    const payload = JSON.parse(options.body);
    expect(payload.service).toBe("payment-service");
    expect(payload.metrics.length).toBe(2);
    expect(payload.metrics[0].name).toBe("payment.latency");
    expect(payload.metrics[0].value).toBe(240);

    await radar.shutdown();
  });

  it("should buffer logs and capture errors with stack traces", async () => {
    const radar = new RadarFlow({
      apiKey: "rf_live_test_12345",
      service: "auth-service",
    });

    radar.info("User logged in successfully", { userId: "usr_992" });
    radar.captureError(new Error("Database connection timed out"), {
      attributes: { host: "db-primary" },
    });

    await radar.flush();

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(payload.logs.length).toBe(2);
    expect(payload.logs[0].level).toBe("info");
    expect(payload.logs[0].message).toBe("User logged in successfully");

    expect(payload.logs[1].level).toBe("error");
    expect(payload.logs[1].message).toBe("Database connection timed out");
    expect(payload.logs[1].attributes["error.type"]).toBe("Error");
    expect(payload.logs[1].attributes["error.stack"]).toBeDefined();

    await radar.shutdown();
  });

  it("should execute trace and record duration and exception status", async () => {
    const radar = new RadarFlow({
      apiKey: "rf_live_test_12345",
      service: "order-service",
    });

    await expect(
      radar.trace("processOrder", async (span) => {
        span.setAttribute("order.id", "ord_777");
        throw new Error("Inventory depleted");
      })
    ).rejects.toThrow("Inventory depleted");

    await radar.flush();

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(payload.spans.length).toBe(1);
    expect(payload.spans[0].name).toBe("processOrder");
    expect(payload.spans[0].statusCode).toBe("error");
    expect(payload.spans[0].statusMessage).toBe("Inventory depleted");
    expect(payload.spans[0].attributes["order.id"]).toBe("ord_777");
    expect(payload.spans[0].durationMs).toBeGreaterThanOrEqual(0);

    await radar.shutdown();
  });
});
