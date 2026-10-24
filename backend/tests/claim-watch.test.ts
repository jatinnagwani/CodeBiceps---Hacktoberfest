import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import {
  parseGitHubIssueUrl,
  fetchGitHubIssue,
  SAMPLE_CLAIM_WATCH_FIXTURES,
} from '../src/claim-watch/github-service';
import { evaluateClaimWatch, generatePoliteReminder } from '../src/claim-watch/analyzer';
import { ClaimWatchResultSchema } from '@proof/shared';
import genuinePR from '../../samples/genuine-pr.json';

describe('PRoof Claim Watch — Inactivity & "Cookie Licking" Triage Suite', () => {
  const app = createApp();
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  // ─── 1. Recent Observable Activity ──────────────────────────────────────────
  describe('1. Recent Observable Activity', () => {
    it('classifies recently active issue as ACTIVITY_DETECTED', async () => {
      const activeData = { ...SAMPLE_CLAIM_WATCH_FIXTURES['demo-active'] };
      const result = await evaluateClaimWatch(activeData, 7);

      expect(result.status).toBe('ACTIVITY_DETECTED');
      expect(result.statusHeadline).toContain('Recent activity observed');
      expect(result.daysSinceLastActivity).toBeLessThanOrEqual(7);
      expect(result.evidence.some(e => e.label === 'Assigned Contributor')).toBe(true);

      const validated = ClaimWatchResultSchema.safeParse(result);
      expect(validated.success).toBe(true);
    });
  });

  // ─── 2. Activity Older than Threshold ───────────────────────────────────────
  describe('2. Inactivity Exceeding Threshold', () => {
    it('classifies stalled issue as NEEDS_CHECK_IN with non-accusatory headline', async () => {
      const stalledData = { ...SAMPLE_CLAIM_WATCH_FIXTURES['demo-stalled'] };
      const result = await evaluateClaimWatch(stalledData, 7);

      expect(result.status).toBe('NEEDS_CHECK_IN');
      expect(result.statusHeadline).toContain('No observable activity');
      expect(result.statusHeadline).toContain('exceeds 7-day threshold');
      expect(result.daysSinceLastActivity).toBeGreaterThanOrEqual(14);

      // Reminder must offer constructive, polite check-in without labelling
      expect(result.generatedReminder).toContain('@dormant-dev');
      expect(result.generatedReminder).toContain('Just checking in to see how things are going');
      expect(result.generatedReminder).not.toMatch(/cookie|lick|spam|abandon/i);

      expect(ClaimWatchResultSchema.safeParse(result).success).toBe(true);
    });
  });

  // ─── 3. Unknown Claim Date / Incomplete History ──────────────────────────────
  describe('3. Unknown Claim Date or Assignment History', () => {
    it('labels unknown assignment history as a LIMITATION without guessing', async () => {
      const unrecordedClaim = {
        ...SAMPLE_CLAIM_WATCH_FIXTURES['demo-stalled'],
        claimDate: null,
        claimSource: 'UNKNOWN' as const,
      };

      const result = await evaluateClaimWatch(unrecordedClaim, 7);
      const limitation = result.evidence.find(e => e.type === 'LIMITATION');

      expect(limitation).toBeDefined();
      expect(limitation?.label).toContain('Assignment History Incomplete');
    });
  });

  // ─── 4. Linked PR with Recent Activity ──────────────────────────────────────
  describe('4. Linked PR with Recent Observable Activity', () => {
    it('preserves ACTIVITY_DETECTED when linked PR has recent commits despite quiet issue', async () => {
      const linkedPRActiveData = { ...SAMPLE_CLAIM_WATCH_FIXTURES['demo-linked-pr-active'] };
      const result = await evaluateClaimWatch(linkedPRActiveData, 7);

      // Issue itself was quiet for 12 days, but linked PR was updated 2 days ago
      expect(result.status).toBe('ACTIVITY_DETECTED');
      expect(result.daysSinceLastActivity).toBe(2);
      expect(result.evidence.some(e => e.label === 'Linked PR #890')).toBe(true);
    });
  });

  // ─── 5. Missing or Incomplete GitHub Data ────────────────────────────────────
  describe('5. Missing Data / Unassigned Issue', () => {
    it('classifies unassigned issue as INSUFFICIENT_INFORMATION', async () => {
      const unassignedData = { ...SAMPLE_CLAIM_WATCH_FIXTURES['demo-insufficient'] };
      const result = await evaluateClaimWatch(unassignedData, 7);

      expect(result.status).toBe('INSUFFICIENT_INFORMATION');
      expect(result.assignee).toBeNull();
      expect(result.statusHeadline).toContain('Issue is not assigned');
      expect(result.evidence.some(e => e.label === 'Unassigned Issue')).toBe(true);
    });
  });

  // ─── 6. Invalid or Unsupported Issue URL ───────────────────────────────────
  describe('6. URL Validation & Security', () => {
    it('parses valid GitHub issue URLs correctly', () => {
      const parsed = parseGitHubIssueUrl('https://github.com/facebook/react/issues/1234');
      expect(parsed).not.toBeNull();
      expect(parsed?.owner).toBe('facebook');
      expect(parsed?.repo).toBe('react');
      expect(parsed?.issueNumber).toBe(1234);
    });

    it('rejects unsupported hosts (e.g. GitLab, external domains)', () => {
      expect(parseGitHubIssueUrl('https://gitlab.com/owner/repo/issues/123')).toBeNull();
      expect(parseGitHubIssueUrl('https://malicious-site.com/github.com/issues/1')).toBeNull();
    });

    it('rejects pull request URLs in place of issue URLs', () => {
      expect(parseGitHubIssueUrl('https://github.com/facebook/react/pull/123')).toBeNull();
    });

    it('POST /api/claim-watch/evaluate rejects malformed URL with 400', async () => {
      const res = await request(app)
        .post('/api/claim-watch/evaluate')
        .send({ issueUrl: 'not-a-valid-url' });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });
  });

  // ─── 7. Private / Inaccessible Issues and API Errors ─────────────────────────
  describe('7. API Errors & Graceful Resilience', () => {
    it('handles HTTP 404 (private or missing issue) gracefully', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        headers: new Headers(),
      } as unknown as Response);

      const res = await request(app)
        .post('/api/claim-watch/evaluate')
        .send({
          issueUrl: 'https://github.com/private-org/secret-repo/issues/999',
          demoMode: false,
        });

      expect(res.status).toBe(404);
      expect(res.body.error).toContain('not found or repository is private');
    });

    it('handles HTTP 403 rate limits with actionable suggestions', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        headers: new Headers({ 'x-ratelimit-remaining': '0' }),
      } as unknown as Response);

      const res = await request(app)
        .post('/api/claim-watch/evaluate')
        .send({
          issueUrl: 'https://github.com/owner/repo/issues/50',
          demoMode: false,
        });

      expect(res.status).toBe(429);
      expect(res.body.error).toContain('rate limit exceeded');
    });
  });

  // ─── 8. Sample Mode Visibly Distinguished ──────────────────────────────────
  describe('8. Sample / Demo Mode Distinction', () => {
    it('POST /api/claim-watch/evaluate marks demo mode fixtures as isDemoData: true', async () => {
      const res = await request(app)
        .post('/api/claim-watch/evaluate')
        .send({
          issueUrl: 'https://github.com/nodejs/node/issues/88',
          demoMode: true,
        });

      expect(res.status).toBe(200);
      expect(res.body.isDemoData).toBe(true);
      expect(res.body.status).toBe('NEEDS_CHECK_IN');
    });

    it('GET /api/claim-watch/samples returns sample fixtures for instant evaluation', async () => {
      const res = await request(app).get('/api/claim-watch/samples');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body[0]).toHaveProperty('url');
      expect(res.body[0]).toHaveProperty('title');
    });
  });

  // ─── 9. Read-Only Safety Guarantees ────────────────────────────────────────
  describe('9. Read-Only Non-Destructive Safeguards', () => {
    it('reminder is purely an editable string and triggers zero GitHub write operations', async () => {
      const fetchSpy = vi.fn().mockImplementation(async () => {
        throw new Error('External network request blocked');
      });
      global.fetch = fetchSpy;

      const res = await request(app)
        .post('/api/claim-watch/evaluate')
        .send({
          issueUrl: 'https://github.com/facebook/react/issues/42',
          demoMode: true,
        });

      expect(res.status).toBe(200);
      expect(res.body.generatedReminder).toBeTruthy();

      // Zero calls made to external mutating endpoints
      for (const call of fetchSpy.mock.calls) {
        const url = String(call[0]);
        expect(url).not.toContain('comments');
        expect(url).not.toContain('assignees');
      }
    });
  });

  // ─── 10. Existing PR Triage Regression Protection ───────────────────────────
  describe('10. Existing PR Triage Compatibility & Non-Regression', () => {
    it('original PR triage endpoint POST /api/analyze functions 100% identically', async () => {
      const res = await request(app)
        .post('/api/analyze')
        .send(genuinePR);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('verdict', 'GENUINE');
      expect(res.body).toHaveProperty('confidence');
      expect(res.body).toHaveProperty('reviewComment');
    });

    it('original sample PR listing endpoint GET /api/pull-requests remains intact', async () => {
      const res = await request(app).get('/api/pull-requests');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(4);
    });
  });
});
