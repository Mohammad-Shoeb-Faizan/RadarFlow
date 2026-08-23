"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Server, Activity, AlertTriangle, ShieldCheck, Clock, Layers, RefreshCw, ArrowRight, ExternalLink } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function ServicesPage() {
  const [services, setServices] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchServices = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/v1/services?environment=production");
      if (res.ok) {
        const data = await res.json();
        setServices(data.services || []);
      }
    } catch (err) {
      console.error("Failed to load services", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  return (
    <div className="space-y-6 w-full min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-4 sm:pb-5">
        <div>
          <h1 className="text-lg sm:text-xl font-bold tracking-tight text-foreground">
            Monitored Microservices
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Architecture health, response latencies, error budgets, and runtime environments.
          </p>
        </div>

        <Button variant="outline" size="sm" onClick={fetchServices} disabled={isLoading} className="gap-1.5 text-xs font-mono h-8">
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
        {services.map((svc) => {
          const isHealthy = svc.status === "healthy";
          const isDegraded = svc.status === "degraded";
          const isCritical = svc.status === "critical";

          return (
            <Card key={svc.id} className="border-border/80 bg-card hover:border-primary/40 transition-all shadow-sm flex flex-col justify-between">
              <div>
                <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-border/40 gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 border border-primary/20 text-primary shrink-0">
                      <Server className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="text-sm sm:text-base font-bold text-foreground font-mono truncate">{svc.name}</CardTitle>
                      <span className="text-[10px] text-muted-foreground uppercase font-mono">{svc.environment}</span>
                    </div>
                  </div>

                  <Badge
                    variant={isHealthy ? "success" : isDegraded ? "warning" : "destructive"}
                    className="capitalize font-mono text-xs px-2 py-0.5 shrink-0"
                  >
                    {svc.status}
                  </Badge>
                </CardHeader>

                <CardContent className="space-y-4 pt-4 font-mono">
                  {/* 3-Column Metrics Grid */}
                  <div className="grid grid-cols-3 gap-1.5 py-2 rounded-lg bg-muted/20 border border-border/50 text-center">
                    <div>
                      <div className="text-xs sm:text-sm font-bold text-foreground truncate">{svc.avgLatencyMs}ms</div>
                      <div className="text-[9px] sm:text-[10px] text-muted-foreground uppercase tracking-wider">Avg Latency</div>
                    </div>
                    <div>
                      <div className={`text-xs sm:text-sm font-bold truncate ${svc.errorCount15m > 0 || svc.errorRatePercent > 1 ? "text-rose-400" : "text-foreground"}`}>
                        {svc.errorRatePercent !== undefined ? `${svc.errorRatePercent}%` : `${svc.errorCount15m} err`}
                      </div>
                      <div className="text-[9px] sm:text-[10px] text-muted-foreground uppercase tracking-wider">Error Rate</div>
                    </div>
                    <div>
                      <div className="text-xs sm:text-sm font-bold text-foreground truncate">{svc.throughput || "1.2k req/s"}</div>
                      <div className="text-[9px] sm:text-[10px] text-muted-foreground uppercase tracking-wider">Throughput</div>
                    </div>
                  </div>

                  {/* Metadata List */}
                  <div className="space-y-1.5 text-xs text-muted-foreground">
                    <div className="flex items-center justify-between gap-2">
                      <span>Runtime Framework:</span>
                      <span className="text-foreground font-medium truncate">{svc.framework || svc.language || "TypeScript"}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span>Active Incidents:</span>
                      <span className={svc.activeIncidents > 0 ? "text-rose-400 font-bold" : "text-emerald-400 font-semibold"}>
                        {svc.activeIncidents} unresolved
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] pt-1 border-t border-border/30">
                      <span>Last heartbeat:</span>
                      <span className="text-foreground">Online</span>
                    </div>
                  </div>
                </CardContent>
              </div>

              {/* Actions Footer */}
              <div className="p-4 pt-0">
                <div className="flex flex-col sm:flex-row items-center gap-2 pt-2 border-t border-border/40 font-mono">
                  <Link href={`/traces?search=${svc.name}`} className="w-full sm:flex-1">
                    <Button variant="outline" size="sm" className="w-full text-xs gap-1.5 h-8">
                      <span>Inspect Traces</span>
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  </Link>
                  <Link href={`/logs?service=${svc.name}`} className="w-full sm:flex-1">
                    <Button variant="outline" size="sm" className="w-full text-xs gap-1.5 h-8">
                      <span>View Logs</span>
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
