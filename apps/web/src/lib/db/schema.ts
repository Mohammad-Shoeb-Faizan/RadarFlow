import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  role: text("role").default("admin").notNull(),
  avatarUrl: text("avatar_url"),
  createdAt: integer("created_at").notNull().default(sql`(strftime('%s', 'now') * 1000)`),
  updatedAt: integer("updated_at").notNull().default(sql`(strftime('%s', 'now') * 1000)`),
});

export const organizations = sqliteTable("organizations", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  createdAt: integer("created_at").notNull().default(sql`(strftime('%s', 'now') * 1000)`),
  updatedAt: integer("updated_at").notNull().default(sql`(strftime('%s', 'now') * 1000)`),
});

export const organizationMembers = sqliteTable("organization_members", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").notNull(),
  userId: text("user_id").notNull(),
  role: text("role").notNull().default("member"), // owner | admin | member | viewer
  createdAt: integer("created_at").notNull().default(sql`(strftime('%s', 'now') * 1000)`),
});

export const projects = sqliteTable("projects", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").notNull(),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  description: text("description"),
  createdAt: integer("created_at").notNull().default(sql`(strftime('%s', 'now') * 1000)`),
  updatedAt: integer("updated_at").notNull().default(sql`(strftime('%s', 'now') * 1000)`),
});

export const services = sqliteTable("services", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull(),
  name: text("name").notNull(),
  environment: text("environment").notNull().default("production"), // production | staging | development
  status: text("status").notNull().default("healthy"), // healthy | degraded | critical | unknown
  language: text("language").default("typescript"),
  framework: text("framework").default("nextjs"),
  lastHeartbeatAt: integer("last_heartbeat_at"),
  createdAt: integer("created_at").notNull().default(sql`(strftime('%s', 'now') * 1000)`),
  updatedAt: integer("updated_at").notNull().default(sql`(strftime('%s', 'now') * 1000)`),
});

export const apiKeys = sqliteTable("api_keys", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull(),
  name: text("name").notNull(),
  keyPrefix: text("key_prefix").notNull(), // e.g. "rf_live_abc1..."
  keyHash: text("key_hash").notNull(),     // SHA-256 / bcrypt hash
  lastUsedAt: integer("last_used_at"),
  expiresAt: integer("expires_at"),
  revokedAt: integer("revoked_at"),
  createdAt: integer("created_at").notNull().default(sql`(strftime('%s', 'now') * 1000)`),
});

export const metrics = sqliteTable("metrics", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull(),
  serviceId: text("service_id").notNull(),
  environment: text("environment").notNull().default("production"),
  metricName: text("metric_name").notNull(),
  value: real("value").notNull(),
  unit: text("unit"),
  tags: text("tags"), // JSON string
  timestamp: integer("timestamp").notNull(),
});

export const logs = sqliteTable("logs", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull(),
  serviceId: text("service_id").notNull(),
  environment: text("environment").notNull().default("production"),
  level: text("level").notNull(), // debug | info | warn | error | fatal
  message: text("message").notNull(),
  attributes: text("attributes"), // JSON string
  traceId: text("trace_id"),
  spanId: text("span_id"),
  timestamp: integer("timestamp").notNull(),
});

export const traces = sqliteTable("traces", {
  id: text("id").primaryKey(),
  traceId: text("trace_id").notNull().unique(),
  projectId: text("project_id").notNull(),
  serviceId: text("service_id").notNull(),
  environment: text("environment").notNull().default("production"),
  rootSpanName: text("root_span_name").notNull(),
  startTime: integer("start_time").notNull(),
  endTime: integer("end_time").notNull(),
  durationMs: real("duration_ms").notNull(),
  statusCode: text("status_code").notNull().default("unset"), // ok | error | unset
  errorCount: integer("error_count").notNull().default(0),
  spanCount: integer("span_count").notNull().default(1),
  createdAt: integer("created_at").notNull().default(sql`(strftime('%s', 'now') * 1000)`),
});

export const spans = sqliteTable("spans", {
  id: text("id").primaryKey(),
  traceId: text("trace_id").notNull(),
  spanId: text("span_id").notNull(),
  parentSpanId: text("parent_span_id"),
  projectId: text("project_id").notNull(),
  serviceId: text("service_id").notNull(),
  environment: text("environment").notNull().default("production"),
  name: text("name").notNull(),
  kind: text("kind").default("internal"),
  startTime: integer("start_time").notNull(),
  endTime: integer("end_time"),
  durationMs: real("duration_ms").default(0),
  statusCode: text("status_code").default("unset"),
  statusMessage: text("status_message"),
  attributes: text("attributes"), // JSON string
  events: text("events"),         // JSON string
});

export const incidents = sqliteTable("incidents", {
  id: text("id").primaryKey(),
  incidentNumber: integer("incident_number").notNull(),
  projectId: text("project_id").notNull(),
  serviceId: text("service_id").notNull(),
  environment: text("environment").notNull().default("production"),
  title: text("title").notNull(),
  severity: text("severity").notNull(), // low | medium | high | critical
  status: text("status").notNull(),     // triggered | acknowledged | investigating | resolved
  triggerReason: text("trigger_reason").notNull(),
  impactedMetrics: text("impacted_metrics"), // JSON string
  firstDetectedAt: integer("first_detected_at").notNull(),
  acknowledgedAt: integer("acknowledged_at"),
  resolvedAt: integer("resolved_at"),
  createdAt: integer("created_at").notNull().default(sql`(strftime('%s', 'now') * 1000)`),
  updatedAt: integer("updated_at").notNull().default(sql`(strftime('%s', 'now') * 1000)`),
});

export const incidentEvents = sqliteTable("incident_events", {
  id: text("id").primaryKey(),
  incidentId: text("incident_id").notNull(),
  eventType: text("event_type").notNull(), // status_change | comment | ai_analysis | metric_breach | deployment_correlated
  message: text("message").notNull(),
  metadata: text("metadata"), // JSON string
  createdAt: integer("created_at").notNull().default(sql`(strftime('%s', 'now') * 1000)`),
});

export const alertRules = sqliteTable("alert_rules", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull(),
  serviceId: text("service_id").notNull(),
  environment: text("environment").notNull().default("production"),
  name: text("name").notNull(),
  metricName: text("metric_name").notNull(),
  condition: text("condition").notNull(), // gt | lt | gte | lte | eq
  threshold: real("threshold").notNull(),
  durationSeconds: integer("duration_seconds").notNull().default(300),
  severity: text("severity").notNull().default("high"), // low | medium | high | critical
  isEnabled: integer("is_enabled").notNull().default(1),
  createdAt: integer("created_at").notNull().default(sql`(strftime('%s', 'now') * 1000)`),
  updatedAt: integer("updated_at").notNull().default(sql`(strftime('%s', 'now') * 1000)`),
});

export const deployments = sqliteTable("deployments", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull(),
  serviceId: text("service_id").notNull(),
  environment: text("environment").notNull().default("production"),
  version: text("version").notNull(),
  commitHash: text("commit_hash").notNull(),
  commitMessage: text("commit_message"),
  deployedBy: text("deployed_by").notNull(),
  status: text("status").notNull().default("success"), // success | failed | in_progress
  deployedAt: integer("deployed_at").notNull(),
  createdAt: integer("created_at").notNull().default(sql`(strftime('%s', 'now') * 1000)`),
});

export const aiAnalyses = sqliteTable("ai_analyses", {
  id: text("id").primaryKey(),
  incidentId: text("incident_id").notNull(),
  provider: text("provider").notNull(), // gemini | openai | noop
  model: text("model").notNull(),
  likelyCause: text("likely_cause").notNull(),
  confidence: integer("confidence").notNull(), // 0-100%
  evidenceList: text("evidence_list").notNull(), // JSON string array
  recommendedActions: text("recommended_actions").notNull(), // JSON string array
  rawResponse: text("raw_response"), // JSON string
  createdAt: integer("created_at").notNull().default(sql`(strftime('%s', 'now') * 1000)`),
});
