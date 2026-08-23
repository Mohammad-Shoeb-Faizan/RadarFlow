import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  incidents,
  incidentEvents,
  aiAnalyses,
  deployments,
  logs,
  traces,
  services,
} from "@/lib/db/schema";
import { eq, desc, and, gte, asc } from "drizzle-orm";
import crypto from "crypto";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const incident = (
      await db.select().from(incidents).where(eq(incidents.id, id)).limit(1)
    )[0];

    if (!incident) {
      return NextResponse.json({ error: "Incident not found" }, { status: 404 });
    }

    const events = await db
      .select()
      .from(incidentEvents)
      .where(eq(incidentEvents.incidentId, id))
      .orderBy(asc(incidentEvents.createdAt));

    const aiAnalysis = (
      await db
        .select()
        .from(aiAnalyses)
        .where(eq(aiAnalyses.incidentId, id))
        .orderBy(desc(aiAnalyses.createdAt))
        .limit(1)
    )[0];

    // Correlated deployments (around the incident window)
    const windowStart = incident.firstDetectedAt - 60 * 60 * 1000;
    const windowEnd = incident.firstDetectedAt + 30 * 60 * 1000;

    const relatedDeployments = await db
      .select()
      .from(deployments)
      .where(
        and(
          eq(deployments.serviceId, incident.serviceId),
          gte(deployments.deployedAt, windowStart)
        )
      )
      .orderBy(desc(deployments.deployedAt))
      .limit(5);

    // Correlated error logs
    const relatedLogs = await db
      .select()
      .from(logs)
      .where(
        and(
          eq(logs.serviceId, incident.serviceId),
          gte(logs.timestamp, incident.firstDetectedAt - 15 * 60 * 1000)
        )
      )
      .orderBy(desc(logs.timestamp))
      .limit(20);

    // Correlated traces
    const relatedTraces = await db
      .select()
      .from(traces)
      .where(
        and(
          eq(traces.serviceId, incident.serviceId),
          gte(traces.startTime, incident.firstDetectedAt - 15 * 60 * 1000)
        )
      )
      .orderBy(desc(traces.startTime))
      .limit(15);

    return NextResponse.json({
      incident: {
        ...incident,
        impactedMetrics: incident.impactedMetrics ? JSON.parse(incident.impactedMetrics) : [],
      },
      events: events.map((e) => ({
        ...e,
        metadata: e.metadata ? JSON.parse(e.metadata) : {},
      })),
      aiAnalysis: aiAnalysis
        ? {
            ...aiAnalysis,
            evidenceList: JSON.parse(aiAnalysis.evidenceList),
            recommendedActions: JSON.parse(aiAnalysis.recommendedActions),
          }
        : null,
      deployments: relatedDeployments,
      logs: relatedLogs.map((l) => ({
        ...l,
        attributes: l.attributes ? JSON.parse(l.attributes) : {},
      })),
      traces: relatedTraces,
    });
  } catch (error) {
    console.error("[Incident Detail Error]", error);
    return NextResponse.json({ error: "Failed to fetch incident details" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { status, note } = body;

    const incident = (
      await db.select().from(incidents).where(eq(incidents.id, id)).limit(1)
    )[0];

    if (!incident) {
      return NextResponse.json({ error: "Incident not found" }, { status: 404 });
    }

    const now = Date.now();
    const updates: Partial<typeof incidents.$inferInsert> = {
      updatedAt: now,
    };

    if (status) {
      updates.status = status;
      if (status === "acknowledged" && !incident.acknowledgedAt) {
        updates.acknowledgedAt = now;
      } else if (status === "resolved") {
        updates.resolvedAt = now;

        // Reset service status to healthy if all incidents are resolved
        await db
          .update(services)
          .set({ status: "healthy", updatedAt: now })
          .where(
            and(
              eq(services.name, incident.serviceId),
              eq(services.environment, incident.environment)
            )
          );
      }

      await db.insert(incidentEvents).values({
        id: `ev_${crypto.randomUUID().replace(/-/g, "").substring(0, 16)}`,
        incidentId: id,
        eventType: "status_change",
        message: `Incident marked as ${status}${note ? `: "${note}"` : ""}`,
        metadata: JSON.stringify({ previousStatus: incident.status, newStatus: status }),
      });
    }

    await db.update(incidents).set(updates).where(eq(incidents.id, id));

    return NextResponse.json({ success: true, status });
  } catch (error) {
    console.error("[Incident Update Error]", error);
    return NextResponse.json({ error: "Failed to update incident" }, { status: 500 });
  }
}
