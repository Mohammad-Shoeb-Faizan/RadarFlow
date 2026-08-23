"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Sparkles,
  Rocket,
  Activity,
  FileText,
  GitFork,
  ArrowRight,
  ShieldCheck,
  RotateCcw,
} from "lucide-react";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import { toast } from "sonner";

export interface IncidentData {
  id: string;
  incidentNumber: number;
  projectId: string;
  serviceId: string;
  environment: string;
  title: string;
  severity: "low" | "medium" | "high" | "critical";
  status: "triggered" | "acknowledged" | "investigating" | "resolved";
  triggerReason: string;
  impactedMetrics: Array<{
    name: string;
    value: number;
    unit?: string;
    baselineValue?: number;
    deltaPercent?: number;
  }>;
  firstDetectedAt: number;
  acknowledgedAt?: number | null;
  resolvedAt?: number | null;
}

export interface TimelineEvent {
  id: string;
  eventType: string;
  message: string;
  metadata?: Record<string, unknown>;
  createdAt: number;
}

export interface AIAnalysisData {
  id: string;
  provider: string;
  model: string;
  likelyCause: string;
  confidence: number;
  evidenceList: string[];
  recommendedActions: string[];
}

export function IncidentDetailView({
  incident: initialIncident,
  events: initialEvents = [],
  aiAnalysis: initialAiAnalysis,
  logs = [],
  traces = [],
  deployments = [],
}: {
  incident: IncidentData;
  events?: TimelineEvent[];
  aiAnalysis?: AIAnalysisData | null;
  logs?: Array<{ level: string; message: string; timestamp: number; attributes?: Record<string, unknown> }>;
  traces?: Array<{ traceId: string; rootSpanName: string; durationMs: number; statusCode: string }>;
  deployments?: Array<{ version: string; commitHash: string; commitMessage?: string; deployedAt: number }>;
}) {
  const [incident, setIncident] = useState<IncidentData>(initialIncident);
  const [events, setEvents] = useState<TimelineEvent[]>(initialEvents);
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysisData | null>(initialAiAnalysis || null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "logs" | "traces" | "timeline">("overview");

  const handleStatusChange = async (newStatus: IncidentData["status"]) => {
    try {
      const res = await fetch(`/api/v1/incidents/${incident.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setIncident((prev) => ({ ...prev, status: newStatus }));
        toast.success(`Incident status updated to ${newStatus}`);
      }
    } catch {
      toast.error("Failed to update status");
    }
  };

  const handleTriggerAI = async () => {
    setIsAnalyzing(true);
    try {
      const res = await fetch(`/api/v1/incidents/${incident.id}/analyze`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setAiAnalysis(data.analysis);
        toast.success("AI Root Cause Analysis completed", {
          description: `Confidence: ${data.analysis.confidence}%`,
        });
      } else {
        toast.error("AI Analysis failed", { description: data.error });
      }
    } catch {
      toast.error("Network error during AI analysis");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getSeverityBadge = (sev: string) => {
    switch (sev) {
      case "critical":
        return "destructive";
      case "high":
        return "warning";
      case "medium":
        return "info";
      default:
        return "secondary";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "resolved":
        return "success";
      case "investigating":
        return "warning";
      case "acknowledged":
        return "info";
      default:
        return "destructive";
    }
  };

  const detectedMinutesAgo = Math.max(0, Math.round((Date.now() - incident.firstDetectedAt) / 60000));

  return (
    <div className="space-y-6 w-full min-w-0">
      {/* Header Banner */}
      <div className="rounded-xl border border-border/80 bg-card p-4 sm:p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
          <div className="space-y-1.5 min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 font-mono text-xs text-muted-foreground">
              <span className="font-bold text-foreground">INCIDENT #{incident.incidentNumber}</span>
              <span>•</span>
              <span className="capitalize">{incident.environment}</span>
              <span>•</span>
              <span className="text-primary font-semibold">{incident.serviceId}</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Started {detectedMinutesAgo}m ago
              </span>
            </div>
            <h1 className="text-lg sm:text-xl font-bold text-foreground tracking-tight break-words">{incident.title}</h1>
            <p className="text-xs text-muted-foreground break-words">{incident.triggerReason}</p>
          </div>

          {/* Badges & Actions */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Badge variant={getSeverityBadge(incident.severity)} className="uppercase text-xs px-2.5 py-1">
              {incident.severity}
            </Badge>
            <Badge variant={getStatusBadge(incident.status)} className="uppercase text-xs px-2.5 py-1">
              {incident.status}
            </Badge>

            {incident.status !== "resolved" ? (
              <div className="flex flex-wrap items-center gap-1.5">
                {incident.status === "triggered" && (
                  <Button size="sm" variant="outline" onClick={() => handleStatusChange("acknowledged")} className="text-xs h-8">
                    Acknowledge
                  </Button>
                )}
                {incident.status !== "investigating" && (
                  <Button size="sm" variant="secondary" onClick={() => handleStatusChange("investigating")} className="text-xs h-8">
                    Investigate
                  </Button>
                )}
                <Button size="sm" variant="default" className="bg-emerald-600 hover:bg-emerald-500 text-xs h-8" onClick={() => handleStatusChange("resolved")}>
                  Resolve
                </Button>
              </div>
            ) : (
              <Button size="sm" variant="outline" onClick={() => handleStatusChange("investigating")} className="text-xs h-8">
                Reopen
              </Button>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-4 border-t border-border/80 mt-6 pt-4 text-xs font-medium overflow-x-auto whitespace-nowrap">
          {[
            { id: "overview", label: "Overview & Impact" },
            { id: "timeline", label: `Timeline (${events.length})` },
            { id: "logs", label: `Related Logs (${logs.length})` },
            { id: "traces", label: `Related Traces (${traces.length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`pb-1 transition-colors border-b-2 font-mono shrink-0 ${
                activeTab === tab.id
                  ? "border-primary text-primary font-bold"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Cols: Impact & AI Root Cause */}
          <div className="lg:col-span-2 space-y-6">
            {/* Impact Section */}
            <Card className="border-border/80 bg-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-xs uppercase font-mono tracking-wider text-muted-foreground">
                  Telemetry Impact & Regressions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                  {incident.impactedMetrics && incident.impactedMetrics.length > 0 ? (
                    incident.impactedMetrics.map((m) => (
                      <div key={m.name} className="rounded-lg border border-border/70 bg-card/60 p-3 space-y-1 font-mono">
                        <span className="text-[10px] text-muted-foreground uppercase truncate block">{m.name}</span>
                        <div className="flex items-baseline gap-2">
                          {m.baselineValue !== undefined ? (
                            <>
                              <span className="text-xs text-muted-foreground line-through">
                                {m.baselineValue}{m.unit}
                              </span>
                              <ArrowRight className="h-3 w-3 text-rose-400 shrink-0" />
                            </>
                          ) : null}
                          <span className="text-base font-bold text-rose-400">
                            {m.value}{m.unit}
                          </span>
                        </div>
                        {m.deltaPercent ? (
                          <span className="text-[10px] text-rose-400 font-bold">
                            +{m.deltaPercent}% breach
                          </span>
                        ) : null}
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-muted-foreground">No specific metric deltas recorded.</div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* AI Incident Analysis Showcase Card */}
            <Card className="border-primary/40 bg-gradient-to-br from-card to-primary/5 shadow-[0_0_30px_rgba(42,142,255,0.08)]">
              <CardHeader className="flex flex-wrap sm:flex-nowrap items-start sm:items-center justify-between pb-3 gap-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/20 text-primary border border-primary/30 shrink-0">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-bold text-foreground">
                      AI Root Cause Analysis
                    </CardTitle>
                    <span className="text-[10px] font-mono text-muted-foreground block">
                      Powered by Gemini 2.5 Flash • Analyzes telemetry, logs, and deployments
                    </span>
                  </div>
                </div>

                <Button
                  size="sm"
                  variant="default"
                  onClick={handleTriggerAI}
                  disabled={isAnalyzing}
                  className="gap-1.5 text-xs bg-primary hover:bg-primary/90 text-primary-foreground font-semibold h-8 shrink-0 font-mono"
                >
                  <Sparkles className={`h-3.5 w-3.5 ${isAnalyzing ? "animate-spin" : ""}`} />
                  <span>{aiAnalysis ? "Re-analyze" : "Analyze Root Cause"}</span>
                </Button>
              </CardHeader>

              <CardContent className="space-y-4 pt-1">
                {aiAnalysis ? (
                  <div className="space-y-4 text-xs font-mono">
                    {/* Likely Cause & Confidence */}
                    <div className="rounded-lg border border-border bg-card/80 p-3.5 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                          Likely Cause
                        </span>
                        <div className="flex items-center gap-1.5 rounded-full bg-primary/10 border border-primary/30 px-2 py-0.5 text-[11px] font-bold text-primary">
                          <span>Confidence:</span>
                          <span>{aiAnalysis.confidence}%</span>
                        </div>
                      </div>
                      <p className="text-sm font-medium text-foreground leading-relaxed">
                        {aiAnalysis.likelyCause}
                      </p>
                    </div>

                    {/* Evidence Points */}
                    {aiAnalysis.evidenceList && aiAnalysis.evidenceList.length > 0 && (
                      <div className="space-y-1.5">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                          Supporting Telemetry Evidence
                        </span>
                        <ul className="space-y-1 pl-1">
                          {aiAnalysis.evidenceList.map((item, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-foreground/90">
                              <span className="text-primary font-bold">•</span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Recommended Steps */}
                    {aiAnalysis.recommendedActions && aiAnalysis.recommendedActions.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                          Recommended Investigation Steps
                        </span>
                        <div className="space-y-1">
                          {aiAnalysis.recommendedActions.map((act, idx) => (
                            <div key={idx} className="flex items-start gap-2 p-2 rounded bg-emerald-950/20 border border-emerald-500/20 text-emerald-300">
                              <span className="font-bold">{idx + 1}.</span>
                              <span>{act}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center p-6 text-center space-y-2 border border-dashed border-border/80 rounded-lg">
                    <Sparkles className="h-8 w-8 text-primary/60" />
                    <p className="text-xs text-muted-foreground max-w-sm font-mono">
                      No AI analysis performed yet. Click "Analyze Root Cause" to synthesize error logs, anomalous metric spikes, and recent deployments.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Col: Deployment Correlation & Service Details */}
          <div className="space-y-6">
            {/* Correlated Deployment */}
            <Card className="border-border/80 bg-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-xs uppercase font-mono tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Rocket className="h-3.5 w-3.5 text-primary" />
                  <span>Correlated Deployments</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 font-mono text-xs">
                {deployments && deployments.length > 0 ? (
                  deployments.map((d) => (
                    <div key={d.version} className="rounded-lg border border-border/60 bg-muted/20 p-3 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-foreground">{d.version}</span>
                        <Badge variant="outline" className="text-[10px]">{d.commitHash.substring(0, 7)}</Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground line-clamp-2">{d.commitMessage}</p>
                      <div className="text-[10px] text-muted-foreground/80 flex items-center gap-1 pt-1">
                        <Clock className="h-3 w-3" />
                        Deployed {Math.round((Date.now() - d.deployedAt) / 60000)}m ago
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-muted-foreground text-xs">No recent deployments detected in window.</div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="border-border/80 bg-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-xs uppercase font-mono tracking-wider text-muted-foreground">
                  Investigation Links
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-xs font-mono">
                <Link
                  href={`/traces?search=${incident.serviceId}`}
                  className="flex items-center justify-between p-2.5 rounded-lg border border-border/60 hover:bg-accent/40 text-foreground transition-colors group"
                >
                  <div className="flex items-center gap-2">
                    <GitFork className="h-3.5 w-3.5 text-primary" />
                    <span>View Service Traces</span>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                </Link>

                <Link
                  href={`/logs?search=${incident.serviceId}`}
                  className="flex items-center justify-between p-2.5 rounded-lg border border-border/60 hover:bg-accent/40 text-foreground transition-colors group"
                >
                  <div className="flex items-center gap-2">
                    <FileText className="h-3.5 w-3.5 text-primary" />
                    <span>View Service Logs</span>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Timeline Tab */}
      {activeTab === "timeline" && (
        <Card className="border-border/80 bg-card">
          <CardHeader>
            <CardTitle className="text-sm font-bold font-mono">Incident Event Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-border/40 font-mono text-xs">
              {events.map((ev) => (
                <div key={ev.id} className="py-3 flex items-start gap-3">
                  <div className="h-2 w-2 rounded-full bg-primary mt-1.5 shrink-0" />
                  <div className="space-y-0.5 min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-foreground uppercase tracking-wider text-[11px]">
                        {ev.eventType}
                      </span>
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {new Date(ev.createdAt).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-muted-foreground">{ev.message}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Related Logs Tab */}
      {activeTab === "logs" && (
        <Card className="border-border/80 bg-card">
          <CardHeader>
            <CardTitle className="text-sm font-bold font-mono">Correlated Error Logs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-border/40 font-mono text-xs">
              {logs.map((log, idx) => (
                <div key={idx} className="py-2.5 flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3">
                  <Badge variant="destructive" className="uppercase text-[9px] w-14 justify-center shrink-0">
                    {log.level}
                  </Badge>
                  <span className="text-muted-foreground text-[11px] shrink-0">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                  <span className="text-foreground flex-1 break-words">{log.message}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Related Traces Tab */}
      {activeTab === "traces" && (
        <Card className="border-border/80 bg-card">
          <CardHeader>
            <CardTitle className="text-sm font-bold font-mono">Correlated Traces & Spans</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-border/40 font-mono text-xs">
              {traces.map((tr) => (
                <div key={tr.traceId} className="py-2.5 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Badge variant={tr.statusCode === "error" ? "destructive" : "outline"} className="text-[9px]">
                      {tr.statusCode}
                    </Badge>
                    <span className="font-semibold text-foreground truncate">{tr.rootSpanName}</span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-rose-400 font-bold">{tr.durationMs.toFixed(0)}ms</span>
                    <Link
                      href={`/traces?search=${tr.traceId}`}
                      className="text-primary hover:underline flex items-center gap-1 text-[11px]"
                    >
                      <span>Inspect</span>
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
