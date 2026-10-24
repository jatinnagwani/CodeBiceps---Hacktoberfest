import { PullRequestPayload, HeuristicFinding } from '@proof/shared';
import { checkWhitespaceOnly } from './whitespace';
import { checkEmptyDiff } from './empty-diff';
import { checkDiffSizeAndTests } from './diff-size';
import { checkLinkedIssue } from './issue-link';
import { checkDescriptionAndTemplate } from './template-check';
import { checkTitleQuality } from './title-quality';

export * from './whitespace';
export * from './empty-diff';
export * from './diff-size';
export * from './issue-link';
export * from './template-check';
export * from './title-quality';

export interface HeuristicAnalysisOutput {
  findings: HeuristicFinding[];
  score: number; // 0 to 100
  rulesTriggered: string[];
}

/**
 * Runs all deterministic heuristic rules on the incoming pull request payload.
 */
export function runHeuristics(pr: PullRequestPayload): HeuristicAnalysisOutput {
  const findings: HeuristicFinding[] = [];

  // 1. Empty or Unparseable Diff Check
  findings.push(checkEmptyDiff(pr.filesChanged));

  // 2. Whitespace & Substantive Diff Check
  findings.push(checkWhitespaceOnly(pr.filesChanged));

  // 3. Diff Volume & Test Coverage Check
  findings.push(...checkDiffSizeAndTests(pr.filesChanged, pr.stats));

  // 4. PR Title Quality & Low-Effort Check
  findings.push(checkTitleQuality(pr.title));

  // 5. Linked Issue Traceability Check
  findings.push(checkLinkedIssue(pr.linkedIssue, pr.title, pr.description));

  // 6. Description & Template Adherence Check
  findings.push(checkDescriptionAndTemplate(pr.description));

  // Calculate base score: starts at 50 (neutral) and adjusts based on findings
  let computedScore = 50;
  for (const f of findings) {
    computedScore += f.scoreImpact;
  }
  // Clamp between 0 and 100
  const normalizedScore = Math.max(0, Math.min(100, computedScore));

  const rulesTriggered = findings
    .filter(f => !f.passed || f.severity === 'CRITICAL' || f.severity === 'WARNING')
    .map(f => f.id);

  return {
    findings,
    score: normalizedScore,
    rulesTriggered,
  };
}
