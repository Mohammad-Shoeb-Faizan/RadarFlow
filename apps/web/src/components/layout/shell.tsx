"use client";

import React, { useState } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { CommandPalette } from "./command-palette";
import { KeyboardShortcutsModal, useGlobalKeyboardNavigation } from "./keyboard-shortcuts";
import { Toaster, toast } from "sonner";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = pathname === "/login" || pathname === "/register";

  const [environment, setEnvironment] = useState("production");
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useGlobalKeyboardNavigation({
    onOpenCommand: () => setIsCommandOpen(true),
    onOpenShortcuts: () => setIsShortcutsOpen(true),
  });

  const handleAction = async (action: string) => {
    if (action === "generate-traffic") {
      try {
        const res = await fetch("/api/v1/demo/generate-traffic", { method: "POST" });
        const data = await res.json();
        if (res.ok) {
          toast.success("Generated realistic demo telemetry across 4 services", {
            description: `${data.stats.totalMetrics} metrics, ${data.stats.totalLogs} logs, ${data.stats.totalSpans} trace spans ingested`,
          });
          setRefreshKey((k) => k + 1);
        }
      } catch {
        toast.error("Failed to generate demo traffic");
      }
    } else if (action === "simulate-incident") {
      try {
        const res = await fetch("/api/v1/demo/simulate-incident", { method: "POST" });
        const data = await res.json();
        if (res.ok) {
          toast.error(`Simulated Incident #${data.incidentNumber} Triggered!`, {
            description: "Deployment #482 -> DB Pool Saturation -> Latency Spike -> Error Rate Surge",
          });
          setRefreshKey((k) => k + 1);
        }
      } catch {
        toast.error("Failed to simulate incident");
      }
    } else if (action === "reset") {
      try {
        await fetch("/api/v1/demo/reset", { method: "POST" });
        toast.info("Demo telemetry reset");
        setRefreshKey((k) => k + 1);
      } catch {
        toast.error("Failed to reset demo");
      }
    }
  };

  if (isAuthPage) {
    return (
      <div className="min-h-screen bg-background text-foreground radar-grid">
        <Toaster position="top-right" theme="dark" richColors />
        {children}
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background text-foreground radar-grid">
      <Toaster position="top-right" theme="dark" richColors />
      <Sidebar
        onOpenShortcuts={() => setIsShortcutsOpen(true)}
        onOpenCommand={() => setIsCommandOpen(true)}
      />

      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        <Header
          environment={environment}
          onEnvironmentChange={setEnvironment}
          onOpenCommand={() => setIsCommandOpen(true)}
          onRefresh={() => setRefreshKey((k) => k + 1)}
        />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8" key={refreshKey}>
          {children}
        </main>
      </div>

      <CommandPalette
        isOpen={isCommandOpen}
        onClose={() => setIsCommandOpen(false)}
        onTriggerAction={handleAction}
      />
      <KeyboardShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />
    </div>
  );
}
