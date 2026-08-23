"use client";

import React from "react";
import { LogViewer } from "@/components/logs/log-viewer";
import { FileText } from "lucide-react";

export default function LogsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Structured Logs Explorer
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Real-time high-throughput log streaming, multi-level filtering, and JSON attribute inspection.
        </p>
      </div>

      <LogViewer />
    </div>
  );
}
