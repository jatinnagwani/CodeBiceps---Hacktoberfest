import { describe, it, expect } from 'vitest';
import {
  PullRequestPayload,
  PullRequestPayloadSchema,
  AnalysisResultSchema,
  TriageResultSchema,
  ReviewVerdict,
  Confidence,
  ReviewComment,
  Evidence,
} from '@proof/shared';
import {
  reproducibleGenuinePR,
  reproducibleNeedsWorkPR,
  reproducibleLikelySpamPR,
  reproducibleWhitespacePR,
  reproducibleBenchmarkDataset,
} from './fixtures/reproducible-dataset';
import {
  runHeuristics,
  checkWhitespaceOnly,
  checkEmptyDiff,
  checkDiffSizeAndTests,
  checkLinkedIssue,
  checkDescriptionAndTemplate,
  checkTitleQuality,
} from '../src/heuristics';
import { ReviewEngine } from '../src/engine/review-engine';
import { OllamaAdapter } from '../src/ai/ollama-client';

/**
 * Deterministic Mock Ollama Adapter.
 *
 * Simulates a healthy local Ollama instance returning predetermined,
 * schema-valid triage results for unit testing without requiring
 * an installed Ollama daemon or model.
 */
class DeterministicMockOllamaAdapter extends OllamaAdapter {
  private customHandler?: (
    pr: PullRequestPayload
  ) => Promise<{
    verdict: ReviewVerdict;
    confidence: Confidence;
    reasoning: string;
    summary: string;
    reviewComment: ReviewComment;
    evidence: Evidence[];
  }>;

  constructor(
    customHandler?: (
      pr: PullRequestPayload
    ) => Promise<{
      verdict: ReviewVerdict;
      confidence: Confidence;
      reasoning: string;
      summary: string;
      reviewComment: ReviewComment;
      evidence: Evidence[];
    }>
  ) {
    super('http://mock-ollama:11434', 'mock-qwen2.5:3b');
    this.customHandler = customHandler;
  }

  async checkHealth() {
    return {
      connected: true,
      endpoint: 'http://mock-ollama:11434',
      model: 'mock-qwen2.5:3b',
      quantization: 'Q4_K_M',
      modelInstalled: true,
    };
  }

  async analyzeWithOllama(pr: PullRequestPayload) {
    if (this.customHandler) {
      const custom = await this.customHandler(pr);
      return {
        prId: pr.id,
        verdict: custom.verdict,
        confidence: custom.confidence,
        engine: 'OLLAMA_LOCAL' as const,
        engineDetails: {
          ollamaAvailable: true,
          modelName: 'mock-qwen2.5:3b',
          quantization: 'Q4_K_M',
          executionTimeMs: 45,
          isFallback: false,
        },
        reasoning: custom.reasoning,
        summary: custom.summary,
        heuristicFindings: [],
        evidence: custom.evidence,
        suggestedComment: custom.reviewComment,
        reviewComment: custom.reviewComment,
        metadata: {
          analyzedAt: new Date().toISOString(),
          rulesTriggered: [],
          heuristicScore: 85,
        },
      };
    }

    // Default response for benchmark PRs
    return null;
  }
}

/**
 * Mock Ollama Adapter simulating an offline or unreachable local daemon.
 */
class OfflineMockOllamaAdapter extends OllamaAdapter {
  constructor() {
    super('http://offline-ollama:11434', 'mock-model');
  }

  async checkHealth() {
    return {
      connected: false,
      endpoint: 'http://offline-ollama:11434',
      model: 'mock-model',
      quantization: 'Q4_K_M',
      modelInstalled: false,
    };
  }

  async analyzeWithOllama() {
    return null;
  }
}

describe('PRoof Reproducible Benchmark Dataset & Verification Suite', () => {
  // ── 0. Dataset Schema & Structure Conformance ──────────────────────────────
  describe('Dataset Contract Validation', () => {
    /**
     * Verifies that all 4 benchmark fixtures strictly conform to the shared
     * PullRequestPayloadSchema and contain non-empty metadata and diff hunks.
     */
    it('all benchmark fixtures strictly conform to PullRequestPayloadSchema', () => {
      expect(reproducibleBenchmarkDataset).toHaveLength(4);

      for (const fixture of reproducibleBenchmarkDataset) {
        const parseResult = PullRequestPayloadSchema.safeParse(fixture);
        expect(parseResult.success).toBe(true);

        // Required operational fields
        expect(fixture.id).toBeTruthy();
        expect(fixture.title.trim().length).toBeGreaterThan(0);
        expect(fixture.description.trim().length).toBeGreaterThan(0);
        expect(fixture.filesChanged.length).toBeGreaterThan(0);
        expect(fixture.stats.totalFiles).toBe(fixture.filesChanged.length);

        // Diff patches must be present and contain standard unified diff headers
        for (const file of fixture.filesChanged) {
          expect(file.patch).toBeDefined();
          expect(file.patch).toContain('@@');
        }
      }
    });
  });

  // ── 1. Genuine PR with Meaningful Code Change ─────────────────────────────
  describe('Scenario 1: Genuine PR with Meaningful Code Change', () => {
    const pr = reproducibleGenuinePR;

    /**
     * Verifies heuristic behavior on genuine PR:
     * - Detects substantive code additions in src/middleware/idempotency.ts
     * - Identifies accompanying unit test file in tests/middleware/idempotency.test.ts
     * - Recognizes linked issue #204
     * - Computes a high heuristic confidence score (>= 70)
     */
    it('evaluates genuine PR heuristics with high score and positive test coverage', () => {
      const { findings, score, rulesTriggered } = runHeuristics(pr);

      // Score must reflect high-quality contribution
      expect(score).toBeGreaterThanOrEqual(70);
      expect(rulesTriggered).toHaveLength(0); // No warning or critical rules triggered

      // Diff Volume Check: reasonable scope
      const volumeFinding = findings.find(f => f.id === 'diff-volume-check');
      expect(volumeFinding).toBeDefined();
      expect(volumeFinding?.passed).toBe(true);
      expect(volumeFinding?.severity).toBe('INFO');
      expect(volumeFinding?.scoreImpact).toBe(15);

      // Test Coverage Check: dedicated test file recognized
      const testFinding = findings.find(f => f.id === 'test-coverage-check');
      expect(testFinding).toBeDefined();
      expect(testFinding?.passed).toBe(true);
      expect(testFinding?.severity).toBe('INFO');
      expect(testFinding?.scoreImpact).toBe(25);
      expect(testFinding?.details?.testFiles).toContain('tests/middleware/idempotency.test.ts');

      // Linked Issue Check: references #204
      const issueFinding = findings.find(f => f.id === 'linked-issue-check');
      expect(issueFinding).toBeDefined();
      expect(issueFinding?.passed).toBe(true);
      expect(issueFinding?.details?.issue).toBe('#204');

      // Whitespace Check: substantive changes verified
      const whitespaceFinding = findings.find(f => f.id === 'whitespace-check');
      expect(whitespaceFinding?.passed).toBe(true);
      expect(whitespaceFinding?.severity).toBe('INFO');

      // Title & Template Checks
      expect(checkTitleQuality(pr.title).passed).toBe(true);
      expect(checkDescriptionAndTemplate(pr.description).passed).toBe(true);
    });

    /**
     * Verifies ReviewEngine behavior with mocked Ollama:
     * - Produces verdict: GENUINE with HIGH confidence
     * - Generates encouraging mentoring review comment
     * - Evidence references existing file src/middleware/idempotency.ts
     * - Output strictly satisfies AnalysisResultSchema and TriageResultSchema
     */
    it('ReviewEngine produces GENUINE verdict with ENCOURAGING tone using mocked Ollama', async () => {
      const mockAdapter = new DeterministicMockOllamaAdapter(async (p) => ({
        verdict: 'GENUINE',
        confidence: 'HIGH',
        reasoning: 'The PR adds IdempotencyStore with in-memory TTL caching and includes complete unit tests.',
        summary: 'High-quality idempotent middleware implementation with verified unit test coverage.',
        reviewComment: {
          greeting: `Hello @${p.author},`,
          summary: 'Excellent work on adding the idempotency key middleware!',
          actionablePoints: [
            'Test coverage cleanly exercises TTL eviction and cache hit paths.',
            'Implementation cleanly addresses #204 without side effects.',
          ],
          closing: 'Looks ready for maintainer merge.',
          tone: 'ENCOURAGING',
          isEdited: false,
          markdown: `Hello @${p.author},\n\nExcellent work on adding the idempotency key middleware!\n\n- Test coverage cleanly exercises TTL eviction and cache hit paths.\n- Implementation cleanly addresses #204 without side effects.\n\nLooks ready for maintainer merge.`,
        },
        evidence: [
          {
            id: 'ev-idempotency-class',
            type: 'DIFF_INSPECTION',
            severity: 'POSITIVE',
            description: 'IdempotencyStore implementation with TTL cache map.',
            file: 'src/middleware/idempotency.ts',
            lineStart: 7,
            lineEnd: 28,
          },
        ],
      }));

      const engine = new ReviewEngine(mockAdapter);
      const result = await engine.review(pr);

      // Verify verdict, confidence, and engine reporting
      expect(result.verdict).toBe('GENUINE');
      expect(result.confidence).toBe('HIGH');
      expect(result.engine).toBe('OLLAMA_LOCAL');
      expect(result.engineDetails.isFallback).toBe(false);
      expect(result.engineDetails.ollamaAvailable).toBe(true);

      // Verify comment and tone
      expect(result.reviewComment.tone).toBe('ENCOURAGING');
      expect(result.suggestedComment.tone).toBe('ENCOURAGING');

      // Verify evidence grounding: must match changed file
      expect(result.evidence.length).toBeGreaterThan(0);
      const codeEvidence = result.evidence.find(e => e.file === 'src/middleware/idempotency.ts');
      expect(codeEvidence).toBeDefined();

      // Verify full schema compliance
      const validated = AnalysisResultSchema.safeParse(result);
      expect(validated.success).toBe(true);
      const triageValidated = TriageResultSchema.safeParse(result);
      expect(triageValidated.success).toBe(true);
    });

    /**
     * Verifies fallback behavior when Ollama is offline:
     * - Heuristics score >= 70 with tests passing yields GENUINE in HEURISTICS_FALLBACK mode
     */
    it('ReviewEngine safely produces GENUINE fallback when Ollama is offline', async () => {
      const engine = new ReviewEngine(new OfflineMockOllamaAdapter());
      const result = await engine.review(pr);

      expect(result.verdict).toBe('GENUINE');
      expect(result.engine).toBe('HEURISTICS_FALLBACK');
      expect(result.engineDetails.isFallback).toBe(true);
      expect(result.engineDetails.ollamaAvailable).toBe(false);
      expect(result.reviewComment.tone).toBe('ENCOURAGING');

      // Schema validation
      expect(AnalysisResultSchema.safeParse(result).success).toBe(true);
    });
  });

  // ── 2. PR That Needs Work ─────────────────────────────────────────────────
  describe('Scenario 2: PR That Needs Work', () => {
    const pr = reproducibleNeedsWorkPR;

    /**
     * Verifies heuristic behavior on PR that needs work:
     * - Substantive code added (src/metrics/latency-collector.ts)
     * - test-coverage-check flags WARNING (code modified without tests)
     * - linked-issue-check flags WARNING (missing issue link)
     * - template-check flags WARNING (incomplete checklist items)
     * - Score sits in the moderate needs-work range (40 <= score < 70)
     */
    it('evaluates needs-work PR heuristics flagging missing tests, issue link, and unchecked checklist', () => {
      const { findings, score, rulesTriggered } = runHeuristics(pr);

      // Score must fall into needs-work bracket
      expect(score).toBeGreaterThanOrEqual(40);
      expect(score).toBeLessThan(70);

      // Warnings must flag actionable omissions
      expect(rulesTriggered).toContain('test-coverage-check');
      expect(rulesTriggered).toContain('linked-issue-check');
      expect(rulesTriggered).toContain('template-check');

      // Test Coverage: flagged as WARNING with penalty
      const testFinding = findings.find(f => f.id === 'test-coverage-check');
      expect(testFinding?.passed).toBe(false);
      expect(testFinding?.severity).toBe('WARNING');
      expect(testFinding?.scoreImpact).toBeLessThan(0);

      // Checklist: flagged for incomplete items
      const templateFinding = findings.find(f => f.id === 'template-check');
      expect(templateFinding?.passed).toBe(false);
      expect(templateFinding?.severity).toBe('WARNING');
      expect(templateFinding?.details?.uncheckedBoxes).toBe(2);

      // Diff Volume & Substance: changes are real, not empty or whitespace
      expect(findings.find(f => f.id === 'diff-volume-check')?.passed).toBe(true);
      expect(findings.find(f => f.id === 'whitespace-check')?.passed).toBe(true);
    });

    /**
     * Verifies ReviewEngine behavior with mocked Ollama:
     * - Produces verdict: NEEDS_WORK
     * - Tone: CONSTRUCTIVE_GUIDANCE with actionable points requesting tests
     * - Output strictly satisfies AnalysisResultSchema and TriageResultSchema
     */
    it('ReviewEngine produces NEEDS_WORK verdict with CONSTRUCTIVE_GUIDANCE using mocked Ollama', async () => {
      const mockAdapter = new DeterministicMockOllamaAdapter(async (p) => ({
        verdict: 'NEEDS_WORK',
        confidence: 'MEDIUM',
        reasoning: 'The LatencyCollector implementation is sound, but lacks automated unit tests and an associated issue link.',
        summary: 'Legitimate feature contribution requiring unit tests and complete PR checklist.',
        reviewComment: {
          greeting: `Hello @${p.author},`,
          summary: 'Thank you for contributing latency metrics tracking!',
          actionablePoints: [
            'Please add unit tests verifying getP95 calculation and buffer boundary handling.',
            'Please link an issue or describe the motivation for the 1000 sample buffer limit.',
            'Please complete the checklist items in the PR description.',
          ],
          closing: 'Once tests are added, we will be glad to review again.',
          tone: 'CONSTRUCTIVE_GUIDANCE',
          isEdited: false,
          markdown: `Hello @${p.author},\n\nThank you for contributing latency metrics tracking!\n\n- Please add unit tests verifying getP95 calculation.\n- Please link an issue.\n\nOnce tests are added, we will be glad to review again.`,
        },
        evidence: [
          {
            id: 'ev-latency-code',
            type: 'DIFF_INSPECTION',
            severity: 'NEUTRAL',
            description: 'LatencyCollector class implementation.',
            file: 'src/metrics/latency-collector.ts',
            lineStart: 1,
            lineEnd: 17,
          },
        ],
      }));

      const engine = new ReviewEngine(mockAdapter);
      const result = await engine.review(pr);

      expect(result.verdict).toBe('NEEDS_WORK');
      expect(result.confidence).toBe('MEDIUM');
      expect(result.engine).toBe('OLLAMA_LOCAL');
      expect(result.reviewComment.tone).toBe('CONSTRUCTIVE_GUIDANCE');
      expect(result.reviewComment.actionablePoints.length).toBeGreaterThan(0);

      // Schema validation
      expect(AnalysisResultSchema.safeParse(result).success).toBe(true);
      expect(TriageResultSchema.safeParse(result).success).toBe(true);
    });

    /**
     * Verifies fallback behavior when Ollama is offline:
     * - Missing tests and moderate score deterministically yields NEEDS_WORK in fallback
     */
    it('ReviewEngine safely produces NEEDS_WORK fallback when Ollama is offline', async () => {
      const engine = new ReviewEngine(new OfflineMockOllamaAdapter());
      const result = await engine.review(pr);

      expect(result.verdict).toBe('NEEDS_WORK');
      expect(result.engine).toBe('HEURISTICS_FALLBACK');
      expect(result.engineDetails.isFallback).toBe(true);
      expect(result.reviewComment.tone).toBe('CONSTRUCTIVE_GUIDANCE');

      expect(AnalysisResultSchema.safeParse(result).success).toBe(true);
    });
  });

  // ── 3. Irrelevant or Likely-Spam PR ───────────────────────────────────────
  describe('Scenario 3: Irrelevant or Likely-Spam PR', () => {
    const pr = reproducibleLikelySpamPR;

    /**
     * Verifies heuristic behavior on low-effort/spam PR:
     * - title-quality-check flags low-effort pattern ("fixed typo")
     * - diff-volume-check flags very small change volume
     * - template-check flags brief description
     * - linked-issue-check flags missing issue
     * - Computes low heuristic score (< 40)
     */
    it('evaluates likely-spam PR heuristics flagging low-effort title, low volume, and brief context', () => {
      const { findings, score, rulesTriggered } = runHeuristics(pr);

      // Low score indicating low-effort or low-context submission
      expect(score).toBeLessThanOrEqual(35);

      // Must trigger multiple warnings
      expect(rulesTriggered).toContain('title-quality-check');
      expect(rulesTriggered).toContain('diff-volume-check');
      expect(rulesTriggered).toContain('template-check');
      expect(rulesTriggered).toContain('linked-issue-check');

      // Title Quality: generic low-effort pattern match
      const titleFinding = checkTitleQuality(pr.title);
      expect(titleFinding.passed).toBe(false);
      expect(titleFinding.severity).toBe('WARNING');
      expect(titleFinding.scoreImpact).toBeLessThan(0);

      // Description: brief filler text
      const templateFinding = checkDescriptionAndTemplate(pr.description);
      expect(templateFinding.passed).toBe(false);
      expect(templateFinding.severity).toBe('WARNING');
    });

    /**
     * Verifies ReviewEngine behavior with mocked Ollama:
     * - Identifies promotional/irrelevant modification in README
     * - Produces verdict: LIKELY_SPAM with POLITE_CAUTION tone
     * - Redirection encourages genuine contribution via good-first-issues
     * - Output strictly satisfies AnalysisResultSchema and TriageResultSchema
     */
    it('ReviewEngine produces LIKELY_SPAM verdict with POLITE_CAUTION using mocked Ollama', async () => {
      const mockAdapter = new DeterministicMockOllamaAdapter(async (p) => ({
        verdict: 'LIKELY_SPAM',
        confidence: 'HIGH',
        reasoning: 'The PR adds self-promotional text to README.md without substantive documentation improvements.',
        summary: 'Low-effort promotional modification to documentation.',
        reviewComment: {
          greeting: `Hello @${p.author},`,
          summary: 'Thank you for your interest in contributing to our project.',
          actionablePoints: [
            'This PR adds promotional text rather than addressing a project need or bug.',
            'Please consult CONTRIBUTING.md or check open issues labeled "good first issue" for meaningful tasks.',
          ],
          closing: 'We encourage you to tackle one of our open issues if you would like to participate in Hacktoberfest.',
          tone: 'POLITE_CAUTION',
          isEdited: false,
          markdown: `Hello @${p.author},\n\nThank you for your interest in contributing to our project.\n\n- This PR adds promotional text rather than addressing a project need or bug.\n- Please consult CONTRIBUTING.md.\n\nWe encourage you to tackle one of our open issues!`,
        },
        evidence: [
          {
            id: 'ev-promo-text',
            type: 'DIFF_INSPECTION',
            severity: 'CONCERN',
            description: 'Self-promotional text added to README.md.',
            file: 'README.md',
            lineStart: 4,
            lineEnd: 5,
          },
        ],
      }));

      const engine = new ReviewEngine(mockAdapter);
      const result = await engine.review(pr);

      expect(result.verdict).toBe('LIKELY_SPAM');
      expect(result.confidence).toBe('HIGH');
      expect(result.engine).toBe('OLLAMA_LOCAL');
      expect(result.reviewComment.tone).toBe('POLITE_CAUTION');

      // Evidence must match README.md
      const ev = result.evidence.find(e => e.file === 'README.md');
      expect(ev).toBeDefined();

      // Schema validation
      expect(AnalysisResultSchema.safeParse(result).success).toBe(true);
      expect(TriageResultSchema.safeParse(result).success).toBe(true);
    });

    /**
     * Verifies that offline heuristics fallback does NOT falsely classify it as GENUINE.
     */
    it('ReviewEngine fallback prevents low-effort submission from receiving GENUINE verdict', async () => {
      const engine = new ReviewEngine(new OfflineMockOllamaAdapter());
      const result = await engine.review(pr);

      expect(result.verdict).not.toBe('GENUINE');
      expect(['NEEDS_WORK', 'LIKELY_SPAM']).toContain(result.verdict);
      expect(result.engine).toBe('HEURISTICS_FALLBACK');
    });
  });

  // ── 4. Whitespace-Only Diff ───────────────────────────────────────────────
  describe('Scenario 4: Whitespace-Only Diff', () => {
    const pr = reproducibleWhitespacePR;

    /**
     * Verifies heuristic behavior on whitespace-only PR:
     * - checkWhitespaceOnly flags CRITICAL severity failure (-50 scoreImpact)
     * - Detects pure cosmetic changes across all modified files
     * - Rules triggered includes 'whitespace-check'
     */
    it('evaluates whitespace PR heuristics and triggers CRITICAL whitespace-check failure', () => {
      const finding = checkWhitespaceOnly(pr.filesChanged);

      expect(finding.passed).toBe(false);
      expect(finding.severity).toBe('CRITICAL');
      expect(finding.scoreImpact).toBe(-50);
      expect(finding.details?.ratio).toBe(1.0);

      const { findings, rulesTriggered } = runHeuristics(pr);
      expect(rulesTriggered).toContain('whitespace-check');

      const whitespaceFinding = findings.find(f => f.id === 'whitespace-check');
      expect(whitespaceFinding?.severity).toBe('CRITICAL');
    });

    /**
     * Verifies ReviewEngine safety guard override:
     * - Even if an adversarial or hallucinating LLM returns GENUINE,
     *   ReviewEngine detects the critical whitespace finding and OVERRIDES
     *   the verdict to LIKELY_SPAM with HIGH confidence and POLITE_CAUTION tone.
     */
    it('ReviewEngine safety guard overrides model GENUINE verdict to LIKELY_SPAM on whitespace diff', async () => {
      // Adversarial model attempting to return GENUINE on pure whitespace diff
      const adversarialMockAdapter = new DeterministicMockOllamaAdapter(async (p) => ({
        verdict: 'GENUINE',
        confidence: 'HIGH',
        reasoning: 'Model hallucination: considers trailing whitespace cleanup as genuine code quality improvement.',
        summary: 'Whitespace cleanup.',
        reviewComment: {
          greeting: `Hello @${p.author},`,
          summary: 'Thanks for cleaning up code formatting!',
          actionablePoints: [],
          closing: 'Looks good.',
          tone: 'ENCOURAGING',
          isEdited: false,
          markdown: 'LGTM!',
        },
        evidence: [],
      }));

      const engine = new ReviewEngine(adversarialMockAdapter);
      const result = await engine.review(pr);

      // Must be overridden to LIKELY_SPAM
      expect(result.verdict).toBe('LIKELY_SPAM');
      expect(result.confidence).toBe('HIGH');
      expect(result.reasoning).toContain('Verdict overridden to LIKELY_SPAM');
      expect(result.reasoning).toContain('whitespace/formatting adjustments');
      expect(result.reviewComment.tone).toBe('POLITE_CAUTION');

      // Schema validation
      expect(AnalysisResultSchema.safeParse(result).success).toBe(true);
      expect(TriageResultSchema.safeParse(result).success).toBe(true);
    });

    /**
     * Verifies ReviewEngine fallback behavior for whitespace diff:
     * - Generates LIKELY_SPAM fallback with HIGH confidence when Ollama is offline
     */
    it('ReviewEngine produces LIKELY_SPAM fallback with HIGH confidence when Ollama is offline', async () => {
      const engine = new ReviewEngine(new OfflineMockOllamaAdapter());
      const result = await engine.review(pr);

      expect(result.verdict).toBe('LIKELY_SPAM');
      expect(result.confidence).toBe('HIGH');
      expect(result.engine).toBe('HEURISTICS_FALLBACK');
      expect(result.engineDetails.isFallback).toBe(true);
      expect(result.reviewComment.tone).toBe('POLITE_CAUTION');

      // Schema validation
      expect(AnalysisResultSchema.safeParse(result).success).toBe(true);
    });
  });

  // ── 5. Cross-Scenario Evidence Grounding & Parity ──────────────────────────
  describe('Cross-Scenario Contract & Evidence Grounding Verification', () => {
    /**
     * Verifies that for every fixture analyzed, all evidence file references
     * strictly correspond to files actually modified in that pull request.
     */
    it('ensures no evidence references nonexistent files across all 4 scenarios', async () => {
      const engine = new ReviewEngine(new OfflineMockOllamaAdapter());

      for (const fixture of reproducibleBenchmarkDataset) {
        const result = await engine.review(fixture);
        const validFilenames = new Set(fixture.filesChanged.map(f => f.filename));

        for (const ev of result.evidence) {
          if (ev.file) {
            expect(validFilenames.has(ev.file)).toBe(true);
          }
        }

        // Both reviewComment and suggestedComment must be present and identical
        expect(result.reviewComment).toBeDefined();
        expect(result.suggestedComment).toBeDefined();
        expect(result.reviewComment.tone).toBe(result.suggestedComment.tone);
      }
    });
  });
});
