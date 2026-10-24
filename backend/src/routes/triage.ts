import { Router, Request, Response } from 'express';
import { z } from 'zod';
import {
  PullRequestSchema,
  PullRequestPayloadSchema,
  ReviewApprovalRequestSchema,
  HealthStatusResponse,
  ReviewApprovalResponse,
} from '@proof/shared';
import { defaultTriagePipeline } from '../pipeline/triage-pipeline';
import { defaultSampleStore } from '../samples/sample-store';
import { defaultOllamaClient } from '../ai/ollama-client';
import { validateAllEvidence } from '../validation/evidence-validator';

export const triageRouter = Router();

// Store maintainer approval records in-memory for the demo session
const approvalRecords = new Map<string, ReviewApprovalResponse>();

/**
 * GET /api/health
 * Returns service readiness, active heuristics count, and Ollama connectivity status.
 */
triageRouter.get('/health', async (_req: Request, res: Response) => {
  const ollamaHealth = await defaultOllamaClient.checkHealth();

  const response: HealthStatusResponse = {
    status: ollamaHealth.connected ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    version: '0.1.0',
    ollama: {
      connected: ollamaHealth.connected,
      endpoint: ollamaHealth.endpoint,
      model: ollamaHealth.model,
      quantization: ollamaHealth.quantization,
      version: ollamaHealth.version,
    },
    heuristics: {
      activeRulesCount: 5,
      ready: true,
    },
  };

  res.json(response);
});

/**
 * GET /api/pull-requests
 * GET /api/samples (alias)
 * Returns list of local sample PRs for demonstration.
 * Validates output against PullRequestSchema.
 */
const getPullRequestsHandler = (_req: Request, res: Response) => {
  try {
    const samples = defaultSampleStore.getAllSamples();
    const validated = z.array(PullRequestPayloadSchema).parse(samples);
    res.json(validated);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to serialize pull requests', details: err.message });
  }
};
triageRouter.get('/pull-requests', getPullRequestsHandler);
triageRouter.get('/samples', getPullRequestsHandler);

/**
 * GET /api/pull-requests/:id
 * GET /api/samples/:id (alias)
 * Returns a specific sample PR by ID.
 * Validates output against PullRequestPayloadSchema.
 */
const getPullRequestByIdHandler = (req: Request, res: Response) => {
  const sample = defaultSampleStore.getSampleById(req.params.id);
  if (!sample) {
    return res.status(404).json({ error: `Sample PR '${req.params.id}' not found.` });
  }
  try {
    const validated = PullRequestPayloadSchema.parse(sample);
    res.json(validated);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to serialize pull request', details: err.message });
  }
};
triageRouter.get('/pull-requests/:id', getPullRequestByIdHandler);
triageRouter.get('/samples/:id', getPullRequestByIdHandler);

/**
 * POST /api/triage/analyze
 * POST /api/analyze (alias)
 * Analyzes any incoming PR payload through the triage pipeline.
 */
const analyzeHandler = async (req: Request, res: Response) => {
  const parsed = PullRequestPayloadSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: 'Invalid pull request payload',
      details: parsed.error.issues,
    });
  }

  try {
    const result = await defaultTriagePipeline.triage(parsed.data);
    res.json(result);
  } catch (err) {
    console.error('[triage/analyze] Unexpected error:', err);
    res.status(500).json({ error: 'Failed to analyze pull request.' });
  }
};
triageRouter.post('/triage/analyze', analyzeHandler);
triageRouter.post('/analyze', analyzeHandler);

/**
 * POST /api/reviews/approve
 * Records maintainer approval of the suggested comment.
 * Never executes destructive actions (never automatically closes, merges, or rejects).
 */
triageRouter.post('/reviews/approve', (req: Request, res: Response) => {
  const parsed = ReviewApprovalRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: 'Invalid review approval request',
      details: parsed.error.issues,
    });
  }

  const { prId, finalComment, actionTaken } = parsed.data;
  const approvalId = `apr-${Math.random().toString(36).substring(2, 9)}`;

  const response: ReviewApprovalResponse = {
    success: true,
    approvalId,
    prId,
    recordedAt: new Date().toISOString(),
    message: 'Maintainer review comment successfully verified and recorded.',
    finalComment,
    actionTaken,
  };

  approvalRecords.set(approvalId, response);
  res.json(response);
});

/**
 * POST /api/evidence/validate
 * Validates a batch of evidence citations against PR changed files.
 */
triageRouter.post('/evidence/validate', (req: Request, res: Response) => {
  const { evidence, filesChanged } = req.body;
  if (!Array.isArray(evidence) || !Array.isArray(filesChanged)) {
    return res.status(400).json({
      error: 'Invalid request: "evidence" and "filesChanged" must be arrays.',
    });
  }

  const report = validateAllEvidence(evidence, filesChanged);
  res.json(report);
});
