"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.VERDICT_META = void 0;
/** Lookup table — import and use directly, no runtime branching needed. */
exports.VERDICT_META = {
    GENUINE: {
        verdict: 'GENUINE',
        label: 'Genuine',
        description: 'The contribution appears relevant, substantive, and reasonably well-supported by evidence.',
        colour: 'green',
        defaultAction: 'COMMENT_ONLY',
    },
    NEEDS_WORK: {
        verdict: 'NEEDS_WORK',
        label: 'Needs Work',
        description: 'The contribution may be legitimate but requires clarification, missing tests, or further refinement.',
        colour: 'amber',
        defaultAction: 'REQUEST_CHANGES',
    },
    LIKELY_SPAM: {
        verdict: 'LIKELY_SPAM',
        label: 'Likely Spam',
        description: 'Multiple signals (whitespace-only, trivial diffs, no context) suggest a low-effort or off-topic submission.',
        colour: 'red',
        defaultAction: 'COMMENT_ONLY',
    },
};
