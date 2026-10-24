import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { AnalysisResultSchema } from '@proof/shared';
import genuinePR from '../../samples/genuine-pr.json';

describe('PRoof Backend API Smoke Tests', () => {
  const app = createApp();

  describe('1. Health Status', () => {
    it('GET /api/health returns healthy readiness status', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('status');
      expect(['healthy', 'degraded']).toContain(res.body.status);
      expect(res.body).toHaveProperty('version');
      expect(res.body.heuristics.ready).toBe(true);
      expect(res.body.heuristics.activeRulesCount).toBeGreaterThan(0);
    });

    it('GET /health returns basic ping status', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        status: 'healthy',
        timestamp: expect.any(String),
        service: 'proof-backend',
      });
    });
  });

  describe('2. Sample Pull Requests Listing', () => {
    it('GET /api/pull-requests returns array of benchmark samples', async () => {
      const res = await request(app).get('/api/pull-requests');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(3);

      const prIds = res.body.map((pr: any) => pr.id);
      expect(prIds).toContain('sample-genuine-01');
      expect(prIds).toContain('sample-needs-work-02');
      expect(prIds).toContain('sample-likely-spam-03');
    });

    it('GET /api/pull-requests/:id returns specific PR with valid schema', async () => {
      const res = await request(app).get('/api/pull-requests/sample-genuine-01');
      expect(res.status).toBe(200);
      expect(res.body.id).toBe('sample-genuine-01');
      expect(res.body.title).toBeDefined();
      expect(Array.isArray(res.body.filesChanged)).toBe(true);
      expect(res.body.stats).toBeDefined();
    });
  });

  describe('3. Pull Request Analysis (POST /api/analyze)', () => {
    it('POST /api/analyze evaluates genuine PR and returns valid AnalysisResult', async () => {
      const res = await request(app)
        .post('/api/analyze')
        .send(genuinePR);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('prId', genuinePR.id);
      expect(['GENUINE', 'NEEDS_WORK', 'LIKELY_SPAM']).toContain(res.body.verdict);
      expect(['HIGH', 'MEDIUM', 'LOW']).toContain(res.body.confidence);
      expect(res.body).toHaveProperty('reasoning');
      expect(res.body.reasoning.length).toBeGreaterThanOrEqual(10);
      expect(res.body).toHaveProperty('summary');
      expect(Array.isArray(res.body.heuristicFindings)).toBe(true);
      expect(Array.isArray(res.body.evidence)).toBe(true);
      expect(res.body).toHaveProperty('suggestedComment');
      expect(res.body).toHaveProperty('reviewComment');
      expect(res.body.reviewComment.markdown).toBeDefined();
      expect(res.body.metadata).toBeDefined();

      // Validate against shared Zod AnalysisResult contract
      expect(() => AnalysisResultSchema.parse(res.body)).not.toThrow();
    });

    it('POST /api/triage/analyze (alias) returns identical contract', async () => {
      const res = await request(app)
        .post('/api/triage/analyze')
        .send(genuinePR);

      expect(res.status).toBe(200);
      expect(res.body.prId).toBe(genuinePR.id);
      expect(() => AnalysisResultSchema.parse(res.body)).not.toThrow();
    });

    it('POST /api/analyze rejects empty body with 400', async () => {
      const res = await request(app)
        .post('/api/analyze')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    it('POST /api/analyze rejects payload with missing filesChanged with 400', async () => {
      const res = await request(app)
        .post('/api/analyze')
        .send({
          id: 'test-incomplete',
          title: 'Missing filesChanged array',
          author: 'test-user',
          description: 'No files',
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error', 'Invalid pull request payload');
      expect(res.body).toHaveProperty('details');
    });

    it('POST /api/analyze safely handles malformed JSON without crashing', async () => {
      const res = await request(app)
        .post('/api/analyze')
        .set('Content-Type', 'application/json')
        .send('{"invalidJson: true');

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error', 'Malformed JSON payload in request body');
    });
  });
});
