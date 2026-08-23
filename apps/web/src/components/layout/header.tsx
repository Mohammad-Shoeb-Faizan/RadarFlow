"use client";

import React, { useState } from "react";
import {
  Play,
  Flame,
  RotateCcw,
  Search,
  CheckCircle2,
  AlertCircle,
  Zap,
} from "lucide-react";
import { Button } from "../ui/button";
import { toast } from "sonner";

export function Header({
  environment = "production",
  onEnvironmentChange,
  onOpenCommand,
  onRefresh,
}: {
  environment?: string;
  onEnvironmentChange?: (env: string) => void;
  onOpenCommand?: () => void;
  onRefresh?: () => void;
}) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);

  const handleGenerateTraffic = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch("/api/v1/demo/generate-traffic", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        toast.success("Generated realistic demo telemetry across 4 services", {
          description: `${data.stats.totalMetrics} metrics, ${data.stats.totalLogs} logs, ${data.stats.totalSpans} trace spans ingested`,
        });
        onRefresh?.();
      } else {
        toast.error("Failed to generate traffic", { description: data.error });
      }
    } catch {
      toast.error("Network error while generating demo traffic");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSimulateIncident = async () => {
    setIsSimulating(true);
    try {
      const res = await fetch("/api/v1/demo/simulate-incident", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        toast.error(`Simulated Incident #${data.incidentNumber} Triggered!`, {
          description: "Deployment #482 -> DB Pool Saturation -> Latency Spike -> Error Rate Surge",
        });
        onRefresh?.();
      } else {
        toast.error("Failed to simulate incident", { description: data.error });
      }
    } catch {
      toast.error("Network error while simulating incident");
    } finally {
      setIsSimulating(false);
    }
  };

  const handleResetDemo = async () => {
    try {
      const res = await fetch("/api/v1/demo/reset", { method: "POST" });
      if (res.ok) {
        toast.info("Demo data reset to clean baseline state");
        onRefresh?.();
      }
    } catch {
      toast.error("Failed to reset demo data");
    }
  };

  return (
    <header className="sticky top-0 z-20 flex h-14 w-full items-center justify-between border-b border-border/80 bg-background/80 px-4 backdrop-blur-md">
      {/* Left: Environment Selector & Health Status */}
      <div className="flex items-center gap-3">
        <div className="flex items-center rounded-md border border-border/80 bg-card p-0.5 text-xs">
          {["production", "staging", "development"].map((env) => (
            <button
              key={env}
              onClick={() => onEnvironmentChange?.(env)}
              className={`rounded px-2.5 py-1 font-medium capitalize transition-colors ${
                environment === env
                  ? "bg-primary/20 text-primary border border-primary/30"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {env}
            </button>
          ))}
        </div>

        <div className="hidden sm:flex items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-400">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          Live Ingestion Active
        </div>
      </div>

      {/* Center: Command Palette Trigger */}
      {onOpenCommand && (
        <button
          onClick={onOpenCommand}
          className="hidden md:flex items-center gap-2 rounded-md border border-border/80 bg-card/70 px-3 py-1 text-xs text-muted-foreground hover:border-primary/40 hover:text-foreground transition-all duration-150 w-72 justify-between"
        >
          <div className="flex items-center gap-2 truncate">
            <Search className="h-3.5 w-3.5 text-muted-foreground/80" />
            <span className="truncate">Search logs, traces, incidents...</span>
          </div>
          <kbd className="font-mono text-[10px] bg-muted px-1.5 py-0.5 rounded border border-border">⌘K</kbd>
        </button>
      )}

      {/* Right: Demo Action Bar */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleGenerateTraffic}
          disabled={isGenerating}
          className="gap-1.5 text-xs border-primary/30 text-primary hover:bg-primary/10 hover:border-primary/50"
          title="Send a burst of realistic requests and telemetry"
        >
          <Zap className={`h-3.5 w-3.5 ${isGenerating ? "animate-spin" : "text-primary"}`} />
          <span className="hidden sm:inline">Generate Traffic</span>
        </Button>

        <Button
          variant="destructive"
          size="sm"
          onClick={handleSimulateIncident}
          disabled={isSimulating}
          className="gap-1.5 text-xs bg-rose-600/20 text-rose-400 border border-rose-500/30 hover:bg-rose-600/30"
          title="Trigger a realistic DB pool saturation incident with latency spike"
        >
          <Flame className={`h-3.5 w-3.5 ${isSimulating ? "animate-pulse" : "text-rose-400"}`} />
          <span className="hidden sm:inline">Simulate Incident</span>
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={handleResetDemo}
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          title="Reset telemetry and incidents"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </Button>
      </div>
    </header>
  );
}
