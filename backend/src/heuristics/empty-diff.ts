import { ChangedFile, HeuristicFinding } from '@proof/shared';

/**
 * RULE: empty-diff-check
 *
 * Detects pull requests where no parseable diff content exists at all.
 * This is distinct from whitespace-only changes (whitespace-check):
 *   - whitespace-check fires when lines exist but are cosmetic.
 *   - empty-diff-check fires when there are literally no +/- lines
 *     in any patch — either patches are absent entirely or every
 *     patch contains only diff headers (@@, ---, +++).
 *
 * Signals: low-effort submission, accidental empty PR, or tool misconfiguration.
 * This is a signal only — do not label a PR as spam on this finding alone.
 */
export function checkEmptyDiff(files: ChangedFile[]): HeuristicFinding {
  const RULE_ID = 'empty-diff-check';
  const RULE_NAME = 'Empty or Unparseable Diff';

  // No files listed at all
  if (!files || files.length === 0) {
    return {
      id: RULE_ID,
      name: RULE_NAME,
      severity: 'CRITICAL',
      passed: false,
      scoreImpact: -40,
      evidence: 'Pull request contains no changed files.',
      details: { fileCount: 0, filesWithContent: 0 },
    };
  }

  // Count files that actually have any patch content (+/- lines)
  let filesWithContent = 0;
  let totalContentLines = 0;
  const filesWithoutPatch: string[] = [];

  for (const file of files) {
    if (!file.patch) {
      filesWithoutPatch.push(file.filename);
      continue;
    }

    let hasContentLine = false;
    for (const line of file.patch.split('\n')) {
      if (
        (line.startsWith('+') && !line.startsWith('+++')) ||
        (line.startsWith('-') && !line.startsWith('---'))
      ) {
        hasContentLine = true;
        totalContentLines++;
      }
    }
    if (hasContentLine) {
      filesWithContent++;
    } else {
      filesWithoutPatch.push(file.filename);
    }
  }

  const allFilesEmpty = filesWithContent === 0;

  if (allFilesEmpty) {
    const reason =
      filesWithoutPatch.length > 0 &&
      files.every(f => !f.patch)
        ? 'No diff patch is available for any changed file (patches may not have been fetched).'
        : `All ${files.length} file(s) have patches containing only diff headers with no added or removed lines.`;

    return {
      id: RULE_ID,
      name: RULE_NAME,
      severity: 'CRITICAL',
      passed: false,
      scoreImpact: -40,
      evidence: reason,
      details: {
        fileCount: files.length,
        filesWithContent: 0,
        filesWithoutPatch,
      },
    };
  }

  if (filesWithoutPatch.length > 0) {
    return {
      id: RULE_ID,
      name: RULE_NAME,
      severity: 'INFO',
      passed: true,
      scoreImpact: 5,
      evidence: `${filesWithContent} of ${files.length} file(s) have parseable diff content. ` +
        `${filesWithoutPatch.length} file(s) have no patch data (may be binary or too large).`,
      details: { fileCount: files.length, filesWithContent, filesWithoutPatch, totalContentLines },
    };
  }

  return {
    id: RULE_ID,
    name: RULE_NAME,
    severity: 'INFO',
    passed: true,
    scoreImpact: 10,
    evidence: `All ${files.length} file(s) contain parseable diff content (${totalContentLines} total +/- lines).`,
    details: { fileCount: files.length, filesWithContent, totalContentLines },
  };
}
