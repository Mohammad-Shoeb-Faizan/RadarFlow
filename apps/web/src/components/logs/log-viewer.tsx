"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Search,
  Filter,
  Clock,
  ChevronRight,
  ChevronDown,
  ExternalLink,
  RefreshCw,
  FileText,
} from "lucide-react";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";

export interface LogEntry {
  id: string;
  projectId: string;
  serviceId: string;
  environment: string;
  level: "debug" | "info" | "warn" | "error" | "fatal";
  message: string;
  attributes: Record<string, unknown>;
  traceId?: string | null;
  spanId?: string | null;
  timestamp: number;
}

export function LogViewer({ initialLogs = [] }: { initialLogs?: LogEntry[] }) {
  const [logsList, setLogsList] = useState<LogEntry[]>(initialLogs);
  const [search, setSearch] = useState("");
  const [selectedLevel, setSelectedLevel] = useState("all");
  const [selectedService, setSelectedService] = useState("all");
  const [timeRange, setTimeRange] = useState("1h");
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        level: selectedLevel,
        service: selectedService,
        timeRange,
        search,
        limit: "100",
      });
      const res = await fetch(`/api/v1/logs?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setLogsList(data.logs || []);
      }
    } catch (err) {
      console.error("Failed to fetch logs", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [selectedLevel, selectedService, timeRange]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLogs();
  };

  const getLevelBadgeVariant = (level: string) => {
    switch (level) {
      case "error":
      case "fatal":
        return "destructive";
      case "warn":
        return "warning";
      case "info":
        return "info";
      default:
        return "secondary";
    }
  };

  return (
    <div className="flex flex-col space-y-4 w-full min-w-0">
      {/* Search & Filter Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 rounded-xl border border-border/80 bg-card p-3 shadow-sm">
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 flex-1 min-w-0">
          <div className="relative flex flex-1 items-center min-w-0">
            <Search className="absolute left-3 h-4 w-4 text-muted-foreground shrink-0" />
            <input
              type="text"
              placeholder="Search log messages, stack traces..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-card pl-9 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary min-w-0"
            />
          </div>
          <Button type="submit" size="sm" variant="secondary" className="text-xs h-9 shrink-0">
            Filter
          </Button>
        </form>

        <div className="flex flex-wrap items-center gap-2">
          {/* Level Filter */}
          <div className="flex items-center rounded-md border border-border bg-card p-0.5 text-xs overflow-x-auto">
            {["all", "error", "warn", "info", "debug"].map((lvl) => (
              <button
                key={lvl}
                onClick={() => setSelectedLevel(lvl)}
                className={`rounded px-2 py-1 uppercase font-mono font-medium transition-colors text-[10px] sm:text-xs ${
                  selectedLevel === lvl
                    ? "bg-primary/20 text-primary border border-primary/30"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>

          {/* Time Range */}
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="h-8 rounded-md border border-input bg-card px-2 text-xs text-foreground font-mono focus:outline-none shrink-0"
          >
            <option value="15m">Last 15m</option>
            <option value="1h">Last 1h</option>
            <option value="6h">Last 6h</option>
            <option value="24h">Last 24h</option>
            <option value="7d">Last 7d</option>
          </select>

          <Button
            variant="ghost"
            size="icon"
            onClick={fetchLogs}
            disabled={isLoading}
            className="h-8 w-8 text-muted-foreground hover:text-foreground shrink-0"
            title="Refresh logs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Logs Table / Stream */}
      <div className="rounded-xl border border-border/80 bg-card overflow-hidden shadow-sm w-full min-w-0">
        {logsList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center p-4">
            <FileText className="h-10 w-10 text-muted-foreground/50 mb-3" />
            <h4 className="text-sm font-semibold text-foreground">No logs found</h4>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm">
              No matching log events received in this time window. Click "Generate Traffic" above or instrument your app.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/40 font-mono text-xs max-h-[650px] overflow-y-auto">
            {logsList.map((log) => {
              const isExpanded = expandedLogId === log.id;
              const d = new Date(log.timestamp);
              const timeString = `${String(d.getHours()).padStart(2, "0")}:${String(
                d.getMinutes()
              ).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}.${String(
                d.getMilliseconds()
              ).padStart(3, "0")}`;

              return (
                <div
                  key={log.id}
                  className={`group transition-colors ${
                    isExpanded ? "bg-accent/40" : "hover:bg-accent/20"
                  }`}
                >
                  <div
                    onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                    className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3 px-3 py-2.5 sm:py-2 cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-2 shrink-0">
                      <button className="text-muted-foreground hover:text-foreground">
                        {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                      </button>

                      <span className="text-muted-foreground/70 shrink-0 text-[11px]">{timeString}</span>

                      <Badge
                        variant={getLevelBadgeVariant(log.level)}
                        className="uppercase text-[9px] sm:text-[10px] w-12 sm:w-14 justify-center shrink-0 px-1 py-0"
                      >
                        {log.level}
                      </Badge>

                      <span className="text-primary font-medium shrink-0 px-1.5 py-0.5 rounded bg-primary/10 border border-primary/20 text-[10px] sm:text-[11px]">
                        {log.serviceId}
                      </span>

                      {log.traceId && (
                        <Link
                          href={`/traces?search=${log.traceId}`}
                          onClick={(e) => e.stopPropagation()}
                          className="sm:hidden text-[9px] text-muted-foreground hover:text-primary flex items-center gap-0.5 ml-auto px-1 py-0.5 rounded bg-muted/60"
                        >
                          <span>Trace</span>
                          <ExternalLink className="h-2.5 w-2.5" />
                        </Link>
                      )}
                    </div>

                    <span className="flex-1 truncate text-foreground text-[11px] sm:text-[12px] pl-5 sm:pl-0">
                      {log.message}
                    </span>

                    {log.traceId && (
                      <Link
                        href={`/traces?search=${log.traceId}`}
                        onClick={(e) => e.stopPropagation()}
                        className="hidden sm:flex text-[10px] text-muted-foreground hover:text-primary items-center gap-1 shrink-0 px-1.5 py-0.5 rounded bg-muted/60"
                        title="Jump to Trace"
                      >
                        <span>Trace</span>
                        <ExternalLink className="h-2.5 w-2.5" />
                      </Link>
                    )}
                  </div>

                  {/* Expanded JSON Inspector */}
                  {isExpanded && (
                    <div className="border-t border-border/50 bg-muted/20 p-3 sm:p-4 pl-4 sm:pl-10 text-[11px] animate-in fade-in-0 duration-100">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="min-w-0">
                          <div className="text-[10px] text-muted-foreground uppercase font-bold mb-1">Metadata</div>
                          <div className="space-y-0.5 text-muted-foreground break-all">
                            <div><span className="text-foreground">Service:</span> {log.serviceId}</div>
                            <div><span className="text-foreground">Environment:</span> {log.environment}</div>
                            <div><span className="text-foreground">ISO Timestamp:</span> {new Date(log.timestamp).toISOString()}</div>
                            {log.traceId && <div><span className="text-foreground">Trace ID:</span> {log.traceId}</div>}
                            {log.spanId && <div><span className="text-foreground">Span ID:</span> {log.spanId}</div>}
                          </div>
                        </div>

                        <div className="min-w-0">
                          <div className="text-[10px] text-muted-foreground uppercase font-bold mb-1">Structured Attributes</div>
                          <pre className="rounded bg-card p-2 border border-border overflow-x-auto text-[11px] text-foreground leading-relaxed max-w-full">
                            {JSON.stringify(log.attributes, null, 2)}
                          </pre>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
