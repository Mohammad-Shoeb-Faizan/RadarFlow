export type LogLevel = "debug" | "info" | "warn" | "error" | "fatal";
export type Environment = "development" | "staging" | "production" | string;

export interface RadarFlowConfig {
  apiKey: string;
  endpoint?: string;
  service?: string;
  environment?: Environment;
  release?: string;
  batchSize?: number;
  flushIntervalMs?: number;
  enabled?: boolean;
  debug?: boolean;
  onError?: (error: Error) => void;
}

export interface MetricPayload {
  name: string;
  value: number;
  unit?: string;
  tags?: Record<string, string | number | boolean>;
  timestamp?: number; // Epoch ms
}

export interface LogPayload {
  level: LogLevel;
  message: string;
  attributes?: Record<string, unknown>;
  traceId?: string;
  spanId?: string;
  timestamp?: number; // Epoch ms
  service?: string;
  environment?: string;
}

export interface SpanPayload {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  name: string;
  kind?: "server" | "client" | "internal" | "producer" | "consumer";
  startTime: number; // Epoch ms
  endTime?: number;  // Epoch ms
  durationMs?: number;
  statusCode?: "unset" | "ok" | "error";
  statusMessage?: string;
  attributes?: Record<string, unknown>;
  events?: Array<{
    name: string;
    timestamp: number;
    attributes?: Record<string, unknown>;
  }>;
  service?: string;
  environment?: string;
}

export interface EventPayload {
  name: string;
  attributes?: Record<string, unknown>;
  timestamp?: number;
  service?: string;
  environment?: string;
}

export interface TelemetryBatch {
  service: string;
  environment: string;
  release?: string;
  metrics: MetricPayload[];
  logs: LogPayload[];
  spans: SpanPayload[];
  events: EventPayload[];
  sentAt: number;
}
