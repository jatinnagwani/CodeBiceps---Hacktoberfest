import {
  PullRequestPayload,
  HeuristicFinding,
  TriageResult,
  AnalysisResult,
  ReviewVerdict,
  Confidence,
  Evidence,
  ReviewComment,
} from '@proof/shared';
import { buildTriagePrompt } from './prompt-builder';

export interface OllamaStatus {
  connected: boolean;
  endpoint: string;
  model: string;
  quantization: string;
  version?: string;
  modelsAvailable?: string[];
  modelInstalled?: boolean;
}

export interface OllamaAdapterConfig {
  endpoint?: string;
  model?: string;
  timeoutMs?: number;
  temperature?: number;
}

/**
 * Local AI model adapter connecting PRoof to Ollama's local HTTP API.
 *
 * Design constraints:
 * - Local-first: communicates strictly with the local Ollama daemon.
 * - Integrity: never silently delegates to hosted or cloud AI providers.
 * - Honesty: never claims model analysis succeeded when it failed; returns null on error.
 * - Defensive: handles offline daemons, missing models, timeouts, and malformed outputs.
 */
export class OllamaAdapter {
  private endpoint: string;
  private model: string;
  private timeoutMs: number;
  private temperature: number;

  constructor(
    endpoint = process.env.OLLAMA_HOST || process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
    model = process.env.OLLAMA_MODEL || 'proof-reviewer',
    timeoutMs = process.env.OLLAMA_TIMEOUT_MS ? parseInt(process.env.OLLAMA_TIMEOUT_MS, 10) : 20000,
    temperature = process.env.OLLAMA_TEMPERATURE ? parseFloat(process.env.OLLAMA_TEMPERATURE) : 0.1
  ) {
    this.endpoint = endpoint.replace(/\/$/, '');
    this.model = model;
    this.timeoutMs = timeoutMs;
    this.temperature = temperature;
  }

  getModel(): string {
    return this.model;
  }

  getEndpoint(): string {
    return this.endpoint;
  }

  getTimeoutMs(): number {
    return this.timeoutMs;
  }

  getTemperature(): number {
    return this.temperature;
  }

  /**
   * Pings Ollama to check availability and verify whether the configured model is installed.
   */
  async checkHealth(): Promise<OllamaStatus> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), Math.min(this.timeoutMs, 3000));

      const res = await fetch(`${this.endpoint}/api/tags`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        return {
          connected: false,
          endpoint: this.endpoint,
          model: this.model,
          quantization: 'Q4_K_M',
          modelInstalled: false,
        };
      }

      const data = (await res.json()) as { models?: Array<{ name: string }> };
      const modelNames = Array.isArray(data.models) ? data.models.map(m => m.name) : [];
      const modelInstalled = modelNames.some(
        m => m === this.model || m === `${this.model}:latest` || m.startsWith(`${this.model}:`)
      );

      return {
        connected: true,
        endpoint: this.endpoint,
        model: this.model,
        quantization: 'Q4_K_M',
        modelsAvailable: modelNames,
        modelInstalled,
      };
    } catch {
      return {
        connected: false,
        endpoint: this.endpoint,
        model: this.model,
        quantization: 'Q4_K_M',
        modelInstalled: false,
      };
    }
  }

  /**
   * Primary entry point to send PR details, diff, and heuristic findings to Ollama.
   * Requests a structured assessment: verdict, concise reasoning, evidence references,
   * and a constructive mentoring comment.
   *
   * Returns null if Ollama is offline, the model is missing, an HTTP error occurs,
   * or the response is malformed. Never claims success on failure.
   */
  async analyzeWithOllama(
    pr: PullRequestPayload,
    heuristicFindings: HeuristicFinding[],
    heuristicScore: number
  ): Promise<(TriageResult & { reviewComment: ReviewComment; reasoning: string }) | null> {
    if (!pr || !pr.id) {
      return null;
    }

    const startTime = Date.now();
    const { system, prompt } = buildTriagePrompt(pr, heuristicFindings);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    let res: Response;
    try {
      res = await fetch(`${this.endpoint}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          system,
          prompt,
          format: 'json',
          stream: false,
          options: {
            temperature: this.temperature,
            top_p: 0.9,
          },
        }),
        signal: controller.signal,
      });
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        console.warn(`[OllamaAdapter] Request timed out after ${this.timeoutMs}ms.`);
      } else {
        console.warn(
          `[OllamaAdapter] Ollama daemon is offline or unreachable: ${(err as Error)?.message || err}`
        );
      }
      return null;
    } finally {
      clearTimeout(timeoutId);
    }

    // Handle model not installed (Ollama returns HTTP 404)
    if (res.status === 404) {
      let detail = '';
      try {
        const errJson = (await res.json()) as { error?: string };
        detail = errJson.error || '';
      } catch {
        // ignore error parsing
      }
      console.warn(
        `[OllamaAdapter] Model "${this.model}" is not installed in Ollama (HTTP 404). ` +
          (detail ? `Detail: ${detail}. ` : '') +
          `Pull the model with: "ollama pull ${this.model}".`
      );
      return null;
    }

    // Handle generic HTTP errors
    if (!res.ok) {
      console.warn(`[OllamaAdapter] API request failed with HTTP ${res.status}: ${res.statusText}`);
      return null;
    }

    // Parse outer response container
    let data: { response?: string; error?: string };
    try {
      data = (await res.json()) as { response?: string; error?: string };
    } catch {
      console.warn('[OllamaAdapter] Malformed response: failed to parse HTTP body as JSON.');
      return null;
    }

    if (data.error) {
      if (data.error.toLowerCase().includes('not found')) {
        console.warn(
          `[OllamaAdapter] Model "${this.model}" is not installed in Ollama. Detail: ${data.error}`
        );
      } else {
        console.warn(`[OllamaAdapter] Ollama returned error: ${data.error}`);
      }
      return null;
    }

    if (!data.response || typeof data.response !== 'string' || !data.response.trim()) {
      console.warn('[OllamaAdapter] Malformed response: empty response string from model.');
      return null;
    }

    // Parse model-generated JSON
    let parsed: any;
    try {
      const raw = data.response.trim();
      const cleanJson = raw.startsWith('```')
        ? raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
        : raw;
      parsed = JSON.parse(cleanJson);
    } catch (parseErr) {
      console.warn(
        `[OllamaAdapter] Malformed model output: failed to parse model JSON: ${(parseErr as Error).message}`
      );
      return null;
    }

    if (!parsed || typeof parsed !== 'object') {
      console.warn('[OllamaAdapter] Malformed model output: expected JSON object.');
      return null;
    }

    // Validate verdict against domain types
    const validVerdicts: ReviewVerdict[] = ['GENUINE', 'NEEDS_WORK', 'LIKELY_SPAM'];
    if (!parsed.verdict || !validVerdicts.includes(parsed.verdict)) {
      console.warn(`[OllamaAdapter] Malformed model output: invalid verdict "${parsed.verdict}".`);
      return null;
    }

    const executionTimeMs = Date.now() - startTime;
    const verdict: ReviewVerdict = parsed.verdict;
    const confidence: Confidence = ['HIGH', 'MEDIUM', 'LOW'].includes(parsed.confidence)
      ? parsed.confidence
      : 'MEDIUM';

    const reasoning =
      typeof parsed.reasoning === 'string' && parsed.reasoning.trim().length > 0
        ? parsed.reasoning.trim()
        : typeof parsed.summary === 'string' && parsed.summary.trim().length > 0
        ? parsed.summary.trim()
        : `PR evaluated as ${verdict} based on diff analysis and heuristic signals.`;

    const summary =
      typeof parsed.summary === 'string' && parsed.summary.trim().length > 0
        ? parsed.summary.trim()
        : `AI evaluation complete: ${verdict}.`;

    const evidence: Evidence[] = Array.isArray(parsed.evidence)
      ? parsed.evidence.map((e: any, i: number) => ({
          id: `ai-ev-${i}`,
          type: ['HEURISTIC', 'AI_OBSERVATION', 'DIFF_INSPECTION'].includes(e.type)
            ? e.type
            : 'AI_OBSERVATION',
          severity: ['POSITIVE', 'NEUTRAL', 'CONCERN'].includes(e.severity)
            ? e.severity
            : 'NEUTRAL',
          description: typeof e.description === 'string' ? e.description : '',
          file: typeof e.file === 'string' ? e.file : undefined,
          lineRange: typeof e.lineRange === 'string' ? e.lineRange : undefined,
        }))
      : [];

    const rawComment = parsed.suggestedComment || {};
    const greeting =
      typeof rawComment.greeting === 'string' ? rawComment.greeting : `Hi @${pr.author}!`;
    const commentSummary =
      typeof rawComment.summary === 'string' ? rawComment.summary : summary;
    const actionablePoints: string[] = Array.isArray(rawComment.actionablePoints)
      ? rawComment.actionablePoints.filter((p: unknown) => typeof p === 'string')
      : [];
    const closing =
      typeof rawComment.closing === 'string' ? rawComment.closing : 'Best regards.';
    const tone = ['ENCOURAGING', 'CONSTRUCTIVE_GUIDANCE', 'POLITE_CAUTION'].includes(
      rawComment.tone
    )
      ? rawComment.tone
      : verdict === 'GENUINE'
      ? 'ENCOURAGING'
      : verdict === 'NEEDS_WORK'
      ? 'CONSTRUCTIVE_GUIDANCE'
      : 'POLITE_CAUTION';

    const markdown =
      typeof rawComment.markdown === 'string' && rawComment.markdown.trim().length > 0
        ? rawComment.markdown.trim()
        : `${greeting}\n\n${commentSummary}\n\n${actionablePoints.map(p => `- ${p}`).join('\n')}\n\n${closing}`;

    const reviewComment: ReviewComment = {
      greeting,
      summary: commentSummary,
      actionablePoints,
      closing,
      tone,
      isEdited: false,
      markdown,
    };

    return {
      prId: pr.id,
      verdict,
      confidence,
      engine: 'OLLAMA_LOCAL',
      engineDetails: {
        ollamaAvailable: true,
        modelName: this.model,
        quantization: 'Q4_K_M',
        executionTimeMs,
        isFallback: false,
      },
      reasoning,
      summary,
      heuristicFindings,
      evidence,
      suggestedComment: reviewComment,
      reviewComment,
      metadata: {
        analyzedAt: new Date().toISOString(),
        rulesTriggered: heuristicFindings.filter(h => !h.passed).map(h => h.id),
        heuristicScore,
      },
    };
  }

  /**
   * Convenience alias matching analyzeWithOllama.
   */
  async analyze(
    pr: PullRequestPayload,
    heuristicFindings: HeuristicFinding[],
    heuristicScore: number
  ): Promise<(TriageResult & { reviewComment: ReviewComment; reasoning: string }) | null> {
    return this.analyzeWithOllama(pr, heuristicFindings, heuristicScore);
  }
}

/**
 * Backwards-compatible class alias.
 */
export class OllamaClient extends OllamaAdapter {}

export const defaultOllamaAdapter = new OllamaAdapter();
export const defaultOllamaClient = defaultOllamaAdapter;
