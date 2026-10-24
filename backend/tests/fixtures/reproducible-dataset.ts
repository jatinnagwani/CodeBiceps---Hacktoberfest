import { PullRequestPayload } from '@proof/shared';

/**
 * Small, reproducible PRoof benchmark dataset.
 *
 * Each fixture is a self-contained, schema-valid PullRequestPayload representing
 * a canonical open-source contribution scenario.
 */

/**
 * 1. A genuine PR with a meaningful, high-quality code change.
 *
 * Characteristics:
 * - Clear, descriptive title following conventional commits
 * - Detailed problem/solution description with closed checklist and linked issue
 * - Substantive functional implementation in source code
 * - Dedicated unit test file with high test coverage and assertions
 * - Clean diff hunks with correct line numbers and context
 */
export const reproducibleGenuinePR: PullRequestPayload = {
  id: 'bench-genuine-01',
  category: 'GENUINE',
  title: 'feat(api): add idempotency key middleware for mutating requests',
  author: 'elena-dev',
  authorAssociation: 'CONTRIBUTOR',
  createdAt: '2026-10-25T01:00:00Z',
  branch: 'feat/idempotency-key',
  targetBranch: 'main',
  linkedIssue: '#204',
  description: `### Summary
Adds an idempotency key middleware for POST and PUT endpoints to prevent duplicate processing on retried network requests.

### Changes
- Implemented \`IdempotencyStore\` with in-memory TTL cache (5-minute expiration).
- Registered middleware to return cached responses on matching \`Idempotency-Key\` headers.
- Added comprehensive unit tests covering cached hit, concurrent execution, and cache eviction.

### Checklist
- [x] Closes #204
- [x] Comprehensive unit tests added and passing
- [x] Conforms to project coding standards`,
  filesChanged: [
    {
      filename: 'src/middleware/idempotency.ts',
      status: 'added',
      additions: 32,
      deletions: 0,
      patch: `@@ -0,0 +1,32 @@
+import { Request, Response, NextFunction } from 'express';
+
+interface CacheEntry {
+  statusCode: number;
+  body: unknown;
+  expiresAt: number;
+}
+
+export class IdempotencyStore {
+  private store = new Map<string, CacheEntry>();
+  private ttlMs = 300000; // 5 minutes
+
+  get(key: string): CacheEntry | null {
+    const entry = this.store.get(key);
+    if (!entry) return null;
+    if (Date.now() > entry.expiresAt) {
+      this.store.delete(key);
+      return null;
+    }
+    return entry;
+  }
+
+  set(key: string, statusCode: number, body: unknown): void {
+    this.store.set(key, {
+      statusCode,
+      body,
+      expiresAt: Date.now() + this.ttlMs,
+    });
+  }
+}`,
    },
    {
      filename: 'tests/middleware/idempotency.test.ts',
      status: 'added',
      additions: 26,
      deletions: 0,
      patch: `@@ -0,0 +1,26 @@
+import { describe, it, expect, beforeEach } from 'vitest';
+import { IdempotencyStore } from '../../src/middleware/idempotency';
+
+describe('IdempotencyStore', () => {
+  let store: IdempotencyStore;
+
+  beforeEach(() => {
+    store = new IdempotencyStore();
+  });
+
+  it('stores and retrieves cached HTTP responses within TTL', () => {
+    store.set('req-123', 201, { id: 'obj-1' });
+    const entry = store.get('req-123');
+    expect(entry).not.toBeNull();
+    expect(entry?.statusCode).toBe(201);
+    expect(entry?.body).toEqual({ id: 'obj-1' });
+  });
+
+  it('returns null for nonexistent keys', () => {
+    expect(store.get('unknown-key')).toBeNull();
+  });
+});`,
    },
  ],
  stats: {
    totalAdditions: 58,
    totalDeletions: 0,
    totalFiles: 2,
  },
};

/**
 * 2. A PR that needs work.
 *
 * Characteristics:
 * - Genuine feature code added to a core module
 * - Lacks unit tests completely (0 test files in filesChanged)
 * - Incomplete checklist in PR description (open checkboxes - [ ])
 * - Missing linked issue reference
 * - Deserves constructive mentoring rather than rejection
 */
export const reproducibleNeedsWorkPR: PullRequestPayload = {
  id: 'bench-needs-work-02',
  category: 'NEEDS_WORK',
  title: 'feat(metrics): track request latency percentiles in memory',
  author: 'marcus-novice',
  authorAssociation: 'FIRST_TIME_CONTRIBUTOR',
  createdAt: '2026-10-25T02:00:00Z',
  branch: 'feat/latency-metrics',
  targetBranch: 'main',
  linkedIssue: null,
  description: `Added a helper to collect HTTP request response times and calculate p95 latency.

### Checklist
- [ ] Closes issue #
- [ ] Unit tests added
- [x] Code compiles without errors`,
  filesChanged: [
    {
      filename: 'src/metrics/latency-collector.ts',
      status: 'added',
      additions: 24,
      deletions: 0,
      patch: `@@ -0,0 +1,24 @@
+export class LatencyCollector {
+  private samples: number[] = [];
+
+  record(durationMs: number): void {
+    this.samples.push(durationMs);
+    if (this.samples.length > 1000) {
+      this.samples.shift();
+    }
+  }
+
+  getP95(): number {
+    if (this.samples.length === 0) return 0;
+    const sorted = [...this.samples].sort((a, b) => a - b);
+    const idx = Math.floor(sorted.length * 0.95);
+    return sorted[idx];
+  }
+}`,
    },
  ],
  stats: {
    totalAdditions: 24,
    totalDeletions: 0,
    totalFiles: 1,
  },
};

/**
 * 3. An irrelevant or likely-spam PR.
 *
 * Characteristics:
 * - Minimal or promotional/irrelevant modifications
 * - Trivial or generic commit title ("update", "docs")
 * - Extremely sparse, repetitive or filler description ("fixed typo", "clean code")
 * - No tests, no linked issue
 * - Modifies documentation superficially with single-character additions
 */
export const reproducibleLikelySpamPR: PullRequestPayload = {
  id: 'bench-likely-spam-03',
  category: 'LIKELY_SPAM',
  title: 'fixed typo',
  author: 'badge-hunter-2026',
  authorAssociation: 'NONE',
  createdAt: '2026-10-25T02:30:00Z',
  branch: 'patch-readme',
  targetBranch: 'main',
  linkedIssue: null,
  description: 'fixed typo',
  filesChanged: [
    {
      filename: 'README.md',
      status: 'modified',
      additions: 2,
      deletions: 1,
      patch: `@@ -4,3 +4,4 @@
 # PRoof Triage Engine
-A tool for reviewing GitHub PRs locally.
+A tool for reviewing GitHub PRs locally. 
+Check out my profile!`,
    },
  ],
  stats: {
    totalAdditions: 2,
    totalDeletions: 1,
    totalFiles: 1,
  },
};

/**
 * 4. A whitespace-only diff.
 *
 * Characteristics:
 * - Modifies source files by adding trailing spaces and empty blank lines
 * - Net non-whitespace alteration across all files is 0
 * - PR title claims stylistic cleanup or formatting
 * - Must be caught deterministically by whitespace-check heuristic
 */
export const reproducibleWhitespacePR: PullRequestPayload = {
  id: 'bench-whitespace-04',
  category: 'LIKELY_SPAM',
  title: 'style: clean up indentation and trailing whitespace',
  author: 'whitespace-bot',
  authorAssociation: 'NONE',
  createdAt: '2026-10-25T03:00:00Z',
  branch: 'cleanup-spaces',
  targetBranch: 'main',
  linkedIssue: null,
  description: 'Cleaned up indentation and trailing spaces across configuration files.',
  filesChanged: [
    {
      filename: 'src/config/server.ts',
      status: 'modified',
      additions: 3,
      deletions: 3,
      patch: `@@ -12,3 +12,3 @@ export const serverConfig = {
-  port: 3001,
-  host: '0.0.0.0',
-  env: 'production',
+  port: 3001,   
+  host: '0.0.0.0',   
+  env: 'production',   
 };`,
    },
    {
      filename: 'docs/architecture.md',
      status: 'modified',
      additions: 2,
      deletions: 0,
      patch: `@@ -20,2 +20,4 @@
 ## Security Model
 All analysis runs locally.
+
+  `,
    },
  ],
  stats: {
    totalAdditions: 5,
    totalDeletions: 3,
    totalFiles: 2,
  },
};

/** Complete collection of benchmark fixtures */
export const reproducibleBenchmarkDataset = [
  reproducibleGenuinePR,
  reproducibleNeedsWorkPR,
  reproducibleLikelySpamPR,
  reproducibleWhitespacePR,
];
