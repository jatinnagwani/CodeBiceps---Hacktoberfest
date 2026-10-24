/**
 * PRoof — Shared Domain Types (v2)
 *
 * Canonical contracts for pull request analysis, heuristic findings,
 * AI verdicts, evidence references, and maintainer review comments.
 *
 * Naming convention
 * -----------------
 * The canonical names are defined here (PullRequest, AnalysisResult, etc.).
 * Backwards-compatible aliases for the original names (PullRequestPayload,
 * TriageResult, etc.) are re-exported at the bottom so existing backend and
 * frontend code continues to compile without change.
 *
 * Import rules
 * ------------
 * - Both frontend and backend import exclusively from '@proof/shared'.
 * - This file has no runtime dependencies beyond the standard library.
 *   Zod schema objects live in schemas.ts so this file stays pure types.
 */

// ─── Primitive Enumerations ──────────────────────────────────────────────────

/** The three possible triage classifications for a pull request. */
export type ReviewVerdict = 'GENUINE' | 'NEEDS_WORK' | 'LIKELY_SPAM';

/** @deprecated Use ReviewVerdict */
export type Verdict = ReviewVerdict;

/** Confidence level emitted by the analysis engine. */
export type Confidence = 'HIGH' | 'MEDIUM' | 'LOW';

/** Which analysis engine produced the result. */
export type AnalysisEngine = 'OLLAMA_LOCAL' | 'HEURISTICS_FALLBACK';

/** Severity of an individual heuristic rule result. */
export type HeuristicSeverity = 'INFO' | 'WARNING' | 'CRITICAL';

/** Whether an evidence item supports or concerns the contribution. */
export type EvidenceSeverity = 'POSITIVE' | 'NEUTRAL' | 'CONCERN';

/** Origin of an evidence item. */
export type EvidenceType = 'HEURISTIC' | 'AI_OBSERVATION' | 'DIFF_INSPECTION';

/** Tone key for the suggested review comment. */
export type CommentTone = 'ENCOURAGING' | 'CONSTRUCTIVE_GUIDANCE' | 'POLITE_CAUTION';

/** Action the maintainer selects when approving a review. */
export type ReviewAction = 'COMMENT_ONLY' | 'REQUEST_CHANGES' | 'APPROVE_FOR_REVIEW';

// ─── Display Metadata for ReviewVerdict ──────────────────────────────────────

/**
 * UI-facing display metadata for each ReviewVerdict value.
 * Used by the frontend to render badges, colours, and help text
 * without scattering constants across components.
 */
export interface ReviewVerdictMeta {
  verdict: ReviewVerdict;
  /** Short human-readable label shown in badges (e.g. "Needs Work"). */
  label: string;
  /** One-sentence description for tooltips and screen readers. */
  description: string;
  /** Semantic colour key: 'green' | 'amber' | 'red'. */
  colour: 'green' | 'amber' | 'red';
  /**
   * Suggested default ReviewAction for this verdict.
   * Maintainers can always override in the approval UI.
   */
  defaultAction: ReviewAction;
}

/** Lookup table — import and use directly, no runtime branching needed. */
export const VERDICT_META: Record<ReviewVerdict, ReviewVerdictMeta> = {
  GENUINE: {
    verdict: 'GENUINE',
    label: 'Genuine',
    description:
      'The contribution appears relevant, substantive, and reasonably well-supported by evidence.',
    colour: 'green',
    defaultAction: 'COMMENT_ONLY',
  },
  NEEDS_WORK: {
    verdict: 'NEEDS_WORK',
    label: 'Needs Work',
    description:
      'The contribution may be legitimate but requires clarification, missing tests, or further refinement.',
    colour: 'amber',
    defaultAction: 'REQUEST_CHANGES',
  },
  LIKELY_SPAM: {
    verdict: 'LIKELY_SPAM',
    label: 'Likely Spam',
    description:
      'Multiple signals (whitespace-only, trivial diffs, no context) suggest a low-effort or off-topic submission.',
    colour: 'red',
    defaultAction: 'COMMENT_ONLY',
  },
};

// ─── ChangedFile ─────────────────────────────────────────────────────────────

/**
 * A single file entry in the pull request diff.
 *
 * `patch` contains the raw unified-diff text. It is treated as untrusted
 * input throughout the pipeline — never executed or eval'd.
 */
export interface ChangedFile {
  /** Repository-relative file path, e.g. "src/auth/session-manager.ts". */
  filename: string;
  /** Git status for this file in the diff. */
  status: 'added' | 'modified' | 'deleted' | 'renamed';
  /** Number of lines added. */
  additions: number;
  /** Number of lines deleted. */
  deletions: number;
  /**
   * Raw unified-diff patch string.
   * Absent when the file is binary or the patch is not available.
   */
  patch?: string;
  /** Previous filename when status === 'renamed'. */
  previousFilename?: string;
}

// ─── PRStats ─────────────────────────────────────────────────────────────────

/** Aggregate statistics computed across all changed files. */
export interface PRStats {
  totalAdditions: number;
  totalDeletions: number;
  totalFiles: number;
}

// ─── PullRequest ─────────────────────────────────────────────────────────────

/**
 * The canonical input contract for a pull request entering the triage pipeline.
 *
 * Fields are intentionally minimal — only information observable without
 * executing any code from the diff. GitHub credentials must never be
 * embedded here; the frontend only sees sanitised payloads.
 */
export interface PullRequest {
  /** Stable identifier, e.g. "sample-genuine-01" or "gh-pr-1042". */
  id: string;
  /**
   * Ground-truth category when the PR is a pre-labelled sample.
   * Absent for real incoming pull requests.
   */
  category?: ReviewVerdict;
  /** PR title as submitted by the author. */
  title: string;
  /** GitHub username of the PR author. */
  author: string;
  /**
   * GitHub author-association string (e.g. "FIRST_TIME_CONTRIBUTOR",
   * "MEMBER", "NONE"). Used as a weak signal, never as the sole evidence.
   */
  authorAssociation?: string;
  /** ISO-8601 creation timestamp. */
  createdAt?: string;
  /** Source branch name. */
  branch?: string;
  /** Target merge branch (usually "main"). */
  targetBranch?: string;
  /**
   * Linked issue reference extracted from description or metadata,
   * e.g. "#142" or "https://github.com/org/repo/issues/142".
   * Null when no issue is referenced.
   */
  linkedIssue?: string | null;
  /** Full pull request description / body as submitted by the author. */
  description: string;
  /** Ordered list of files changed in the diff. */
  filesChanged: ChangedFile[];
  /** Aggregate diff statistics. */
  stats: PRStats;
}

/** @deprecated Use PullRequest */
export type PullRequestPayload = PullRequest;

// ─── HeuristicFinding ────────────────────────────────────────────────────────

/**
 * The result of a single deterministic heuristic rule applied to a pull
 * request. Rules are pure functions — identical input always yields identical
 * output, with no model inference.
 *
 * A `passed` finding rewards the score; a failing WARNING or CRITICAL finding
 * penalises it. Evidence strings must reference only observable, verifiable
 * facts (line counts, regex matches, checklist state) — never inferred intent.
 */
export interface HeuristicFinding {
  /** Stable rule identifier, e.g. "whitespace-check". */
  id: string;
  /** Human-readable rule name shown in the UI. */
  name: string;
  /** Severity classification of this finding. */
  severity: HeuristicSeverity;
  /** Whether the rule evaluation passed (contribution satisfies the rule). */
  passed: boolean;
  /**
   * Signed integer added to the running heuristic score.
   * Positive = reward; negative = penalty. Magnitude is rule-specific.
   */
  scoreImpact: number;
  /**
   * Concise, factual evidence string describing exactly what was observed.
   * Must not reference line numbers that were not verified in the patch.
   */
  evidence: string;
  /**
   * Optional structured details (counts, ratios, filenames) used by the
   * frontend to render expanded tooltips without re-parsing the diff.
   */
  details?: Record<string, unknown>;
}

// ─── Evidence ────────────────────────────────────────────────────────────────

/**
 * A single piece of verifiable evidence cited in support of the verdict.
 *
 * Evidence items from `HEURISTIC` origin are deterministic and reproducible.
 * Items from `AI_OBSERVATION` or `DIFF_INSPECTION` origin are model-generated
 * and should be displayed with appropriate epistemic humility in the UI.
 *
 * Line ranges must only be populated when the relevant line numbers were
 * directly extracted from the diff patch — never guessed.
 */
export interface Evidence {
  /** Stable identifier unique within a single AnalysisResult. */
  id: string;
  /** Where this evidence came from. */
  type: EvidenceType;
  /** Whether the evidence supports, is neutral, or raises concern. */
  severity: EvidenceSeverity;
  /**
   * Human-readable description of the observable finding.
   * Model-generated descriptions must be isolated from diff content to
   * prevent indirect prompt injection in the UI render path.
   */
  description: string;
  /** Repository-relative file path this evidence refers to, if applicable. */
  file?: string;
  /**
   * Line range within `file`, formatted "L10-L15" or a single "L42".
   * Only set when the range was extracted directly from the patch;
   * must never be fabricated.
   */
  lineRange?: string;
}

/** @deprecated Use Evidence */
export type EvidenceItem = Evidence;

// ─── ReviewComment ────────────────────────────────────────────────────────────

/**
 * A structured review comment produced by the analysis engine and presented
 * to the maintainer for review and optional editing before approval.
 *
 * The maintainer always has the final say. `editedMarkdown` and `isEdited`
 * track whether the maintainer changed the suggested text before approving.
 */
export interface ReviewComment {
  /**
   * Complete rendered Markdown string ready for posting as a GitHub comment.
   * This is the canonical field — greeting / actionablePoints / closing are
   * structural hints used to build the initial markdown value.
   */
  markdown: string;
  /** Opening line addressed to the PR author. */
  greeting: string;
  /**
   * One or two sentences summarising the verdict and primary concern or praise.
   * Kept brief so maintainers can scan without reading the full markdown.
   */
  summary: string;
  /**
   * Ordered list of concrete, actionable next steps or positive observations.
   * Each item should be self-contained and independently verifiable.
   */
  actionablePoints: string[];
  /** Closing line. Should be polite regardless of verdict. */
  closing: string;
  /** Tone classification used to style the comment in the UI. */
  tone: CommentTone;

  // ── Maintainer edit tracking ──────────────────────────────────────────────

  /**
   * True when the maintainer has modified `markdown` before approving.
   * Lets the backend distinguish AI-generated from human-reviewed comments
   * for analytics and audit purposes.
   */
  isEdited: boolean;
  /**
   * The final markdown text after any maintainer edits.
   * Undefined when `isEdited` is false (original `markdown` was approved).
   */
  editedMarkdown?: string;
  /**
   * GitHub username of the maintainer who approved this comment.
   * Undefined until the maintainer submits the approval.
   */
  approvedBy?: string;
  /**
   * ISO-8601 timestamp of when the maintainer approved the comment.
   * Undefined until approval is recorded.
   */
  approvedAt?: string;
}

/** @deprecated Use ReviewComment */
export type SuggestedComment = ReviewComment;

// ─── EngineDetails ────────────────────────────────────────────────────────────

/** Runtime details about the inference engine that produced the result. */
export interface EngineDetails {
  ollamaAvailable: boolean;
  modelName: string;
  quantization?: string;
  executionTimeMs: number;
  /** True when Ollama was unavailable and deterministic fallback was used. */
  isFallback: boolean;
  notes?: string;
}

// ─── AnalysisResult ──────────────────────────────────────────────────────────

/**
 * The complete output of the triage pipeline for a single pull request.
 *
 * This is the primary data transfer object returned by POST /api/triage/analyze
 * and consumed by the frontend dashboard.
 */
export interface AnalysisResult {
  /** The ID of the pull request that was analysed. */
  prId: string;
  /** Final classification verdict. */
  verdict: ReviewVerdict;
  /** Confidence level in the verdict. */
  confidence: Confidence;
  /** Which engine produced this result. */
  engine: AnalysisEngine;
  /** Runtime information about the engine. */
  engineDetails: EngineDetails;
  /**
   * Concise human-readable reasoning for the verdict (1–3 sentences).
   *
   * This field is mandatory and must be grounded in the evidence list —
   * it must not introduce claims not present in `evidence` or
   * `heuristicFindings`. When the engine is HEURISTICS_FALLBACK this
   * is generated deterministically; when OLLAMA_LOCAL it is extracted
   * from the structured model output.
   */
  reasoning: string;
  /**
   * Executive summary suitable for the verdict banner headline.
   * Shorter than `reasoning`; typically one sentence.
   */
  summary: string;
  /** All heuristic rule results, in evaluation order. */
  heuristicFindings: HeuristicFinding[];
  /** Evidence items cited to support the verdict. */
  evidence: Evidence[];
  /**
   * The suggested review comment for the maintainer to review and edit.
   * `isEdited` will be false until the maintainer interacts with the UI.
   */
  reviewComment: ReviewComment;
  /** Internal metadata for tracing and debugging. */
  metadata: {
    /** ISO-8601 timestamp of analysis completion. */
    analyzedAt: string;
    /** IDs of heuristic rules that triggered a penalty or warning. */
    rulesTriggered: string[];
    /**
     * Final normalised heuristic score [0–100] used to initialise the
     * verdict when the AI engine is unavailable.
     */
    heuristicScore: number;
  };
}

/**
 * @deprecated Use AnalysisResult
 *
 * TriageResult is kept as a structural alias (not just a type alias) so that
 * existing backend code that constructs objects typed as TriageResult continues
 * to compile. The two types are structurally identical via the mapping below.
 *
 * Migration: rename `suggestedComment` → `reviewComment` when updating
 * each consumer.
 */
export interface TriageResult {
  prId: string;
  verdict: ReviewVerdict;
  confidence: Confidence;
  engine: AnalysisEngine;
  engineDetails: EngineDetails;
  summary: string;
  reasoning?: string;           // Added; optional for backwards compat
  heuristicFindings: HeuristicFinding[];
  evidence: Evidence[];
  /** @deprecated Use reviewComment on AnalysisResult */
  suggestedComment: ReviewComment;
  metadata: {
    analyzedAt: string;
    rulesTriggered: string[];
    heuristicScore: number;
  };
}

// ─── API Request / Response types ────────────────────────────────────────────

export interface ReviewApprovalRequest {
  prId: string;
  /** The final comment text the maintainer approved (possibly edited). */
  finalComment: string;
  /** Whether the maintainer edited the AI-suggested comment. */
  commentWasEdited?: boolean;
  approvedVerdict: ReviewVerdict;
  actionTaken: ReviewAction;
  maintainerNotes?: string;
  maintainerName?: string;
}

export interface ReviewApprovalResponse {
  success: boolean;
  approvalId: string;
  prId: string;
  recordedAt: string;
  message: string;
  finalComment: string;
  actionTaken: ReviewAction;
}

export interface HealthStatusResponse {
  status: 'healthy' | 'degraded';
  timestamp: string;
  version: string;
  ollama: {
    connected: boolean;
    endpoint: string;
    model: string;
    quantization: string;
    version?: string;
  };
  heuristics: {
    activeRulesCount: number;
    ready: boolean;
  };
}
