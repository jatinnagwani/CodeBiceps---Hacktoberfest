/**
 * PRoof — Zod Validation Schemas (v2)
 *
 * Every schema is derived from the canonical types in types.ts so the two
 * files stay in sync.  Both backend (API input validation, model output
 * parsing) and frontend (optional runtime guards on API responses) import
 * from '@proof/shared'.
 *
 * No circular dependencies: types.ts → no imports; schemas.ts → zod only.
 */
import { z } from 'zod';

// ─── Primitive enum schemas ───────────────────────────────────────────────────

export const ReviewVerdictSchema = z.enum(['GENUINE', 'NEEDS_WORK', 'LIKELY_SPAM']);

/** @deprecated Use ReviewVerdictSchema */
export const VerdictSchema = ReviewVerdictSchema;

export const ConfidenceSchema = z.enum(['HIGH', 'MEDIUM', 'LOW']);

export const AnalysisEngineSchema = z.enum(['OLLAMA_LOCAL', 'HEURISTICS_FALLBACK']);

export const HeuristicSeveritySchema = z.enum(['INFO', 'WARNING', 'CRITICAL']);

export const EvidenceSeveritySchema = z.enum(['POSITIVE', 'NEUTRAL', 'CONCERN']);

export const EvidenceTypeSchema = z.enum([
  'HEURISTIC',
  'AI_OBSERVATION',
  'DIFF_INSPECTION',
]);

export const CommentToneSchema = z.enum([
  'ENCOURAGING',
  'CONSTRUCTIVE_GUIDANCE',
  'POLITE_CAUTION',
]);

export const ReviewActionSchema = z.enum([
  'COMMENT_ONLY',
  'REQUEST_CHANGES',
  'APPROVE_FOR_REVIEW',
]);

// ─── ChangedFile ─────────────────────────────────────────────────────────────

export const ChangedFileSchema = z.object({
  filename: z.string().min(1, 'Filename is required'),
  status: z.enum(['added', 'modified', 'deleted', 'renamed']),
  additions: z.number().int().nonnegative(),
  deletions: z.number().int().nonnegative(),
  patch: z.string().optional(),
  previousFilename: z.string().optional(),
});

// ─── PRStats ─────────────────────────────────────────────────────────────────

export const PRStatsSchema = z.object({
  totalAdditions: z.number().int().nonnegative(),
  totalDeletions: z.number().int().nonnegative(),
  totalFiles: z.number().int().nonnegative(),
});

// ─── PullRequest ─────────────────────────────────────────────────────────────

/**
 * Validates untrusted API inputs for the triage endpoint.
 * All string fields are capped to prevent oversized payloads from
 * exhausting the model context window or memory.
 */
export const PullRequestSchema = z.object({
  id: z.string().min(1, 'PR ID is required'),
  category: ReviewVerdictSchema.optional(),
  title: z
    .string()
    .min(1, 'PR title is required')
    .max(500, 'Title must be ≤500 characters'),
  author: z.string().min(1, 'Author is required').max(100),
  authorAssociation: z.string().max(50).optional(),
  createdAt: z
    .string()
    .datetime({ offset: true })
    .optional()
    .or(z.string().optional()),   // accept non-strict timestamps from samples
  branch: z.string().max(200).optional(),
  targetBranch: z.string().max(200).optional(),
  linkedIssue: z.string().nullable().optional(),
  description: z
    .string()
    .max(65_000, 'Description must be ≤65 000 characters'),
  filesChanged: z
    .array(ChangedFileSchema)
    .min(1, 'At least one changed file is required')
    .max(200, 'Too many files in a single PR; please split the change'),
  stats: PRStatsSchema,
});

/** @deprecated Use PullRequestSchema */
export const PullRequestPayloadSchema = PullRequestSchema;

// ─── HeuristicFinding ────────────────────────────────────────────────────────

export const HeuristicFindingSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  severity: HeuristicSeveritySchema,
  passed: z.boolean(),
  scoreImpact: z.number().int(),
  evidence: z.string().min(1),
  details: z.record(z.unknown()).optional(),
});

// ─── Evidence ────────────────────────────────────────────────────────────────

/**
 * Validates a single evidence item emitted by heuristics or the AI model.
 *
 * The `lineRange` pattern intentionally allows a single line ("L42") or a
 * range ("L10-L25"). It rejects free-text to prevent prompt-injected
 * fabricated references from reaching the UI unvalidated.
 */
export const EvidenceSchema = z.object({
  id: z.string().min(1),
  type: EvidenceTypeSchema,
  severity: EvidenceSeveritySchema,
  description: z
    .string()
    .min(1)
    .max(2000, 'Evidence description must be ≤2000 characters'),
  file: z.string().optional(),
  lineRange: z
    .string()
    .regex(/^L\d+(-L\d+)?$/, 'lineRange must be "L<n>" or "L<n>-L<m>"')
    .optional(),
});

/** @deprecated Use EvidenceSchema */
export const EvidenceItemSchema = EvidenceSchema;

// ─── ReviewComment ────────────────────────────────────────────────────────────

/**
 * Validates the structured review comment from the model or fallback.
 *
 * The `isEdited`, `editedMarkdown`, `approvedBy`, and `approvedAt` fields
 * are optional here because the object arriving from the analysis engine will
 * not yet have them; they are added on the approval path.
 */
export const ReviewCommentSchema = z.object({
  markdown: z
    .string()
    .min(1)
    .max(65_000, 'Comment markdown must be ≤65 000 characters'),
  greeting: z.string().min(1).max(300),
  summary: z
    .string()
    .min(1)
    .max(1000, 'Comment summary must be ≤1000 characters'),
  actionablePoints: z
    .array(z.string().min(1).max(500))
    .min(0)
    .max(20, 'At most 20 actionable points allowed'),
  closing: z.string().min(1).max(300),
  tone: CommentToneSchema,

  // Maintainer edit tracking (set after maintainer interaction)
  isEdited: z.boolean().default(false),
  editedMarkdown: z
    .string()
    .max(65_000)
    .optional(),
  approvedBy: z.string().max(100).optional(),
  approvedAt: z.string().datetime({ offset: true }).optional(),
});

/** @deprecated Use ReviewCommentSchema */
export const SuggestedCommentSchema = ReviewCommentSchema;

// ─── EngineDetails ───────────────────────────────────────────────────────────

export const EngineDetailsSchema = z.object({
  ollamaAvailable: z.boolean(),
  modelName: z.string().min(1),
  quantization: z.string().optional(),
  executionTimeMs: z.number().nonnegative(),
  isFallback: z.boolean(),
  notes: z.string().optional(),
});

// ─── AnalysisResult ──────────────────────────────────────────────────────────

/**
 * Validates the complete triage pipeline output before it is sent to the
 * frontend. Running this on the server-side response acts as a contract test:
 * if the model or fallback generator produces a malformed object it will be
 * caught here rather than silently corrupting the UI.
 */
export const AnalysisResultSchema = z.object({
  prId: z.string().min(1),
  verdict: ReviewVerdictSchema,
  confidence: ConfidenceSchema,
  engine: AnalysisEngineSchema,
  engineDetails: EngineDetailsSchema,
  /**
   * reasoning is required on AnalysisResult.  It may be short ("Heuristic
   * score 22/100 driven by whitespace-only diff across both files.") but
   * must not be empty.
   */
  reasoning: z
    .string()
    .min(10, 'reasoning must be at least 10 characters')
    .max(3000, 'reasoning must be ≤3000 characters'),
  summary: z
    .string()
    .min(1)
    .max(500, 'summary must be ≤500 characters'),
  heuristicFindings: z.array(HeuristicFindingSchema),
  evidence: z.array(EvidenceSchema),
  reviewComment: ReviewCommentSchema,
  metadata: z.object({
    analyzedAt: z.string().min(1),
    rulesTriggered: z.array(z.string()),
    heuristicScore: z.number().min(0).max(100),
  }),
});

/**
 * Legacy schema — structurally identical to AnalysisResultSchema but uses
 * `suggestedComment` instead of `reviewComment` and makes `reasoning`
 * optional to avoid breaking existing callers.
 *
 * @deprecated Use AnalysisResultSchema
 */
export const TriageResultSchema = z.object({
  prId: z.string().min(1),
  verdict: ReviewVerdictSchema,
  confidence: ConfidenceSchema,
  engine: AnalysisEngineSchema,
  engineDetails: EngineDetailsSchema,
  summary: z.string().min(1).max(500),
  reasoning: z.string().min(1).optional(),
  heuristicFindings: z.array(HeuristicFindingSchema),
  evidence: z.array(EvidenceSchema),
  suggestedComment: ReviewCommentSchema,
  metadata: z.object({
    analyzedAt: z.string().min(1),
    rulesTriggered: z.array(z.string()),
    heuristicScore: z.number().min(0).max(100),
  }),
});

// ─── Review Approval ─────────────────────────────────────────────────────────

export const ReviewApprovalRequestSchema = z.object({
  prId: z.string().min(1, 'PR ID is required'),
  finalComment: z
    .string()
    .min(5, 'Review comment must have meaningful content')
    .max(65_000),
  commentWasEdited: z.boolean().optional(),
  approvedVerdict: ReviewVerdictSchema,
  actionTaken: ReviewActionSchema,
  maintainerNotes: z.string().max(2000).optional(),
  maintainerName: z.string().max(100).optional(),
});

export const ReviewApprovalResponseSchema = z.object({
  success: z.boolean(),
  approvalId: z.string().min(1),
  prId: z.string().min(1),
  recordedAt: z.string().min(1),
  message: z.string().min(1),
  finalComment: z.string().min(1),
  actionTaken: ReviewActionSchema,
});

// ─── Convenience inferred types ───────────────────────────────────────────────
// These let callers use z.infer<> to derive TypeScript types directly from
// Zod schemas if they prefer schema-first authoring.

export type PullRequestInput = z.infer<typeof PullRequestSchema>;
export type AnalysisResultOutput = z.infer<typeof AnalysisResultSchema>;
export type ReviewCommentOutput = z.infer<typeof ReviewCommentSchema>;
export type EvidenceOutput = z.infer<typeof EvidenceSchema>;
export type HeuristicFindingOutput = z.infer<typeof HeuristicFindingSchema>;
