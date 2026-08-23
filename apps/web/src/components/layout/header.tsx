"use client";

import React, { useState } from "react";
import {
  Menu,
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
  onToggleMobileNav,
}: {
  environment?: string;
  onEnvironmentChange?: (env: string) => void;
  onOpenCommand?: () => void;
  onRefresh?: () => void;
  onToggleMobileNav?: () => void;
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
    <header className="sticky top-0 z-20 flex h-14 w-full items-center justify-between border-b border-border/80 bg-background/80 px-3 sm:px-4 backdrop-blur-md gap-2">
      {/* Left: Mobile Menu Toggle & Environment Selector */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Mobile Hamburger Menu Button */}
        {onToggleMobileNav && (
          <button
            onClick={onToggleMobileNav}
            className="flex md:hidden items-center justify-center h-9 w-9 rounded-lg border border-border bg-card text-foreground hover:bg-accent transition-colors"
            aria-label="Open navigation menu"
          >
            <Menu className="h-4.5 w-4.5" />
          </button>
        )}

        {/* Environment Selector */}
        <div className="flex items-center rounded-md border border-border/80 bg-card p-0.5 text-xs font-mono">
          {[
            { id: "production", label: "Prod", fullLabel: "production" },
            { id: "staging", label: "Stage", fullLabel: "staging" },
            { id: "development", label: "Dev", fullLabel: "development" },
          ].map((env) => (
            <button
              key={env.id}
              onClick={() => onEnvironmentChange?.(env.id)}
              className={`rounded px-1.5 sm:px-2.5 py-1 font-medium capitalize transition-colors text-[11px] sm:text-xs ${
                environment === env.id
                  ? "bg-primary/20 text-primary border border-primary/30"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title={`Switch to ${env.fullLabel} environment`}
            >
              <span className="sm:hidden">{env.label}</span>
              <span className="hidden sm:inline">{env.fullLabel}</span>
            </button>
          ))}
        </div>

        {/* Live Ingestion Indicator (Desktop & Tablet) */}
        <div className="hidden lg:flex items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-400 font-mono shrink-0">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span>Live Ingestion</span>
        </div>
      </div>

      {/* Center: Command Palette Trigger */}
      {onOpenCommand && (
        <div className="flex items-center justify-center flex-1 max-w-xs mx-2">
          {/* Desktop search bar */}
          <button
            onClick={onOpenCommand}
            className="hidden md:flex items-center gap-2 rounded-md border border-border/80 bg-card/70 px-3 py-1 text-xs text-muted-foreground hover:border-primary/40 hover:text-foreground transition-all duration-150 w-full justify-between"
          >
            <div className="flex items-center gap-2 truncate">
              <Search className="h-3.5 w-3.5 text-muted-foreground/80 shrink-0" />
              <span className="truncate">Search logs, traces...</span>
            </div>
            <kbd className="font-mono text-[10px] bg-muted px-1.5 py-0.5 rounded border border-border shrink-0">⌘K</kbd>
          </button>

          {/* Mobile search icon button */}
          <button
            onClick={onOpenCommand}
            className="md:hidden flex items-center justify-center h-8 w-8 rounded-md border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-accent"
            title="Search telemetry and commands (⌘K)"
          >
            <Search className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Right: Demo Action Bar */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        <Button
          variant="outline"
          size="sm"
          onClick={handleGenerateTraffic}
          disabled={isGenerating}
          className="gap-1.5 text-xs border-primary/30 text-primary hover:bg-primary/10 hover:border-primary/50 h-8 px-2 sm:px-3 font-mono"
          title="Send a burst of realistic requests and telemetry"
        >
          <Zap className={`h-3.5 w-3.5 shrink-0 ${isGenerating ? "animate-spin" : "text-primary"}`} />
          <span className="hidden sm:inline">Generate Traffic</span>
        </Button>

        <Button
          variant="destructive"
          size="sm"
          onClick={handleSimulateIncident}
          disabled={isSimulating}
          className="gap-1.5 text-xs bg-rose-600/20 text-rose-400 border border-rose-500/30 hover:bg-rose-600/30 h-8 px-2 sm:px-3 font-mono"
          title="Trigger a realistic DB pool saturation incident with latency spike"
        >
          <Flame className={`h-3.5 w-3.5 shrink-0 ${isSimulating ? "animate-pulse" : "text-rose-400"}`} />
          <span className="hidden sm:inline">Simulate Incident</span>
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={handleResetDemo}
          className="h-8 w-8 text-muted-foreground hover:text-foreground shrink-0"
          title="Reset telemetry and incidents"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </Button>
      </div>
    </header>
  );
}
