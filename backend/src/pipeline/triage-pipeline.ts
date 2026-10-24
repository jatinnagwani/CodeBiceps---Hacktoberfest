import { PullRequestPayload, TriageResult } from '@proof/shared';
import { runHeuristics } from '../heuristics';
import { OllamaClient, defaultOllamaClient } from '../ai/ollama-client';
import { generateHeuristicsFallback } from '../ai/fallback-generator';
import { filterValidEvidence } from '../validation/evidence-validator';

export class TriagePipeline {
  private ollama: OllamaClient;

  constructor(ollamaClient: OllamaClient = defaultOllamaClient) {
    this.ollama = ollamaClient;
  }

  /**
   * Executes the full PR triage pipeline:
   * 1. Deterministic Heuristics
   * 2. Local Ollama Evaluation (if available)
   * 3. Fallback Generation (if Ollama offline)
   * 4. Structured Verdict & Evidence Synthesis
   */
  async triage(pr: PullRequestPayload): Promise<TriageResult> {
    const startTime = Date.now();

    // Step 1: Run deterministic heuristics
    const { findings, score } = runHeuristics(pr);

    // Step 2: Attempt Ollama local inference
    const health = await this.ollama.checkHealth();
    if (health.connected) {
      const aiResult = await this.ollama.analyzeWithOllama(pr, findings, score);
      if (aiResult) {
        // Step 2b: Validate model-generated evidence against actual PR diff
        const { valid } = filterValidEvidence(aiResult.evidence, pr.filesChanged);
        return {
          ...aiResult,
          evidence: valid,
        };
      }
    }

    // Step 3: Transparent heuristics-only fallback
    const executionTimeMs = Date.now() - startTime;
    const fallbackResult = generateHeuristicsFallback(pr, findings, score, executionTimeMs);
    const { valid } = filterValidEvidence(fallbackResult.evidence, pr.filesChanged);
    return {
      ...fallbackResult,
      evidence: valid,
    };
  }
}

export const defaultTriagePipeline = new TriagePipeline();
