import { describe, it, expect } from 'vitest';
import {
  runHeuristics,
  checkWhitespaceOnly,
  checkEmptyDiff,
  checkDiffSizeAndTests,
  checkLinkedIssue,
  checkDescriptionAndTemplate,
  checkTitleQuality,
} from '../src/heuristics';
import genuinePR from '../../samples/genuine-pr.json';
import needsWorkPR from '../../samples/needs-work-pr.json';
import likelySpamPR from '../../samples/likely-spam-pr.json';
import { PullRequestPayload } from '@proof/shared';

describe('Heuristic Rule: Empty Diff Check', () => {
  it('flags PR with no files as CRITICAL', () => {
    const finding = checkEmptyDiff([]);
    expect(finding.passed).toBe(false);
    expect(finding.severity).toBe('CRITICAL');
    expect(finding.scoreImpact).toBeLessThan(0);
    expect(finding.id).toBe('empty-diff-check');
  });

  it('flags PR where patches contain only diff headers without +/- content lines', () => {
    const finding = checkEmptyDiff([
      {
        filename: 'empty.txt',
        status: 'modified',
        additions: 0,
        deletions: 0,
        patch: '@@ -1,0 +1,0 @@\n--- a/empty.txt\n+++ b/empty.txt',
      },
    ]);
    expect(finding.passed).toBe(false);
    expect(finding.severity).toBe('CRITICAL');
  });

  it('passes normal useful diff with parseable changes', () => {
    const finding = checkEmptyDiff(genuinePR.filesChanged as any);
    expect(finding.passed).toBe(true);
    expect(finding.scoreImpact).toBeGreaterThan(0);
  });
});

describe('Heuristic Rule: Whitespace Check', () => {
  it('identifies pure whitespace changes as CRITICAL', () => {
    const finding = checkWhitespaceOnly([
      {
        filename: 'README.md',
        status: 'modified',
        additions: 2,
        deletions: 0,
        patch: '@@ -1,2 +1,4 @@\n+\n+   ',
      },
    ]);
    expect(finding.passed).toBe(false);
    expect(finding.severity).toBe('CRITICAL');
    expect(finding.scoreImpact).toBe(-50);
  });

  it('identifies whitespace-only modifications across existing lines as CRITICAL', () => {
    const finding = checkWhitespaceOnly([
      {
        filename: 'index.ts',
        status: 'modified',
        additions: 1,
        deletions: 1,
        patch: '@@ -1,1 +1,1 @@\n-const a = 1;\n+const a = 1;  ',
      },
    ]);
    expect(finding.passed).toBe(false);
    expect(finding.severity).toBe('CRITICAL');
  });

  it('passes when substantive code changes exist (normal useful diff)', () => {
    const finding = checkWhitespaceOnly(genuinePR.filesChanged as any);
    expect(finding.passed).toBe(true);
    expect(finding.scoreImpact).toBeGreaterThan(0);
  });
});

describe('Heuristic Rule: Diff Size & Tests', () => {
  it('awards score for test files in genuine PR', () => {
    const findings = checkDiffSizeAndTests(genuinePR.filesChanged as any, genuinePR.stats);
    const testFinding = findings.find(f => f.id === 'test-coverage-check');
    expect(testFinding?.passed).toBe(true);
    expect(testFinding?.scoreImpact).toBe(25);
  });

  it('penalizes code additions with no tests in needs-work PR', () => {
    const findings = checkDiffSizeAndTests(needsWorkPR.filesChanged as any, needsWorkPR.stats);
    const testFinding = findings.find(f => f.id === 'test-coverage-check');
    expect(testFinding?.passed).toBe(false);
    expect(testFinding?.severity).toBe('WARNING');
  });
});

describe('Heuristic Rule: PR Title Quality', () => {
  it('flags generic placeholder titles like "fix" or "update"', () => {
    const finding1 = checkTitleQuality('fix');
    expect(finding1.passed).toBe(false);
    expect(finding1.severity).toBe('WARNING');

    const finding2 = checkTitleQuality('Update');
    expect(finding2.passed).toBe(false);
  });

  it('flags overly short or trivial titles', () => {
    const finding = checkTitleQuality('foo');
    expect(finding.passed).toBe(false);
    expect(finding.severity).toBe('WARNING');
  });

  it('passes informative and descriptive titles', () => {
    const finding = checkTitleQuality(genuinePR.title);
    expect(finding.passed).toBe(true);
    expect(finding.scoreImpact).toBeGreaterThan(0);
  });
});

describe('Heuristic Rule: Linked Issue', () => {
  it('detects issue link in genuine PR', () => {
    const finding = checkLinkedIssue(genuinePR.linkedIssue, genuinePR.title, genuinePR.description);
    expect(finding.passed).toBe(true);
    expect(finding.scoreImpact).toBe(20);
  });

  it('flags missing issue reference in spam PR', () => {
    const finding = checkLinkedIssue(likelySpamPR.linkedIssue, likelySpamPR.title, likelySpamPR.description);
    expect(finding.passed).toBe(false);
  });
});

describe('Heuristic Rule: Template & Description', () => {
  it('flags completely empty PR description', () => {
    const finding = checkDescriptionAndTemplate('');
    expect(finding.passed).toBe(false);
    expect(finding.severity).toBe('WARNING');
    expect(finding.scoreImpact).toBeLessThan(0);
  });

  it('flags repetitive filler content or character spam', () => {
    const finding = checkDescriptionAndTemplate('asdfasdfasdfasdfasdfasdfasdf');
    expect(finding.passed).toBe(false);
    expect(finding.severity).toBe('WARNING');
  });

  it('flags incomplete checkboxes in needs-work PR', () => {
    const finding = checkDescriptionAndTemplate(needsWorkPR.description);
    expect(finding.passed).toBe(false);
    expect(finding.evidence).toContain('incomplete item');
  });

  it('passes comprehensive description in genuine PR', () => {
    const finding = checkDescriptionAndTemplate(genuinePR.description);
    expect(finding.passed).toBe(true);
  });
});

describe('Full Heuristic Suite Orchestration', () => {
  it('scores genuine PR higher than 70', () => {
    const result = runHeuristics(genuinePR as PullRequestPayload);
    expect(result.score).toBeGreaterThanOrEqual(70);
  });

  it('scores spam PR below 40 with critical whitespace triggers', () => {
    const result = runHeuristics(likelySpamPR as PullRequestPayload);
    expect(result.score).toBeLessThan(40);
    expect(result.rulesTriggered).toContain('whitespace-check');
  });

  it('handles empty diff PR gracefully and includes empty-diff-check rule', () => {
    const emptyPR: PullRequestPayload = {
      ...likelySpamPR,
      id: 'test-empty',
      filesChanged: [],
      stats: { totalAdditions: 0, totalDeletions: 0, totalFiles: 0 },
    };
    const result = runHeuristics(emptyPR);
    expect(result.score).toBeLessThanOrEqual(40);
    expect(result.rulesTriggered).toContain('empty-diff-check');
  });
});
