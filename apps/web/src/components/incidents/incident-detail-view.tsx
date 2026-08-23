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
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-xl border border-border/80 bg-card p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5 font-mono text-xs text-muted-foreground">
              <span className="font-bold text-foreground">INCIDENT #{incident.incidentNumber}</span>
              <span>•</span>
              <span className="capitalize">{incident.environment}</span>
              <span>•</span>
              <span className="text-primary">{incident.serviceId}</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Started {detectedMinutesAgo}m ago
              </span>
            </div>
            <h1 className="text-xl font-bold text-foreground tracking-tight">{incident.title}</h1>
            <p className="text-xs text-muted-foreground">{incident.triggerReason}</p>
          </div>

          {/* Badges & Actions */}
          <div className="flex flex-wrap items-center gap-2.5">
            <Badge variant={getSeverityBadge(incident.severity)} className="uppercase text-xs px-2.5 py-1">
              {incident.severity}
            </Badge>
            <Badge variant={getStatusBadge(incident.status)} className="uppercase text-xs px-2.5 py-1">
              {incident.status}
            </Badge>

            {incident.status !== "resolved" ? (
              <div className="flex items-center gap-1.5 ml-2">
                {incident.status === "triggered" && (
                  <Button size="sm" variant="outline" onClick={() => handleStatusChange("acknowledged")}>
                    Acknowledge
                  </Button>
                )}
                {incident.status !== "investigating" && (
                  <Button size="sm" variant="secondary" onClick={() => handleStatusChange("investigating")}>
                    Investigate
                  </Button>
                )}
                <Button size="sm" variant="default" className="bg-emerald-600 hover:bg-emerald-500" onClick={() => handleStatusChange("resolved")}>
                  Resolve Incident
                </Button>
              </div>
            ) : (
              <Button size="sm" variant="outline" onClick={() => handleStatusChange("investigating")}>
                Reopen
              </Button>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-4 border-t border-border/80 mt-6 pt-4 text-xs font-medium">
          {[
            { id: "overview", label: "Overview & Impact" },
            { id: "timeline", label: `Timeline (${events.length})` },
            { id: "logs", label: `Related Logs (${logs.length})` },
            { id: "traces", label: `Related Traces (${traces.length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`pb-1 transition-colors border-b-2 font-mono ${
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
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-xs uppercase font-mono tracking-wider text-muted-foreground">
                  Telemetry Impact & Regressions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                              <ArrowRight className="h-3 w-3 text-rose-400" />
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
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/20 text-primary border border-primary/30">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-bold text-foreground">
                      AI Root Cause Analysis
                    </CardTitle>
                    <span className="text-[10px] font-mono text-muted-foreground">
                      Powered by Gemini 2.0 Flash • Analyzes telemetry, logs, and deployments
                    </span>
                  </div>
                </div>

                <Button
                  size="sm"
                  variant="default"
                  onClick={handleTriggerAI}
                  disabled={isAnalyzing}
                  className="gap-1.5 text-xs bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
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
                        <ol className="space-y-1 pl-1">
                          {aiAnalysis.recommendedActions.map((step, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-foreground/90">
                              <span className="text-emerald-400 font-bold">{idx + 1}.</span>
                              <span>{step}</span>
                            </li>
                          ))}
                        </ol>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="rounded-lg border border-border/60 bg-muted/20 p-6 text-center">
                    <Sparkles className="h-8 w-8 text-primary/60 mx-auto mb-2" />
                    <p className="text-xs font-medium text-foreground">
                      Structured AI Root-Cause Analysis Ready
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-1 max-w-md mx-auto">
                      Click "Analyze Root Cause" to synthesize anomalous metrics, recent deployment diffs, and timeout logs with Gemini.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Correlated Deployment & Quick Stats */}
          <div className="space-y-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs uppercase font-mono tracking-wider text-muted-foreground flex items-center gap-2">
                  <Rocket className="h-3.5 w-3.5 text-primary" />
                  Correlated Deployment
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 font-mono text-xs">
                {deployments.length > 0 ? (
                  deployments.map((dep) => (
                    <div key={dep.commitHash} className="rounded-lg border border-border bg-card p-3 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-foreground">{dep.version}</span>
                        <Badge variant="success">Deployed</Badge>
                      </div>
                      <p className="text-muted-foreground text-[11px]">{dep.commitMessage}</p>
                      <div className="text-[10px] text-muted-foreground pt-1 flex items-center justify-between">
                        <span>Commit: {dep.commitHash.substring(0, 7)}</span>
                        <span>{Math.round((Date.now() - dep.deployedAt) / 60000)}m ago</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-muted-foreground">No deployments correlated with this window.</div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Timeline Tab */}
      {activeTab === "timeline" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-bold">Chronological Incident Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative border-l border-border/80 ml-4 pl-6 space-y-6 font-mono text-xs">
              {events.map((ev) => (
                <div key={ev.id} className="relative group">
                  <div className="absolute -left-[31px] top-0.5 h-3.5 w-3.5 rounded-full bg-primary/20 border-2 border-primary" />
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(ev.createdAt).toLocaleTimeString()}
                    </span>
                    <p className="text-foreground font-medium">{ev.message}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Logs Tab */}
      {activeTab === "logs" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-bold">Related Error Logs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-border/40 font-mono text-xs">
              {logs.map((log, idx) => (
                <div key={idx} className="py-2.5 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground text-[10px]">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                    <Badge variant="destructive" className="uppercase text-[9px]">
                      {log.level}
                    </Badge>
                    <span className="text-foreground font-semibold">{log.message}</span>
                  </div>
                  {log.attributes && Object.keys(log.attributes).length > 0 && (
                    <pre className="rounded bg-muted/20 p-2 text-[10px] text-muted-foreground overflow-x-auto">
                      {JSON.stringify(log.attributes, null, 2)}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Traces Tab */}
      {activeTab === "traces" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-bold">Related Slow & Failed Traces</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-border/40 font-mono text-xs">
              {traces.map((tr) => (
                <div key={tr.traceId} className="flex items-center justify-between py-2.5">
                  <div className="flex items-center gap-2">
                    <Badge variant={tr.statusCode === "error" ? "destructive" : "warning"}>
                      {tr.statusCode}
                    </Badge>
                    <span className="font-semibold text-foreground">{tr.rootSpanName}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-foreground font-bold">{tr.durationMs}ms</span>
                    <Link
                      href={`/traces?search=${tr.traceId}`}
                      className="text-primary hover:underline text-[11px]"
                    >
                      View Waterfall →
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
