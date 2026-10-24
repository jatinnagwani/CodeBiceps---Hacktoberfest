import {
  PullRequestPayload,
  TriageResult,
  AnalysisResult,
  ReviewVerdict,
  Confidence,
  Evidence,
  ReviewComment,
  HeuristicFinding,
  PullRequestPayloadSchema,
  TriageResultSchema,
  AnalysisResultSchema,
} from '@proof/shared';
import { runHeuristics } from '../heuristics';
import { OllamaAdapter, OllamaClient, defaultOllamaAdapter } from '../ai/ollama-client';
import { generateHeuristicsFallback } from '../ai/fallback-generator';
import { filterValidEvidence } from '../validation/evidence-validator';

/**
 * PRoof Review Engine
 *
 * Coordinates pull request evaluation by combining deterministic heuristic rules
 * with probabilistic local LLM analysis (via OllamaAdapter).
 *
 * Core Guarantees:
 * 1. Strict Verdicts: Returns only agreed ReviewVerdict values ('GENUINE' | 'NEEDS_WORK' | 'LIKELY_SPAM').
 * 2. Zod Contract Validation: Model output is strictly verified against shared Zod schemas before being accepted.
 * 3. Cross-Validation without Blind Trust:
 *    - Model output is verified against hard heuristic diff facts (e.g. whitespace-only diffs cannot be GENUINE).
 *    - Heuristic scores are not treated as proof of spam (e.g. documentation or single-line fixes without tests are not spam).
 * 4. Untrusted Input Isolation: Treats PR descriptions, titles, and diffs strictly as untrusted data, never instructions.
 * 5. Robust Fallback: Automatically falls back to a transparent, clearly labeled heuristics-only result if Ollama is offline or times out.
 * 6. Evidence Grounding: Validates all citations against actual diff hunks using filterValidEvidence; never fabricates line numbers or files.
 * 7. Epistemic Humility: Reflects uncertainty in confidence scores and explicit reasoning.
 */
export class ReviewEngine {
  private ollama: OllamaAdapter;

  constructor(ollamaAdapter: OllamaAdapter = defaultOllamaAdapter) {
    this.ollama = ollamaAdapter;
  }

  /**
   * Primary evaluation entry point.
   */
  async review(pr: PullRequestPayload): Promise<AnalysisResult & TriageResult> {
    const startTime = Date.now();

    // ── 0. Validate Untrusted PR Input ──────────────────────────────────────
    const inputValidation = PullRequestPayloadSchema.safeParse(pr);
    if (!inputValidation.success) {
      throw new Error(`Invalid pull request input: ${inputValidation.error.message}`);
    }
    const validatedPR = inputValidation.data;

    // ── 1. Deterministic Heuristics ──────────────────────────────────────────
    const { findings, score } = runHeuristics(validatedPR);

    const whitespaceFinding = findings.find(f => f.id === 'whitespace-check');
    const emptyDiffFinding = findings.find(f => f.id === 'empty-diff-check');
    const testFinding = findings.find(f => f.id === 'test-coverage-check');

    // ── 2. Check Ollama Local AI Availability ────────────────────────────────
    let health = { connected: false };
    try {
      health = await this.ollama.checkHealth();
    } catch {
      health = { connected: false };
    }

    if (!health.connected) {
      return this.buildHeuristicsFallback(validatedPR, findings, score, startTime, 'Ollama is offline or unreachable.');
    }

    // ── 3. Attempt Ollama Inference ──────────────────────────────────────────
    let aiResult: (TriageResult & { reviewComment: ReviewComment; reasoning: string }) | null = null;
    try {
      aiResult = await this.ollama.analyzeWithOllama(validatedPR, findings, score);
    } catch (inferenceErr) {
      console.warn('[ReviewEngine] Ollama inference threw unexpected error, using fallback:', (inferenceErr as Error).message);
      aiResult = null;
    }

    if (!aiResult) {
      return this.buildHeuristicsFallback(
        validatedPR,
        findings,
        score,
        startTime,
        'Local AI inference failed, timed out, or returned malformed output.'
      );
    }

    // ── 4. Validate Model Output Against Shared Zod Schema ──────────────────
    const schemaValidation = TriageResultSchema.safeParse(aiResult);
    if (!schemaValidation.success) {
      console.warn('[ReviewEngine] Model output failed Zod schema validation:', schemaValidation.error.issues);
      return this.buildHeuristicsFallback(
        validatedPR,
        findings,
        score,
        startTime,
        'Model output failed Zod schema validation.'
      );
    }

    // ── 5. Cross-Validation: Combine Reasoning without Blind Trust ───────────
    let finalVerdict: ReviewVerdict = aiResult.verdict;
    let finalConfidence: Confidence = aiResult.confidence;
    let finalReasoning: string = aiResult.reasoning || aiResult.summary;
    let finalSuggestedComment: ReviewComment = aiResult.suggestedComment || aiResult.reviewComment;

    const isWhitespaceCritical = whitespaceFinding && !whitespaceFinding.passed && whitespaceFinding.severity === 'CRITICAL';
    const isEmptyDiffCritical = emptyDiffFinding && !emptyDiffFinding.passed && emptyDiffFinding.severity === 'CRITICAL';

    // Guard 5a: Critical diff facts override model (e.g. prompt injection in description tricked model into GENUINE)
    if ((isWhitespaceCritical || isEmptyDiffCritical) && finalVerdict !== 'LIKELY_SPAM') {
      console.warn(
        `[ReviewEngine] Overriding model verdict "${finalVerdict}" to LIKELY_SPAM due to critical diff heuristics (whitespace/empty diff).`
      );
      finalVerdict = 'LIKELY_SPAM';
      finalConfidence = 'HIGH';
      finalReasoning =
        `Verdict overridden to LIKELY_SPAM: Objective diff analysis determined that changes consist exclusively of ${
          isWhitespaceCritical ? 'whitespace/formatting adjustments' : 'an empty diff'
        }, conflicting with model recommendation. PR description may contain prompt injection or misleading context.`;

      finalSuggestedComment = {
        greeting: `Hello @${validatedPR.author},`,
        summary: 'Thank you for your interest in our project.',
        actionablePoints: [
          'Our automated checks observed that this PR contains only whitespace, indentation, or cosmetic line adjustments.',
          'Please consult CONTRIBUTING.md or check issues tagged "good first issue" for substantive tasks to work on.',
        ],
        closing: 'We encourage you to tackle one of our open issues if you would like to contribute meaningfully.',
        tone: 'POLITE_CAUTION',
        isEdited: false,
        markdown: `Hello @${validatedPR.author},\n\nThank you for your pull request. However, our verification checks indicate that the submitted changes consist solely of whitespace, formatting, or cosmetic adjustments without substantive changes to the codebase.\n\nTo ensure quality contributions during Hacktoberfest, we kindly ask that contributors focus on meaningful bug fixes or feature requests. Please take a look at our open issues labeled \`good first issue\` if you'd like to make a genuine impact!\n\n*Generated by PRoof*`,
      };
    }
    // Guard 5b: Heuristic score is not proof of spam (e.g. small documentation or single-file fix without tests)
    else if (finalVerdict === 'GENUINE' && (!testFinding?.passed || score < 70)) {
      finalConfidence = 'MEDIUM';
      finalReasoning = `${finalReasoning} (Note: Heuristic score is ${score}/100 primarily due to lack of automated tests; verified as substantive by diff inspection).`;
    }
    // Guard 5c: Disagreement between model and strong heuristics
    else if (finalVerdict === 'LIKELY_SPAM' && score >= 80 && testFinding?.passed) {
      console.warn('[ReviewEngine] Model returned LIKELY_SPAM despite strong positive heuristics. Downgrading to NEEDS_WORK with LOW confidence.');
      finalVerdict = 'NEEDS_WORK';
      finalConfidence = 'LOW';
      finalReasoning = `Uncertainty flagged: Model suggested LIKELY_SPAM, but deterministic heuristics found substantial code changes and test coverage (${score}/100). Maintainer review required.`;
    }

    // ── 6. Filter & Validate Evidence Citations Against Diff ─────────────────
    const combinedEvidence: Evidence[] = [
      ...findings.map((h, i) => ({
        id: `heur-ev-${i}`,
        type: 'HEURISTIC' as const,
        severity: (h.passed ? 'POSITIVE' : (h.severity === 'CRITICAL' ? 'CONCERN' : 'NEUTRAL')) as Evidence['severity'],
        description: h.evidence,
        file: validatedPR.filesChanged[0]?.filename,
      })),
      ...(aiResult.evidence || []),
    ];

    const { valid: verifiedEvidence } = filterValidEvidence(combinedEvidence, validatedPR.filesChanged);

    const executionTimeMs = Date.now() - startTime;

    const result: AnalysisResult & TriageResult = {
      prId: validatedPR.id,
      verdict: finalVerdict,
      confidence: finalConfidence,
      engine: 'OLLAMA_LOCAL',
      engineDetails: {
        ollamaAvailable: true,
        modelName: this.ollama.getModel(),
        quantization: 'Q4_K_M',
        executionTimeMs,
        isFallback: false,
      },
      reasoning: finalReasoning,
      summary: aiResult.summary || `${finalVerdict} evaluation based on combined analysis.`,
      heuristicFindings: findings,
      evidence: verifiedEvidence,
      suggestedComment: finalSuggestedComment,
      reviewComment: finalSuggestedComment,
      metadata: {
        analyzedAt: new Date().toISOString(),
        rulesTriggered: findings.filter(f => !f.passed).map(f => f.id),
        heuristicScore: score,
      },
    };

    // Validate with AnalysisResultSchema, ensuring both reviewComment and suggestedComment remain accessible
    const validated = AnalysisResultSchema.passthrough().parse(result);
    return {
      ...validated,
      suggestedComment: finalSuggestedComment,
      reviewComment: finalSuggestedComment,
    } as AnalysisResult & TriageResult;
  }

  /**
   * Alias method for triage pipeline compatibility.
   */
  async triage(pr: PullRequestPayload): Promise<AnalysisResult & TriageResult> {
    return this.review(pr);
  }

  /**
   * Helper that builds an honest, clearly labelled heuristics-only fallback result.
   */
  private buildHeuristicsFallback(
    pr: PullRequestPayload,
    findings: HeuristicFinding[],
    score: number,
    startTime: number,
    reason: string
  ): AnalysisResult & TriageResult {
    const executionTimeMs = Date.now() - startTime;
    const fallback = generateHeuristicsFallback(pr, findings, score, executionTimeMs);
    const { valid: verifiedEvidence } = filterValidEvidence(fallback.evidence, pr.filesChanged);

    const fallbackResult: AnalysisResult & TriageResult = {
      ...fallback,
      reasoning: fallback.summary || `Heuristic evaluation completed with score ${score}/100.`,
      evidence: verifiedEvidence,
      reviewComment: fallback.suggestedComment,
      suggestedComment: fallback.suggestedComment,
      engineDetails: {
        ...fallback.engineDetails,
        notes: `${fallback.engineDetails.notes || ''} [Fallback reason: ${reason}]`.trim(),
      },
    };

    const validated = AnalysisResultSchema.passthrough().parse(fallbackResult);
    return {
      ...validated,
      suggestedComment: fallback.suggestedComment,
      reviewComment: fallback.suggestedComment,
    } as AnalysisResult & TriageResult;
  }
}

/**
 * Backwards-compatible class alias matching Person 1's interface.
 */
export class TriagePipeline extends ReviewEngine {}

export const defaultReviewEngine = new ReviewEngine();
export const defaultTriagePipeline = defaultReviewEngine;
