import { AIProvider, IncidentAnalysisInput, IncidentAnalysis } from "./types";

export class NoopAIProvider implements AIProvider {
  isConfigured(): boolean {
    return false;
  }

  async analyzeIncident(_input: IncidentAnalysisInput): Promise<IncidentAnalysis> {
    return {
      provider: "noop",
      model: "none",
      likelyCause: "AI root-cause analysis is currently disabled. Configure GEMINI_API_KEY to enable automated insights.",
      confidence: 0,
      evidence: [],
      recommendedActions: [
        "Inspect correlated error logs for exception stack traces",
        "Check recently completed deployments for breaking changes",
        "Review database connection pool and resource saturation graphs"
      ],
      isAiConfigured: false,
      analyzedAt: Date.now(),
    };
  }
}
