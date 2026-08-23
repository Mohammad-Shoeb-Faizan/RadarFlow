"use client";

import React, { useState, useEffect } from "react";
import { Rocket, GitCommit, Clock, CheckCircle2, AlertTriangle, Plus, RefreshCw } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function DeploymentsPage() {
  const [deployments, setDeployments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [version, setVersion] = useState("v2.15.0");
  const [message, setMessage] = useState("Optimize SQL index for order query lookup");
  const [serviceId, setServiceId] = useState("api");

  const fetchDeployments = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/v1/deployments");
      if (res.ok) {
        const json = await res.json();
        setDeployments(json.deployments || []);
      }
    } catch (err) {
      console.error("Failed to load deployments", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDeployments();
  }, []);

  const handleRecordDeployment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/v1/deployments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId,
          version,
          commitMessage: message,
          deployedBy: "devops-engineer@radarflow.io",
        }),
      });
      if (res.ok) {
        toast.success(`Recorded deployment ${version} for ${serviceId}`);
        setIsCreating(false);
        fetchDeployments();
      }
    } catch {
      toast.error("Failed to record deployment");
    }
  };

  return (
    <div className="space-y-6 w-full min-w-0">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-4 sm:pb-5">
        <div>
          <h1 className="text-lg sm:text-xl font-bold tracking-tight text-foreground">
            Deployments & Release Correlation
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Track code releases to instantly correlate performance regressions with specific commits.
          </p>
        </div>

        <div className="flex items-center gap-2 font-mono">
          <Button size="sm" onClick={() => setIsCreating(!isCreating)} className="gap-1.5 text-xs h-8">
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Record Deployment</span>
            <span className="sm:hidden">Record</span>
          </Button>

          <Button variant="outline" size="sm" onClick={fetchDeployments} disabled={isLoading} className="gap-1.5 text-xs h-8">
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>
      </div>

      {/* Record Deployment Form Modal / Card */}
      {isCreating && (
        <Card className="border-primary/40 bg-card p-4 sm:p-5 animate-in fade-in-0 duration-150">
          <form onSubmit={handleRecordDeployment} className="space-y-4">
            <h3 className="text-sm font-bold text-foreground">Record New Service Deployment</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              <div>
                <label className="text-xs text-muted-foreground font-mono block mb-1">Service</label>
                <select
                  value={serviceId}
                  onChange={(e) => setServiceId(e.target.value)}
                  className="h-9 w-full rounded-md border border-input bg-card px-3 text-xs text-foreground focus:outline-none"
                >
                  <option value="api">api</option>
                  <option value="web">web</option>
                  <option value="worker">worker</option>
                  <option value="payments">payments</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-muted-foreground font-mono block mb-1">Version / Tag</label>
                <input
                  type="text"
                  value={version}
                  onChange={(e) => setVersion(e.target.value)}
                  className="h-9 w-full rounded-md border border-input bg-card px-3 text-xs text-foreground focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="text-xs text-muted-foreground font-mono block mb-1">Commit Summary</label>
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="h-9 w-full rounded-md border border-input bg-card px-3 text-xs text-foreground focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setIsCreating(false)} className="text-xs h-8">
                Cancel
              </Button>
              <Button type="submit" size="sm" className="text-xs h-8">
                Save Deployment
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Deployments List */}
      <div className="space-y-3 font-mono text-xs">
        {deployments.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-8 sm:p-12 text-center text-muted-foreground">
            No deployments recorded yet. Use the "Record Deployment" button or configure your CI/CD webhook.
          </div>
        ) : (
          deployments.map((dep) => (
            <Card key={dep.id} className="p-3.5 sm:p-4 hover:border-primary/40 transition-colors">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 shrink-0 mt-0.5 sm:mt-0">
                    <Rocket className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-sm text-foreground">{dep.version}</span>
                      <Badge variant="success" className="text-[9px] uppercase px-1.5 py-0">
                        {dep.status}
                      </Badge>
                      <span className="text-primary font-semibold">{dep.serviceId}</span>
                    </div>
                    <p className="text-muted-foreground text-xs mt-0.5 break-words">{dep.commitMessage}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 sm:gap-4 text-[11px] text-muted-foreground pl-11 sm:pl-0 shrink-0">
                  <div className="flex items-center gap-1">
                    <GitCommit className="h-3.5 w-3.5 text-primary" />
                    <span>{dep.commitHash.substring(0, 7)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    <span>{new Date(dep.deployedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
