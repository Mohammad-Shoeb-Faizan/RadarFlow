"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, Clock, Sparkles, Filter, RefreshCw, Flame, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState<any[]>([]);
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedSeverity, setSelectedSeverity] = useState("all");
  const [isLoading, setIsLoading] = useState(true);

  const fetchIncidents = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        status: selectedStatus,
        severity: selectedSeverity,
      });
      const res = await fetch(`/api/v1/incidents?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setIncidents(data.incidents || []);
      }
    } catch (err) {
      console.error("Failed to load incidents", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, [selectedStatus, selectedSeverity]);

  const handleSimulate = async () => {
    try {
      const res = await fetch("/api/v1/demo/simulate-incident", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        toast.error(`Simulated Incident #${data.incidentNumber} Triggered!`);
        fetchIncidents();
      }
    } catch {
      toast.error("Failed to simulate incident");
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

  return (
    <div className="space-y-6 w-full min-w-0">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-4 sm:pb-5">
        <div>
          <h1 className="text-lg sm:text-xl font-bold tracking-tight text-foreground">
            Incidents & Anomaly Detection
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Automated alerts, metric breaches, and AI-assisted root-cause investigations.
          </p>
        </div>

        <div className="flex items-center gap-2 font-mono">
          <Button
            variant="destructive"
            size="sm"
            onClick={handleSimulate}
            className="gap-1.5 text-xs bg-rose-600/20 text-rose-400 border border-rose-500/30 hover:bg-rose-600/30 h-8 px-2.5 sm:px-3"
          >
            <Flame className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Simulate Incident</span>
            <span className="sm:hidden">Simulate</span>
          </Button>

          <Button variant="outline" size="sm" onClick={fetchIncidents} disabled={isLoading} className="gap-1.5 text-xs h-8">
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 rounded-xl border border-border/80 bg-card p-3 shadow-sm">
        <div className="flex items-center rounded-md border border-border bg-card p-0.5 text-xs overflow-x-auto whitespace-nowrap">
          {["all", "triggered", "investigating", "acknowledged", "resolved"].map((st) => (
            <button
              key={st}
              onClick={() => setSelectedStatus(st)}
              className={`rounded px-2.5 sm:px-3 py-1 uppercase font-mono font-medium transition-colors text-[10px] sm:text-xs shrink-0 ${
                selectedStatus === st
                  ? "bg-primary/20 text-primary border border-primary/30"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 text-xs font-mono shrink-0">
          <span className="text-muted-foreground">Severity:</span>
          <select
            value={selectedSeverity}
            onChange={(e) => setSelectedSeverity(e.target.value)}
            className="h-8 rounded-md border border-input bg-card px-2 text-xs text-foreground focus:outline-none"
          >
            <option value="all">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      {/* Incidents List */}
      {incidents.length === 0 ? (
        <div className="rounded-xl border border-border/80 bg-card p-8 sm:p-12 text-center">
          <CheckCircle2 className="h-10 w-10 text-emerald-400 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-foreground">No incidents found</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            All services are operating within normal SLO thresholds. Click "Simulate Incident" to test automated breach detection and AI analysis.
          </p>
          <Button size="sm" variant="outline" onClick={handleSimulate} className="mt-4 text-xs gap-1.5">
            <Flame className="h-3.5 w-3.5 text-rose-400" />
            <span>Simulate Incident</span>
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {incidents.map((inc) => (
            <Link key={inc.id} href={`/incidents/${inc.id}`} className="block">
              <Card className="hover:border-primary/50 transition-all p-4 sm:p-5 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-muted-foreground">
                      <Badge variant={getSeverityBadge(inc.severity)} className="uppercase text-[10px] px-1.5 py-0">
                        {inc.severity}
                      </Badge>
                      <Badge variant={getStatusBadge(inc.status)} className="uppercase text-[10px] px-1.5 py-0">
                        {inc.status}
                      </Badge>
                      <span className="font-bold text-foreground">INCIDENT #{inc.incidentNumber}</span>
                      <span>•</span>
                      <span className="text-primary font-semibold">{inc.serviceId}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(inc.firstDetectedAt).toLocaleTimeString()}
                      </span>
                    </div>

                    <h3 className="text-sm sm:text-base font-bold text-foreground break-words">{inc.title}</h3>
                    <p className="text-xs text-muted-foreground break-words">{inc.triggerReason}</p>
                  </div>

                  <div className="shrink-0">
                    <Button size="sm" variant="default" className="gap-1.5 text-xs bg-primary hover:bg-primary/90 w-full sm:w-auto h-8 font-mono">
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>Investigate →</span>
                    </Button>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
