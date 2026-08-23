import { AIProvider, IncidentAnalysisInput, IncidentAnalysis } from "./types";

export class GeminiAIProvider implements AIProvider {
  private apiKey: string | undefined;
  private model: string;

  constructor(apiKey?: string, model?: string) {
    this.apiKey = apiKey || process.env.GEMINI_API_KEY;
    this.model = model || process.env.GEMINI_MODEL || "gemini-2.5-flash";
  }

  isConfigured(): boolean {
    return !!this.apiKey && this.apiKey.trim().length > 0;
  }

  async analyzeIncident(input: IncidentAnalysisInput): Promise<IncidentAnalysis> {
    if (!this.isConfigured()) {
      return this.buildFallbackAnalysis(input, "Gemini API key is not configured");
    }

    try {
      const prompt = this.buildPrompt(input);
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.2,
          },
        }),
      });

      // Gracefully catch quota/rate-limit errors (HTTP 429), quota depletion (HTTP 403), or upstream overload (HTTP 503)
      if (!response.ok) {
        const errorText = await response.text();
        const isQuotaError =
          response.status === 429 ||
          response.status === 403 ||
          errorText.includes("RESOURCE_EXHAUSTED") ||
          errorText.includes("quota") ||
          errorText.includes("rate limit");

        console.warn(`[Gemini API ${response.status}] ${isQuotaError ? "Quota/Rate-limit reached" : "API error"}:`, errorText);

        const reason = isQuotaError
          ? "Gemini API free-tier rate limit or quota exceeded. Generated heuristic telemetry synthesis."
          : `Gemini API returned status ${response.status}. Generated heuristic telemetry synthesis.`;

        return this.buildFallbackAnalysis(input, reason);
      }

      const data = await response.json();
      const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!candidateText) {
        return this.buildFallbackAnalysis(input, "Empty response received from Gemini model.");
      }

      try {
        const parsed = JSON.parse(candidateText);
        return {
          provider: "gemini",
          model: this.model,
          likelyCause: parsed.likelyCause || "Undetermined root cause based on available signals",
          confidence: Math.min(100, Math.max(0, parsed.confidence ?? 80)),
          evidence: Array.isArray(parsed.evidence) ? parsed.evidence : [],
          recommendedActions: Array.isArray(parsed.recommendedActions) ? parsed.recommendedActions : [],
          isAiConfigured: true,
          analyzedAt: Date.now(),
        };
      } catch {
        return this.buildFallbackAnalysis(input, "Unstructured response from model. Fallback synthesis applied.");
      }
    } catch (err: any) {
      console.warn("[Gemini Provider Exception] Falling back to heuristic analysis:", err?.message || err);
      return this.buildFallbackAnalysis(input, "Network or connectivity issue reaching Gemini API.");
    }
  }

  private buildFallbackAnalysis(input: IncidentAnalysisInput, fallbackReason?: string): IncidentAnalysis {
    const evidence: string[] = [];
    const actions: string[] = [];

    // 1. Correlate recent deployment if present
    if (input.recentDeployment) {
      evidence.push(
        `Correlated deployment ${input.recentDeployment.version} (${input.recentDeployment.commitHash.substring(0, 7)}: "${input.recentDeployment.commitMessage || "update"}") deployed by ${input.recentDeployment.deployedBy}`
      );
      actions.push(`Review recent commit ${input.recentDeployment.commitHash.substring(0, 7)} for regression or consider rollback`);
    }

    // 2. Correlate anomalous metrics
    if (input.metrics && input.metrics.length > 0) {
      const metricList = input.metrics.map((m) => `${m.name} (${m.value}${m.unit || ""}${m.deltaPercent ? `, +${m.deltaPercent}% breach` : ""})`).join(", ");
      evidence.push(`Anomalous metric values detected at incident trigger: ${metricList}`);
    }

    // 3. Correlate error logs
    if (input.relatedLogs && input.relatedLogs.length > 0) {
      const sampleError = input.relatedLogs[0].message;
      evidence.push(`Detected ${input.relatedLogs.length} error logs on service "${input.service}" (sample: "${sampleError.length > 80 ? sampleError.substring(0, 77) + "..." : sampleError}")`);
      actions.push(`Inspect detailed error stack traces and logs for service "${input.service}"`);
    }

    // 4. Correlate slow or failed traces
    if (input.relatedTraces && input.relatedTraces.length > 0) {
      const sampleTrace = input.relatedTraces[0];
      evidence.push(`Slow or failed root span "${sampleTrace.rootSpanName}" taking ${sampleTrace.durationMs}ms (status: ${sampleTrace.statusCode})`);
      actions.push(`Inspect trace waterfall for span "${sampleTrace.rootSpanName}" to isolate database or downstream service bottlenecks`);
    }

    if (actions.length === 0) {
      actions.push("Check service health status, memory saturation, and CPU load");
      actions.push("Inspect upstream gateway and connection pool metrics");
    }

    const likelyCause = input.recentDeployment
      ? `Likely regression introduced by deployment ${input.recentDeployment.version} on ${input.service}, leading to ${input.triggerReason.toLowerCase()}. ${fallbackReason ? `(${fallbackReason})` : ""}`
      : `Telemetry anomaly detected on service "${input.service}" (${input.triggerReason}). ${fallbackReason ? `(${fallbackReason})` : ""}`;

    return {
      provider: "gemini",
      model: `${this.model} (heuristic-fallback)`,
      likelyCause: likelyCause.trim(),
      confidence: input.recentDeployment ? 78 : 70,
      evidence,
      recommendedActions: actions,
      isAiConfigured: this.isConfigured(),
      analyzedAt: Date.now(),
    };
  }

  private buildPrompt(input: IncidentAnalysisInput): string {
    const deploymentInfo = input.recentDeployment
      ? `Recent Deployment:
- Version: ${input.recentDeployment.version} (Commit: ${input.recentDeployment.commitHash})
- Message: "${input.recentDeployment.commitMessage || "No commit message"}"
- Deployed at: ${new Date(input.recentDeployment.deployedAt).toISOString()} by ${input.recentDeployment.deployedBy}`
      : "Recent Deployment: None detected within correlation window";

    const metricsSummary = input.metrics.length > 0
      ? input.metrics.map((m) => `- ${m.name}: ${m.value} ${m.unit || ""} (Delta: ${m.deltaPercent ? (m.deltaPercent > 0 ? "+" : "") + m.deltaPercent + "%" : "N/A"})`).join("\n")
      : "No metric anomalies recorded";

    const logsSummary = input.relatedLogs.length > 0
      ? input.relatedLogs.slice(0, 10).map((l) => `[${l.level.toUpperCase()}] ${l.message} (Attributes: ${JSON.stringify(l.attributes || {})})`).join("\n")
      : "No related error logs found";

    const tracesSummary = input.relatedTraces.length > 0
      ? input.relatedTraces.slice(0, 10).map((t) => `- ${t.rootSpanName} (${t.durationMs}ms, status: ${t.statusCode})${t.errorSpans ? ` [Errors in spans: ${t.errorSpans.join(", ")}]` : ""}`).join("\n")
      : "No slow or failed traces found";

    return `You are RadarFlow AI, a principal site reliability engineer and distributed systems expert.
Analyze the following structured incident telemetry and determine the likely root cause, evidence points, and concrete actionable investigation steps.

Respond strictly in JSON format matching this exact schema:
{
  "likelyCause": "A concise 1-2 sentence explanation of the most probable technical cause",
  "confidence": 85, // Integer percentage between 0 and 100
  "evidence": [
    "Concrete observation from telemetry supporting this conclusion",
    "Second concrete piece of evidence"
  ],
  "recommendedActions": [
    "Specific immediate mitigation or investigation step 1",
    "Specific step 2"
  ]
}

INCIDENT CONTEXT:
Title: ${input.incidentTitle}
Service: ${input.service}
Environment: ${input.environment}
Severity: ${input.severity}
Trigger Reason: ${input.triggerReason}
First Detected: ${new Date(input.firstDetectedAt).toISOString()}

${deploymentInfo}

METRICS AT INCIDENT TRIGGER:
${metricsSummary}

RELATED ERROR LOGS:
${logsSummary}

RELATED SLOW / FAILED TRACES:
${tracesSummary}
`;
  }
}
