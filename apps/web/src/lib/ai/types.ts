export interface IncidentAnalysisInput {
  incidentId: string;
  incidentTitle: string;
  service: string;
  environment: string;
  severity: string;
  triggerReason: string;
  firstDetectedAt: number;
  metrics: Array<{
    name: string;
    value: number;
    unit?: string;
    baselineValue?: number;
    deltaPercent?: number;
  }>;
  recentDeployment?: {
    version: string;
    commitHash: string;
    commitMessage?: string;
    deployedAt: number;
    deployedBy: string;
  };
  relatedLogs: Array<{
    level: string;
    message: string;
    timestamp: number;
    attributes?: Record<string, unknown>;
  }>;
  relatedTraces: Array<{
    traceId: string;
    rootSpanName: string;
    durationMs: number;
    statusCode: string;
    errorSpans?: string[];
  }>;
}

export interface IncidentAnalysis {
  provider: "gemini" | "openai" | "noop";
  model: string;
  likelyCause: string;
  confidence: number; // 0 - 100
  evidence: string[];
  recommendedActions: string[];
  isAiConfigured: boolean;
  analyzedAt: number;
}

export interface AIProvider {
  analyzeIncident(input: IncidentAnalysisInput): Promise<IncidentAnalysis>;
  isConfigured(): boolean;
}
