import {
  PullRequestPayload,
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

export async function analyzePullRequest(pr: PullRequestPayload): Promise<TriageResult> {
  const res = await fetch(`${BASE_URL}/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(pr),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Triage analysis failed with status ${res.status}`);
  }

  return res.json();
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
