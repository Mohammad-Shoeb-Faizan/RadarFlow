import { RadarFlow } from "../client.js";

export function withRadarFlowRoute<T extends (...args: any[]) => any>(
  radar: RadarFlow,
  routeHandler: T,
  routeName?: string
): T {
  return (async (...args: any[]) => {
    const req = args[0] as Request | undefined;
    const method = req?.method || "GET";
    const url = req?.url ? new URL(req.url) : undefined;
    const name = routeName || `API ${method} ${url?.pathname || "route"}`;

    const startTime = Date.now();
    const span = radar.startSpan(name, {
      kind: "server",
      attributes: {
        "http.method": method,
        "http.url": url?.pathname,
      },
    });

    try {
      const response = await routeHandler(...args);
      const durationMs = Date.now() - startTime;
      const status = response instanceof Response ? response.status : 200;

      span.setAttribute("http.status_code", status);
      span.setAttribute("http.duration_ms", durationMs);
      if (status >= 500) {
        span.setStatus("error", `HTTP ${status}`);
      } else {
        span.setStatus("ok");
      }

      radar.trackMetric("http.request.duration", durationMs, {
        unit: "ms",
        tags: { method, status: String(status), route: name },
      });

      return response;
    } catch (error) {
      span.recordException(error instanceof Error ? error : String(error));
      radar.captureError(error, {
        message: `Unhandled exception in route ${name}`,
        attributes: { route: name, method },
      });
      throw error;
    } finally {
      span.end();
    }
  }) as unknown as T;
}
