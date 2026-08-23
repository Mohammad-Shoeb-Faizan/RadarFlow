"use client";

import React, { useState, useEffect } from "react";
import {
  Key,
  Copy,
  Check,
  Plus,
  Trash2,
  Terminal,
  Shield,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Code2,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function SettingsPage() {
  const [keys, setKeys] = useState<any[]>([]);
  const [newKeyName, setNewKeyName] = useState("Production SDK Key");
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [hasCopied, setHasCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fetchKeys = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/v1/api-keys");
      if (res.ok) {
        const json = await res.json();
        setKeys(json.keys || []);
      }
    } catch (err) {
      console.error("Failed to load API keys", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchKeys();
  }, []);

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/v1/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newKeyName, isLive: true }),
      });
      const data = await res.json();
      if (res.ok) {
        setGeneratedKey(data.key.rawKey);
        fetchKeys();
        toast.success("API Key generated successfully");
      }
    } catch {
      toast.error("Failed to generate API key");
    }
  };

  const handleRevokeKey = async (id: string) => {
    try {
      const res = await fetch(`/api/v1/api-keys?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.info("API Key revoked");
        fetchKeys();
      }
    } catch {
      toast.error("Failed to revoke API key");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setHasCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setHasCopied(false), 2000);
  };

  return (
    <div className="space-y-6 sm:space-y-8 max-w-5xl w-full min-w-0">
      {/* Header */}
      <div className="border-b border-border/60 pb-4 sm:pb-5">
        <h1 className="text-lg sm:text-xl font-bold tracking-tight text-foreground">
          Project Settings & Ingestion Keys
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
          Manage secure API keys, OpenTelemetry endpoints, and application onboarding.
        </p>
      </div>

      {/* Generated Key Modal / Banner */}
      {generatedKey && (
        <Card className="border-emerald-500/50 bg-emerald-950/15 p-4 sm:p-5 animate-in zoom-in-95 duration-150">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>New API Key Generated</span>
              </div>
              <Badge variant="warning" className="text-[10px]">
                Save it now — this key will never be displayed again
              </Badge>
            </div>

            <div className="flex items-center justify-between gap-2 rounded-md border border-emerald-500/30 bg-card p-2.5 font-mono text-xs text-foreground">
              <span className="truncate">{generatedKey}</span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => copyToClipboard(generatedKey)}
                className="gap-1 text-xs shrink-0 h-8"
              >
                {hasCopied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{hasCopied ? "Copied" : "Copy Key"}</span>
              </Button>
            </div>

            <div className="flex justify-end">
              <Button size="sm" variant="ghost" onClick={() => setGeneratedKey(null)} className="text-xs h-8">
                Dismiss
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* API Keys Management */}
      <Card className="border-border/80 bg-card">
        <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-border/40">
          <div>
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
              <Key className="h-4 w-4 text-primary" />
              API Ingestion Keys
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-0.5">
              Raw keys are hashed before storage. Only masked prefixes are visible afterwards.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 pt-4">
          {/* Create Key Form */}
          <form onSubmit={handleCreateKey} className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              placeholder="Key description (e.g. Production Cluster)"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              className="h-9 flex-1 rounded-md border border-input bg-card px-3 text-xs text-foreground focus:outline-none"
            />
            <Button type="submit" size="sm" className="gap-1.5 text-xs h-9 shrink-0">
              <Plus className="h-3.5 w-3.5" />
              <span>Create New Key</span>
            </Button>
          </form>

          {/* Keys List */}
          <div className="rounded-lg border border-border/80 divide-y divide-border/60 overflow-hidden font-mono text-xs">
            {keys.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground">
                No active API keys found. Generate one above to begin sending telemetry.
              </div>
            ) : (
              keys.map((k) => (
                <div key={k.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 sm:p-3.5 bg-card/60">
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-foreground truncate">{k.name}</span>
                      <Badge variant="success" className="text-[9px] uppercase px-1.5 py-0">Active</Badge>
                    </div>
                    <div className="text-muted-foreground text-[11px] truncate">{k.maskedKey}</div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4 text-[11px] text-muted-foreground pt-1 sm:pt-0 border-t sm:border-t-0 border-border/40 shrink-0">
                    <span>
                      Last used: {k.lastUsedAt ? `${Math.round((Date.now() - k.lastUsedAt) / 60000)}m ago` : "Never"}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRevokeKey(k.id)}
                      className="h-7 w-7 text-muted-foreground hover:text-rose-400"
                      title="Revoke key"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Onboarding & SDK Quick Start Guide */}
      <Card className="border-primary/30 bg-card">
        <CardHeader className="pb-3 border-b border-border/40">
          <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
            <Code2 className="h-4 w-4 text-primary" />
            Developer SDK Quick Start
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground mt-0.5">
            Instrument your Node.js, Express, or Next.js application in under 60 seconds with <code>@radarflow/sdk</code>.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 pt-4 font-mono text-xs">
          {/* Step 1: Install */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold uppercase text-muted-foreground">1. Install Package</span>
            <div className="rounded-lg bg-card p-2.5 sm:p-3 border border-border flex items-center justify-between gap-2">
              <code className="text-primary font-bold truncate">npm install @radarflow/sdk</code>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard("npm install @radarflow/sdk")}
                className="h-7 text-xs shrink-0"
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {/* Step 2: Environment Variables */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold uppercase text-muted-foreground">2. Set Environment Variables</span>
            <pre className="rounded-lg bg-card p-3 border border-border text-foreground leading-relaxed overflow-x-auto max-w-full">
{`RADARFLOW_API_KEY=${keys[0]?.keyPrefix || "rf_live_xxxxxxxxxxxxxxxx"}
RADARFLOW_ENDPOINT=http://localhost:3000`}
            </pre>
          </div>

          {/* Step 3: Instrumentation Code */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold uppercase text-muted-foreground">3. Instrument Application</span>
            <pre className="rounded-lg bg-card p-3 border border-border text-foreground leading-relaxed overflow-x-auto max-w-full">
{`import { RadarFlow } from "@radarflow/sdk";

const radar = new RadarFlow({
  apiKey: process.env.RADARFLOW_API_KEY!,
  endpoint: process.env.RADARFLOW_ENDPOINT!,
  service: "api-gateway",
  environment: "production",
});

// Automatic error capture
radar.captureError(new Error("Database timeout"), {
  attributes: { query: "orders.find" }
});

// Track metrics & latencies
radar.trackMetric("order.checkout.duration", 412, { unit: "ms" });

// OpenTelemetry distributed tracing
await radar.trace("processOrder", async (span) => {
  span.setAttribute("order.id", "ord_992");
  // Your business logic here
});`}
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
