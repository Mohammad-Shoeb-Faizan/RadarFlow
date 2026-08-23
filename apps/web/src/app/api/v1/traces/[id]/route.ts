import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { traces, spans, logs } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: traceId } = await params;

    const traceRecord = (
      await db.select().from(traces).where(eq(traces.traceId, traceId)).limit(1)
    )[0];

    if (!traceRecord) {
      return NextResponse.json({ error: "Trace not found" }, { status: 404 });
    }

    const spanRecords = await db
      .select()
      .from(spans)
      .where(eq(spans.traceId, traceId))
      .orderBy(asc(spans.startTime));

    const relatedLogs = await db
      .select()
      .from(logs)
      .where(eq(logs.traceId, traceId))
      .orderBy(asc(logs.timestamp));

    const parsedSpans = spanRecords.map((s) => ({
      ...s,
      attributes: s.attributes ? JSON.parse(s.attributes) : {},
      events: s.events ? JSON.parse(s.events) : [],
    }));

    return NextResponse.json({
      trace: traceRecord,
      spans: parsedSpans,
      logs: relatedLogs.map((l) => ({
        ...l,
        attributes: l.attributes ? JSON.parse(l.attributes) : {},
      })),
    });
  } catch (error) {
    console.error("[Trace Detail Error]", error);
    return NextResponse.json({ error: "Failed to fetch trace details" }, { status: 500 });
  }
}
