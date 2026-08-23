"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronRight, AlertCircle, CheckCircle2, Clock, X, Layers } from "lucide-react";
import { Badge } from "../ui/badge";

export interface SpanData {
  id: string;
  traceId: string;
  spanId: string;
  parentSpanId?: string | null;
  name: string;
  kind?: string;
  startTime: number;
  endTime?: number;
  durationMs: number;
  statusCode?: string;
  statusMessage?: string | null;
  attributes?: Record<string, unknown>;
  events?: Array<{ name: string; timestamp: number; attributes?: Record<string, unknown> }>;
  serviceId?: string;
}

export function TraceWaterfall({
  spans,
  totalDurationMs,
  traceStartTime,
}: {
  spans: SpanData[];
  totalDurationMs: number;
  traceStartTime: number;
}) {
  const [selectedSpan, setSelectedSpan] = useState<SpanData | null>(null);
  const [collapsedSpans, setCollapsedSpans] = useState<Record<string, boolean>>({});

  const duration = Math.max(1, totalDurationMs);

  // Group spans into a tree hierarchy
  const childrenMap = new Map<string | null, SpanData[]>();
  spans.forEach((span) => {
    const parentId = span.parentSpanId || null;
    const list = childrenMap.get(parentId) || [];
    list.push(span);
    childrenMap.set(parentId, list);
  });

  const toggleCollapse = (spanId: string) => {
    setCollapsedSpans((prev) => ({ ...prev, [spanId]: !prev[spanId] }));
  };

  const renderSpanRow = (span: SpanData, depth = 0): React.ReactNode => {
    const children = childrenMap.get(span.spanId) || [];
    const hasChildren = children.length > 0;
    const isCollapsed = collapsedSpans[span.spanId];

    // Compute bar positions
    const offsetMs = Math.max(0, span.startTime - traceStartTime);
    const leftPercent = Math.min(98, (offsetMs / duration) * 100);
    const widthPercent = Math.max(2, Math.min(100 - leftPercent, (span.durationMs / duration) * 100));

    const isError = span.statusCode === "error";
    const isSlow = span.durationMs > 200;

    let barColor = "bg-primary/80 hover:bg-primary";
    if (isError) barColor = "bg-rose-500 hover:bg-rose-400";
    else if (isSlow) barColor = "bg-amber-500 hover:bg-amber-400";

    return (
      <React.Fragment key={span.spanId}>
        <div
          onClick={() => setSelectedSpan(span)}
          className={`group flex items-center border-b border-border/40 py-2 px-3 text-xs hover:bg-accent/40 cursor-pointer transition-colors ${
            selectedSpan?.spanId === span.spanId ? "bg-accent/60" : ""
          }`}
        >
          {/* Left: Span Name & Hierarchy */}
          <div className="flex items-center gap-1.5 w-1/3 min-w-[240px] truncate" style={{ paddingLeft: `${depth * 18}px` }}>
            {hasChildren ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleCollapse(span.spanId);
                }}
                className="p-0.5 rounded text-muted-foreground hover:text-foreground"
              >
                {isCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </button>
            ) : (
              <div className="w-4" />
            )}

            {isError ? (
              <AlertCircle className="h-3.5 w-3.5 text-rose-400 shrink-0" />
            ) : (
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0 opacity-60 group-hover:opacity-100" />
            )}

            <span className="font-mono font-medium text-foreground truncate">{span.name}</span>
            {span.kind && (
              <span className="text-[10px] text-muted-foreground uppercase px-1 rounded bg-muted/60 font-mono">
                {span.kind}
              </span>
            )}
          </div>

          {/* Center: Waterfall Timeline Bar */}
          <div className="flex-1 relative h-6 bg-muted/20 rounded mx-4 flex items-center overflow-hidden">
            <div
              className={`absolute h-4 rounded transition-all ${barColor}`}
              style={{
                left: `${leftPercent}%`,
                width: `${widthPercent}%`,
              }}
            />
          </div>

          {/* Right: Duration Tag */}
          <div className="w-24 text-right font-mono font-semibold text-foreground flex items-center justify-end gap-1">
            <Clock className="h-3 w-3 text-muted-foreground" />
            <span>{span.durationMs.toFixed(1)}ms</span>
          </div>
        </div>

        {/* Recursive Children */}
        {!isCollapsed && children.map((child) => renderSpanRow(child, depth + 1))}
      </React.Fragment>
    );
  };

  const rootSpans = childrenMap.get(null) || (spans.length > 0 ? [spans[0]] : []);

  return (
    <div className="relative flex flex-col rounded-xl border border-border/80 bg-card overflow-hidden">
      {/* Waterfall Header */}
      <div className="flex items-center justify-between border-b border-border/80 bg-muted/30 px-4 py-2.5 text-xs text-muted-foreground font-mono">
        <div className="w-1/3">Span Name ({spans.length} spans)</div>
        <div className="flex-1 text-center">Timeline (Total {totalDurationMs.toFixed(0)}ms)</div>
        <div className="w-24 text-right">Duration</div>
      </div>

      {/* Waterfall Rows */}
      <div className="divide-y divide-border/20 overflow-x-auto max-h-[500px] overflow-y-auto">
        {rootSpans.map((root) => renderSpanRow(root, 0))}
      </div>

      {/* Span Detail Drawer / Inspector */}
      {selectedSpan && (
        <div className="border-t border-border bg-card/95 p-4 animate-in slide-in-from-bottom-2 duration-150">
          <div className="flex items-center justify-between pb-3 border-b border-border/60">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" />
              <span className="font-mono font-semibold text-sm text-foreground">{selectedSpan.name}</span>
              <Badge variant={selectedSpan.statusCode === "error" ? "destructive" : "success"}>
                {selectedSpan.statusCode || "ok"}
              </Badge>
            </div>
            <button
              onClick={() => setSelectedSpan(null)}
              className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-accent"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3 text-xs font-mono">
            <div>
              <div className="text-[11px] text-muted-foreground uppercase font-bold mb-1">Timing & Identifiers</div>
              <div className="bg-muted/30 rounded p-2.5 space-y-1">
                <div><span className="text-muted-foreground">Span ID:</span> {selectedSpan.spanId}</div>
                <div><span className="text-muted-foreground">Parent ID:</span> {selectedSpan.parentSpanId || "root"}</div>
                <div><span className="text-muted-foreground">Duration:</span> {selectedSpan.durationMs.toFixed(1)}ms</div>
                {selectedSpan.statusMessage && (
                  <div className="text-rose-400"><span className="text-muted-foreground">Status Msg:</span> {selectedSpan.statusMessage}</div>
                )}
              </div>
            </div>

            <div>
              <div className="text-[11px] text-muted-foreground uppercase font-bold mb-1">Attributes & Context</div>
              <div className="bg-muted/30 rounded p-2.5 overflow-x-auto max-h-36">
                <pre className="text-[11px] text-foreground leading-relaxed">
                  {JSON.stringify(selectedSpan.attributes || {}, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
