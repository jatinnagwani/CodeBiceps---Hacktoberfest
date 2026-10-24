"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReviewApprovalResponseSchema = exports.ReviewApprovalRequestSchema = exports.TriageResultSchema = exports.AnalysisResultSchema = exports.EngineDetailsSchema = exports.SuggestedCommentSchema = exports.ReviewCommentSchema = exports.EvidenceItemSchema = exports.EvidenceSchema = exports.HeuristicFindingSchema = exports.PullRequestPayloadSchema = exports.PullRequestSchema = exports.PRStatsSchema = exports.ChangedFileSchema = exports.ReviewActionSchema = exports.CommentToneSchema = exports.EvidenceTypeSchema = exports.EvidenceSeveritySchema = exports.HeuristicSeveritySchema = exports.AnalysisEngineSchema = exports.ConfidenceSchema = exports.VerdictSchema = exports.ReviewVerdictSchema = void 0;
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
const zod_1 = require("zod");
// ─── Primitive enum schemas ───────────────────────────────────────────────────
exports.ReviewVerdictSchema = zod_1.z.enum(['GENUINE', 'NEEDS_WORK', 'LIKELY_SPAM']);
/** @deprecated Use ReviewVerdictSchema */
exports.VerdictSchema = exports.ReviewVerdictSchema;
exports.ConfidenceSchema = zod_1.z.enum(['HIGH', 'MEDIUM', 'LOW']);
exports.AnalysisEngineSchema = zod_1.z.enum(['OLLAMA_LOCAL', 'HEURISTICS_FALLBACK']);
exports.HeuristicSeveritySchema = zod_1.z.enum(['INFO', 'WARNING', 'CRITICAL']);
exports.EvidenceSeveritySchema = zod_1.z.enum(['POSITIVE', 'NEUTRAL', 'CONCERN']);
exports.EvidenceTypeSchema = zod_1.z.enum([
    'HEURISTIC',
    'AI_OBSERVATION',
    'DIFF_INSPECTION',
]);
exports.CommentToneSchema = zod_1.z.enum([
    'ENCOURAGING',
    'CONSTRUCTIVE_GUIDANCE',
    'POLITE_CAUTION',
]);
exports.ReviewActionSchema = zod_1.z.enum([
    'COMMENT_ONLY',
    'REQUEST_CHANGES',
    'APPROVE_FOR_REVIEW',
]);
// ─── ChangedFile ─────────────────────────────────────────────────────────────
exports.ChangedFileSchema = zod_1.z.object({
    filename: zod_1.z.string().min(1, 'Filename is required'),
    status: zod_1.z.enum(['added', 'modified', 'deleted', 'renamed']),
    additions: zod_1.z.number().int().nonnegative(),
    deletions: zod_1.z.number().int().nonnegative(),
    patch: zod_1.z.string().optional(),
    previousFilename: zod_1.z.string().optional(),
});
// ─── PRStats ─────────────────────────────────────────────────────────────────
exports.PRStatsSchema = zod_1.z.object({
    totalAdditions: zod_1.z.number().int().nonnegative(),
    totalDeletions: zod_1.z.number().int().nonnegative(),
    totalFiles: zod_1.z.number().int().nonnegative(),
});
// ─── PullRequest ─────────────────────────────────────────────────────────────
/**
 * Validates untrusted API inputs for the triage endpoint.
 * All string fields are capped to prevent oversized payloads from
 * exhausting the model context window or memory.
 */
exports.PullRequestSchema = zod_1.z.object({
    id: zod_1.z.string().min(1, 'PR ID is required'),
    category: exports.ReviewVerdictSchema.optional(),
    title: zod_1.z
        .string()
        .min(1, 'PR title is required')
        .max(500, 'Title must be ≤500 characters'),
    author: zod_1.z.string().min(1, 'Author is required').max(100),
    authorAssociation: zod_1.z.string().max(50).optional(),
    createdAt: zod_1.z
        .string()
        .datetime({ offset: true })
        .optional()
        .or(zod_1.z.string().optional()), // accept non-strict timestamps from samples
    branch: zod_1.z.string().max(200).optional(),
    targetBranch: zod_1.z.string().max(200).optional(),
    linkedIssue: zod_1.z.string().nullable().optional(),
    description: zod_1.z
        .string()
        .max(65_000, 'Description must be ≤65 000 characters'),
    filesChanged: zod_1.z
        .array(exports.ChangedFileSchema)
        .min(1, 'At least one changed file is required')
        .max(200, 'Too many files in a single PR; please split the change'),
    stats: exports.PRStatsSchema,
});
/** @deprecated Use PullRequestSchema */
exports.PullRequestPayloadSchema = exports.PullRequestSchema;
// ─── HeuristicFinding ────────────────────────────────────────────────────────
exports.HeuristicFindingSchema = zod_1.z.object({
    id: zod_1.z.string().min(1),
    name: zod_1.z.string().min(1),
    severity: exports.HeuristicSeveritySchema,
    passed: zod_1.z.boolean(),
    scoreImpact: zod_1.z.number().int(),
    evidence: zod_1.z.string().min(1),
    details: zod_1.z.record(zod_1.z.unknown()).optional(),
});
// ─── Evidence ────────────────────────────────────────────────────────────────
/**
 * Validates a single evidence item emitted by heuristics or the AI model.
 *
 * The `lineRange` pattern intentionally allows a single line ("L42") or a
 * range ("L10-L25"). It rejects free-text to prevent prompt-injected
 * fabricated references from reaching the UI unvalidated.
 */
exports.EvidenceSchema = zod_1.z.object({
    id: zod_1.z.string().min(1),
    type: exports.EvidenceTypeSchema,
    severity: exports.EvidenceSeveritySchema,
    description: zod_1.z
        .string()
        .min(1)
        .max(2000, 'Evidence description must be ≤2000 characters'),
    file: zod_1.z.string().optional(),
    lineRange: zod_1.z
        .string()
        .regex(/^L\d+(-L\d+)?$/, 'lineRange must be "L<n>" or "L<n>-L<m>"')
        .optional(),
});
/** @deprecated Use EvidenceSchema */
exports.EvidenceItemSchema = exports.EvidenceSchema;
// ─── ReviewComment ────────────────────────────────────────────────────────────
/**
 * Validates the structured review comment from the model or fallback.
 *
 * The `isEdited`, `editedMarkdown`, `approvedBy`, and `approvedAt` fields
 * are optional here because the object arriving from the analysis engine will
 * not yet have them; they are added on the approval path.
 */
exports.ReviewCommentSchema = zod_1.z.object({
    markdown: zod_1.z
        .string()
        .min(1)
        .max(65_000, 'Comment markdown must be ≤65 000 characters'),
    greeting: zod_1.z.string().min(1).max(300),
    summary: zod_1.z
        .string()
        .min(1)
        .max(1000, 'Comment summary must be ≤1000 characters'),
    actionablePoints: zod_1.z
        .array(zod_1.z.string().min(1).max(500))
        .min(0)
        .max(20, 'At most 20 actionable points allowed'),
    closing: zod_1.z.string().min(1).max(300),
    tone: exports.CommentToneSchema,
    // Maintainer edit tracking (set after maintainer interaction)
    isEdited: zod_1.z.boolean().default(false),
    editedMarkdown: zod_1.z
        .string()
        .max(65_000)
        .optional(),
    approvedBy: zod_1.z.string().max(100).optional(),
    approvedAt: zod_1.z.string().datetime({ offset: true }).optional(),
});
/** @deprecated Use ReviewCommentSchema */
exports.SuggestedCommentSchema = exports.ReviewCommentSchema;
// ─── EngineDetails ───────────────────────────────────────────────────────────
exports.EngineDetailsSchema = zod_1.z.object({
    ollamaAvailable: zod_1.z.boolean(),
    modelName: zod_1.z.string().min(1),
    quantization: zod_1.z.string().optional(),
    executionTimeMs: zod_1.z.number().nonnegative(),
    isFallback: zod_1.z.boolean(),
    notes: zod_1.z.string().optional(),
});
// ─── AnalysisResult ──────────────────────────────────────────────────────────
/**
 * Validates the complete triage pipeline output before it is sent to the
 * frontend. Running this on the server-side response acts as a contract test:
 * if the model or fallback generator produces a malformed object it will be
 * caught here rather than silently corrupting the UI.
 */
exports.AnalysisResultSchema = zod_1.z.object({
    prId: zod_1.z.string().min(1),
    verdict: exports.ReviewVerdictSchema,
    confidence: exports.ConfidenceSchema,
    engine: exports.AnalysisEngineSchema,
    engineDetails: exports.EngineDetailsSchema,
    /**
     * reasoning is required on AnalysisResult.  It may be short ("Heuristic
     * score 22/100 driven by whitespace-only diff across both files.") but
     * must not be empty.
     */
    reasoning: zod_1.z
        .string()
        .min(10, 'reasoning must be at least 10 characters')
        .max(3000, 'reasoning must be ≤3000 characters'),
    summary: zod_1.z
        .string()
        .min(1)
        .max(500, 'summary must be ≤500 characters'),
    heuristicFindings: zod_1.z.array(exports.HeuristicFindingSchema),
    evidence: zod_1.z.array(exports.EvidenceSchema),
    reviewComment: exports.ReviewCommentSchema,
    metadata: zod_1.z.object({
        analyzedAt: zod_1.z.string().min(1),
        rulesTriggered: zod_1.z.array(zod_1.z.string()),
        heuristicScore: zod_1.z.number().min(0).max(100),
    }),
});
/**
 * Legacy schema — structurally identical to AnalysisResultSchema but uses
 * `suggestedComment` instead of `reviewComment` and makes `reasoning`
 * optional to avoid breaking existing callers.
 *
 * @deprecated Use AnalysisResultSchema
 */
exports.TriageResultSchema = zod_1.z.object({
    prId: zod_1.z.string().min(1),
    verdict: exports.ReviewVerdictSchema,
    confidence: exports.ConfidenceSchema,
    engine: exports.AnalysisEngineSchema,
    engineDetails: exports.EngineDetailsSchema,
    summary: zod_1.z.string().min(1).max(500),
    reasoning: zod_1.z.string().min(1).optional(),
    heuristicFindings: zod_1.z.array(exports.HeuristicFindingSchema),
    evidence: zod_1.z.array(exports.EvidenceSchema),
    suggestedComment: exports.ReviewCommentSchema,
    metadata: zod_1.z.object({
        analyzedAt: zod_1.z.string().min(1),
        rulesTriggered: zod_1.z.array(zod_1.z.string()),
        heuristicScore: zod_1.z.number().min(0).max(100),
    }),
});
// ─── Review Approval ─────────────────────────────────────────────────────────
exports.ReviewApprovalRequestSchema = zod_1.z.object({
    prId: zod_1.z.string().min(1, 'PR ID is required'),
    finalComment: zod_1.z
        .string()
        .min(5, 'Review comment must have meaningful content')
        .max(65_000),
    commentWasEdited: zod_1.z.boolean().optional(),
    approvedVerdict: exports.ReviewVerdictSchema,
    actionTaken: exports.ReviewActionSchema,
    maintainerNotes: zod_1.z.string().max(2000).optional(),
    maintainerName: zod_1.z.string().max(100).optional(),
});
exports.ReviewApprovalResponseSchema = zod_1.z.object({
    success: zod_1.z.boolean(),
    approvalId: zod_1.z.string().min(1),
    prId: zod_1.z.string().min(1),
    recordedAt: zod_1.z.string().min(1),
    message: zod_1.z.string().min(1),
    finalComment: zod_1.z.string().min(1),
    actionTaken: exports.ReviewActionSchema,
});
