"use client";

import React from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../ui/card";

export interface MetricPoint {
  time: string;
  timestamp: number;
  value: number;
  min?: number;
  max?: number;
  p95?: number;
  count?: number;
}

export function MetricChart({
  title,
  description,
  data,
  unit = "ms",
  color = "#2a8eff",
  gradientId = "colorValue",
  summary,
  height = 220,
}: {
  title: string;
  description?: string;
  data: MetricPoint[];
  unit?: string;
  color?: string;
  gradientId?: string;
  summary?: {
    avg?: number;
    p50?: number;
    p95?: number;
    p99?: number;
    max?: number;
  };
  height?: number;
}) {
  const hasData = data && data.some((d) => d.value > 0);

  return (
    <Card className="border-border/80 bg-card shadow-sm overflow-hidden w-full min-w-0">
      <CardHeader className="flex flex-wrap sm:flex-nowrap items-start sm:items-center justify-between pb-2 border-b border-border/40 gap-2">
        <div className="min-w-0">
          <CardTitle className="text-sm font-semibold tracking-tight text-foreground flex items-center gap-2 truncate">
            {title}
          </CardTitle>
          {description && (
            <CardDescription className="text-xs text-muted-foreground mt-0.5 truncate">
              {description}
            </CardDescription>
          )}
        </div>

        {summary && (
          <div className="flex items-center gap-2 sm:gap-3 font-mono text-[11px] shrink-0">
            {summary.avg !== undefined && (
              <div className="flex flex-col items-end">
                <span className="text-muted-foreground text-[9px] uppercase tracking-wider">Avg</span>
                <span className="font-semibold text-foreground">
                  {summary.avg}
                  <span className="text-[9px] text-muted-foreground ml-0.5">{unit}</span>
                </span>
              </div>
            )}
            {summary.p95 !== undefined && (
              <div className="flex flex-col items-end">
                <span className="text-muted-foreground text-[9px] uppercase tracking-wider">p95</span>
                <span className="font-semibold text-amber-400">
                  {summary.p95}
                  <span className="text-[9px] text-muted-foreground ml-0.5">{unit}</span>
                </span>
              </div>
            )}
            {summary.p99 !== undefined && (
              <div className="flex flex-col items-end">
                <span className="text-muted-foreground text-[9px] uppercase tracking-wider">p99</span>
                <span className="font-semibold text-rose-400">
                  {summary.p99}
                  <span className="text-[9px] text-muted-foreground ml-0.5">{unit}</span>
                </span>
              </div>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent className="pt-3 sm:pt-4 px-2 sm:px-6">
        {!hasData && (!data || data.length === 0) ? (
          <div className="flex h-[180px] sm:h-[200px] flex-col items-center justify-center text-xs font-mono text-muted-foreground text-center p-4">
            <span>No metrics recorded for selected time range</span>
          </div>
        ) : (
          <div style={{ width: "100%", height }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={color} stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis
                  dataKey="time"
                  stroke="rgba(255,255,255,0.3)"
                  fontSize={9}
                  tickLine={false}
                  axisLine={false}
                  fontFamily="var(--font-mono)"
                  interval="preserveStartEnd"
                />
                <YAxis
                  stroke="rgba(255,255,255,0.3)"
                  fontSize={9}
                  tickLine={false}
                  axisLine={false}
                  fontFamily="var(--font-mono)"
                  tickFormatter={(val) => `${val}${unit === "%" ? "%" : ""}`}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload as MetricPoint;
                      return (
                        <div className="rounded-lg border border-border bg-popover/95 p-2.5 sm:p-3 shadow-xl backdrop-blur-md text-xs font-mono max-w-[calc(100vw-3rem)] min-w-[130px] space-y-1 z-50">
                          <div className="text-[10px] text-muted-foreground border-b border-border/40 pb-1">
                            {d.time}
                          </div>
                          <div className="flex items-center justify-between text-foreground">
                            <span className="flex items-center gap-1.5">
                              <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                              <span>Average:</span>
                            </span>
                            <span className="font-bold">{d.value} {unit}</span>
                          </div>
                          {d.p95 !== undefined && d.p95 > 0 && (
                            <div className="flex items-center justify-between text-amber-400 text-[11px]">
                              <span>p95:</span>
                              <span className="font-semibold">{d.p95} {unit}</span>
                            </div>
                          )}
                          {d.max !== undefined && d.max > 0 && (
                            <div className="flex items-center justify-between text-rose-400 text-[11px]">
                              <span>Max Peak:</span>
                              <span className="font-semibold">{d.max} {unit}</span>
                            </div>
                          )}
                          {d.count !== undefined && d.count > 0 && (
                            <div className="flex items-center justify-between text-muted-foreground text-[10px] pt-0.5">
                              <span>Samples:</span>
                              <span>{d.count}</span>
                            </div>
                          )}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={color}
                  strokeWidth={2}
                  fillOpacity={1}
                  fill={`url(#${gradientId})`}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
