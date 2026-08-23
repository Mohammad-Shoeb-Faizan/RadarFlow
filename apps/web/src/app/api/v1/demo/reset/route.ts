import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { metrics, logs, traces, spans, incidents, incidentEvents, deployments, aiAnalyses, services } from "@/lib/db/schema";

export async function POST() {
  try {
    // Clear dynamic telemetry & incidents
    await db.delete(metrics).execute();
    await db.delete(logs).execute();
    await db.delete(traces).execute();
    await db.delete(spans).execute();
    await db.delete(incidents).execute();
    await db.delete(incidentEvents).execute();
    await db.delete(aiAnalyses).execute();
    await db.delete(deployments).execute();

    // Reset services to healthy
    await db.update(services).set({ status: "healthy", lastHeartbeatAt: Date.now() }).execute();

    return NextResponse.json({ success: true, message: "Telemetry and incidents reset" });
  } catch (error) {
    console.error("[Demo Reset Error]", error);
    return NextResponse.json({ error: "Failed to reset demo data" }, { status: 500 });
  }
}
