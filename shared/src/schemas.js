"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReviewApprovalResponseSchema = exports.ReviewApprovalRequestSchema = exports.TriageResultSchema = exports.EngineDetailsSchema = exports.SuggestedCommentSchema = exports.EvidenceItemSchema = exports.HeuristicFindingSchema = exports.PullRequestPayloadSchema = exports.PRStatsSchema = exports.ChangedFileSchema = void 0;
const zod_1 = require("zod");
exports.ChangedFileSchema = zod_1.z.object({
    filename: zod_1.z.string().min(1, 'Filename is required'),
    status: zod_1.z.enum(['added', 'modified', 'deleted', 'renamed']),
    additions: zod_1.z.number().int().nonnegative(),
    deletions: zod_1.z.number().int().nonnegative(),
    patch: zod_1.z.string().optional(),
});
exports.PRStatsSchema = zod_1.z.object({
    totalAdditions: zod_1.z.number().int().nonnegative(),
    totalDeletions: zod_1.z.number().int().nonnegative(),
    totalFiles: zod_1.z.number().int().nonnegative(),
});
exports.PullRequestPayloadSchema = zod_1.z.object({
    id: zod_1.z.string().min(1, 'PR ID is required'),
    category: zod_1.z.enum(['GENUINE', 'NEEDS_WORK', 'LIKELY_SPAM']).optional(),
    title: zod_1.z.string().min(1, 'PR title is required'),
    author: zod_1.z.string().min(1, 'Author is required'),
    authorAssociation: zod_1.z.string().optional(),
    createdAt: zod_1.z.string().optional(),
    branch: zod_1.z.string().optional(),
    targetBranch: zod_1.z.string().optional(),
    linkedIssue: zod_1.z.string().nullable().optional(),
    description: zod_1.z.string(),
    filesChanged: zod_1.z.array(exports.ChangedFileSchema),
    stats: exports.PRStatsSchema,
});
exports.HeuristicFindingSchema = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string(),
    severity: zod_1.z.enum(['INFO', 'WARNING', 'CRITICAL']),
    passed: zod_1.z.boolean(),
    scoreImpact: zod_1.z.number(),
    evidence: zod_1.z.string(),
    details: zod_1.z.record(zod_1.z.unknown()).optional(),
});
exports.EvidenceItemSchema = zod_1.z.object({
    id: zod_1.z.string(),
    type: zod_1.z.enum(['HEURISTIC', 'AI_OBSERVATION', 'DIFF_INSPECTION']),
    severity: zod_1.z.enum(['POSITIVE', 'NEUTRAL', 'CONCERN']),
    description: zod_1.z.string(),
    file: zod_1.z.string().optional(),
    lineRange: zod_1.z.string().optional(),
});
exports.SuggestedCommentSchema = zod_1.z.object({
    markdown: zod_1.z.string(),
    greeting: zod_1.z.string(),
    summary: zod_1.z.string(),
    actionablePoints: zod_1.z.array(zod_1.z.string()),
    closing: zod_1.z.string(),
    tone: zod_1.z.enum(['ENCOURAGING', 'CONSTRUCTIVE_GUIDANCE', 'POLITE_CAUTION']),
});
exports.EngineDetailsSchema = zod_1.z.object({
    ollamaAvailable: zod_1.z.boolean(),
    modelName: zod_1.z.string(),
    quantization: zod_1.z.string().optional(),
    executionTimeMs: zod_1.z.number(),
    isFallback: zod_1.z.boolean(),
    notes: zod_1.z.string().optional(),
});
exports.TriageResultSchema = zod_1.z.object({
    prId: zod_1.z.string(),
    verdict: zod_1.z.enum(['GENUINE', 'NEEDS_WORK', 'LIKELY_SPAM']),
    confidence: zod_1.z.enum(['HIGH', 'MEDIUM', 'LOW']),
    engine: zod_1.z.enum(['OLLAMA_LOCAL', 'HEURISTICS_FALLBACK']),
    engineDetails: exports.EngineDetailsSchema,
    summary: zod_1.z.string(),
    heuristicFindings: zod_1.z.array(exports.HeuristicFindingSchema),
    evidence: zod_1.z.array(exports.EvidenceItemSchema),
    suggestedComment: exports.SuggestedCommentSchema,
    metadata: zod_1.z.object({
        analyzedAt: zod_1.z.string(),
        rulesTriggered: zod_1.z.array(zod_1.z.string()),
        heuristicScore: zod_1.z.number(),
    }),
});
exports.ReviewApprovalRequestSchema = zod_1.z.object({
    prId: zod_1.z.string().min(1, 'PR ID is required'),
    finalComment: zod_1.z.string().min(5, 'Review comment must have meaningful content'),
    approvedVerdict: zod_1.z.enum(['GENUINE', 'NEEDS_WORK', 'LIKELY_SPAM']),
    actionTaken: zod_1.z.enum(['COMMENT_ONLY', 'REQUEST_CHANGES', 'APPROVE_FOR_REVIEW']),
    maintainerNotes: zod_1.z.string().optional(),
    maintainerName: zod_1.z.string().optional(),
});
exports.ReviewApprovalResponseSchema = zod_1.z.object({
    success: zod_1.z.boolean(),
    approvalId: zod_1.z.string(),
    prId: zod_1.z.string(),
    recordedAt: zod_1.z.string(),
    message: zod_1.z.string(),
    finalComment: zod_1.z.string(),
    actionTaken: zod_1.z.enum(['COMMENT_ONLY', 'REQUEST_CHANGES', 'APPROVE_FOR_REVIEW']),
});
