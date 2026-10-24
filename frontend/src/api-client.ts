import {
  PullRequestPayload,
  AnalysisResult,
  TriageResult,
  HealthStatusResponse,
  ReviewApprovalRequest,
  ReviewApprovalResponse,
} from '@proof/shared';

const BASE_URL = '/api';

export async function fetchHealth(): Promise<HealthStatusResponse> {
  const res = await fetch(`${BASE_URL}/health`);
  if (!res.ok) {
    throw new Error(`Health check failed with status ${res.status}`);
  }
  return res.json();
}

export async function fetchPullRequests(): Promise<PullRequestPayload[]> {
  const res = await fetch(`${BASE_URL}/pull-requests`);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to load pull requests (status ${res.status})`);
  }
  return res.json();
}

/** Backward-compatible alias for fetchPullRequests */
export const fetchSamples = fetchPullRequests;

export async function fetchPullRequestById(id: string): Promise<PullRequestPayload> {
  const res = await fetch(`${BASE_URL}/pull-requests/${encodeURIComponent(id)}`);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to fetch PR #${id} (status ${res.status})`);
  }
  return res.json();
}

export interface AnalyzeOptions {
  timeoutMs?: number;
}

/**
 * Calls POST /api/analyze to evaluate a pull request.
 * Enforces a bounded request timeout (default 25s) with AbortController
 * to gracefully handle timeouts and server issues without freezing the UI.
 */
export async function analyzePullRequest(
  pr: PullRequestPayload,
  options: AnalyzeOptions = {}
): Promise<AnalysisResult> {
  const timeoutMs = options.timeoutMs ?? 25000;
  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {
    const res = await fetch(`${BASE_URL}/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pr),
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      const message =
        errorData.error ||
        errorData.message ||
        `Triage analysis failed with status ${res.status}`;
      throw new Error(message);
    }

    return res.json();
  } catch (err: any) {
    clearTimeout(timer);
    if (err.name === 'AbortError') {
      throw new Error(
        `Analysis timed out after ${Math.round(timeoutMs / 1000)} seconds. The local engine took longer than expected.`
      );
    }
    throw err;
  }
}

export async function approveReviewComment(
  request: ReviewApprovalRequest
): Promise<ReviewApprovalResponse> {
  const res = await fetch(`${BASE_URL}/reviews/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to record review approval`);
  }

  return res.json();
}
