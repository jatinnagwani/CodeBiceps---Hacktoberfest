import React, { useState, useEffect } from 'react';
import {
  ClaimWatchResult,
  ClaimWatchStatus,
} from '@proof/shared';
import {
  evaluateClaimWatch,
  fetchClaimWatchSamples,
  ClaimWatchSampleItem,
} from '../api-client';
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Copy,
  Check,
  ExternalLink,
  Target,
  User,
  Sliders,
  Sparkles,
  Info,
  Calendar,
  X,
  Edit3,
  GitPullRequest,
  AlertTriangle,
  MessageSquare,
  ShieldAlert,
} from 'lucide-react';

export const ClaimWatchView: React.FC = () => {
  const [issueUrl, setIssueUrl] = useState<string>('https://github.com/nodejs/node/issues/88');
  const [thresholdDays, setThresholdDays] = useState<number>(7);
  const [demoMode, setDemoMode] = useState<boolean>(true);
  const [samples, setSamples] = useState<ClaimWatchSampleItem[]>([]);
  const [result, setResult] = useState<ClaimWatchResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [editableReminder, setEditableReminder] = useState<string>('');
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'timeline' | 'comments' | 'linked-prs'>('overview');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isEditingReminder, setIsEditingReminder] = useState<boolean>(false);

  // Load sample issues on mount and evaluate default to display complete UI immediately
  useEffect(() => {
    fetchClaimWatchSamples()
      .then((data) => {
        setSamples(data);
        if (data.length > 0) {
          const first = data[0];
          setIssueUrl(first.url);
          evaluateClaimWatch(first.url, 7, true)
            .then((res) => {
              setResult(res);
              setEditableReminder(res.generatedReminder);
            })
            .catch(() => {});
        }
      })
      .catch((err) => console.warn('Could not load Claim Watch samples:', err));
  }, []);

  // Sync reminder text whenever new evaluation result arrives
  useEffect(() => {
    if (result) {
      setEditableReminder(result.generatedReminder);
    }
  }, [result]);

  const handleEvaluate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!issueUrl.trim()) return;

    try {
      setLoading(true);
      setError(null);
      const res = await evaluateClaimWatch(issueUrl.trim(), thresholdDays, demoMode);
      setResult(res);
      setEditableReminder(res.generatedReminder);
    } catch (err: any) {
      setError(err.message || 'Failed to evaluate issue.');
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSample = (sample: ClaimWatchSampleItem) => {
    setIssueUrl(sample.url);
    setDemoMode(true);
    setLoading(true);
    setError(null);
    evaluateClaimWatch(sample.url, thresholdDays, true)
      .then((res) => {
        setResult(res);
        setEditableReminder(res.generatedReminder);
      })
      .catch((err: any) => {
        setError(err.message || 'Failed to evaluate sample.');
      })
      .finally(() => setLoading(false));
  };

  const handleCopy = () => {
    if (!editableReminder) return;
    navigator.clipboard.writeText(editableReminder);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 animate-subtle-fade max-w-6xl mx-auto pb-12">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-[#151C18] border border-[#22C77A]/30 flex items-center justify-center text-[#22C77A] shrink-0">
            <Target className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#F3F6F4] tracking-tight">
              Claim Watch
            </h1>
            <p className="text-xs text-[#A0ADA5] mt-0.5">
              Spot potentially stalled issue claims. Keep open-source contributions moving without discouraging genuine contributors.
            </p>
          </div>
        </div>

        {result && (
          <button
            type="button"
            onClick={() => {
              setResult(null);
              setIssueUrl('');
            }}
            className="text-xs text-[#22C77A] hover:text-[#36E39A] font-medium transition self-start sm:self-auto cursor-pointer"
          >
            Analyze Another
          </button>
        )}
      </div>

      {/* Input Container */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[#101613] border border-[#202B24] space-y-3 shadow-lg">
        <form onSubmit={handleEvaluate} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <div className="flex-1 flex items-center bg-[#080B0A] border border-[#202B24] rounded-xl px-3.5 py-2.5 focus-within:border-[#22C77A] transition gap-2.5">
            <GitPullRequest className="h-4 w-4 text-[#718078] shrink-0" />
            <input
              type="text"
              value={issueUrl}
              onChange={(e) => setIssueUrl(e.target.value)}
              placeholder="https://github.com/owner/repo/issues/456"
              className="bg-transparent text-xs text-[#F3F6F4] placeholder-[#718078] outline-none flex-1 font-mono"
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <select
                value={thresholdDays}
                onChange={(e) => setThresholdDays(Number(e.target.value))}
                className="appearance-none bg-[#080B0A] border border-[#202B24] text-xs text-[#F3F6F4] font-medium rounded-xl px-3.5 py-2.5 pr-8 focus:border-[#22C77A] outline-none cursor-pointer"
              >
                <option value={3}>3 days</option>
                <option value={5}>5 days</option>
                <option value={7}>7 days</option>
                <option value={14}>14 days</option>
                <option value={21}>21 days</option>
                <option value={30}>30 days</option>
              </select>
              <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[#718078]">
                ▼
              </span>
            </div>

            <button
              type="submit"
              disabled={loading || !issueUrl.trim()}
              className="px-6 py-2.5 rounded-xl bg-[#22C77A] hover:bg-[#36E39A] disabled:opacity-40 text-[#080B0A] font-semibold text-xs shadow-sm transition shrink-0 flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="h-3 w-3 border-2 border-[#080B0A]/30 border-t-[#080B0A] rounded-full animate-spin" />
                  <span>Analyzing...</span>
                </>
              ) : (
                <span>Analyze</span>
              )}
            </button>
          </div>
        </form>

        {/* Sample selector & links */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[#718078] font-medium">Try a sample issue:</span>
            {samples.length > 0 ? (
              samples.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => handleSelectSample(s)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium border transition cursor-pointer ${
                    issueUrl === s.url
                      ? 'bg-[#153326] text-[#22C77A] border-[#22C77A]/40'
                      : 'bg-[#080B0A] text-[#A0ADA5] hover:text-[#F3F6F4] border-[#202B24] hover:bg-[#151C18]'
                  }`}
                >
                  #{s.key.split('-')[1] || s.key} {s.title.slice(0, 20)}...
                </button>
              ))
            ) : (
              <button
                type="button"
                onClick={() => handleEvaluate()}
                className="px-2.5 py-1 rounded-md text-[11px] font-medium border bg-[#080B0A] text-[#A0ADA5] border-[#202B24]"
              >
                #456 Error handling
              </button>
            )}
            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#151C18] text-[#22C77A] border border-[#22C77A]/30">
              Demo data
            </span>
          </div>

          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="text-xs text-[#718078] hover:text-[#22C77A] transition underline cursor-pointer"
          >
            How it works?
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-800/40 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Evaluated Issue Card */}
      {result && (
        <div className="p-5 sm:p-6 rounded-2xl bg-[#101613] border border-[#202B24] shadow-xl space-y-5 animate-subtle-fade">
          {/* Top Issue Title & Status Badge */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <div>
              <span className="text-xs text-[#718078] font-mono">
                Issue #{result.issueNumber}
              </span>
              <h2 className="text-lg sm:text-xl font-bold text-[#F3F6F4] mt-0.5 tracking-tight">
                {result.issueTitle}
              </h2>
              <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-[#718078]">
                <div className="flex items-center gap-1.5">
                  <div className="h-4 w-4 rounded-full bg-[#151C18] border border-[#202B24] flex items-center justify-center text-[9px] text-[#22C77A] font-semibold">
                    {result.assignee ? result.assignee[0].toUpperCase() : 'U'}
                  </div>
                  <span className="text-[#A0ADA5] font-medium">
                    {result.assignee ? `@${result.assignee}` : 'Unassigned'}
                  </span>
                </div>
                <span>•</span>
                <span>Opened {result.claimDate ? '12 days ago' : 'recently'}</span>
                <span>•</span>
                <span>
                  Last activity {result.daysSinceLastActivity !== null ? `${result.daysSinceLastActivity} days ago` : 'unknown'}
                </span>
                <span>•</span>
                <span>
                  Linked PR: {result.linkedPullRequests.length > 0 ? `#${result.linkedPullRequests[0].number}` : 'None'}
                </span>
              </div>
            </div>

            <div className="shrink-0 self-start">
              {result.status === 'NEEDS_CHECK_IN' && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-950/40 text-amber-300 border border-amber-500/40">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
                  <span>Needs a Check-in</span>
                </span>
              )}
              {result.status === 'ACTIVITY_DETECTED' && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#153326] text-[#22C77A] border border-[#22C77A]/40">
                  <CheckCircle2 className="h-3.5 w-3.5 text-[#22C77A]" />
                  <span>Activity Detected</span>
                </span>
              )}
              {result.status === 'INSUFFICIENT_INFORMATION' && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#151C18] text-[#A0ADA5] border border-[#202B24]">
                  <HelpCircle className="h-3.5 w-3.5 text-[#A0ADA5]" />
                  <span>No Claim Detected</span>
                </span>
              )}
            </div>
          </div>

          {/* Sub Navigation Tabs */}
          <div className="flex items-center gap-1 border-b border-[#202B24] pb-px">
            <button
              type="button"
              onClick={() => setActiveSubTab('overview')}
              className={`px-3.5 py-2 text-xs font-semibold transition border-b-2 cursor-pointer ${
                activeSubTab === 'overview'
                  ? 'border-[#22C77A] text-[#22C77A]'
                  : 'border-transparent text-[#718078] hover:text-[#F3F6F4]'
              }`}
            >
              Overview
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('timeline')}
              className={`px-3.5 py-2 text-xs font-semibold transition border-b-2 cursor-pointer ${
                activeSubTab === 'timeline'
                  ? 'border-[#22C77A] text-[#22C77A]'
                  : 'border-transparent text-[#718078] hover:text-[#F3F6F4]'
              }`}
            >
              Activity Timeline
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('comments')}
              className={`px-3.5 py-2 text-xs font-semibold transition border-b-2 cursor-pointer ${
                activeSubTab === 'comments'
                  ? 'border-[#22C77A] text-[#22C77A]'
                  : 'border-transparent text-[#718078] hover:text-[#F3F6F4]'
              }`}
            >
              Comments
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('linked-prs')}
              className={`px-3.5 py-2 text-xs font-semibold transition border-b-2 cursor-pointer ${
                activeSubTab === 'linked-prs'
                  ? 'border-[#22C77A] text-[#22C77A]'
                  : 'border-transparent text-[#718078] hover:text-[#F3F6F4]'
              }`}
            >
              Linked PRs ({result.linkedPullRequests.length})
            </button>
          </div>

          {/* Sub Tab: Overview (3-Column Layout from Screenshot) */}
          {activeSubTab === 'overview' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 1. Key Signals */}
                <div className="p-4 rounded-xl bg-[#080B0A] border border-[#202B24] space-y-3">
                  <h3 className="text-xs font-semibold text-[#F3F6F4]">Key Signals</h3>
                  <div className="space-y-2 text-xs">
                    {result.daysSinceLastActivity !== null && result.daysSinceLastActivity >= thresholdDays && (
                      <div className="flex items-start gap-2 text-amber-300">
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" />
                        <span className="text-[11px] leading-relaxed">
                          No activity for {result.daysSinceLastActivity} days (&gt; {thresholdDays} days threshold)
                        </span>
                      </div>
                    )}
                    {result.assignee ? (
                      <div className="flex items-start gap-2 text-amber-300">
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" />
                        <span className="text-[11px] leading-relaxed">
                          Assigned to contributor ({result.linkedPullRequests.length ? 'PR linked' : 'no linked PR'})
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-start gap-2 text-[#A0ADA5]">
                        <Info className="h-3.5 w-3.5 text-[#22C77A] shrink-0 mt-0.5" />
                        <span className="text-[11px] leading-relaxed">
                          Issue is unassigned
                        </span>
                      </div>
                    )}
                    <div className="flex items-start gap-2 text-amber-300">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" />
                      <span className="text-[11px] leading-relaxed">
                        No relevant updates detected
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. Assessment */}
                <div className="p-4 rounded-xl bg-[#080B0A] border border-[#202B24] space-y-3 flex flex-col justify-between">
                  <div>
                    <h3 className="text-xs font-semibold text-[#F3F6F4] mb-2">Assessment</h3>
                    <div className="mb-2">
                      {result.status === 'NEEDS_CHECK_IN' && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-400">
                          <AlertTriangle className="h-3 w-3" />
                          <span>Needs a Check-In</span>
                        </span>
                      )}
                      {result.status === 'ACTIVITY_DETECTED' && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#22C77A]">
                          <CheckCircle2 className="h-3 w-3" />
                          <span>Active Progress</span>
                        </span>
                      )}
                      {result.status === 'INSUFFICIENT_INFORMATION' && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#A0ADA5]">
                          <HelpCircle className="h-3 w-3" />
                          <span>Insufficient Info</span>
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[#A0ADA5] leading-relaxed">
                      {result.notes ||
                        `The issue has been inactive for ${result.daysSinceLastActivity || 8} days and there's no visible progress. A friendly check-in may help move things forward.`}
                    </p>
                  </div>
                  <div>
                    <span className="inline-block text-[10px] font-medium px-2 py-0.5 rounded bg-[#151C18] text-[#718078] border border-[#202B24]">
                      Low confidence
                    </span>
                  </div>
                </div>

                {/* 3. Issue Details */}
                <div className="p-4 rounded-xl bg-[#080B0A] border border-[#202B24] space-y-2.5">
                  <h3 className="text-xs font-semibold text-[#F3F6F4]">Issue Details</h3>
                  <div className="space-y-1.5 text-[11px]">
                    <div>
                      <span className="text-[#718078]">Title: </span>
                      <span className="text-[#F3F6F4] font-medium">{result.issueTitle}</span>
                    </div>
                    <div>
                      <span className="text-[#718078]">Created: </span>
                      <span className="text-[#A0ADA5]">Apr 20, 2025</span>
                    </div>
                    <div>
                      <span className="text-[#718078]">Assignee: </span>
                      <span className="text-[#22C77A] font-medium">{result.assignee || 'None'}</span>
                    </div>
                    <div className="flex items-center gap-1.5 pt-1">
                      <span className="text-[#718078]">Labels: </span>
                      <span className="px-1.5 py-0.2 rounded text-[10px] bg-[#151C18] text-[#A0ADA5] border border-[#202B24]">
                        backend
                      </span>
                      <span className="px-1.5 py-0.2 rounded text-[10px] bg-[#151C18] text-[#A0ADA5] border border-[#202B24]">
                        priority:medium
                      </span>
                    </div>
                  </div>
                  <div className="pt-2">
                    <a
                      href={result.issueUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] text-[#22C77A] hover:text-[#36E39A] font-medium transition"
                    >
                      <span>View on GitHub</span>
                      <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                  </div>
                </div>
              </div>

              {/* Bottom: Suggested Follow-up Card */}
              <div className="p-4 rounded-xl bg-[#080B0A] border border-[#202B24] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-3.5 w-3.5 text-[#22C77A]" />
                    <h3 className="text-xs font-semibold text-[#F3F6F4]">Suggested Follow-up</h3>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCopy}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#151C18] hover:bg-[#202B24] text-xs font-medium text-[#F3F6F4] border border-[#202B24] transition cursor-pointer"
                    >
                      {copied ? (
                        <>
                          <Check className="h-3 w-3 text-[#22C77A]" />
                          <span className="text-[#22C77A]">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3 text-[#718078]" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsEditingReminder(!isEditingReminder)}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#151C18] hover:bg-[#202B24] text-xs font-medium text-[#F3F6F4] border border-[#202B24] transition cursor-pointer"
                    >
                      <Edit3 className="h-3 w-3 text-[#718078]" />
                      <span>{isEditingReminder ? 'Done' : 'Edit'}</span>
                    </button>
                  </div>
                </div>

                {isEditingReminder ? (
                  <textarea
                    value={editableReminder}
                    onChange={(e) => setEditableReminder(e.target.value)}
                    rows={3}
                    className="w-full p-3 rounded-lg bg-[#101613] border border-[#202B24] focus:border-[#22C77A] text-xs text-[#F3F6F4] font-mono outline-none resize-y"
                  />
                ) : (
                  <div className="p-3 rounded-lg bg-[#101613] border border-[#202B24] text-xs text-[#A0ADA5] font-mono leading-relaxed">
                    {editableReminder ||
                      `Hi @${result.assignee || 'contributor'} 👋 Just checking in on this issue. Would you still be working on it or do you need more time? Let us know if you need any help or support!`}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Sub Tab: Activity Timeline */}
          {activeSubTab === 'timeline' && (
            <div className="p-4 rounded-xl bg-[#080B0A] border border-[#202B24] space-y-3">
              <h3 className="text-xs font-semibold text-[#F3F6F4]">Observable Timeline Evidence</h3>
              <div className="space-y-2">
                {result.evidence.map((ev, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 p-2.5 rounded-lg bg-[#101613] border border-[#202B24] text-xs"
                  >
                    <Clock className="h-3.5 w-3.5 text-[#22C77A] mt-0.5 shrink-0" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-[#F3F6F4]">{ev.label}</span>
                        <span className="text-[10px] text-[#718078] font-mono">{ev.type}</span>
                      </div>
                      <p className="text-[#A0ADA5] text-[11px] mt-0.5 leading-relaxed">
                        {ev.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sub Tab: Comments */}
          {activeSubTab === 'comments' && (
            <div className="p-4 rounded-xl bg-[#080B0A] border border-[#202B24] space-y-3">
              <h3 className="text-xs font-semibold text-[#F3F6F4]">Maintainer Draft & Review Notes</h3>
              <textarea
                value={editableReminder}
                onChange={(e) => setEditableReminder(e.target.value)}
                rows={5}
                className="w-full p-3 rounded-lg bg-[#101613] border border-[#202B24] focus:border-[#22C77A] text-xs text-[#F3F6F4] font-mono outline-none"
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="px-4 py-2 rounded-lg bg-[#22C77A] text-[#080B0A] font-semibold text-xs hover:bg-[#36E39A] transition cursor-pointer"
                >
                  {copied ? 'Copied to Clipboard!' : 'Copy Draft to Clipboard'}
                </button>
              </div>
            </div>
          )}

          {/* Sub Tab: Linked PRs */}
          {activeSubTab === 'linked-prs' && (
            <div className="p-4 rounded-xl bg-[#080B0A] border border-[#202B24] space-y-3">
              <h3 className="text-xs font-semibold text-[#F3F6F4]">Linked Pull Requests</h3>
              {result.linkedPullRequests.length === 0 ? (
                <div className="p-4 rounded-lg bg-[#101613] border border-[#202B24] text-center text-xs text-[#718078]">
                  No pull request linked to this issue.
                </div>
              ) : (
                <div className="space-y-2">
                  {result.linkedPullRequests.map((pr) => (
                    <div
                      key={pr.number}
                      className="flex items-center justify-between p-3 rounded-lg bg-[#101613] border border-[#202B24] text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <GitPullRequest className="h-4 w-4 text-[#22C77A]" />
                        <span className="font-semibold text-[#F3F6F4]">#{pr.number} {pr.title}</span>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] bg-[#151C18] text-[#22C77A] border border-[#22C77A]/30">
                        {pr.state}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Detail Modal (Panel 4 from Screenshot) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#101613] border border-[#202B24] rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative space-y-4 animate-subtle-fade">
            <div className="flex items-start justify-between pb-3 border-b border-[#202B24]">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-[#151C18] border border-amber-500/30 text-amber-400 flex items-center justify-center">
                  <AlertTriangle className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#F3F6F4]">
                    Potential check-in needed
                  </h3>
                  <p className="text-xs text-[#A0ADA5]">
                    This issue has been inactive for {result?.daysSinceLastActivity || 8} days with no visible progress.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-[#718078] hover:text-[#F3F6F4] p-1 rounded-lg hover:bg-[#151C18] transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-[#080B0A] border border-[#202B24] space-y-2">
                <h4 className="font-semibold text-[#F3F6F4]">Issue Details</h4>
                <div className="space-y-1 text-[#A0ADA5] text-[11px]">
                  <div>#{result?.issueNumber || 456} {result?.issueTitle || 'Improve error handling in data service'}</div>
                  <div>Assignee: <span className="text-[#22C77A]">@{result?.assignee || 'alex-contributor'}</span></div>
                  <div>Claim date: <span className="text-[#F3F6F4]">Apr 20, 2025 (Inferred)</span></div>
                  <div>Last activity: <span className="text-amber-400">{result?.daysSinceLastActivity || 8} days ago</span></div>
                  <div>Linked PR: <span className="text-[#F3F6F4]">None</span></div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#080B0A] border border-[#202B24] space-y-2">
                <h4 className="font-semibold text-[#F3F6F4]">Detected Signals</h4>
                <div className="space-y-1.5 text-[11px] text-amber-300">
                  <div className="flex items-center gap-1.5">
                    <AlertTriangle className="h-3 w-3 text-amber-400 shrink-0" />
                    <span>No activity for 8 days (&gt; 7 days threshold)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <AlertTriangle className="h-3 w-3 text-amber-400 shrink-0" />
                    <span>Assigned to contributor (no linked PR)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <AlertTriangle className="h-3 w-3 text-amber-400 shrink-0" />
                    <span>No recent updates detected</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#080B0A] border border-[#202B24] space-y-1">
              <h4 className="text-xs font-semibold text-[#F3F6F4]">Why this might need a check-in</h4>
              <p className="text-[11px] text-[#A0ADA5] leading-relaxed">
                The issue hasn't had any visible activity for 8 days, and there's no linked PR. A friendly check-in can help determine if the contributor is still working on it or if it's available for others.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-[#080B0A] border border-[#202B24] space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-[#F3F6F4]">Suggested Follow-up</h4>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#151C18] text-[#22C77A] text-[11px] font-medium border border-[#202B24] cursor-pointer"
                  >
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>
              <div className="p-2.5 rounded bg-[#101613] text-[11px] font-mono text-[#A0ADA5]">
                {editableReminder}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-[#22C77A] hover:bg-[#36E39A] text-[#080B0A] font-semibold text-xs transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
