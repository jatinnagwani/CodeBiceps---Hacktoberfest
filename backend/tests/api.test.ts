import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import genuinePR from '../../samples/genuine-pr.json';

describe('PRoof Express REST API', () => {
  const app = createApp();

  it('GET /api/health returns health status and engine readiness', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status');
    expect(res.body).toHaveProperty('ollama');
    expect(res.body).toHaveProperty('heuristics');
    expect(res.body.heuristics.ready).toBe(true);
  });

  it('GET /api/samples returns array of 3 sample pull requests', async () => {
    const res = await request(app).get('/api/samples');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(3);
    const ids = res.body.map((s: any) => s.id);
    expect(ids).toContain('sample-genuine-01');
    expect(ids).toContain('sample-needs-work-02');
    expect(ids).toContain('sample-likely-spam-03');
  });

  it('GET /api/pull-requests (alias) returns array of sample pull requests', async () => {
    const res = await request(app).get('/api/pull-requests');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(3);
  });

  it('GET /api/samples/:id returns specific sample with full patch data', async () => {
    const res = await request(app).get('/api/samples/sample-genuine-01');
    expect(res.status).toBe(200);
    expect(res.body.id).toBe('sample-genuine-01');
    expect(res.body.title).toContain('fix(auth)');
  });

  it('GET /api/pull-requests/:id (alias) returns specific sample', async () => {
    const res = await request(app).get('/api/pull-requests/sample-genuine-01');
    expect(res.status).toBe(200);
    expect(res.body.id).toBe('sample-genuine-01');
  });

  it('POST /api/triage/analyze returns valid triage result', async () => {
    const res = await request(app)
      .post('/api/triage/analyze')
      .send(genuinePR);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('verdict');
    expect(res.body).toHaveProperty('confidence');
    expect(res.body).toHaveProperty('heuristicFindings');
    expect(res.body).toHaveProperty('suggestedComment');
    expect(res.body.verdict).toBe('GENUINE');
  });

  it('POST /api/analyze (alias) returns valid triage result', async () => {
    const res = await request(app)
      .post('/api/analyze')
      .send(genuinePR);
    expect(res.status).toBe(200);
    expect(res.body.verdict).toBe('GENUINE');
  });

  it('POST /api/triage/analyze rejects invalid payload with 400', async () => {
    const res = await request(app)
      .post('/api/triage/analyze')
      .send({ invalid: 'data' });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('POST /api/reviews/approve records maintainer edited comment', async () => {
    const res = await request(app)
      .post('/api/reviews/approve')
      .send({
        prId: 'sample-genuine-01',
        finalComment: 'Looks great! Thank you for the tests.',
        approvedVerdict: 'GENUINE',
        actionTaken: 'COMMENT_ONLY',
      });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body).toHaveProperty('approvalId');
    expect(res.body.finalComment).toBe('Looks great! Thank you for the tests.');
  });

  it('POST /api/evidence/validate returns batch validation report for evidence', async () => {
    const res = await request(app)
      .post('/api/evidence/validate')
      .send({
        evidence: [
          {
            id: 'ev-test-1',
            type: 'DIFF_INSPECTION',
            file: 'src/auth/session-manager.ts',
            lineRange: 'L24-L35',
            description: 'Valid reference inside diff patch',
            confidence: 0.9,
          },
          {
            id: 'ev-test-2',
            type: 'DIFF_INSPECTION',
            file: 'nonexistent/file.ts',
            description: 'Hallucinated file',
            confidence: 0.8,
          },
        ],
        filesChanged: genuinePR.filesChanged,
      });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('validCount', 1);
    expect(res.body).toHaveProperty('invalidCount', 1);
    expect(res.body.results).toHaveLength(2);
    expect(res.body.results[0].status).toBe('VALID');
    expect(res.body.results[1].status).toBe('INVALID');
  });

  it('POST /api/evidence/validate rejects non-array inputs with 400', async () => {
    const res = await request(app)
      .post('/api/evidence/validate')
      .send({ evidence: 'not-an-array', filesChanged: [] });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('GET /health returns healthy service status', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'healthy');
    expect(res.body).toHaveProperty('service', 'proof-backend');
  });

  it('handles malformed JSON request bodies with 400 JSON error', async () => {
    const res = await request(app)
      .post('/api/triage/analyze')
      .set('Content-Type', 'application/json')
      .send('{"badJson: invalid}');
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error', 'Malformed JSON payload in request body');
  });

  it('returns 404 JSON for undefined routes', async () => {
    const res = await request(app).get('/api/undefined-endpoint');
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error', 'Endpoint not found');
  });
});

