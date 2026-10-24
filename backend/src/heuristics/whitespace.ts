import { ChangedFile, HeuristicFinding } from '@proof/shared';

/**
 * Inspects diff patches to determine if the changes are predominantly or exclusively whitespace,
 * trailing spaces, or meaningless formatting modifications without logic changes.
 */
export function checkWhitespaceOnly(files: ChangedFile[]): HeuristicFinding {
  if (!files || files.length === 0) {
    return {
      id: 'whitespace-check',
      name: 'Diff Substance & Whitespace Analysis',
      severity: 'WARNING',
      passed: false,
      scoreImpact: -20,
      evidence: 'No files or diff patches provided for analysis.',
    };
  }

  let totalDiffLines = 0;
  let cosmeticLines = 0;
  const filesAnalyzed: string[] = [];
  let cosmeticFilesCount = 0;

  for (const file of files) {
    if (!file.patch) continue;
    filesAnalyzed.push(file.filename);

    const lines = file.patch.split('\n');
    const added: string[] = [];
    const deleted: string[] = [];

    for (const line of lines) {
      if (line.startsWith('+') && !line.startsWith('+++')) {
        added.push(line.slice(1));
        totalDiffLines++;
      } else if (line.startsWith('-') && !line.startsWith('---')) {
        deleted.push(line.slice(1));
        totalDiffLines++;
      }
    }

    // Check additions
    let fileCosmeticCount = 0;
    const fileTotalCount = added.length + deleted.length;

    for (const add of added) {
      // 1. Pure empty line or spaces
      if (add.trim().length === 0) {
        fileCosmeticCount++;
      } else if (deleted.some(del => del.trim() === add.trim())) {
        // 2. Line matches a deleted line when whitespace is trimmed (trailing spaces / indentation only)
        fileCosmeticCount++;
      }
    }

    for (const del of deleted) {
      if (del.trim().length === 0) {
        fileCosmeticCount++;
      } else if (added.some(add => add.trim() === del.trim())) {
        fileCosmeticCount++;
      }
    }

    cosmeticLines += fileCosmeticCount;
    if (fileTotalCount > 0 && fileCosmeticCount === fileTotalCount) {
      cosmeticFilesCount++;
    }
  }

  const isPureCosmetic = totalDiffLines > 0 && cosmeticLines === totalDiffLines;
  const isHighCosmeticRatio = totalDiffLines > 0 && (cosmeticLines / totalDiffLines) >= 0.75;

  if (isPureCosmetic || (filesAnalyzed.length > 0 && cosmeticFilesCount === filesAnalyzed.length)) {
    return {
      id: 'whitespace-check',
      name: 'Diff Substance & Whitespace Analysis',
      severity: 'CRITICAL',
      passed: false,
      scoreImpact: -50,
      evidence: `Diff consists solely of whitespace, blank lines, or trailing space adjustments (${cosmeticLines}/${totalDiffLines} lines across ${filesAnalyzed.length} files). No logic, tests, or substantive documentation added.`,
      details: { totalDiffLines, cosmeticLines, ratio: 1.0 },
    };
  }

  if (isHighCosmeticRatio) {
    return {
      id: 'whitespace-check',
      name: 'Diff Substance & Whitespace Analysis',
      severity: 'WARNING',
      passed: false,
      scoreImpact: -30,
      evidence: `Over 75% of changed lines (${cosmeticLines}/${totalDiffLines}) are empty lines, trailing spaces, or cosmetic indentation adjustments.`,
      details: { totalDiffLines, cosmeticLines, ratio: cosmeticLines / totalDiffLines },
    };
  }

  return {
    id: 'whitespace-check',
    name: 'Diff Substance & Whitespace Analysis',
    severity: 'INFO',
    passed: true,
    scoreImpact: 20,
    evidence: `Substantive code changes detected across ${filesAnalyzed.length} file(s). ${totalDiffLines - cosmeticLines} substantive lines modified.`,
    details: { totalDiffLines, substantiveLines: totalDiffLines - cosmeticLines },
  };
}
