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
  ShieldAlert,
  GitPullRequest,
  User,
  Sliders,
  Sparkles,
  Info,
  Calendar,
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

  // Load sample issues on mount
  useEffect(() => {
    fetchClaimWatchSamples()
      .then((data) => setSamples(data))
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
  };

  const handleCopy = () => {
    if (!editableReminder) return;
    navigator.clipboard.writeText(editableReminder);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Overview Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/30 to-slate-900 border border-slate-800 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
                Claim Watch
              </span>
              <span className="text-xs text-slate-400">Conservative Inactivity Triage</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-100 mt-1">
              Issue Claim Inactivity Checker
            </h1>
            <p className="text-sm text-slate-400 max-w-2xl mt-1 leading-relaxed">
              Identify potentially stalled issue claims ("cookie licking") using observable timeline evidence.
              Never infers malicious intent; emphasizes constructive check-ins and offers a copyable polite reminder.
            </p>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400">
            <Info className="h-4 w-4 text-indigo-400 shrink-0" />
            <span>Read-only: Never writes or closes issues automatically</span>
          </div>
        </div>
      </div>

      {/* Input & Configuration Card */}
      <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4">
        <form onSubmit={handleEvaluate} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
              GitHub Issue URL
            </label>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={issueUrl}
                onChange={(e) => setIssueUrl(e.target.value)}
                placeholder="https://github.com/owner/repo/issues/123"
                className="flex-1 px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm text-slate-100 placeholder-slate-500 outline-none transition"
              />
              <button
                type="submit"
                disabled={loading || !issueUrl.trim()}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-sm shadow-lg shadow-indigo-600/25 transition shrink-0 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="h-4 w-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <>
                    <Clock className="h-4 w-4" />
                    <span>Check Activity</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Quick Sample Selector */}
          {samples.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-xs text-slate-400 font-medium mr-1">Demo Scenarios:</span>
              {samples.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => handleSelectSample(s)}
                  className={`px-2.5 py-1 text-xs rounded-lg border transition ${
                    issueUrl === s.url
                      ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/50'
                      : 'bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border-slate-800'
                  }`}
                  title={s.notes}
                >
                  {s.title.slice(0, 32)}...
                </button>
              ))}
            </div>
          )}

          {/* Controls: Inactivity Threshold & Demo Mode */}
          <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-400">
            <div className="flex items-center gap-3">
              <Sliders className="h-4 w-4 text-indigo-400" />
              <span>Inactivity Threshold:</span>
              <input
                type="range"
                min="3"
                max="30"
                value={thresholdDays}
                onChange={(e) => setThresholdDays(parseInt(e.target.value, 10))}
                className="w-28 accent-indigo-500 cursor-pointer"
              />
              <span className="font-semibold text-slate-200 bg-slate-800 px-2 py-0.5 rounded">
                {thresholdDays} days
              </span>
            </div>

            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={demoMode}
                  onChange={(e) => setDemoMode(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-0"
                />
                <span className="text-slate-300 font-medium">Demo/Sample Mode</span>
              </label>
              <span className="text-[11px] text-slate-500">
                (Use local fixtures without GitHub API tokens)
              </span>
            </div>
          </div>
        </form>
      </div>

      {/* Error Card */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-300 text-xs flex items-start gap-3 shadow-lg">
          <AlertCircle className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Evaluation Alert</p>
            <p className="mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Results View */}
      {result && (
        <div className="space-y-6">
          {/* Status Banner */}
          <div
            className={`p-6 rounded-2xl border shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
              result.status === 'ACTIVITY_DETECTED'
                ? 'bg-emerald-950/40 border-emerald-800 text-emerald-200'
                : result.status === 'NEEDS_CHECK_IN'
                ? 'bg-amber-950/40 border-amber-800 text-amber-200'
                : 'bg-blue-950/40 border-blue-800 text-blue-200'
            }`}
          >
            <div className="flex items-start gap-4">
              <div
                className={`p-3 rounded-xl ${
                  result.status === 'ACTIVITY_DETECTED'
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : result.status === 'NEEDS_CHECK_IN'
                    ? 'bg-amber-500/20 text-amber-400'
                    : 'bg-blue-500/20 text-blue-400'
                }`}
              >
                {result.status === 'ACTIVITY_DETECTED' ? (
                  <CheckCircle2 className="h-6 w-6" />
                ) : result.status === 'NEEDS_CHECK_IN' ? (
                  <AlertCircle className="h-6 w-6" />
                ) : (
                  <HelpCircle className="h-6 w-6" />
                )}
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-black/30 border border-white/10">
                    {result.status === 'ACTIVITY_DETECTED'
                      ? 'Activity Detected'
                      : result.status === 'NEEDS_CHECK_IN'
                      ? 'Needs a Check-In'
                      : 'Insufficient Information'}
                  </span>
                  {result.isDemoData && (
                    <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      Sample Data
                    </span>
                  )}
                </div>
                <h2 className="text-lg font-bold mt-1 text-white">{result.statusHeadline}</h2>
                <p className="text-xs text-slate-300 mt-1 max-w-xl">
                  {result.notes}
                </p>
              </div>
            </div>

            <div className="flex flex-col items-end text-xs text-slate-400 shrink-0">
              <span>Threshold: {result.inactivityThresholdDays} days</span>
              {result.daysSinceLastActivity !== null && (
                <span className="font-semibold text-slate-200 mt-0.5">
                  Last observed: {result.daysSinceLastActivity} days ago
                </span>
              )}
            </div>
          </div>

          {/* Details & Telemetry Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Issue Information Card */}
            <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Info className="h-3.5 w-3.5 text-indigo-400" />
                <span>Issue Details</span>
              </div>
              <h3 className="text-sm font-semibold text-slate-200 line-clamp-2">
                {result.issueTitle}
              </h3>
              <a
                href={result.issueUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition"
              >
                <span>{result.owner}/{result.repo}#{result.issueNumber}</span>
                <ExternalLink className="h-3 w-3" />
              </a>

              <div className="pt-2 border-t border-slate-800/80 space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5" /> Assignee:
                  </span>
                  <span className="font-semibold text-slate-200">
                    {result.assignee ? `@${result.assignee}` : 'Unassigned'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" /> Last Activity:
                  </span>
                  <span className="text-slate-300">
                    {result.lastObservableActivityAt
                      ? new Date(result.lastObservableActivityAt).toLocaleDateString()
                      : 'Unknown'}
                  </span>
                </div>
              </div>
            </div>

            {/* Linked Pull Requests Card */}
            <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <GitPullRequest className="h-3.5 w-3.5 text-indigo-400" />
                <span>Linked Pull Requests</span>
              </div>

              {result.linkedPullRequests.length === 0 ? (
                <div className="py-4 text-center text-xs text-slate-500">
                  No linked pull requests detected on public timeline.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {result.linkedPullRequests.map((pr) => (
                    <div
                      key={pr.number}
                      className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <a
                          href={pr.url}
                          target="_blank"
                          rel="noreferrer"
                          className="font-semibold text-slate-200 hover:text-indigo-300 flex items-center gap-1"
                        >
                          <span>PR #{pr.number}</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                        <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-bold bg-slate-800 text-slate-300">
                          {pr.state}
                        </span>
                      </div>
                      <p className="text-slate-400 line-clamp-1">{pr.title}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Evidence & Fact Ledger */}
            <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
                <span>Observable Evidence</span>
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {result.evidence.map((ev, i) => (
                  <div
                    key={i}
                    className="p-2 rounded-xl bg-slate-950 border border-slate-800/80 text-xs space-y-0.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-300">{ev.label}</span>
                      <span
                        className={`text-[9px] font-bold px-1 rounded ${
                          ev.type === 'VERIFIED_FACT'
                            ? 'bg-emerald-950 text-emerald-400'
                            : ev.type === 'ESTIMATE'
                            ? 'bg-amber-950 text-amber-400'
                            : 'bg-blue-950 text-blue-400'
                        }`}
                      >
                        {ev.type}
                      </span>
                    </div>
                    <p className="text-slate-400 text-[11px] leading-relaxed">
                      {ev.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Editable Maintainer Reminder Section */}
          <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <span>Maintainer Check-In Reminder</span>
                  <span className="text-xs font-normal text-slate-400">(Editable Draft)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Review or customize this constructive check-in message, then copy it to the GitHub issue.
                </p>
              </div>

              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white shadow-md shadow-indigo-600/20 transition self-start sm:self-auto"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span>Copy Reminder</span>
                  </>
                )}
              </button>
            </div>

            <textarea
              rows={6}
              value={editableReminder}
              onChange={(e) => setEditableReminder(e.target.value)}
              className="w-full p-4 rounded-xl bg-slate-950 border border-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-xs font-mono text-slate-200 leading-relaxed outline-none transition resize-y"
            />

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400 flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-amber-400 shrink-0" />
              <span>
                <strong>Read-only safeguard:</strong> PRoof never contacts GitHub or posts comments automatically. Copy this reminder to post it manually if appropriate.
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
