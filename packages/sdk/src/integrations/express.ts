import { RadarFlow } from "../client";

export interface ExpressRequestLike {
  method: string;
  url?: string;
  originalUrl?: string;
  path?: string;
  route?: { path?: string };
  headers: Record<string, string | string[] | undefined>;
  ip?: string;
}

export interface ExpressResponseLike {
  statusCode: number;
  on(event: string, callback: (...args: unknown[]) => void): void;
}

export type ExpressNextLike = (err?: unknown) => void;

export interface ExpressMiddlewareOptions {
  recordBodies?: boolean;
  ignorePaths?: (string | RegExp)[];
}

export function radarflowExpress(radar: RadarFlow, options?: ExpressMiddlewareOptions) {
  return function radarMiddleware(req: ExpressRequestLike, res: ExpressResponseLike, next: ExpressNextLike) {
    const path = req.path || req.url || "/";

    if (options?.ignorePaths?.some((p) => (typeof p === "string" ? p === path : p.test(path)))) {
      return next();
    }

    const startTime = Date.now();
    const span = radar.startSpan(`HTTP ${req.method} ${req.route?.path || req.path}`, {
      kind: "server",
      attributes: {
        "http.method": req.method,
        "http.url": req.originalUrl || req.url,
        "http.route": req.route?.path,
        "http.user_agent": req.headers["user-agent"],
        "http.client_ip": req.ip,
      },
    });

    res.on("finish", () => {
      const durationMs = Date.now() - startTime;
      const statusCode = res.statusCode || 200;

      span.setAttribute("http.status_code", statusCode);
      span.setAttribute("http.duration_ms", durationMs);

      if (statusCode >= 500) {
        span.setStatus("error", `HTTP ${statusCode}`);
      } else {
        span.setStatus("ok");
      }

      span.end();

      radar.trackMetric("http.request.duration", durationMs, {
        unit: "ms",
        tags: {
          method: req.method,
          status: String(statusCode),
          path: req.route?.path || "unknown",
        },
      });

      radar.trackMetric("http.request.count", 1, {
        tags: {
          method: req.method,
          status: String(statusCode),
        },
      });
    });

    next();
  };
}
