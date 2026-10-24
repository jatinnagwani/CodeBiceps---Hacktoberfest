import { HeuristicFinding } from '@proof/shared';

/**
 * Checks if the pull request references an existing issue or task.
 */
export function checkLinkedIssue(
  linkedIssue: string | null | undefined,
  title: string,
  description: string
): HeuristicFinding {
  const issueRegex = /(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?|issue)\s*#\d+|#\d+/i;

  const hasExplicitLink = Boolean(linkedIssue && linkedIssue.trim().length > 0);
  const foundInDesc = issueRegex.test(description);
  const foundInTitle = issueRegex.test(title);

  if (hasExplicitLink || foundInDesc || foundInTitle) {
    const reference = linkedIssue || (description.match(issueRegex)?.[0]) || (title.match(issueRegex)?.[0]);
    return {
      id: 'linked-issue-check',
      name: 'Linked Issue Traceability',
      severity: 'INFO',
      passed: true,
      scoreImpact: 20,
      evidence: `Pull request references linked issue (${reference}), establishing clear motivation.`,
      details: { issue: reference },
    };
  }

  return {
    id: 'linked-issue-check',
    name: 'Linked Issue Traceability',
    severity: 'WARNING',
    passed: false,
    scoreImpact: -10,
    evidence: 'No linked issue referenced in the PR description, metadata, or title (e.g. Closes #123).',
  };
}
