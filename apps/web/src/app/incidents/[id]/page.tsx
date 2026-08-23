"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { IncidentDetailView } from "@/components/incidents/incident-detail-view";
import { Button } from "@/components/ui/button";

export default function IncidentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const fetchDetail = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/v1/incidents/${id}`);
        if (res.ok) {
          const json = await res.json();
          setData(json);
        } else {
          setError("Incident not found or failed to load");
        }
      } catch (err) {
        setError("Network error while loading incident");
      } finally {
        setIsLoading(false);
      }
    };
    fetchDetail();
  }, [id]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
        <span className="text-xs font-mono text-muted-foreground">Loading incident telemetry & correlation...</span>
      </div>
    );
  }

  if (error || !data?.incident) {
    return (
      <div className="p-8 text-center space-y-4">
        <h2 className="text-lg font-bold text-foreground">Incident not found</h2>
        <p className="text-xs text-muted-foreground">{error || "Unable to locate incident record"}</p>
        <Button size="sm" onClick={() => router.push("/incidents")}>
          Back to Incidents
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link
        href="/incidents"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-mono transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        <span>Back to Incidents</span>
      </Link>

      <IncidentDetailView
        incident={data.incident}
        events={data.events}
        aiAnalysis={data.aiAnalysis}
        logs={data.logs}
        traces={data.traces}
        deployments={data.deployments}
      />
    </div>
  );
}
