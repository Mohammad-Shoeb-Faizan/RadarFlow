import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  incidents,
  incidentEvents,
  aiAnalyses,
  deployments,
  logs,
  traces,
} from "@/lib/db/schema";
import { eq, desc, and, gte } from "drizzle-orm";
import { getAIProvider } from "@/lib/ai";
import crypto from "crypto";

export async function POST(
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

    const provider = getAIProvider();

    // Fetch related deployments
    const windowStart = incident.firstDetectedAt - 60 * 60 * 1000;
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
      .limit(1);

    // Fetch related error logs
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
      .limit(15);

    // Fetch related traces
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
      .limit(10);

    const impactedMetrics = incident.impactedMetrics ? JSON.parse(incident.impactedMetrics) : [];

    const analysisInput = {
      incidentId: incident.id,
      incidentTitle: incident.title,
      service: incident.serviceId,
      environment: incident.environment,
      severity: incident.severity,
      triggerReason: incident.triggerReason,
      firstDetectedAt: incident.firstDetectedAt,
      metrics: impactedMetrics,
      recentDeployment: relatedDeployments[0]
        ? {
            version: relatedDeployments[0].version,
            commitHash: relatedDeployments[0].commitHash,
            commitMessage: relatedDeployments[0].commitMessage || undefined,
            deployedAt: relatedDeployments[0].deployedAt,
            deployedBy: relatedDeployments[0].deployedBy,
          }
        : undefined,
      relatedLogs: relatedLogs.map((l) => ({
        level: l.level,
        message: l.message,
        timestamp: l.timestamp,
        attributes: l.attributes ? JSON.parse(l.attributes) : {},
      })),
      relatedTraces: relatedTraces.map((t) => ({
        traceId: t.traceId,
        rootSpanName: t.rootSpanName,
        durationMs: t.durationMs,
        statusCode: t.statusCode,
      })),
    };

    const analysisResult = await provider.analyzeIncident(analysisInput);

    const analysisId = `ai_${crypto.randomUUID().replace(/-/g, "").substring(0, 16)}`;

    await db.insert(aiAnalyses).values({
      id: analysisId,
      incidentId: incident.id,
      provider: analysisResult.provider,
      model: analysisResult.model,
      likelyCause: analysisResult.likelyCause,
      confidence: analysisResult.confidence,
      evidenceList: JSON.stringify(analysisResult.evidence),
      recommendedActions: JSON.stringify(analysisResult.recommendedActions),
      rawResponse: JSON.stringify(analysisResult),
      createdAt: Date.now(),
    });

    await db.insert(incidentEvents).values({
      id: `ev_${crypto.randomUUID().replace(/-/g, "").substring(0, 16)}`,
      incidentId: incident.id,
      eventType: "ai_analysis",
      message: `AI root-cause analysis completed (${analysisResult.confidence}% confidence): ${analysisResult.likelyCause}`,
      metadata: JSON.stringify({ analysisId, provider: analysisResult.provider }),
    });

    return NextResponse.json({
      success: true,
      analysis: {
        id: analysisId,
        ...analysisResult,
        evidenceList: analysisResult.evidence,
        recommendedActions: analysisResult.recommendedActions,
      },
    });
  } catch (error) {
    console.error("[AI Analysis Error]", error);
    const message = error instanceof Error ? error.message : "Failed to execute AI analysis";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
