import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiKeys, projects } from "@/lib/db/schema";
import { eq, desc, isNull } from "drizzle-orm";
import { createApiKey, revokeApiKey, maskApiKey } from "@/lib/api-keys";

export async function GET(req: NextRequest) {
  try {
    const defaultProject = (await db.select().from(projects).limit(1))[0];
    if (!defaultProject) {
      return NextResponse.json({ keys: [] });
    }

    const keys = await db
      .select()
      .from(apiKeys)
      .where(isNull(apiKeys.revokedAt))
      .orderBy(desc(apiKeys.createdAt));

    return NextResponse.json({
      keys: keys.map((k) => ({
        id: k.id,
        name: k.name,
        maskedKey: maskApiKey(k.keyPrefix),
        keyPrefix: k.keyPrefix,
        lastUsedAt: k.lastUsedAt,
        createdAt: k.createdAt,
      })),
    });
  } catch (error) {
    console.error("[API Keys Query Error]", error);
    return NextResponse.json({ error: "Failed to fetch API keys" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, isLive } = body;

    const defaultProject = (await db.select().from(projects).limit(1))[0];
    if (!defaultProject) {
      return NextResponse.json({ error: "No active project found" }, { status: 400 });
    }

    const created = await createApiKey(
      defaultProject.id,
      name || "Default Telemetry Key",
      isLive !== false
    );

    return NextResponse.json({
      key: {
        id: created.id,
        name: created.name,
        rawKey: created.rawKey, // Returned ONLY at creation time!
        keyPrefix: created.keyPrefix,
      },
    }, { status: 201 });
  } catch (error) {
    console.error("[API Key Creation Error]", error);
    return NextResponse.json({ error: "Failed to create API key" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Key ID is required" }, { status: 400 });
    }

    const defaultProject = (await db.select().from(projects).limit(1))[0];
    if (!defaultProject) {
      return NextResponse.json({ error: "No active project" }, { status: 400 });
    }

    await revokeApiKey(id, defaultProject.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[API Key Revoke Error]", error);
    return NextResponse.json({ error: "Failed to revoke API key" }, { status: 500 });
  }
}
