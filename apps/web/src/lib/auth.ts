import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { db } from "./db";
import { users, organizations, organizationMembers, projects, apiKeys, services } from "./db/schema";
import { hashApiKey } from "./api-keys";
import { eq } from "drizzle-orm";

const JWT_SECRET = process.env.AUTH_SECRET || "radarflow-super-secret-key-change-in-production";
const COOKIE_NAME = "rf_session";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function createToken(payload: SessionUser): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): SessionUser | null {
  try {
    return jwt.verify(token, JWT_SECRET) as SessionUser;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;
    return verifyToken(token);
  } catch {
    return null;
  }
}

export async function authenticateRequest(req?: Request): Promise<SessionUser | null> {
  // Check Authorization Bearer header
  if (req) {
    const authHeader = req.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      const user = verifyToken(token);
      if (user) return user;
    }
  }

  // Fallback to cookie
  return getSession();
}

/**
 * Idempotently creates the default demo admin user, organization, project,
 * and baseline services in the database if they do not exist yet.
 */
export async function ensureDefaultUserAndOrg() {
  const adminEmail = (process.env.DEMO_ADMIN_EMAIL || "admin@radarflow.io").toLowerCase().trim();
  const adminPassword = process.env.DEMO_ADMIN_PASSWORD || "admin123";

  // Check if admin user already exists
  const existingUsers = await db.select().from(users).where(eq(users.email, adminEmail)).limit(1);
  if (existingUsers.length > 0) {
    const defaultOrg = (await db.select().from(organizations).limit(1))[0];
    const defaultProject = (await db.select().from(projects).limit(1))[0];
    return { user: existingUsers[0], org: defaultOrg, project: defaultProject };
  }

  // Create initial demo user and organization idempotently
  const userId = "usr_admin";
  const orgId = "org_radarflow";
  const projectId = "prj_default";
  const now = Date.now();

  const passwordHash = await hashPassword(adminPassword);

  await db.insert(users).values({
    id: userId,
    email: adminEmail,
    passwordHash,
    name: "Alex Dev",
    role: "owner",
  }).onConflictDoNothing();

  await db.insert(organizations).values({
    id: orgId,
    name: "RadarFlow Team",
    slug: "radarflow-team",
  }).onConflictDoNothing();

  await db.insert(organizationMembers).values({
    id: "mem_owner",
    organizationId: orgId,
    userId,
    role: "owner",
  }).onConflictDoNothing();

  await db.insert(projects).values({
    id: projectId,
    organizationId: orgId,
    name: "Production Cloud",
    slug: "production-cloud",
    description: "Core e-commerce and API microservices",
  }).onConflictDoNothing();

  // Create master API key for demo ingestion
  const rawKey = "rf_live_radarflow_master_key_1042";
  await db.insert(apiKeys).values({
    id: "key_master",
    projectId,
    name: "Production Ingestion Master",
    keyPrefix: "rf_live_ra",
    keyHash: hashApiKey(rawKey),
    lastUsedAt: now,
  }).onConflictDoNothing();

  // Create default services
  const initialServices = [
    { id: "svc_web", name: "web", framework: "Next.js", language: "typescript" },
    { id: "svc_api", name: "api", framework: "Express", language: "typescript" },
    { id: "svc_worker", name: "worker", framework: "BullMQ", language: "typescript" },
    { id: "svc_payments", name: "payments", framework: "Gin", language: "go" },
  ];

  for (const svc of initialServices) {
    await db.insert(services).values({
      id: svc.id,
      projectId,
      name: svc.name,
      environment: "production",
      status: "healthy",
      framework: svc.framework,
      language: svc.language,
      lastHeartbeatAt: now,
    }).onConflictDoNothing();
  }

  return {
    user: { id: userId, email: adminEmail, name: "Alex Dev", role: "owner" },
    org: { id: orgId, name: "RadarFlow Team", slug: "radarflow-team" },
    project: { id: projectId, name: "Production Cloud", slug: "production-cloud" },
  };
}
