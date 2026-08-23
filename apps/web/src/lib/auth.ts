import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { db } from "./db";
import { users, organizations, organizationMembers, projects } from "./db/schema";
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

export async function ensureDefaultUserAndOrg() {
  const existingUsers = await db.select().from(users).limit(1);
  if (existingUsers.length > 0) {
    const defaultOrg = (await db.select().from(organizations).limit(1))[0];
    const defaultProject = (await db.select().from(projects).limit(1))[0];
    return { user: existingUsers[0], org: defaultOrg, project: defaultProject };
  }

  // Create initial demo user and org
  const userId = "usr_admin";
  const orgId = "org_radarflow";
  const projectId = "prj_default";

  const passwordHash = await hashPassword("admin123");

  await db.insert(users).values({
    id: userId,
    email: "admin@radarflow.io",
    passwordHash,
    name: "Alex Dev",
    role: "owner",
  });

  await db.insert(organizations).values({
    id: orgId,
    name: "RadarFlow Team",
    slug: "radarflow-team",
  });

  await db.insert(organizationMembers).values({
    id: "mem_1",
    organizationId: orgId,
    userId,
    role: "owner",
  });

  await db.insert(projects).values({
    id: projectId,
    organizationId: orgId,
    name: "Production Cloud",
    slug: "production-cloud",
    description: "Core e-commerce and API microservices",
  });

  return {
    user: { id: userId, email: "admin@radarflow.io", name: "Alex Dev", role: "owner" },
    org: { id: orgId, name: "RadarFlow Team", slug: "radarflow-team" },
    project: { id: projectId, name: "Production Cloud", slug: "production-cloud" },
  };
}
