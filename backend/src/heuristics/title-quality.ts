import { HeuristicFinding } from '@proof/shared';

/**
 * RULE: title-quality-check
 *
 * Detects vague, uninformative, or generic PR titles.
 * A good title identifies *what* changed and ideally *why*.
 *
 * Signals checked:
 *  - Extremely short titles (≤10 chars after trimming)
 *  - Titles that are only numbers or punctuation
 *  - Generic filler phrases that give reviewers no information
 *  - Title is identical (case-insensitive) to the repository default
 *    PR title placeholder strings
 *
 * Important: a short title is a weak signal. A one-liner like
 * "fix: null deref in parser" is perfectly fine. Only flag when the
 * title is clearly uninformative.
 */

// Phrases that, when the *entire* title matches, indicate a generic submission.
// Partial matches are intentionally not checked — "Update README to fix typo"
// is fine even though it contains "update".
const GENERIC_TITLE_PATTERNS: RegExp[] = [
  /^(fix|fixes|fixed)$/i,
  /^(update|updated|updates)$/i,
  /^(changes?|changed)$/i,
  /^(edit|edited|edits)$/i,
  /^(misc|miscellaneous)$/i,
  /^(wip|work in progress)$/i,
  /^(patch[\s-]?\d*)$/i,
  /^(pr\s*#?\d*)$/i,
  /^(hacktoberfest)$/i,
  /^(contribution)$/i,
  /^\d+$/, // pure number
  /^[^\w\s]*$/, // only punctuation / emoji, no word chars
];

// Phrases commonly used in low-effort Hacktoberfest submissions.
// Checked as a whole-title match (case-insensitive, trimmed).
const LOW_EFFORT_FULL_TITLE_PATTERNS: RegExp[] = [
  /^add\s+(my\s+)?name$/i,
  /^add(ed)?\s+myself$/i,
  /^(fix(ed)?\s+)?typo(s)?$/i,
  /^(fix(ed)?\s+)?spelling\s+error(s)?$/i,
  /^removed?\s+whitespace$/i,
  /^(minor\s+)?grammar\s+(fix(es)?|correction(s)?)$/i,
  /^(fixed?\s+)?indent(ation)?$/i,
];

export function checkTitleQuality(title: string): HeuristicFinding {
  const RULE_ID = 'title-quality-check';
  const RULE_NAME = 'Pull Request Title Quality';

  const trimmed = title.trim();

  // 1. Extremely short
  if (trimmed.length <= 10) {
    return {
      id: RULE_ID,
      name: RULE_NAME,
      severity: 'WARNING',
      passed: false,
      scoreImpact: -15,
      evidence: `Title is very short (${trimmed.length} chars): "${trimmed}". A descriptive title helps reviewers understand the purpose at a glance.`,
      details: { title: trimmed, charLength: trimmed.length, reason: 'too-short' },
    };
  }

  // 2. Fully generic single-word / pattern match
  for (const pattern of GENERIC_TITLE_PATTERNS) {
    if (pattern.test(trimmed)) {
      return {
        id: RULE_ID,
        name: RULE_NAME,
        severity: 'WARNING',
        passed: false,
        scoreImpact: -20,
        evidence: `Title matches a generic placeholder pattern: "${trimmed}". Please use a title that explains what the change does (e.g. "fix(auth): prevent race condition on token refresh").`,
        details: { title: trimmed, reason: 'generic-pattern', pattern: pattern.source },
      };
    }
  }

  // 3. Low-effort common submission titles (full-title match)
  for (const pattern of LOW_EFFORT_FULL_TITLE_PATTERNS) {
    if (pattern.test(trimmed)) {
      return {
        id: RULE_ID,
        name: RULE_NAME,
        severity: 'WARNING',
        passed: false,
        scoreImpact: -15,
        evidence: `Title suggests a low-effort or cosmetic-only change: "${trimmed}". Minor fixes are welcome, but the PR body should explain the motivation.`,
        details: { title: trimmed, reason: 'low-effort-pattern', pattern: pattern.source },
      };
    }
  }

  // 4. Passes — informative title
  return {
    id: RULE_ID,
    name: RULE_NAME,
    severity: 'INFO',
    passed: true,
    scoreImpact: 10,
    evidence: `Title appears descriptive (${trimmed.length} chars): "${trimmed}".`,
    details: { title: trimmed, charLength: trimmed.length },
  };
}
