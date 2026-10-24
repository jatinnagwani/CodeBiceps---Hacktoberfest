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

export async function fetchSamples(): Promise<PullRequestPayload[]> {
  const res = await fetch(`${BASE_URL}/samples`);
  if (!res.ok) {
    throw new Error(`Failed to load sample pull requests`);
  }
  return res.json();
}

export async function analyzePullRequest(pr: PullRequestPayload): Promise<TriageResult> {
  const res = await fetch(`${BASE_URL}/triage/analyze`, {
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
