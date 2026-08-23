import { SpanPayload } from "./types";

function generateHexId(bytes: number): string {
  const chars = "0123456789abcdef";
  let result = "";
  for (let i = 0; i < bytes * 2; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

export function generateTraceId(): string {
  return generateHexId(16); // 128-bit hex
}

export function generateSpanId(): string {
  return generateHexId(8); // 64-bit hex
}

export interface SpanOptions {
  parentSpanId?: string;
  traceId?: string;
  kind?: SpanPayload["kind"];
  attributes?: Record<string, unknown>;
  startTime?: number;
}

export class Span {
  public readonly traceId: string;
  public readonly spanId: string;
  public readonly parentSpanId?: string;
  public readonly name: string;
  public readonly kind: SpanPayload["kind"];
  public readonly startTime: number;
  public endTime?: number;
  public durationMs?: number;
  public statusCode: SpanPayload["statusCode"] = "unset";
  public statusMessage?: string;
  public attributes: Record<string, unknown>;
  public events: Array<{ name: string; timestamp: number; attributes?: Record<string, unknown> }> = [];

  private onEndCallback: (span: SpanPayload) => void;

  constructor(
    name: string,
    options: SpanOptions,
    onEnd: (span: SpanPayload) => void
  ) {
    this.name = name;
    this.traceId = options.traceId || generateTraceId();
    this.spanId = generateSpanId();
    this.parentSpanId = options.parentSpanId;
    this.kind = options.kind || "internal";
    this.startTime = options.startTime || Date.now();
    this.attributes = { ...(options.attributes || {}) };
    this.onEndCallback = onEnd;
  }

  setAttribute(key: string, value: unknown): this {
    this.attributes[key] = value;
    return this;
  }

  setAttributes(attrs: Record<string, unknown>): this {
    Object.assign(this.attributes, attrs);
    return this;
  }

  addEvent(name: string, attributes?: Record<string, unknown>): this {
    this.events.push({
      name,
      timestamp: Date.now(),
      attributes,
    });
    return this;
  }

  setStatus(code: "ok" | "error" | "unset", message?: string): this {
    this.statusCode = code;
    this.statusMessage = message;
    return this;
  }

  recordException(error: Error | string, attributes?: Record<string, unknown>): this {
    this.statusCode = "error";
    const errorMessage = typeof error === "string" ? error : error.message;
    const errorStack = error instanceof Error ? error.stack : undefined;
    this.statusMessage = errorMessage;
    this.addEvent("exception", {
      "exception.message": errorMessage,
      "exception.stacktrace": errorStack,
      ...(attributes || {}),
    });
    return this;
  }

  end(endTime?: number): void {
    if (this.endTime) return; // Already ended
    this.endTime = endTime || Date.now();
    this.durationMs = Math.max(0, this.endTime - this.startTime);

    this.onEndCallback({
      traceId: this.traceId,
      spanId: this.spanId,
      parentSpanId: this.parentSpanId,
      name: this.name,
      kind: this.kind,
      startTime: this.startTime,
      endTime: this.endTime,
      durationMs: this.durationMs,
      statusCode: this.statusCode,
      statusMessage: this.statusMessage,
      attributes: this.attributes,
      events: this.events,
    });
  }

  startChildSpan(name: string, options?: Omit<SpanOptions, "parentSpanId" | "traceId">): Span {
    return new Span(
      name,
      {
        ...options,
        traceId: this.traceId,
        parentSpanId: this.spanId,
      },
      this.onEndCallback
    );
  }
}
