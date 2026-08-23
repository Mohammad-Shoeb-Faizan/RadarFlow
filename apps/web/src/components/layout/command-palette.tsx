"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Server,
  AlertTriangle,
  FileText,
  Activity,
  GitFork,
  Rocket,
  Settings,
  Search,
  Zap,
  Flame,
  RotateCcw,
  X,
} from "lucide-react";

interface CommandItem {
  id: string;
  name: string;
  category: "Navigation" | "Telemetry" | "Actions";
  icon: React.ComponentType<{ className?: string }>;
  action: () => void;
  shortcut?: string;
}

export function CommandPalette({
  isOpen,
  onClose,
  onTriggerAction,
}: {
  isOpen: boolean;
  onClose: () => void;
  onTriggerAction?: (actionName: string) => void;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const commands: CommandItem[] = [
    {
      id: "nav-overview",
      name: "Overview Dashboard",
      category: "Navigation",
      icon: LayoutDashboard,
      shortcut: "G O",
      action: () => {
        router.push("/");
        onClose();
      },
    },
    {
      id: "nav-services",
      name: "Services & Microservices",
      category: "Navigation",
      icon: Server,
      shortcut: "G S",
      action: () => {
        router.push("/services");
        onClose();
      },
    },
    {
      id: "nav-incidents",
      name: "Incidents & Root Cause",
      category: "Navigation",
      icon: AlertTriangle,
      shortcut: "G I",
      action: () => {
        router.push("/incidents");
        onClose();
      },
    },
    {
      id: "nav-logs",
      name: "Logs Explorer",
      category: "Telemetry",
      icon: FileText,
      shortcut: "G L",
      action: () => {
        router.push("/logs");
        onClose();
      },
    },
    {
      id: "nav-metrics",
      name: "Metrics & Time-series",
      category: "Telemetry",
      icon: Activity,
      shortcut: "G M",
      action: () => {
        router.push("/metrics");
        onClose();
      },
    },
    {
      id: "nav-traces",
      name: "Distributed Traces",
      category: "Telemetry",
      icon: GitFork,
      shortcut: "G T",
      action: () => {
        router.push("/traces");
        onClose();
      },
    },
    {
      id: "nav-deployments",
      name: "Deployments Correlation",
      category: "Telemetry",
      icon: Rocket,
      shortcut: "G D",
      action: () => {
        router.push("/deployments");
        onClose();
      },
    },
    {
      id: "nav-settings",
      name: "Settings & API Keys",
      category: "Navigation",
      icon: Settings,
      action: () => {
        router.push("/settings");
        onClose();
      },
    },
    {
      id: "act-generate-traffic",
      name: "Demo: Generate Telemetry Traffic",
      category: "Actions",
      icon: Zap,
      action: () => {
        onTriggerAction?.("generate-traffic");
        onClose();
      },
    },
    {
      id: "act-simulate-incident",
      name: "Demo: Simulate DB Saturation Incident",
      category: "Actions",
      icon: Flame,
      action: () => {
        onTriggerAction?.("simulate-incident");
        onClose();
      },
    },
    {
      id: "act-reset-demo",
      name: "Demo: Reset Telemetry & Incidents",
      category: "Actions",
      icon: RotateCcw,
      action: () => {
        onTriggerAction?.("reset");
        onClose();
      },
    },
  ];

  const filteredCommands = commands.filter(
    (c) =>
      c.name.toLowerCase().includes(query.toLowerCase()) ||
      c.category.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery("");
      setSelectedIndex(0);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredCommands.length));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % Math.max(1, filteredCommands.length));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          filteredCommands[selectedIndex].action();
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, filteredCommands, selectedIndex, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 bg-background/80 backdrop-blur-sm px-3 sm:px-4">
      <div
        className="w-full max-w-lg rounded-xl border border-border/80 bg-card shadow-2xl overflow-hidden animate-in fade-in-0 zoom-in-95 duration-150 flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Header */}
        <div className="flex items-center border-b border-border/80 px-3.5 py-2.5 shrink-0">
          <Search className="h-4 w-4 text-muted-foreground mr-2.5 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a command or search..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            className="w-full bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none text-foreground"
          />
          <button
            onClick={onClose}
            className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-accent shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Command List */}
        <div className="max-h-64 sm:max-h-80 overflow-y-auto p-1.5 flex-1">
          {filteredCommands.length === 0 ? (
            <div className="py-6 text-center text-xs text-muted-foreground">
              No matching commands or pages found.
            </div>
          ) : (
            filteredCommands.map((cmd, idx) => {
              const Icon = cmd.icon;
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={cmd.id}
                  onClick={() => cmd.action()}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between rounded-lg px-3 py-2 text-xs font-medium cursor-pointer transition-colors ${
                    isSelected
                      ? "bg-primary/15 text-primary border border-primary/20"
                      : "text-foreground hover:bg-accent/60"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon className={`h-4 w-4 shrink-0 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                    <span className="truncate">{cmd.name}</span>
                    <span className="text-[10px] text-muted-foreground font-mono px-1 rounded bg-muted/60 shrink-0 hidden sm:inline">
                      {cmd.category}
                    </span>
                  </div>
                  {cmd.shortcut && (
                    <kbd className="font-mono text-[10px] bg-muted/80 text-muted-foreground px-1.5 py-0.5 rounded border border-border shrink-0 ml-2">
                      {cmd.shortcut}
                    </kbd>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border/80 bg-muted/20 px-3 py-2 text-[10px] text-muted-foreground font-mono shrink-0">
          <div className="flex items-center gap-2">
            <span>Navigate <kbd className="bg-muted px-1 rounded border border-border">↑</kbd><kbd className="bg-muted px-1 rounded border border-border">↓</kbd></span>
            <span>Select <kbd className="bg-muted px-1 rounded border border-border">↵</kbd></span>
          </div>
          <span>RadarFlow</span>
        </div>
      </div>
    </div>
  );
}
