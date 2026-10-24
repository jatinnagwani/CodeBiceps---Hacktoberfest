import { describe, it, expect } from 'vitest';
import {
  validateEvidence,
  validateAllEvidence,
  filterValidEvidence,
  parsePatchHunks,
  parseLineRange,
} from '../src/validation/evidence-validator';
import { Evidence, ChangedFile } from '@proof/shared';
import genuinePR from '../../samples/genuine-pr.json';
import likelySpamPR from '../../samples/likely-spam-pr.json';

describe('Evidence Validator — Line & Hunk Parsing', () => {
  it('parses standard unified diff hunk headers with counts', () => {
    const patch = '@@ -24,8 +24,14 @@ export class SessionManager {\n+  private refreshPromise: Promise<string> | null = null;';
    const hunks = parsePatchHunks(patch);
    expect(hunks).toHaveLength(1);
    expect(hunks[0].newStart).toBe(24);
    expect(hunks[0].newCount).toBe(14);
    expect(hunks[0].newEnd).toBe(37); // 24 + 14 - 1
  });

  it('parses unified diff hunk headers when count is omitted (defaults to 1)', () => {
    const patch = '@@ -1 +1 @@\n-const a = 1;\n+const a = 2;';
    const hunks = parsePatchHunks(patch);
    expect(hunks).toHaveLength(1);
    expect(hunks[0].newStart).toBe(1);
    expect(hunks[0].newCount).toBe(1);
    expect(hunks[0].newEnd).toBe(1);
  });

  it('handles null, undefined, or empty patch gracefully without throwing', () => {
    expect(parsePatchHunks(undefined)).toEqual([]);
    expect(parsePatchHunks(null)).toEqual([]);
    expect(parsePatchHunks('')).toEqual([]);
    expect(parsePatchHunks('   ')).toEqual([]);
  });

  it('parses line ranges in various valid formats', () => {
    const r1 = parseLineRange('L24-L35');
    expect(r1).toEqual({ start: 24, end: 35, isRange: true, raw: 'L24-L35' });

    const r2 = parseLineRange('L42');
    expect(r2).toEqual({ start: 42, end: 42, isRange: false, raw: 'L42' });

    const r3 = parseLineRange('10-20');
    expect(r3).toEqual({ start: 10, end: 20, isRange: true, raw: '10-20' });
  });

  it('rejects malformed line range strings', () => {
    expect(parseLineRange('L24toL35')).toBeNull();
    expect(parseLineRange('invalid')).toBeNull();
    expect(parseLineRange('')).toBeNull();
    expect(parseLineRange(null)).toBeNull();
  });
});

describe('Evidence Validator — Valid Evidence', () => {
  const sampleFiles: ChangedFile[] = genuinePR.filesChanged as ChangedFile[];

  it('accepts evidence citing an existing file and valid line range within hunk', () => {
    // In genuinePR, session-manager.ts has hunk @@ -24,8 +24,14 @@ (lines 24-37)
    const evidence: Evidence = {
      id: 'ev-valid-01',
      type: 'DIFF_INSPECTION',
      severity: 'POSITIVE',
      description: 'Deduplicated concurrent token refresh requests with an in-flight promise mutex.',
      file: 'src/auth/session-manager.ts',
      lineRange: 'L24-L35',
    };

    const result = validateEvidence(evidence, sampleFiles);
    expect(result.isValid).toBe(true);
    expect(result.status).toBe('VALID');
    expect(result.fileVerified).toBe(true);
    expect(result.linesVerified).toBe(true);
    expect(result.verificationScope).toBe('FULL');
    expect(result.details?.matchingHunk).toContain('@@ -24,8 +24,14 @@');
  });

  it('accepts evidence citing a single line within hunk', () => {
    const evidence: Evidence = {
      id: 'ev-valid-single-line',
      type: 'DIFF_INSPECTION',
      severity: 'POSITIVE',
      description: 'Defined private refreshPromise mutex property.',
      file: 'src/auth/session-manager.ts',
      lineRange: 'L26',
    };

    const result = validateEvidence(evidence, sampleFiles);
    expect(result.isValid).toBe(true);
    expect(result.status).toBe('VALID');
    expect(result.fileVerified).toBe(true);
    expect(result.linesVerified).toBe(true);
  });

  it('accepts file-level evidence without line range', () => {
    const evidence: Evidence = {
      id: 'ev-valid-file-level',
      type: 'HEURISTIC',
      severity: 'POSITIVE',
      description: 'Includes dedicated unit test coverage for session manager.',
      file: 'tests/auth/session-manager.test.ts',
    };

    const result = validateEvidence(evidence, sampleFiles);
    expect(result.isValid).toBe(true);
    expect(result.status).toBe('VALID');
    expect(result.fileVerified).toBe(true);
    expect(result.linesVerified).toBe(true);
    expect(result.verificationScope).toBe('FILE_ONLY');
  });

  it('accepts general PR-level evidence without file or line range', () => {
    const evidence: Evidence = {
      id: 'ev-valid-pr-level',
      type: 'HEURISTIC',
      severity: 'POSITIVE',
      description: 'Comprehensive PR description provided with verified checklist items.',
    };

    const result = validateEvidence(evidence, sampleFiles);
    expect(result.isValid).toBe(true);
    expect(result.status).toBe('VALID');
    expect(result.verificationScope).toBe('PR_LEVEL');
  });
});

describe('Evidence Validator — Nonexistent Files', () => {
  const sampleFiles: ChangedFile[] = genuinePR.filesChanged as ChangedFile[];

  it('rejects evidence citing a file path not in the PR diff', () => {
    const evidence: Evidence = {
      id: 'ev-fake-file',
      type: 'DIFF_INSPECTION',
      severity: 'CONCERN',
      description: 'Claimed memory leak in database connector module.',
      file: 'src/database/connector.ts', // Not in genuinePR!
      lineRange: 'L10-L20',
    };

    const result = validateEvidence(evidence, sampleFiles);
    expect(result.isValid).toBe(false);
    expect(result.status).toBe('INVALID');
    expect(result.fileVerified).toBe(false);
    expect(result.linesVerified).toBe(false);
    expect(result.reason).toContain('was not found in the changed files list');
  });
});

describe('Evidence Validator — Invalid Line References', () => {
  const sampleFiles: ChangedFile[] = genuinePR.filesChanged as ChangedFile[];

  it('rejects evidence citing lines completely outside the patch hunks', () => {
    // In genuinePR, session-manager.ts has hunk 24-37. Line 999 does not exist in patch!
    const evidence: Evidence = {
      id: 'ev-out-of-bounds',
      type: 'DIFF_INSPECTION',
      severity: 'CONCERN',
      description: 'Claimed syntax error on non-existent line.',
      file: 'src/auth/session-manager.ts',
      lineRange: 'L999',
    };

    const result = validateEvidence(evidence, sampleFiles);
    expect(result.isValid).toBe(false);
    expect(result.status).toBe('INVALID');
    expect(result.fileVerified).toBe(true);
    expect(result.linesVerified).toBe(false);
    expect(result.reason).toContain('is outside the diff patch');
    expect(result.details?.availableHunks).toBeDefined();
  });

  it('rejects inverted line ranges (start > end)', () => {
    const evidence: Evidence = {
      id: 'ev-inverted-lines',
      type: 'DIFF_INSPECTION',
      severity: 'NEUTRAL',
      description: 'Observation with inverted line numbers.',
      file: 'src/auth/session-manager.ts',
      lineRange: 'L35-L24', // start > end
    };

    const result = validateEvidence(evidence, sampleFiles);
    expect(result.isValid).toBe(false);
    expect(result.status).toBe('INVALID');
    expect(result.reason).toContain('Inverted line range');
  });

  it('rejects non-positive line numbers (L0)', () => {
    const evidence: Evidence = {
      id: 'ev-zero-line',
      type: 'DIFF_INSPECTION',
      severity: 'NEUTRAL',
      description: 'Observation citing line 0.',
      file: 'src/auth/session-manager.ts',
      lineRange: 'L0',
    };

    const result = validateEvidence(evidence, sampleFiles);
    expect(result.isValid).toBe(false);
    expect(result.status).toBe('INVALID');
    expect(result.reason).toContain('positive integers');
  });
});

describe('Evidence Validator — Malformed Evidence & Unsupported Claims', () => {
  const sampleFiles: ChangedFile[] = genuinePR.filesChanged as ChangedFile[];

  it('rejects evidence with missing or empty description', () => {
    const evidence = {
      id: 'ev-empty-desc',
      type: 'DIFF_INSPECTION',
      severity: 'POSITIVE',
      description: '   ',
      file: 'src/auth/session-manager.ts',
    } as Evidence;

    const result = validateEvidence(evidence, sampleFiles);
    expect(result.isValid).toBe(false);
    expect(result.status).toBe('INVALID');
    expect(result.reason).toContain('description is missing, empty, or too brief');
  });

  it('rejects evidence with missing or empty id', () => {
    const evidence = {
      id: '',
      type: 'HEURISTIC',
      severity: 'POSITIVE',
      description: 'Valid description with missing id.',
    } as Evidence;

    const result = validateEvidence(evidence, sampleFiles);
    expect(result.isValid).toBe(false);
    expect(result.status).toBe('INVALID');
    expect(result.reason).toContain('missing or non-string "id"');
  });

  it('rejects evidence with unsupported type', () => {
    const evidence = {
      id: 'ev-bad-type',
      type: 'UNSUPPORTED_TYPE_XYZ' as any,
      severity: 'POSITIVE',
      description: 'Valid description with bad type.',
    } as Evidence;

    const result = validateEvidence(evidence, sampleFiles);
    expect(result.isValid).toBe(false);
    expect(result.status).toBe('INVALID');
    expect(result.reason).toContain('Unsupported evidence type');
  });

  it('rejects DIFF_INSPECTION evidence that fails to specify a target file', () => {
    const evidence: Evidence = {
      id: 'ev-diff-without-file',
      type: 'DIFF_INSPECTION',
      severity: 'POSITIVE',
      description: 'Claimed diff inspection but provided no file path.',
    };

    const result = validateEvidence(evidence, sampleFiles);
    expect(result.isValid).toBe(false);
    expect(result.status).toBe('INVALID');
    expect(result.reason).toContain('DIFF_INSPECTION must cite a repository file path');
  });

  it('rejects evidence with lineRange but missing file', () => {
    const evidence: Evidence = {
      id: 'ev-range-without-file',
      type: 'HEURISTIC',
      severity: 'POSITIVE',
      description: 'Claimed line range without a file.',
      lineRange: 'L10-L20',
    };

    const result = validateEvidence(evidence, sampleFiles);
    expect(result.isValid).toBe(false);
    expect(result.status).toBe('INVALID');
    expect(result.reason).toContain('without providing a file path');
  });
});

describe('Evidence Validator — Diffs with Missing Patches / Binary Files', () => {
  it('safely handles files with missing patch content and flags line claims as UNVERIFIABLE', () => {
    const binaryFile: ChangedFile = {
      filename: 'assets/architecture.png',
      status: 'added',
      additions: 0,
      deletions: 0,
      patch: undefined, // No patch content (e.g. binary or truncated)
    };

    const evidenceWithLine: Evidence = {
      id: 'ev-binary-with-line',
      type: 'DIFF_INSPECTION',
      severity: 'POSITIVE',
      description: 'Claimed diagram change on line 10.',
      file: 'assets/architecture.png',
      lineRange: 'L10',
    };

    const result = validateEvidence(evidenceWithLine, [binaryFile]);
    expect(result.isValid).toBe(false);
    expect(result.status).toBe('UNVERIFIABLE');
    expect(result.verificationScope).toBe('PATCH_ABSENT');
    expect(result.fileVerified).toBe(true);
    expect(result.linesVerified).toBe(false);
    expect(result.reason).toContain('no unified diff patch is available');
  });

  it('permits file-level claims on files with missing patch content', () => {
    const binaryFile: ChangedFile = {
      filename: 'assets/logo.png',
      status: 'modified',
      additions: 0,
      deletions: 0,
      patch: undefined,
    };

    const fileLevelEvidence: Evidence = {
      id: 'ev-binary-file-level',
      type: 'HEURISTIC',
      severity: 'POSITIVE',
      description: 'Updated brand asset logo image in assets directory.',
      file: 'assets/logo.png',
    };

    const result = validateEvidence(fileLevelEvidence, [binaryFile]);
    expect(result.isValid).toBe(true);
    expect(result.status).toBe('VALID');
    expect(result.verificationScope).toBe('FILE_ONLY');
    expect(result.fileVerified).toBe(true);
  });
});

describe('Evidence Validator — Batch Validation & Filtering', () => {
  const sampleFiles: ChangedFile[] = genuinePR.filesChanged as ChangedFile[];

  it('computes accurate batch summary counts', () => {
    const evidenceBatch: Evidence[] = [
      {
        id: 'ev-1',
        type: 'DIFF_INSPECTION',
        severity: 'POSITIVE',
        description: 'Valid token refresh mutex.',
        file: 'src/auth/session-manager.ts',
        lineRange: 'L24-L35',
      },
      {
        id: 'ev-2',
        type: 'DIFF_INSPECTION',
        severity: 'CONCERN',
        description: 'Hallucinated claim on non-existent file.',
        file: 'src/ghost/phantom.ts',
        lineRange: 'L10-L20',
      },
      {
        id: 'ev-3',
        type: 'HEURISTIC',
        severity: 'POSITIVE',
        description: 'PR-level description check.',
      },
    ];

    const report = validateAllEvidence(evidenceBatch, sampleFiles);
    expect(report.total).toBe(3);
    expect(report.validCount).toBe(2);
    expect(report.invalidCount).toBe(1);
    expect(report.allValid).toBe(false);
    expect(report.summary).toContain('2 valid, 1 invalid');
  });

  it('filterValidEvidence excludes invalid items and preserves valid evidence', () => {
    const evidenceBatch: Evidence[] = [
      {
        id: 'ev-good-1',
        type: 'HEURISTIC',
        severity: 'POSITIVE',
        description: 'Valid general observation.',
      },
      {
        id: 'ev-bad-1',
        type: 'DIFF_INSPECTION',
        severity: 'CONCERN',
        description: 'Invalid line number on session manager.',
        file: 'src/auth/session-manager.ts',
        lineRange: 'L888',
      },
      {
        id: 'ev-good-2',
        type: 'DIFF_INSPECTION',
        severity: 'POSITIVE',
        description: 'Valid tests added.',
        file: 'tests/auth/session-manager.test.ts',
        lineRange: 'L88-L120',
      },
    ];

    const { valid, rejected } = filterValidEvidence(evidenceBatch, sampleFiles);
    expect(valid).toHaveLength(2);
    expect(valid.map((v) => v.id)).toEqual(['ev-good-1', 'ev-good-2']);

    expect(rejected).toHaveLength(1);
    expect(rejected[0].evidence.id).toBe('ev-bad-1');
    expect(rejected[0].result.reason).toContain('is outside the diff patch');
  });

  it('validates all evidence generated from likelySpamPR sample', () => {
    const spamFiles = likelySpamPR.filesChanged as ChangedFile[];

    // In likelySpamPR: README.md has hunk @@ -12,3 +12,5 @@ (lines 12-16)
    const validSpamEvidence: Evidence = {
      id: 'ev-spam-whitespace',
      type: 'DIFF_INSPECTION',
      severity: 'CONCERN',
      description: 'Trailing whitespace added on README.md.',
      file: 'README.md',
      lineRange: 'L12-L16',
    };

    const result = validateEvidence(validSpamEvidence, spamFiles);
    expect(result.isValid).toBe(true);
    expect(result.status).toBe('VALID');
  });
});
