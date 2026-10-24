import { PullRequestPayload, HeuristicFinding, TriageResult } from '@proof/shared';
import { buildTriagePrompt } from './prompt-builder';

export interface OllamaStatus {
  connected: boolean;
  endpoint: string;
  model: string;
  quantization: string;
  version?: string;
  modelsAvailable?: string[];
}

export class OllamaClient {
  private endpoint: string;
  private model: string;
  private timeoutMs: number;

  constructor(endpoint = process.env.OLLAMA_HOST || 'http://localhost:11434', model = process.env.OLLAMA_MODEL || 'qwen2.5:3b', timeoutMs = 20000) {
    this.endpoint = endpoint.replace(/\/$/, '');
    this.model = model;
    this.timeoutMs = timeoutMs;
  }

  /**
   * Pings Ollama to check availability and available models.
   */
  async checkHealth(): Promise<OllamaStatus> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

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
        };
      }

      const data = await res.json() as { models?: Array<{ name: string }> };
      const modelNames = data.models ? data.models.map(m => m.name) : [];

      return {
        connected: true,
        endpoint: this.endpoint,
        model: this.model,
        quantization: 'Q4_K_M',
        modelsAvailable: modelNames,
      };
    } catch {
      return {
        connected: false,
        endpoint: this.endpoint,
        model: this.model,
        quantization: 'Q4_K_M',
      };
    }
  }

  /**
   * Sends PR triage prompt to local Ollama instance and validates the structured response.
   */
  async analyzeWithOllama(
    pr: PullRequestPayload,
    heuristicFindings: HeuristicFinding[],
    heuristicScore: number
  ): Promise<TriageResult | null> {
    const startTime = Date.now();
    const { system, prompt } = buildTriagePrompt(pr, heuristicFindings);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

      const res = await fetch(`${this.endpoint}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          system,
          prompt,
          format: 'json',
          stream: false,
          options: {
            temperature: 0.2, // low temperature for consistent classification
            top_p: 0.9,
          },
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        console.warn(`[OllamaClient] API request failed with status: ${res.status}`);
        return null;
      }

      const data = await res.json() as { response?: string };
      if (!data.response) {
        return null;
      }

      // Parse JSON from Ollama response
      const parsed = JSON.parse(data.response.trim());
      const executionTimeMs = Date.now() - startTime;

      return {
        prId: pr.id,
        verdict: parsed.verdict || 'NEEDS_WORK',
        confidence: parsed.confidence || 'MEDIUM',
        engine: 'OLLAMA_LOCAL',
        engineDetails: {
          ollamaAvailable: true,
          modelName: this.model,
          quantization: 'Q4_K_M',
          executionTimeMs,
          isFallback: false,
        },
        summary: parsed.summary || 'AI evaluation complete.',
        heuristicFindings,
        evidence: Array.isArray(parsed.evidence) ? parsed.evidence.map((e: any, i: number) => ({
          id: `ai-ev-${i}`,
          type: e.type || 'AI_OBSERVATION',
          severity: e.severity || 'NEUTRAL',
          description: e.description || '',
          file: e.file,
          lineRange: e.lineRange,
        })) : [],
        suggestedComment: parsed.suggestedComment || {
          greeting: `Hi @${pr.author}!`,
          summary: 'Thank you for your pull request.',
          actionablePoints: [],
          closing: 'Best regards.',
          tone: 'CONSTRUCTIVE_GUIDANCE',
          markdown: `Hi @${pr.author}! Thank you for your contribution.`,
        },
        metadata: {
          analyzedAt: new Date().toISOString(),
          rulesTriggered: heuristicFindings.filter(h => !h.passed).map(h => h.id),
          heuristicScore,
        },
      };
    } catch (err) {
      console.warn('[OllamaClient] Inference error or timeout, falling back:', (err as Error).message);
      return null;
    }
  }
}

export const defaultOllamaClient = new OllamaClient();
