import {
  ClaimWatchStatus,
  ClaimWatchResult,
  ClaimWatchEvidence,
  ClaimWatchResultSchema,
} from '@proof/shared';
import { RawGitHubIssueData } from './github-service';
import { defaultOllamaAdapter, OllamaAdapter } from '../ai/ollama-client';

/**
 * Evaluates issue activity using conservative, non-accusatory heuristics.
 * Identifies potential inactivity ("cookie licking") without declaring malicious intent.
 */
export async function evaluateClaimWatch(
  data: RawGitHubIssueData,
  inactivityThresholdDays = 7,
  ollama: OllamaAdapter = defaultOllamaAdapter
): Promise<ClaimWatchResult> {
  const evidence: ClaimWatchEvidence[] = [];
  const now = Date.now();

  // 1. Assignee Verification
  if (!data.assignee) {
    evidence.push({
      label: 'Unassigned Issue',
      description: 'The issue currently has no assigned contributor.',
      type: 'VERIFIED_FACT',
    });

    const reminder = generatePoliteReminder(data, 'INSUFFICIENT_INFORMATION', inactivityThresholdDays);

    return ClaimWatchResultSchema.parse({
      issueUrl: data.url,
      issueNumber: data.issueNumber,
      owner: data.owner,
      repo: data.repo,
      issueTitle: data.title,
      assignee: null,
      status: 'INSUFFICIENT_INFORMATION',
      statusHeadline: 'Issue is not assigned to any contributor.',
      inactivityThresholdDays,
      lastObservableActivityAt: data.lastActivityAt,
      daysSinceLastActivity: null,
      claimDate: null,
      claimSource: 'UNKNOWN',
      linkedPullRequests: data.linkedPullRequests,
      evidence,
      generatedReminder: reminder,
      isDemoData: data.isDemoData,
      notes: 'No assignee detected. Claim Watch requires an assigned contributor or explicit claim history.',
    });
  }

  evidence.push({
    label: 'Assigned Contributor',
    description: `Issue is assigned to @${data.assignee}.`,
    type: 'VERIFIED_FACT',
  });

  // 2. Claim Date / Assignment History
  if (data.claimDate && data.claimSource !== 'UNKNOWN') {
    evidence.push({
      label: 'Observable Claim Timestamp',
      description: `Claim recorded on ${new Date(data.claimDate).toLocaleDateString()} via ${data.claimSource.replace(/_/g, ' ').toLowerCase()}.`,
      type: 'VERIFIED_FACT',
      timestamp: data.claimDate,
    });
  } else {
    evidence.push({
      label: 'Assignment History Incomplete',
      description: 'Exact assignment or claim date could not be verified from public timeline.',
      type: 'LIMITATION',
    });
  }

  // 3. Determine Most Recent Observable Activity
  // Activity candidates: issue updatedAt, lastActivityAt, or linked PR lastActivityAt
  let latestActivityTimestamp: number | null = null;
  let latestActivitySource = 'none';

  if (data.lastActivityAt) {
    const ts = new Date(data.lastActivityAt).getTime();
    if (!isNaN(ts)) {
      latestActivityTimestamp = ts;
      latestActivitySource = 'Issue activity/comments';
    }
  }

  // Check linked PRs for recent work
  let activeLinkedPRCount = 0;
  for (const pr of data.linkedPullRequests) {
    evidence.push({
      label: `Linked PR #${pr.number}`,
      description: `Pull Request #${pr.number} ("${pr.title}") is ${pr.state} by @${pr.author}.`,
      type: 'VERIFIED_FACT',
      timestamp: pr.lastActivityAt,
    });

    if (pr.lastActivityAt) {
      const prTs = new Date(pr.lastActivityAt).getTime();
      if (!isNaN(prTs)) {
        if (!latestActivityTimestamp || prTs > latestActivityTimestamp) {
          latestActivityTimestamp = prTs;
          latestActivitySource = `Linked PR #${pr.number}`;
        }
      }
    }

    if (pr.state === 'open' || pr.state === 'draft') {
      activeLinkedPRCount++;
    }
  }

  // 4. Calculate Inactivity & Status
  let status: ClaimWatchStatus = 'INSUFFICIENT_INFORMATION';
  let statusHeadline = 'Insufficient information to evaluate activity.';
  let daysSinceLastActivity: number | null = null;

  if (!latestActivityTimestamp) {
    evidence.push({
      label: 'Activity Telemetry Missing',
      description: 'No observable comment, commit, or pull request timestamp was found.',
      type: 'LIMITATION',
    });
    status = 'INSUFFICIENT_INFORMATION';
    statusHeadline = 'Insufficient observable timeline data to assess contributor progress.';
  } else {
    const diffMs = Math.max(0, now - latestActivityTimestamp);
    daysSinceLastActivity = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    evidence.push({
      label: 'Most Recent Observable Activity',
      description: `${daysSinceLastActivity} day(s) ago via ${latestActivitySource}.`,
      type: 'VERIFIED_FACT',
      timestamp: new Date(latestActivityTimestamp).toISOString(),
    });

    if (daysSinceLastActivity <= inactivityThresholdDays) {
      status = 'ACTIVITY_DETECTED';
      statusHeadline = `Recent activity observed ${daysSinceLastActivity} day(s) ago (within ${inactivityThresholdDays}-day threshold).`;
    } else {
      // If active PR exists with observable work, be conservative
      if (activeLinkedPRCount > 0 && daysSinceLastActivity <= inactivityThresholdDays + 3) {
        status = 'ACTIVITY_DETECTED';
        statusHeadline = `Active open PR #${data.linkedPullRequests[0].number} exists with progress observed.`;
      } else {
        status = 'NEEDS_CHECK_IN';
        statusHeadline = `No observable activity for ${daysSinceLastActivity} days (exceeds ${inactivityThresholdDays}-day threshold).`;
      }
    }
  }

  // 5. Generate Polite, Educational Reminder (Non-Accusatory)
  const generatedReminder = generatePoliteReminder(data, status, inactivityThresholdDays, daysSinceLastActivity);

  return ClaimWatchResultSchema.parse({
    issueUrl: data.url,
    issueNumber: data.issueNumber,
    owner: data.owner,
    repo: data.repo,
    issueTitle: data.title,
    assignee: data.assignee,
    status,
    statusHeadline,
    inactivityThresholdDays,
    lastObservableActivityAt: latestActivityTimestamp ? new Date(latestActivityTimestamp).toISOString() : null,
    daysSinceLastActivity,
    claimDate: data.claimDate,
    claimSource: data.claimSource,
    linkedPullRequests: data.linkedPullRequests,
    evidence,
    generatedReminder,
    isDemoData: data.isDemoData,
    notes: data.notes || (data.isDemoData ? 'Demo mode data' : 'Live GitHub data'),
  });
}

/**
 * Builds a polite, constructive, non-accusatory check-in message.
 * Emphasizes support, offers guidance, and provides a graceful way
 * to free up the issue if the contributor no longer has time.
 */
export function generatePoliteReminder(
  data: RawGitHubIssueData,
  status: ClaimWatchStatus,
  thresholdDays: number,
  daysInactive: number | null = null
): string {
  const assigneeGreeting = data.assignee ? `@${data.assignee}` : 'there';

  if (status === 'NEEDS_CHECK_IN') {
    return `Hi ${assigneeGreeting}! 👋

Just checking in to see how things are going with this issue. We noticed there hasn't been any observable activity for the past ${daysInactive ?? thresholdDays} days.

- Are you still planning to work on this, or do you have any questions we can help with?
- If you're busy or no longer have time, no worries at all! Just let us know so we can unassign this issue and open it up for another contributor.

Thank you for your interest in helping improve ${data.owner}/${data.repo}!`;
  }

  if (status === 'ACTIVITY_DETECTED') {
    return `Hi ${assigneeGreeting}! 👋

Thank you for your active work on this issue! We noticed recent progress. Please let us know if you need any feedback or maintainer review on your pull request.

Keep up the great work!`;
  }

  return `Hi ${assigneeGreeting}! 👋

We're reviewing open issues to keep our community roadmap active. Could you share a quick update on your current progress or if you need any assistance getting started?

Thanks for contributing to ${data.owner}/${data.repo}!`;
}
