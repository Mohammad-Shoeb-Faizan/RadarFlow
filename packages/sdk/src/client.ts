import {
  RadarFlowConfig,
  MetricPayload,
  LogPayload,
  SpanPayload,
  EventPayload,
  TelemetryBatch,
  LogLevel,
} from "./types.js";
import { Span, SpanOptions } from "./tracer.js";

export class RadarFlow {
  private config: Required<Omit<RadarFlowConfig, "release" | "onError">> & {
    release?: string;
    onError?: (error: Error) => void;
  };
  private metricBuffer: MetricPayload[] = [];
  private logBuffer: LogPayload[] = [];
  private spanBuffer: SpanPayload[] = [];
  private eventBuffer: EventPayload[] = [];
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private isFlushing = false;
  private isShutdown = false;

  constructor(config: RadarFlowConfig) {
    if (!config || !config.apiKey) {
      throw new Error("[RadarFlow] API key is required to initialize RadarFlow SDK");
    }

    let endpoint = (config.endpoint || "http://localhost:3000").replace(/\/$/, "");
    if (!endpoint.startsWith("http://") && !endpoint.startsWith("https://")) {
      endpoint = `https://${endpoint}`;
    }

    const nodeEnv = typeof process !== "undefined" && process.env ? process.env.NODE_ENV : "development";
    const pkgVersion = typeof process !== "undefined" && process.env ? process.env.npm_package_version : undefined;

    this.config = {
      apiKey: config.apiKey,
      endpoint,
      service: config.service || "default-service",
      environment: config.environment || nodeEnv || "development",
      release: config.release || pkgVersion,
      batchSize: Math.max(1, config.batchSize || 50),
      flushIntervalMs: Math.max(500, config.flushIntervalMs || 2000),
      enabled: config.enabled !== false,
      debug: config.debug || false,
      onError: config.onError,
    };

    if (this.config.enabled && typeof window === "undefined") {
      this.startFlushTimer();
    }
  }

  private startFlushTimer(): void {
    if (this.flushTimer) return;
    this.flushTimer = setInterval(() => {
      this.flush().catch((err) => {
        this.handleInternalError(err);
      });
    }, this.config.flushIntervalMs);

    // Ensure timer doesn't block process exit in Node
    const timerObj = this.flushTimer as any;
    if (timerObj && typeof timerObj.unref === "function") {
      timerObj.unref();
    }
  }

  private handleInternalError(error: unknown): void {
    const err = error instanceof Error ? error : new Error(String(error));
    if (this.config.debug) {
      console.error("[RadarFlow Error]", err);
    }
    if (this.config.onError) {
      try {
        this.config.onError(err);
      } catch {
        // Suppress user onError exceptions
      }
    }
  }

  /**
   * Track a numerical metric (e.g. latency, request rate, custom KPI)
   */
  trackMetric(
    name: string,
    value: number,
    options?: {
      unit?: string;
      tags?: Record<string, string | number | boolean>;
      timestamp?: number;
    }
  ): void {
    if (!this.config.enabled || this.isShutdown) return;

    this.metricBuffer.push({
      name,
      value,
      unit: options?.unit,
      tags: options?.tags,
      timestamp: options?.timestamp || Date.now(),
    });

    this.checkAutoFlush();
  }

  /**
   * Log a structured message
   */
  log(
    level: LogLevel,
    message: string,
    attributes?: Record<string, unknown>,
    context?: { traceId?: string; spanId?: string; timestamp?: number }
  ): void {
    if (!this.config.enabled || this.isShutdown) return;

    this.logBuffer.push({
      level,
      message,
      attributes: attributes || {},
      traceId: context?.traceId,
      spanId: context?.spanId,
      timestamp: context?.timestamp || Date.now(),
      service: this.config.service,
      environment: this.config.environment,
    });

    this.checkAutoFlush();
  }

  debug(message: string, attributes?: Record<string, unknown>): void {
    this.log("debug", message, attributes);
  }

  info(message: string, attributes?: Record<string, unknown>): void {
    this.log("info", message, attributes);
  }

  warn(message: string, attributes?: Record<string, unknown>): void {
    this.log("warn", message, attributes);
  }

  error(message: string, attributes?: Record<string, unknown>): void {
    this.log("error", message, attributes);
  }

  fatal(message: string, attributes?: Record<string, unknown>): void {
    this.log("fatal", message, attributes);
  }

  /**
   * Capture an error or unhandled exception
   */
  captureError(
    error: Error | unknown,
    context?: {
      message?: string;
      attributes?: Record<string, unknown>;
      traceId?: string;
      spanId?: string;
    }
  ): void {
    if (!this.config.enabled || this.isShutdown) return;

    const isErrorObj = error instanceof Error;
    const errorMessage = context?.message || (isErrorObj ? error.message : String(error));
    const stack = isErrorObj ? error.stack : undefined;

    this.log(
      "error",
      errorMessage,
      {
        "error.type": isErrorObj ? error.name : "Error",
        "error.message": errorMessage,
        "error.stack": stack,
        ...(context?.attributes || {}),
      },
      {
        traceId: context?.traceId,
        spanId: context?.spanId,
      }
    );
  }

  /**
   * Track a custom business or lifecycle event
   */
  trackEvent(name: string, attributes?: Record<string, unknown>): void {
    if (!this.config.enabled || this.isShutdown) return;

    this.eventBuffer.push({
      name,
      attributes: attributes || {},
      timestamp: Date.now(),
      service: this.config.service,
      environment: this.config.environment,
    });

    this.checkAutoFlush();
  }

  /**
   * Start an OpenTelemetry-compatible span
   */
  startSpan(name: string, options?: SpanOptions): Span {
    return new Span(name, options || {}, (spanPayload) => {
      this.spanBuffer.push({
        ...spanPayload,
        service: spanPayload.service || this.config.service,
        environment: spanPayload.environment || this.config.environment,
      });
      this.checkAutoFlush();
    });
  }

  /**
   * Execute an async or sync function wrapped inside an active trace span
   */
  async trace<T>(
    name: string,
    fn: (span: Span) => Promise<T> | T,
    options?: SpanOptions
  ): Promise<T> {
    const span = this.startSpan(name, options);
    try {
      const result = await fn(span);
      if (span.statusCode === "unset") {
        span.setStatus("ok");
      }
      return result;
    } catch (err) {
      span.recordException(err instanceof Error ? err : String(err));
      throw err;
    } finally {
      span.end();
    }
  }

  private checkAutoFlush(): void {
    const totalBuffered =
      this.metricBuffer.length +
      this.logBuffer.length +
      this.spanBuffer.length +
      this.eventBuffer.length;

    if (totalBuffered >= this.config.batchSize) {
      this.flush().catch((err) => this.handleInternalError(err));
    }
  }

  /**
   * Flush all buffered telemetry immediately to the RadarFlow ingestion API
   */
  async flush(): Promise<void> {
    if (!this.config.enabled || this.isFlushing) return;

    const metrics = this.metricBuffer.splice(0, this.metricBuffer.length);
    const logs = this.logBuffer.splice(0, this.logBuffer.length);
    const spans = this.spanBuffer.splice(0, this.spanBuffer.length);
    const events = this.eventBuffer.splice(0, this.eventBuffer.length);

    if (metrics.length === 0 && logs.length === 0 && spans.length === 0 && events.length === 0) {
      return;
    }

    const payload: TelemetryBatch = {
      service: this.config.service,
      environment: this.config.environment,
      release: this.config.release,
      metrics,
      logs,
      spans,
      events,
      sentAt: Date.now(),
    };

    this.isFlushing = true;

    try {
      const url = `${this.config.endpoint}/api/v1/telemetry`;
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-radarflow-key": this.config.apiKey,
          "User-Agent": "@radarflow/sdk/0.1.0",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok && this.config.debug) {
        console.warn(`[RadarFlow] Telemetry flush returned HTTP ${response.status}`);
      }
    } catch (error) {
      // Re-queue items if network failure occurred and we're not shutting down
      if (!this.isShutdown && this.metricBuffer.length < 500) {
        this.metricBuffer.unshift(...metrics);
        this.logBuffer.unshift(...logs);
        this.spanBuffer.unshift(...spans);
        this.eventBuffer.unshift(...events);
      }
      this.handleInternalError(error);
    } finally {
      this.isFlushing = false;
    }
  }

  /**
   * Flush any remaining telemetry and stop timers
   */
  async shutdown(): Promise<void> {
    this.isShutdown = true;
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    await this.flush();
  }
}
