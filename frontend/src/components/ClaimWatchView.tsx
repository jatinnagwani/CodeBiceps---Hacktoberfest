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
    <div className="space-y-6 animate-subtle-fade">
      {/* Overview Banner */}
      <div className="p-6 rounded-xl bg-[#101613] border border-[#202B24] shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded border border-[#202B24] bg-[#151C18] text-[#22C77A]">
                Claim Watch
              </span>
              <span className="text-xs text-[#718078]">Conservative Inactivity Triage</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#F3F6F4] mt-1.5">
              Issue Claim Inactivity Checker
            </h1>
            <p className="text-xs sm:text-sm text-[#A0ADA5] max-w-2xl mt-1 leading-relaxed">
              Identify potentially stalled issue claims ("cookie licking") using observable timeline evidence.
              Never infers malicious intent; emphasizes constructive check-ins and offers a copyable polite reminder.
            </p>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#0B100E] border border-[#202B24] text-xs text-[#A0ADA5]">
            <Info className="h-3.5 w-3.5 text-[#22C77A] shrink-0" />
            <span>Read-only: Never writes or closes issues automatically</span>
          </div>
        </div>
      </div>

      {/* Input & Configuration Card */}
      <div className="p-6 rounded-xl bg-[#101613] border border-[#202B24] shadow-sm space-y-4">
        <form onSubmit={handleEvaluate} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#A0ADA5] mb-2">
              GitHub Issue URL
            </label>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={issueUrl}
                onChange={(e) => setIssueUrl(e.target.value)}
                placeholder="https://github.com/owner/repo/issues/123"
                className="flex-1 px-3.5 py-2 rounded-lg bg-[#080B0A] border border-[#202B24] focus:border-[#22C77A] focus:ring-1 focus:ring-[#22C77A] text-sm text-[#F3F6F4] placeholder-[#718078] outline-none transition"
              />
              <button
                type="submit"
                disabled={loading || !issueUrl.trim()}
                className="px-5 py-2 rounded-lg bg-[#22C77A] hover:bg-[#36E39A] disabled:opacity-40 text-[#080B0A] font-semibold text-sm shadow-sm transition shrink-0 flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <div className="h-3.5 w-3.5 border-2 border-[#080B0A]/30 border-t-[#080B0A] rounded-full animate-spin" />
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
              <span className="text-xs text-[#718078] font-medium mr-1">Demo Scenarios:</span>
              {samples.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => handleSelectSample(s)}
                  className={`px-2.5 py-1 text-xs rounded-md border transition ${
                    issueUrl === s.url
                      ? 'bg-[#151C18] text-[#22C77A] border-[#22C77A]/50'
                      : 'bg-[#0B100E] hover:bg-[#151C18] text-[#A0ADA5] hover:text-[#F3F6F4] border-[#202B24]'
                  }`}
                  title={s.notes}
                >
                  {s.title.slice(0, 32)}...
                </button>
              ))}
            </div>
          )}

          {/* Controls: Inactivity Threshold & Demo Mode */}
          <div className="pt-3 border-t border-[#202B24] flex flex-wrap items-center justify-between gap-4 text-xs text-[#A0ADA5]">
            <div className="flex items-center gap-3">
              <Sliders className="h-4 w-4 text-[#22C77A]" />
              <span>Inactivity Threshold:</span>
              <input
                type="range"
                min="3"
                max="30"
                value={thresholdDays}
                onChange={(e) => setThresholdDays(parseInt(e.target.value, 10))}
                className="w-28 accent-[#22C77A] cursor-pointer"
              />
              <span className="font-semibold text-[#F3F6F4] bg-[#151C18] border border-[#202B24] px-2 py-0.5 rounded">
                {thresholdDays} days
              </span>
            </div>

            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={demoMode}
                  onChange={(e) => setDemoMode(e.target.checked)}
                  className="rounded border-[#202B24] bg-[#080B0A] text-[#22C77A] focus:ring-0"
                />
                <span className="text-[#F3F6F4] font-medium">Demo/Sample Mode</span>
              </label>
              <span className="text-[11px] text-[#718078]">
                (Local fixtures without GitHub tokens)
              </span>
            </div>
          </div>
        </form>
      </div>

      {/* Error Card */}
      {error && (
        <div className="p-4 rounded-xl bg-[#151C18] border border-rose-500/40 text-rose-300 text-xs flex items-start gap-3 shadow-sm animate-subtle-fade">
          <AlertCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-rose-200">Evaluation Alert</p>
            <p className="mt-0.5 text-rose-300/90">{error}</p>
          </div>
        </div>
      )}

      {/* Results View */}
      {result && (
        <div className="space-y-6 animate-subtle-fade">
          {/* Status Banner */}
          <div
            className={`p-6 rounded-xl border shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
              result.status === 'ACTIVITY_DETECTED'
                ? 'bg-[#101613] border-[#22C77A]/40 text-[#F3F6F4]'
                : result.status === 'NEEDS_CHECK_IN'
                ? 'bg-[#101613] border-amber-500/40 text-[#F3F6F4]'
                : 'bg-[#101613] border-[#202B24] text-[#F3F6F4]'
            }`}
          >
            <div className="flex items-start gap-4">
              <div
                className={`p-2.5 rounded-lg border ${
                  result.status === 'ACTIVITY_DETECTED'
                    ? 'bg-[#151C18] border-[#22C77A]/30 text-[#22C77A]'
                    : result.status === 'NEEDS_CHECK_IN'
                    ? 'bg-[#151C18] border-amber-500/30 text-amber-400'
                    : 'bg-[#151C18] border-[#202B24] text-[#A0ADA5]'
                }`}
              >
                {result.status === 'ACTIVITY_DETECTED' ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : result.status === 'NEEDS_CHECK_IN' ? (
                  <AlertCircle className="h-5 w-5" />
                ) : (
                  <HelpCircle className="h-5 w-5" />
                )}
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                      result.status === 'ACTIVITY_DETECTED'
                        ? 'border-[#22C77A]/40 bg-[#151C18] text-[#22C77A]'
                        : result.status === 'NEEDS_CHECK_IN'
                        ? 'border-amber-500/40 bg-[#151C18] text-amber-300'
                        : 'border-[#202B24] bg-[#151C18] text-[#A0ADA5]'
                    }`}
                  >
                    {result.status === 'ACTIVITY_DETECTED'
                      ? 'Activity Detected'
                      : result.status === 'NEEDS_CHECK_IN'
                      ? 'Needs a Check-In'
                      : 'Insufficient Information'}
                  </span>
                  {result.isDemoData && (
                    <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#151C18] text-[#22C77A] border border-[#202B24]">
                      Sample Data
                    </span>
                  )}
                </div>
                <h2 className="text-base sm:text-lg font-bold mt-1 text-[#F3F6F4]">{result.statusHeadline}</h2>
                <p className="text-xs text-[#A0ADA5] mt-1 max-w-xl leading-relaxed">
                  {result.notes}
                </p>
              </div>
            </div>

            <div className="flex flex-col items-end text-xs text-[#718078] shrink-0">
              <span>Threshold: {result.inactivityThresholdDays} days</span>
              {result.daysSinceLastActivity !== null && (
                <span className="font-semibold text-[#F3F6F4] mt-0.5">
                  Last observed: {result.daysSinceLastActivity} days ago
                </span>
              )}
            </div>
          </div>

          {/* Details & Telemetry Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Issue Information Card */}
            <div className="p-5 rounded-xl bg-[#101613] border border-[#202B24] space-y-3">
              <div className="text-xs font-semibold uppercase tracking-wider text-[#A0ADA5] flex items-center gap-2">
                <Info className="h-3.5 w-3.5 text-[#22C77A]" />
                <span>Issue Details</span>
              </div>
              <h3 className="text-sm font-semibold text-[#F3F6F4] line-clamp-2">
                {result.issueTitle}
              </h3>
              <a
                href={result.issueUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-[#22C77A] hover:text-[#36E39A] transition"
              >
                <span>{result.owner}/{result.repo}#{result.issueNumber}</span>
                <ExternalLink className="h-3 w-3" />
              </a>

              <div className="pt-2 border-t border-[#202B24] space-y-2 text-xs">
                <div className="flex items-center justify-between text-[#A0ADA5]">
                  <span className="flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5" /> Assignee:
                  </span>
                  <span className="font-semibold text-[#F3F6F4]">
                    {result.assignee ? `@${result.assignee}` : 'Unassigned'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[#A0ADA5]">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" /> Last Activity:
                  </span>
                  <span className="text-[#F3F6F4]">
                    {result.lastObservableActivityAt
                      ? new Date(result.lastObservableActivityAt).toLocaleDateString()
                      : 'Unknown'}
                  </span>
                </div>
              </div>
            </div>

            {/* Linked Pull Requests Card */}
            <div className="p-5 rounded-xl bg-[#101613] border border-[#202B24] space-y-3">
              <div className="text-xs font-semibold uppercase tracking-wider text-[#A0ADA5] flex items-center gap-2">
                <GitPullRequest className="h-3.5 w-3.5 text-[#22C77A]" />
                <span>Linked Pull Requests</span>
              </div>

              {result.linkedPullRequests.length === 0 ? (
                <div className="py-4 text-center text-xs text-[#718078]">
                  No linked pull requests detected on public timeline.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {result.linkedPullRequests.map((pr) => (
                    <div
                      key={pr.number}
                      className="p-2.5 rounded-lg bg-[#0B100E] border border-[#202B24] text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <a
                          href={pr.url}
                          target="_blank"
                          rel="noreferrer"
                          className="font-semibold text-[#F3F6F4] hover:text-[#22C77A] flex items-center gap-1"
                        >
                          <span>PR #{pr.number}</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                        <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-bold bg-[#151C18] text-[#A0ADA5] border border-[#202B24]">
                          {pr.state}
                        </span>
                      </div>
                      <p className="text-[#A0ADA5] line-clamp-1">{pr.title}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Evidence & Fact Ledger */}
            <div className="p-5 rounded-xl bg-[#101613] border border-[#202B24] space-y-3">
              <div className="text-xs font-semibold uppercase tracking-wider text-[#A0ADA5] flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-[#22C77A]" />
                <span>Observable Evidence</span>
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {result.evidence.map((ev, i) => (
                  <div
                    key={i}
                    className="p-2 rounded-lg bg-[#0B100E] border border-[#202B24] text-xs space-y-0.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-[#F3F6F4]">{ev.label}</span>
                      <span
                        className={`text-[9px] font-bold px-1 py-0.2 rounded border ${
                          ev.type === 'VERIFIED_FACT'
                            ? 'bg-[#151C18] border-[#22C77A]/30 text-[#22C77A]'
                            : ev.type === 'ESTIMATE'
                            ? 'bg-[#151C18] border-amber-500/30 text-amber-300'
                            : 'bg-[#151C18] border-[#202B24] text-[#A0ADA5]'
                        }`}
                      >
                        {ev.type}
                      </span>
                    </div>
                    <p className="text-[#A0ADA5] text-[11px] leading-relaxed">
                      {ev.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Editable Maintainer Reminder Section */}
          <div className="p-6 rounded-xl bg-[#101613] border border-[#202B24] shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-[#F3F6F4] flex items-center gap-2">
                  <span>Maintainer Check-In Reminder</span>
                  <span className="text-xs font-normal text-[#718078]">(Editable Draft)</span>
                </h3>
                <p className="text-xs text-[#A0ADA5] mt-0.5">
                  Review or customize this constructive check-in message, then copy it to the GitHub issue.
                </p>
              </div>

              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#22C77A] hover:bg-[#36E39A] text-xs font-semibold text-[#080B0A] shadow-sm transition self-start sm:self-auto cursor-pointer"
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
              className="w-full p-3.5 rounded-lg bg-[#080B0A] border border-[#202B24] focus:border-[#22C77A] focus:ring-1 focus:ring-[#22C77A] text-xs font-mono text-[#F3F6F4] leading-relaxed outline-none transition resize-y"
            />

            <div className="p-3 rounded-lg bg-[#0B100E] border border-[#202B24] text-[11px] text-[#A0ADA5] flex items-center gap-2">
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
