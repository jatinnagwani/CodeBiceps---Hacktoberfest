import { Evidence, ChangedFile } from '@proof/shared';

// ─── Interfaces ─────────────────────────────────────────────────────────────

export type EvidenceValidationStatus = 'VALID' | 'INVALID' | 'UNVERIFIABLE';

export type VerificationScope =
  | 'FULL'          // Both file path and line numbers verified against unified diff hunks
  | 'FILE_ONLY'     // File path verified in PR; no line numbers claimed
  | 'PR_LEVEL'      // PR-level observation (e.g. description checklist, overall repo structure)
  | 'PATCH_ABSENT'  // File exists in PR, but unified diff patch is missing (binary/truncated)
  | 'SYNTAX_ONLY';  // Line range syntax is invalid, inverted, or malformed

export interface ParsedLineRange {
  start: number;
  end: number;
  isRange: boolean;
  raw: string;
}

export interface PatchHunkRange {
  oldStart: number;
  oldCount: number;
  newStart: number;
  newCount: number;
  newEnd: number;
  oldEnd: number;
  header: string;
}

export interface FileDiffMetadata {
  filename: string;
  hasPatch: boolean;
  hunks: PatchHunkRange[];
  validNewLines: Set<number>;
  validOldLines: Set<number>;
}

export interface EvidenceValidationResult {
  evidenceId: string;
  status: EvidenceValidationStatus;
  isValid: boolean;
  reason?: string;
  fileVerified: boolean;
  linesVerified: boolean;
  verificationScope: VerificationScope;
  details?: {
    file?: string;
    lineRange?: string;
    parsedLines?: { start: number; end: number };
    availableHunks?: string[];
    matchingHunk?: string;
  };
}

export interface BatchEvidenceValidationReport {
  total: number;
  validCount: number;
  invalidCount: number;
  unverifiableCount: number;
  allValid: boolean;
  results: EvidenceValidationResult[];
  summary: string;
}

// ─── Diff & Line Range Parsing Utilities ─────────────────────────────────────

/**
 * Parses unified diff hunk headers to extract modified line ranges.
 * Handles formats:
 *   @@ -old_start,old_count +new_start,new_count @@
 *   @@ -old_start +new_start,new_count @@
 *   @@ -old_start,old_count +new_start @@
 *   @@ -old_start +new_start @@
 */
export function parsePatchHunks(patch?: string | null): PatchHunkRange[] {
  if (!patch || typeof patch !== 'string') {
    return [];
  }

  const hunks: PatchHunkRange[] = [];
  const lines = patch.split('\n');

  const hunkRegex = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@(.*)$/;

  for (const line of lines) {
    const match = line.match(hunkRegex);
    if (match) {
      const oldStart = parseInt(match[1], 10);
      const oldCount = match[2] !== undefined ? parseInt(match[2], 10) : 1;
      const newStart = parseInt(match[3], 10);
      const newCount = match[4] !== undefined ? parseInt(match[4], 10) : 1;

      const newEnd = newCount > 0 ? newStart + newCount - 1 : newStart;
      const oldEnd = oldCount > 0 ? oldStart + oldCount - 1 : oldStart;

      hunks.push({
        oldStart,
        oldCount,
        newStart,
        newCount,
        newEnd,
        oldEnd,
        header: line.trim(),
      });
    }
  }

  return hunks;
}

/**
 * Parses line ranges formatted as "L10-L25", "L42", "10-25", or "42".
 * Returns null if the string cannot be parsed into integer line numbers.
 */
export function parseLineRange(rangeStr?: string | null): ParsedLineRange | null {
  if (!rangeStr || typeof rangeStr !== 'string') {
    return null;
  }

  const trimmed = rangeStr.trim();
  const match = trimmed.match(/^L?(\d+)(?:-L?(\d+))?$/i);
  if (!match) {
    return null;
  }

  const start = parseInt(match[1], 10);
  const end = match[2] !== undefined ? parseInt(match[2], 10) : start;

  return {
    start,
    end,
    isRange: match[2] !== undefined,
    raw: trimmed,
  };
}

/**
 * Builds metadata for a changed file by parsing all hunk ranges and line numbers.
 */
export function getFileDiffMetadata(file: ChangedFile): FileDiffMetadata {
  const hasPatch = Boolean(file.patch && file.patch.trim().length > 0);
  if (!hasPatch || !file.patch) {
    return {
      filename: file.filename,
      hasPatch: false,
      hunks: [],
      validNewLines: new Set<number>(),
      validOldLines: new Set<number>(),
    };
  }

  const hunks = parsePatchHunks(file.patch);
  const validNewLines = new Set<number>();
  const validOldLines = new Set<number>();

  const patchLines = file.patch.split('\n');
  let currentNew = 0;
  let currentOld = 0;
  let inHunk = false;

  const hunkRegex = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/;

  for (const line of patchLines) {
    const hunkMatch = line.match(hunkRegex);
    if (hunkMatch) {
      currentOld = parseInt(hunkMatch[1], 10);
      currentNew = parseInt(hunkMatch[3], 10);
      inHunk = true;
      continue;
    }

    if (!inHunk) continue;

    if (line.startsWith('+') && !line.startsWith('+++')) {
      validNewLines.add(currentNew);
      currentNew++;
    } else if (line.startsWith('-') && !line.startsWith('---')) {
      validOldLines.add(currentOld);
      currentOld++;
    } else if (line.startsWith(' ')) {
      validNewLines.add(currentNew);
      validOldLines.add(currentOld);
      currentNew++;
      currentOld++;
    }
  }

  return {
    filename: file.filename,
    hasPatch: true,
    hunks,
    validNewLines,
    validOldLines,
  };
}

// ─── Single Evidence Validator ──────────────────────────────────────────────

/**
 * Validates a single evidence item against the pull request's changed files.
 *
 * Checks performed:
 * 1. Well-formedness of evidence fields (id, description, type, severity).
 * 2. If no file is claimed:
 *    - Valid if type is HEURISTIC or AI_OBSERVATION (PR-level observation).
 *    - Invalid if type is DIFF_INSPECTION (which requires a target file).
 * 3. If file is claimed:
 *    - Checks if file is present in changed files list.
 * 4. If line range is claimed:
 *    - Validates line syntax (positive numbers, start <= end).
 *    - If patch is missing (binary/truncated), flags as UNVERIFIABLE with limited scope.
 *    - If patch is present, verifies that referenced lines fall within modified hunks.
 */
export function validateEvidence(
  evidence: Evidence,
  filesChanged: ChangedFile[]
): EvidenceValidationResult {
  const evidenceId = evidence.id || 'unknown-evidence';

  // 1. Basic malformedness checks
  if (!evidence.id || typeof evidence.id !== 'string') {
    return {
      evidenceId,
      status: 'INVALID',
      isValid: false,
      reason: 'Evidence is malformed: missing or non-string "id" field.',
      fileVerified: false,
      linesVerified: false,
      verificationScope: 'SYNTAX_ONLY',
    };
  }

  if (
    !evidence.description ||
    typeof evidence.description !== 'string' ||
    evidence.description.trim().length < 5
  ) {
    return {
      evidenceId,
      status: 'INVALID',
      isValid: false,
      reason: 'Evidence description is missing, empty, or too brief (<5 characters).',
      fileVerified: false,
      linesVerified: false,
      verificationScope: 'SYNTAX_ONLY',
    };
  }

  const validTypes = ['HEURISTIC', 'AI_OBSERVATION', 'DIFF_INSPECTION'];
  if (!validTypes.includes(evidence.type)) {
    return {
      evidenceId,
      status: 'INVALID',
      isValid: false,
      reason: `Unsupported evidence type "${evidence.type}". Expected one of: ${validTypes.join(', ')}.`,
      fileVerified: false,
      linesVerified: false,
      verificationScope: 'SYNTAX_ONLY',
    };
  }

  // 2. Case A: No file specified
  if (!evidence.file || evidence.file.trim().length === 0) {
    if (evidence.lineRange) {
      return {
        evidenceId,
        status: 'INVALID',
        isValid: false,
        reason: `Evidence specifies a lineRange ("${evidence.lineRange}") without providing a file path.`,
        fileVerified: false,
        linesVerified: false,
        verificationScope: 'SYNTAX_ONLY',
      };
    }

    if (evidence.type === 'DIFF_INSPECTION') {
      return {
        evidenceId,
        status: 'INVALID',
        isValid: false,
        reason: 'Evidence of type DIFF_INSPECTION must cite a repository file path.',
        fileVerified: false,
        linesVerified: false,
        verificationScope: 'SYNTAX_ONLY',
      };
    }

    // General PR-level observation (e.g. description checklist, issue link, overall diff volume)
    return {
      evidenceId,
      status: 'VALID',
      isValid: true,
      fileVerified: true,
      linesVerified: true,
      verificationScope: 'PR_LEVEL',
      details: {},
    };
  }

  // 3. Case B: File specified — check existence in filesChanged
  const targetFileClean = evidence.file.trim().replace(/^\.\//, '');
  const matchingFile = filesChanged.find(
    (f) => f.filename.trim().replace(/^\.\//, '') === targetFileClean
  );

  if (!matchingFile) {
    return {
      evidenceId,
      status: 'INVALID',
      isValid: false,
      reason: `Referenced file "${evidence.file}" was not found in the changed files list of this pull request.`,
      fileVerified: false,
      linesVerified: false,
      verificationScope: 'FILE_ONLY',
      details: { file: evidence.file },
    };
  }

  // 4. File exists — check lineRange
  if (!evidence.lineRange || evidence.lineRange.trim().length === 0) {
    // File-level claim without specific line reference (e.g. "Includes new test file")
    return {
      evidenceId,
      status: 'VALID',
      isValid: true,
      fileVerified: true,
      linesVerified: true,
      verificationScope: 'FILE_ONLY',
      details: { file: matchingFile.filename },
    };
  }

  // Parse claimed line range
  const parsedRange = parseLineRange(evidence.lineRange);
  if (!parsedRange) {
    return {
      evidenceId,
      status: 'INVALID',
      isValid: false,
      reason: `Malformed line range format "${evidence.lineRange}". Expected format "L<start>" or "L<start>-L<end>" (e.g. "L24-L35").`,
      fileVerified: true,
      linesVerified: false,
      verificationScope: 'SYNTAX_ONLY',
      details: { file: matchingFile.filename, lineRange: evidence.lineRange },
    };
  }

  if (parsedRange.start <= 0 || parsedRange.end <= 0) {
    return {
      evidenceId,
      status: 'INVALID',
      isValid: false,
      reason: `Invalid non-positive line number in "${evidence.lineRange}". Line numbers must be positive integers (>0).`,
      fileVerified: true,
      linesVerified: false,
      verificationScope: 'SYNTAX_ONLY',
      details: { file: matchingFile.filename, lineRange: evidence.lineRange },
    };
  }

  if (parsedRange.start > parsedRange.end) {
    return {
      evidenceId,
      status: 'INVALID',
      isValid: false,
      reason: `Inverted line range: start line ${parsedRange.start} is greater than end line ${parsedRange.end} in "${evidence.lineRange}".`,
      fileVerified: true,
      linesVerified: false,
      verificationScope: 'SYNTAX_ONLY',
      details: { file: matchingFile.filename, lineRange: evidence.lineRange },
    };
  }

  // Parse patch content
  const meta = getFileDiffMetadata(matchingFile);

  // If no patch is available (e.g. binary file or diff omitted), verification is limited
  if (!meta.hasPatch || meta.hunks.length === 0) {
    return {
      evidenceId,
      status: 'UNVERIFIABLE',
      isValid: false,
      reason: `File "${matchingFile.filename}" is present in the PR, but no unified diff patch is available (e.g. binary file or truncated diff); line range "${evidence.lineRange}" cannot be verified.`,
      fileVerified: true,
      linesVerified: false,
      verificationScope: 'PATCH_ABSENT',
      details: {
        file: matchingFile.filename,
        lineRange: evidence.lineRange,
        parsedLines: { start: parsedRange.start, end: parsedRange.end },
      },
    };
  }

  // Check if claimed lines fall within modified hunks
  const availableHunkSummaries = meta.hunks.map(
    (h) => `L${h.newStart}-L${h.newEnd} (${h.header})`
  );

  // Check if range falls within any new hunk span or old hunk span
  const matchingHunk = meta.hunks.find(
    (h) =>
      (parsedRange.start >= h.newStart && parsedRange.end <= h.newEnd) ||
      (parsedRange.start >= h.oldStart && parsedRange.end <= h.oldEnd)
  );

  if (matchingHunk) {
    return {
      evidenceId,
      status: 'VALID',
      isValid: true,
      fileVerified: true,
      linesVerified: true,
      verificationScope: 'FULL',
      details: {
        file: matchingFile.filename,
        lineRange: evidence.lineRange,
        parsedLines: { start: parsedRange.start, end: parsedRange.end },
        matchingHunk: matchingHunk.header,
      },
    };
  }

  // Also check if individual lines are covered in validNewLines or validOldLines
  let allLinesInDiff = true;
  for (let l = parsedRange.start; l <= parsedRange.end; l++) {
    if (!meta.validNewLines.has(l) && !meta.validOldLines.has(l)) {
      allLinesInDiff = false;
      break;
    }
  }

  if (allLinesInDiff) {
    return {
      evidenceId,
      status: 'VALID',
      isValid: true,
      fileVerified: true,
      linesVerified: true,
      verificationScope: 'FULL',
      details: {
        file: matchingFile.filename,
        lineRange: evidence.lineRange,
        parsedLines: { start: parsedRange.start, end: parsedRange.end },
      },
    };
  }

  // Line numbers are outside the diff patch
  return {
    evidenceId,
    status: 'INVALID',
    isValid: false,
    reason: `Line reference "${evidence.lineRange}" is outside the diff patch for "${matchingFile.filename}". Available diff hunk range(s): ${availableHunkSummaries.join('; ')}.`,
    fileVerified: true,
    linesVerified: false,
    verificationScope: 'FULL',
    details: {
      file: matchingFile.filename,
      lineRange: evidence.lineRange,
      parsedLines: { start: parsedRange.start, end: parsedRange.end },
      availableHunks: availableHunkSummaries,
    },
  };
}

// ─── Batch Evidence Validator ───────────────────────────────────────────────

/**
 * Validates a batch of evidence items against the changed files.
 * Returns a comprehensive report with validation statistics.
 */
export function validateAllEvidence(
  evidenceList: Evidence[],
  filesChanged: ChangedFile[]
): BatchEvidenceValidationReport {
  if (!evidenceList || evidenceList.length === 0) {
    return {
      total: 0,
      validCount: 0,
      invalidCount: 0,
      unverifiableCount: 0,
      allValid: true,
      results: [],
      summary: 'No evidence items to validate.',
    };
  }

  const results = evidenceList.map((ev) => validateEvidence(ev, filesChanged));

  const validCount = results.filter((r) => r.status === 'VALID').length;
  const invalidCount = results.filter((r) => r.status === 'INVALID').length;
  const unverifiableCount = results.filter((r) => r.status === 'UNVERIFIABLE').length;
  const allValid = invalidCount === 0 && unverifiableCount === 0;

  const summary = allValid
    ? `All ${validCount} evidence item(s) successfully verified against PR diff.`
    : `${validCount} valid, ${invalidCount} invalid, ${unverifiableCount} unverifiable out of ${evidenceList.length} total evidence item(s).`;

  return {
    total: evidenceList.length,
    validCount,
    invalidCount,
    unverifiableCount,
    allValid,
    results,
    summary,
  };
}

/**
 * Filters out invalid or unsupported evidence items, preserving only verified evidence.
 * Returns valid items and a rejection log explaining why invalid items were excluded.
 */
export function filterValidEvidence(
  evidenceList: Evidence[],
  filesChanged: ChangedFile[]
): {
  valid: Evidence[];
  rejected: Array<{ evidence: Evidence; result: EvidenceValidationResult }>;
} {
  const valid: Evidence[] = [];
  const rejected: Array<{ evidence: Evidence; result: EvidenceValidationResult }> = [];

  for (const ev of evidenceList) {
    const res = validateEvidence(ev, filesChanged);
    if (res.isValid) {
      valid.push(ev);
    } else {
      rejected.push({ evidence: ev, result: res });
    }
  }

  return { valid, rejected };
}
