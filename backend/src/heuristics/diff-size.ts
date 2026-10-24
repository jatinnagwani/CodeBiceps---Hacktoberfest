import { ChangedFile, HeuristicFinding, PRStats } from '@proof/shared';

/**
 * Analyzes diff volume, addition/deletion balance, and test coverage indicators.
 */
export function checkDiffSizeAndTests(files: ChangedFile[], stats: PRStats): HeuristicFinding[] {
  const findings: HeuristicFinding[] = [];

  // 1. Diff Volume Check
  const totalChanges = stats.totalAdditions + stats.totalDeletions;
  if (totalChanges <= 4 && stats.totalFiles <= 2) {
    findings.push({
      id: 'diff-volume-check',
      name: 'Diff Change Volume',
      severity: 'WARNING',
      passed: false,
      scoreImpact: -15,
      evidence: `Very small change volume (${totalChanges} total line changes across ${stats.totalFiles} file(s)). Potential low-effort submission.`,
      details: { totalChanges, filesCount: stats.totalFiles },
    });
  } else if (totalChanges > 1500) {
    findings.push({
      id: 'diff-volume-check',
      name: 'Diff Change Volume',
      severity: 'WARNING',
      passed: false,
      scoreImpact: -10,
      evidence: `Very large pull request (${totalChanges} lines changed). Recommend breaking down into focused, smaller PRs for reliable review.`,
      details: { totalChanges, filesCount: stats.totalFiles },
    });
  } else {
    findings.push({
      id: 'diff-volume-check',
      name: 'Diff Change Volume',
      severity: 'INFO',
      passed: true,
      scoreImpact: 15,
      evidence: `Reasonable PR scope with ${totalChanges} line changes across ${stats.totalFiles} file(s).`,
      details: { totalChanges, filesCount: stats.totalFiles },
    });
  }

  // 2. Test Coverage Indicator
  const testFiles = files.filter(f =>
    /(\.test\.|\.spec\.|__tests__|tests\/)/i.test(f.filename)
  );

  const codeFiles = files.filter(f =>
    !/(\.test\.|\.spec\.|__tests__|tests\/|\.md$|\.json$|\.ya?ml$)/i.test(f.filename)
  );

  if (testFiles.length > 0) {
    findings.push({
      id: 'test-coverage-check',
      name: 'Automated Test Coverage',
      severity: 'INFO',
      passed: true,
      scoreImpact: 25,
      evidence: `Includes ${testFiles.length} dedicated test file(s): ${testFiles.map(t => t.filename).join(', ')}.`,
      details: { testFiles: testFiles.map(t => t.filename) },
    });
  } else if (codeFiles.length > 0) {
    findings.push({
      id: 'test-coverage-check',
      name: 'Automated Test Coverage',
      severity: 'WARNING',
      passed: false,
      scoreImpact: -15,
      evidence: `Code modifications made in ${codeFiles.length} source file(s) without accompanying unit/integration tests.`,
      details: { uncuratedFiles: codeFiles.map(c => c.filename) },
    });
  } else {
    findings.push({
      id: 'test-coverage-check',
      name: 'Automated Test Coverage',
      severity: 'INFO',
      passed: true,
      scoreImpact: 0,
      evidence: 'Documentation or configuration PR; automated test files not required.',
    });
  }

  return findings;
}
