import crypto from "crypto";
import { db } from "./db";
import { apiKeys, projects } from "./db/schema";
import { eq, and, isNull } from "drizzle-orm";

export function generateRawApiKey(environment: "production" | "development" = "production"): string {
  const prefix = environment === "production" ? "rf_live_" : "rf_test_";
  const randomBytes = crypto.randomBytes(24).toString("hex");
  return `${prefix}${randomBytes}`;
}

export function hashApiKey(rawKey: string): string {
  return crypto.createHash("sha256").update(rawKey).digest("hex");
}

export function maskApiKey(rawKey: string): string {
  if (rawKey.length <= 12) return rawKey;
  const prefix = rawKey.substring(0, 8);
  return `${prefix}${"•".repeat(20)}`;
}

export async function createApiKey(projectId: string, name: string, isLive = true) {
  const rawKey = generateRawApiKey(isLive ? "production" : "development");
  const keyHash = hashApiKey(rawKey);
  const keyPrefix = rawKey.substring(0, 10);
  const id = `key_${crypto.randomUUID().replace(/-/g, "").substring(0, 16)}`;

  await db.insert(apiKeys).values({
    id,
    projectId,
    name,
    keyPrefix,
    keyHash,
  });

  return {
    id,
    projectId,
    name,
    rawKey, // Only returned once upon creation!
    keyPrefix,
  };
}

export async function verifyApiKey(rawKey: string): Promise<{ projectId: string; keyId: string } | null> {
  if (!rawKey || (!rawKey.startsWith("rf_live_") && !rawKey.startsWith("rf_test_"))) {
    return null;
  }

  const keyHash = hashApiKey(rawKey);
  const matchedKeys = await db
    .select()
    .from(apiKeys)
    .where(and(eq(apiKeys.keyHash, keyHash), isNull(apiKeys.revokedAt)))
    .limit(1);

  if (matchedKeys.length === 0) {
    return null;
  }

  const apiKey = matchedKeys[0];

  // Update last used timestamp asynchronously
  db.update(apiKeys)
    .set({ lastUsedAt: Date.now() })
    .where(eq(apiKeys.id, apiKey.id))
    .execute()
    .catch(() => {});

  return {
    projectId: apiKey.projectId,
    keyId: apiKey.id,
  };
}

export async function revokeApiKey(keyId: string, projectId: string) {
  return db
    .update(apiKeys)
    .set({ revokedAt: Date.now() })
    .where(and(eq(apiKeys.id, keyId), eq(apiKeys.projectId, projectId)))
    .execute();
}
