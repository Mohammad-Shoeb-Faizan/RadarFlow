"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { GitFork, Clock, Search, Filter, RefreshCw, AlertCircle, CheckCircle2, ChevronRight, Loader2 } from "lucide-react";
import { TraceWaterfall } from "@/components/traces/trace-waterfall";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

function TracesContent() {
  const searchParams = useSearchParams();
  const initialSearch = searchParams.get("search") || "";

  const [traces, setTraces] = useState<any[]>([]);
  const [selectedTraceId, setSelectedTraceId] = useState<string | null>(null);
  const [selectedTraceData, setSelectedTraceData] = useState<any>(null);
  const [search, setSearch] = useState(initialSearch);
  const [status, setStatus] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [isDetailLoading, setIsDetailLoading] = useState(false);

  const fetchTraces = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        status,
        search,
        limit: "50",
      });
      const res = await fetch(`/api/v1/traces?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setTraces(json.traces || []);
        if (json.traces?.length > 0 && !selectedTraceId) {
          setSelectedTraceId(json.traces[0].traceId);
        }
      }
    } catch (err) {
      console.error("Failed to load traces", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTraces();
  }, [status]);

  useEffect(() => {
    if (!selectedTraceId) return;
    const fetchTraceDetail = async () => {
      setIsDetailLoading(true);
      try {
        const res = await fetch(`/api/v1/traces/${selectedTraceId}`);
        if (res.ok) {
          const json = await res.json();
          setSelectedTraceData(json);
        }
      } catch (err) {
        console.error("Failed to load trace detail", err);
      } finally {
        setIsDetailLoading(false);
      }
    };
    fetchTraceDetail();
  }, [selectedTraceId]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Distributed Traces
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Trace execution flow across HTTP handlers, database queries, cache lookups, and microservices.
          </p>
        </div>

        <Button variant="outline" size="sm" onClick={fetchTraces} disabled={isLoading} className="gap-1.5 text-xs">
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </Button>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/80 bg-card p-3 shadow-sm">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            fetchTraces();
          }}
          className="flex flex-1 items-center gap-2 min-w-[240px]"
        >
          <div className="relative flex flex-1 items-center">
            <Search className="absolute left-3 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by Trace ID or route name (e.g. /api/orders)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-card pl-9 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <Button type="submit" size="sm" variant="secondary" className="text-xs">
            Search
          </Button>
        </form>

        <div className="flex items-center rounded-md border border-border bg-card p-0.5 text-xs font-mono">
          {["all", "ok", "error"].map((st) => (
            <button
              key={st}
              onClick={() => setStatus(st)}
              className={`rounded px-3 py-1 uppercase font-medium transition-colors ${
                status === st
                  ? "bg-primary/20 text-primary border border-primary/30"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid: Left Traces List, Right Waterfall */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Traces List */}
        <div className="rounded-xl border border-border/80 bg-card overflow-hidden shadow-sm max-h-[700px] flex flex-col">
          <div className="border-b border-border/80 bg-muted/20 px-4 py-2.5 text-xs font-mono text-muted-foreground flex items-center justify-between">
            <span>Recent Traces ({traces.length})</span>
            <span>Duration</span>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-border/40 font-mono text-xs">
            {traces.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                No traces found matching your criteria.
              </div>
            ) : (
              traces.map((t) => {
                const isSelected = selectedTraceId === t.traceId;
                const isError = t.statusCode === "error";

                return (
                  <div
                    key={t.traceId}
                    onClick={() => setSelectedTraceId(t.traceId)}
                    className={`p-3 cursor-pointer transition-colors ${
                      isSelected ? "bg-primary/15 border-l-2 border-primary" : "hover:bg-accent/40"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5 truncate">
                        {isError ? (
                          <AlertCircle className="h-3.5 w-3.5 text-rose-400 shrink-0" />
                        ) : (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0 opacity-70" />
                        )}
                        <span className="font-semibold text-foreground truncate">{t.rootSpanName}</span>
                      </div>
                      <span className={`font-bold shrink-0 ${t.durationMs > 300 ? "text-amber-400" : "text-foreground"}`}>
                        {t.durationMs.toFixed(0)}ms
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                      <span className="text-primary">{t.serviceId}</span>
                      <span>{new Date(t.startTime).toLocaleTimeString()}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Waterfall Inspector */}
        <div className="lg:col-span-2 space-y-4">
          {selectedTraceData ? (
            <div>
              <div className="flex items-center justify-between pb-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
                    <span className="font-bold text-foreground">{selectedTraceData.trace.rootSpanName}</span>
                    <span>•</span>
                    <span>Trace: {selectedTraceData.trace.traceId.substring(0, 16)}...</span>
                  </div>
                  <div className="text-[11px] font-mono text-muted-foreground">
                    Started at {new Date(selectedTraceData.trace.startTime).toLocaleTimeString()} • Total duration {selectedTraceData.trace.durationMs.toFixed(1)}ms
                  </div>
                </div>

                <Badge variant={selectedTraceData.trace.statusCode === "error" ? "destructive" : "success"}>
                  {selectedTraceData.trace.statusCode}
                </Badge>
              </div>

              <TraceWaterfall
                spans={selectedTraceData.spans || []}
                totalDurationMs={selectedTraceData.trace.durationMs}
                traceStartTime={selectedTraceData.trace.startTime}
              />
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-card p-12 text-center text-xs text-muted-foreground">
              Select a trace from the left panel to inspect the waterfall execution tree.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function TracesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
          <span className="text-xs font-mono text-muted-foreground">Loading distributed traces...</span>
        </div>
      }
    >
      <TracesContent />
    </Suspense>
  );
}
