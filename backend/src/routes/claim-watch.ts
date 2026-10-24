import { Router, Request, Response } from 'express';
import { ClaimWatchRequestSchema, ClaimWatchResultSchema } from '@proof/shared';
import {
  parseGitHubIssueUrl,
  fetchGitHubIssue,
  SAMPLE_CLAIM_WATCH_FIXTURES,
} from '../claim-watch/github-service';
import { evaluateClaimWatch } from '../claim-watch/analyzer';

export const claimWatchRouter = Router();

/**
 * GET /api/claim-watch/samples
 * Returns list of pre-configured sample issues for instant demonstration.
 */
claimWatchRouter.get('/samples', (_req: Request, res: Response) => {
  const sampleList = Object.entries(SAMPLE_CLAIM_WATCH_FIXTURES).map(([key, item]) => ({
    key,
    title: item.title,
    url: item.url,
    assignee: item.assignee,
    notes: item.notes,
  }));
  res.json(sampleList);
});

/**
 * POST /api/claim-watch/evaluate
 * Evaluates a GitHub issue URL for claim activity / cookie-licking.
 */
claimWatchRouter.post('/evaluate', async (req: Request, res: Response) => {
  if (!req.body || typeof req.body !== 'object') {
    return res.status(400).json({ error: 'Request body must be a valid JSON object.' });
  }

  const parsedBody = ClaimWatchRequestSchema.safeParse(req.body);
  if (!parsedBody.success) {
    return res.status(400).json({
      error: 'Invalid Claim Watch request.',
      details: parsedBody.error.issues,
    });
  }

  const { issueUrl, inactivityThresholdDays, demoMode } = parsedBody.data;

  // Strict URL parsing & validation
  const parsedUrl = parseGitHubIssueUrl(issueUrl);
  if (!parsedUrl) {
    return res.status(400).json({
      error: 'Invalid or unsupported GitHub issue URL. Format must be: https://github.com/owner/repo/issues/123',
    });
  }

  try {
    const rawIssueData = await fetchGitHubIssue(parsedUrl, Boolean(demoMode));
    const result = await evaluateClaimWatch(rawIssueData, inactivityThresholdDays);
    const validatedResult = ClaimWatchResultSchema.parse(result);

    res.json(validatedResult);
  } catch (err: any) {
    console.warn(`[claim-watch] Issue evaluation error for ${parsedUrl.canonicalUrl}:`, err.message);

    // Differentiate between 404 (not found / private) and other errors
    const isNotFound = err.message.includes('not found') || err.message.includes('private');
    const isRateLimit = err.message.includes('rate limit');
    const status = isNotFound ? 404 : (isRateLimit ? 429 : 500);

    res.status(status).json({
      error: err.message || 'Failed to evaluate issue.',
      issueUrl: parsedUrl.canonicalUrl,
      suggestion: 'You can test this repository using one of the pre-configured Demo Samples or enable Demo Mode.',
    });
  }
});
