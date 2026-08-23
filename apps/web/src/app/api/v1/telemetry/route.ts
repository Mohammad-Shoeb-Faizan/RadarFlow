import { NextRequest, NextResponse } from "next/server";
import { verifyApiKey } from "@/lib/api-keys";
import { processTelemetryBatch } from "@/lib/telemetry-processor";
import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";

export async function POST(req: NextRequest) {
  try {
    const rawApiKey = req.headers.get("x-radarflow-key") || req.headers.get("authorization")?.replace("Bearer ", "");

    let projectId: string | null = null;

    if (rawApiKey) {
      const verified = await verifyApiKey(rawApiKey);
      if (!verified) {
        return NextResponse.json(
          { error: { code: "UNAUTHORIZED", message: "Invalid or revoked RadarFlow API Key" } },
          { status: 401 }
        );
      }
      projectId = verified.projectId;
    } else {
      // If no key provided: allow local development demo fallback only in non-production
      if (process.env.NODE_ENV === "production") {
        return NextResponse.json(
          { error: { code: "UNAUTHORIZED", message: "Missing RadarFlow API Key. Provide via 'x-radarflow-key' header." } },
          { status: 401 }
        );
      }
      const defaultProject = (await db.select().from(projects).limit(1))[0];
      if (defaultProject) {
        projectId = defaultProject.id;
      } else {
        return NextResponse.json(
          { error: { code: "UNAUTHORIZED", message: "No active project found for unauthenticated telemetry" } },
          { status: 401 }
        );
      }
    }

    let payload: any;
    try {
      payload = await req.json();
    } catch {
      return NextResponse.json(
        { error: { code: "INVALID_JSON", message: "Malformed JSON payload in request body" } },
        { status: 400 }
      );
    }

    if (!payload || typeof payload !== "object") {
      return NextResponse.json(
        { error: { code: "INVALID_PAYLOAD", message: "Payload must be a JSON object" } },
        { status: 400 }
      );
    }

    if (!projectId) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Failed to resolve project identifier" } },
        { status: 401 }
      );
    }

    const result = await processTelemetryBatch(projectId, payload);

    return NextResponse.json(result, { status: 202 });
  } catch (error) {
    console.error("[Telemetry Ingestion Error]", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to process telemetry batch" } },
      { status: 500 }
    );
  }
}
