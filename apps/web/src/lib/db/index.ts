import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";
import path from "path";
import fs from "fs";

let dbInstance: ReturnType<typeof drizzle<typeof schema>> | null = null;
let clientInstance: ReturnType<typeof createClient> | null = null;
let initPromise: Promise<void> | null = null;

export function getDb() {
  if (dbInstance) return dbInstance;

  const dbDir = path.resolve(process.cwd(), "data");
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  const dbPath = path.resolve(dbDir, "radarflow.db");
  const url = process.env.DATABASE_URL || `file:${dbPath}`;

  clientInstance = createClient({
    url,
  });

  initPromise = initTables(clientInstance);
  dbInstance = drizzle(clientInstance, { schema });
  return dbInstance;
}

export async function ensureDbInitialized() {
  getDb();
  if (initPromise) {
    await initPromise;
  }
}

async function initTables(client: ReturnType<typeof createClient>) {
  try {
    await client.execute("PRAGMA journal_mode = WAL;");
    await client.execute("PRAGMA busy_timeout = 5000;");
  } catch {}

  const statements = [
    `CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'admin',
      avatar_url TEXT,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
      updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
    );`,
    `CREATE TABLE IF NOT EXISTS organizations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
      updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
    );`,
    `CREATE TABLE IF NOT EXISTS organization_members (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'member',
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
    );`,
    `CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL,
      name TEXT NOT NULL,
      slug TEXT NOT NULL,
      description TEXT,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
      updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
    );`,
    `CREATE TABLE IF NOT EXISTS services (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      name TEXT NOT NULL,
      environment TEXT NOT NULL DEFAULT 'production',
      status TEXT NOT NULL DEFAULT 'healthy',
      language TEXT DEFAULT 'typescript',
      framework TEXT DEFAULT 'nextjs',
      last_heartbeat_at INTEGER,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
      updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
    );`,
    `CREATE TABLE IF NOT EXISTS api_keys (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      name TEXT NOT NULL,
      key_prefix TEXT NOT NULL,
      key_hash TEXT NOT NULL,
      last_used_at INTEGER,
      expires_at INTEGER,
      revoked_at INTEGER,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
    );`,
    `CREATE TABLE IF NOT EXISTS metrics (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      service_id TEXT NOT NULL,
      environment TEXT NOT NULL DEFAULT 'production',
      metric_name TEXT NOT NULL,
      value REAL NOT NULL,
      unit TEXT,
      tags TEXT,
      timestamp INTEGER NOT NULL
    );`,
    `CREATE TABLE IF NOT EXISTS logs (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      service_id TEXT NOT NULL,
      environment TEXT NOT NULL DEFAULT 'production',
      level TEXT NOT NULL,
      message TEXT NOT NULL,
      attributes TEXT,
      trace_id TEXT,
      span_id TEXT,
      timestamp INTEGER NOT NULL
    );`,
    `CREATE TABLE IF NOT EXISTS traces (
      id TEXT PRIMARY KEY,
      trace_id TEXT NOT NULL UNIQUE,
      project_id TEXT NOT NULL,
      service_id TEXT NOT NULL,
      environment TEXT NOT NULL DEFAULT 'production',
      root_span_name TEXT NOT NULL,
      start_time INTEGER NOT NULL,
      end_time INTEGER NOT NULL,
      duration_ms REAL NOT NULL,
      status_code TEXT NOT NULL DEFAULT 'unset',
      error_count INTEGER NOT NULL DEFAULT 0,
      span_count INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
    );`,
    `CREATE TABLE IF NOT EXISTS spans (
      id TEXT PRIMARY KEY,
      trace_id TEXT NOT NULL,
      span_id TEXT NOT NULL,
      parent_span_id TEXT,
      project_id TEXT NOT NULL,
      service_id TEXT NOT NULL,
      environment TEXT NOT NULL DEFAULT 'production',
      name TEXT NOT NULL,
      kind TEXT DEFAULT 'internal',
      start_time INTEGER NOT NULL,
      end_time INTEGER,
      duration_ms REAL DEFAULT 0,
      status_code TEXT DEFAULT 'unset',
      status_message TEXT,
      attributes TEXT,
      events TEXT
    );`,
    `CREATE TABLE IF NOT EXISTS incidents (
      id TEXT PRIMARY KEY,
      incident_number INTEGER NOT NULL,
      project_id TEXT NOT NULL,
      service_id TEXT NOT NULL,
      environment TEXT NOT NULL DEFAULT 'production',
      title TEXT NOT NULL,
      severity TEXT NOT NULL,
      status TEXT NOT NULL,
      trigger_reason TEXT NOT NULL,
      impacted_metrics TEXT,
      first_detected_at INTEGER NOT NULL,
      acknowledged_at INTEGER,
      resolved_at INTEGER,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
      updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
    );`,
    `CREATE TABLE IF NOT EXISTS incident_events (
      id TEXT PRIMARY KEY,
      incident_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      message TEXT NOT NULL,
      metadata TEXT,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
    );`,
    `CREATE TABLE IF NOT EXISTS alert_rules (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      service_id TEXT NOT NULL,
      environment TEXT NOT NULL DEFAULT 'production',
      name TEXT NOT NULL,
      metric_name TEXT NOT NULL,
      condition TEXT NOT NULL,
      threshold REAL NOT NULL,
      duration_seconds INTEGER NOT NULL DEFAULT 300,
      severity TEXT NOT NULL DEFAULT 'high',
      is_enabled INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
      updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
    );`,
    `CREATE TABLE IF NOT EXISTS deployments (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      service_id TEXT NOT NULL,
      environment TEXT NOT NULL DEFAULT 'production',
      version TEXT NOT NULL,
      commit_hash TEXT NOT NULL,
      commit_message TEXT,
      deployed_by TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'success',
      deployed_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
    );`,
    `CREATE TABLE IF NOT EXISTS ai_analyses (
      id TEXT PRIMARY KEY,
      incident_id TEXT NOT NULL,
      provider TEXT NOT NULL,
      model TEXT NOT NULL,
      likely_cause TEXT NOT NULL,
      confidence INTEGER NOT NULL,
      evidence_list TEXT NOT NULL,
      recommended_actions TEXT NOT NULL,
      raw_response TEXT,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
    );`,
    `CREATE INDEX IF NOT EXISTS idx_metrics_project_time ON metrics(project_id, timestamp);`,
    `CREATE INDEX IF NOT EXISTS idx_logs_project_time ON logs(project_id, timestamp);`,
    `CREATE INDEX IF NOT EXISTS idx_traces_project ON traces(project_id, start_time);`,
    `CREATE INDEX IF NOT EXISTS idx_spans_trace ON spans(trace_id);`,
    `CREATE INDEX IF NOT EXISTS idx_incidents_project ON incidents(project_id, status);`,
  ];

  try {
    const check = await client.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='users'");
    if (check.rows.length > 0) return;
    await client.batch(statements.map((sql) => ({ sql, args: [] })));
  } catch (err: any) {
    if (err?.code !== "SQLITE_BUSY") {
      console.error("[Database Init Error]", err);
    }
  }
}

export const db = getDb();
