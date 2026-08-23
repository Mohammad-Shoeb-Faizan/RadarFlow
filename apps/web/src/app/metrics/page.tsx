"use client";

import React, { useState, useEffect } from "react";
import { Activity, Clock, RefreshCw, BarChart3, Database, Cpu } from "lucide-react";
import { MetricChart } from "@/components/charts/metric-chart";
import { Button } from "@/components/ui/button";

export default function MetricsPage() {
  const [metricName, setMetricName] = useState("http.request.duration");
  const [timeRange, setTimeRange] = useState("1h");
  const [service, setService] = useState("all");
  const [data, setData] = useState<any>({ series: [], summary: {} });
  const [isLoading, setIsLoading] = useState(false);

  const fetchMetricData = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        name: metricName,
        timeRange,
        service,
      });
      const res = await fetch(`/api/v1/metrics?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error("Failed to load metrics", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMetricData();
  }, [metricName, timeRange, service]);

  const metricsList = [
    { id: "http.request.duration", label: "HTTP Request Duration", unit: "ms", color: "#2a8eff" },
    { id: "http.error.rate", label: "HTTP Error Rate", unit: "%", color: "#ef4444" },
    { id: "http.request.count", label: "Request Throughput", unit: "req", color: "#10b981" },
    { id: "db.connection.active", label: "DB Active Connections", unit: "conn", color: "#f59e0b" },
    { id: "cpu.usage", label: "CPU Utilization", unit: "%", color: "#8b5cf6" },
  ];

  const currentMetric = metricsList.find((m) => m.id === metricName) || metricsList[0];

  return (
    <div className="space-y-6 w-full min-w-0">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-4 sm:pb-5">
        <div>
          <h1 className="text-lg sm:text-xl font-bold tracking-tight text-foreground">
            Metrics & Time-series
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Aggregated system and application telemetry with p50, p95, and p99 percentiles.
          </p>
        </div>

        <Button variant="outline" size="sm" onClick={fetchMetricData} disabled={isLoading} className="gap-1.5 text-xs font-mono h-8">
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </Button>
      </div>

      {/* Metric Selector Tabs */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 rounded-xl border border-border/80 bg-card p-3 shadow-sm">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {metricsList.map((m) => (
            <button
              key={m.id}
              onClick={() => setMetricName(m.id)}
              className={`rounded-lg px-2.5 sm:px-3 py-1.5 text-xs font-mono font-medium transition-all shrink-0 ${
                metricName === m.id
                  ? "bg-primary/20 text-primary border border-primary/40 shadow-sm"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Time Range Selector */}
        <div className="flex items-center gap-2 font-mono text-xs shrink-0">
          <span className="text-muted-foreground">Range:</span>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="h-8 rounded-md border border-input bg-card px-2 text-xs text-foreground focus:outline-none"
          >
            <option value="15m">Last 15m</option>
            <option value="1h">Last 1h</option>
            <option value="6h">Last 6h</option>
            <option value="24h">Last 24h</option>
            <option value="7d">Last 7d</option>
          </select>
        </div>
      </div>

      {/* Main Large Chart */}
      <MetricChart
        title={`${currentMetric.label} (${currentMetric.unit})`}
        description={`Aggregated time-series buckets over ${timeRange}`}
        data={data.series || []}
        unit={currentMetric.unit}
        color={currentMetric.color}
        gradientId="mainMetricGrad"
        summary={data.summary}
        height={260}
      />

      {/* Secondary Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 pt-2">
        <MetricChart
          title="HTTP Error Rate"
          data={data.series || []}
          unit="%"
          color="#ef4444"
          gradientId="errMiniGrad"
          height={180}
        />
        <MetricChart
          title="CPU Utilization"
          data={data.series || []}
          unit="%"
          color="#8b5cf6"
          gradientId="cpuMiniGrad"
          height={180}
        />
      </div>
    </div>
  );
}
