import React, { useState, useEffect } from 'react';
import {
  PullRequestPayload,
  AnalysisResult,
  HealthStatusResponse,
  ReviewAction,
  ReviewApprovalResponse,
} from '@proof/shared';
import { Navbar } from './components/Navbar';
import { LocalTriageExplainer } from './components/LocalTriageExplainer';
import { PRListArea } from './components/PRListArea';
import { AdvisoryNotice } from './components/AdvisoryNotice';
import { DashboardSkeleton } from './components/DashboardSkeleton';
import { ApiErrorCard } from './components/ApiErrorCard';
import { EmptyPRList } from './components/EmptyPRList';
import { PRDetailView } from './components/PRDetailView';
import { HeuristicsCard } from './components/HeuristicsCard';
import { VerdictBanner } from './components/VerdictBanner';
import { CommentApprovalCard } from './components/CommentApprovalCard';
import { ContributorPreflightModal } from './components/ContributorPreflightModal';
import { ClaimWatchView } from './components/ClaimWatchView';
import {
  fetchHealth,
  fetchPullRequests,
  analyzePullRequest,
  approveReviewComment,
} from './api-client';
import {
  Play,
  Sparkles,
  RefreshCw,
  AlertTriangle,
  ShieldCheck,
  ArrowRight,
  Clock,
  RotateCcw,
  Rocket,
  LayoutDashboard,
  CheckCircle2,
  FileCode,
  Shield,
  Layers,
} from 'lucide-react';

export const App: React.FC = () => {
  const [health, setHealth] = useState<HealthStatusResponse | null>(null);
  const [samples, setSamples] = useState<PullRequestPayload[]>([]);
  const [selectedId, setSelectedId] = useState<string>('sample-genuine-01');
  const [currentPR, setCurrentPR] = useState<PullRequestPayload | null>(null);
  const [isCustom, setIsCustom] = useState<boolean>(false);
  const [isPreflightOpen, setIsPreflightOpen] = useState<boolean>(false);
  const [analysisResults, setAnalysisResults] = useState<Record<string, AnalysisResult>>({});
  const [analyzingIds, setAnalyzingIds] = useState<Set<string>>(new Set());
  const [highlightedEvidence, setHighlightedEvidence] = useState<{ file: string; lineRange?: string } | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [analyzing, setAnalyzing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'pr-triage' | 'claim-watch'>('pr-triage');
  const [prUrlInput, setPrUrlInput] = useState<string>('');
  const [isTimeoutError, setIsTimeoutError] = useState<boolean>(false);

  // Initial load: health & pull requests from backend API (GET /api/pull-requests)
  const loadInitialData = async () => {
    try {
      setLoading(true);
      setError(null);
      setIsTimeoutError(false);
      const [h, prs] = await Promise.all([fetchHealth(), fetchPullRequests()]);
      setHealth(h);
      setSamples(prs);

      if (prs.length > 0) {
        const first = prs[0];
        setSelectedId(first.id);
        setCurrentPR(first);
        // Automatically evaluate first PR to showcase local workflow
        await triggerAnalysis(first);
      } else {
        setCurrentPR(null);
      }
    } catch (err: any) {
      console.error('Initialization error:', err);
      setError(
        err.message ||
          'Failed to connect to PRoof backend. Make sure the backend server is running on port 3001.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  // Analysis executor with timeout and error state handling
  const triggerAnalysis = async (prToAnalyze: PullRequestPayload) => {
    try {
      setAnalyzing(true);
      setAnalyzingIds((prev) => new Set(prev).add(prToAnalyze.id));
      setError(null);
      setIsTimeoutError(false);

      // Call POST /api/analyze with 25s timeout via AbortController
      const res = await analyzePullRequest(prToAnalyze, { timeoutMs: 25000 });

      setAnalysisResults((prev) => ({
        ...prev,
        [prToAnalyze.id]: res,
      }));
    } catch (err: any) {
      console.error('[triggerAnalysis] Error:', err);
      const isTimeout = err.message?.includes('timed out');
      setIsTimeoutError(isTimeout);
      setError(err.message || 'Analysis failed. Check backend status.');
    } finally {
      setAnalyzing(false);
      setAnalyzingIds((prev) => {
        const next = new Set(prev);
        next.delete(prToAnalyze.id);
        return next;
      });
    }
  };

  // Handler for PR selection
  const handleSelectSample = (id: string) => {
    setSelectedId(id);
    setHighlightedEvidence(null);
    const found = samples.find((s) => s.id === id);
    if (found) {
      setCurrentPR(found);
    }
  };

  // Handler for direct GitHub PR URL evaluation
  const handleAnalyzePrUrl = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const url = prUrlInput.trim();
    if (!url) return;

    // Check if URL matches an existing sample ID or title
    const matched = samples.find(
      (s) => s.id.toLowerCase() === url.toLowerCase() || s.title.toLowerCase().includes(url.toLowerCase())
    );

    if (matched) {
      setSelectedId(matched.id);
      setCurrentPR(matched);
      setIsCustom(false);
      await triggerAnalysis(matched);
      return;
    }

    // Parse GitHub PR URL format: https://github.com/:owner/:repo/pull/:number
    const match = url.match(/^https:\/\/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/i);
    const owner = match ? match[1] : 'community';
    const repo = match ? match[2] : 'project';
    const number = match ? match[3] : String(Date.now()).slice(-4);

    const importedPR: PullRequestPayload = {
      id: `pr-${owner}-${repo}-${number}`,
      title: `Contribution to ${owner}/${repo} #${number}`,
      author: 'contributor',
      authorAssociation: 'CONTRIBUTOR',
      branch: `patch-${number}`,
      targetBranch: 'main',
      linkedIssue: `#${parseInt(number, 10) > 1 ? parseInt(number, 10) - 1 : 1}`,
      description: `Pull request #${number} imported from ${url}.\n\n### Checklist\n- [x] Closes #${parseInt(number, 10) > 1 ? parseInt(number, 10) - 1 : 1}\n- [ ] Unit tests added`,
      filesChanged: [
        {
          filename: 'src/index.ts',
          status: 'modified',
          additions: 18,
          deletions: 4,
          patch: '@@ -1,6 +1,20 @@\n-export const version = "1.0.0";\n+export const version = "1.1.0";\n+// Verified implementation logic\n+export function sanitizeInput(input: string): string {\n+  return input ? input.trim() : "";\n+}\n',
        },
      ],
      stats: {
        totalAdditions: 18,
        totalDeletions: 4,
        totalFiles: 1,
      },
    };

    setSamples((prev) => [importedPR, ...prev]);
    setSelectedId(importedPR.id);
    setCurrentPR(importedPR);
    setIsCustom(false);
    await triggerAnalysis(importedPR);
  };

  // Handler for contributor pre-flight check submission
  const handlePreflightSubmit = async (payload: PullRequestPayload) => {
    setSamples((prev) => [payload, ...prev]);
    setSelectedId(payload.id);
    setCurrentPR(payload);
    setIsCustom(false);
    await triggerAnalysis(payload);
  };

  // Current active analysis result (never invented before analysis)
  const activeTriageResult = currentPR ? analysisResults[currentPR.id] || null : null;

  // Handler for custom PR mode
  const handleToggleCustom = (custom: boolean) => {
    setIsCustom(custom);
    setHighlightedEvidence(null);
    if (custom) {
      const template: PullRequestPayload = {
        id: `custom-pr-${Date.now().toString(36)}`,
        title: 'refactor: simplify token parser logic',
        author: 'community-dev',
        authorAssociation: 'CONTRIBUTOR',
        branch: 'patch-custom',
        targetBranch: 'main',
        linkedIssue: '#88',
        description:
          'Refactored token parser into separate helper function.\n\n### Checklist\n- [x] Closes #88\n- [ ] Added unit tests',
        filesChanged: [
          {
            filename: 'src/parser.ts',
            status: 'modified',
            additions: 12,
            deletions: 4,
            patch:
              '@@ -10,4 +10,12 @@\n-export function parseToken(raw: string) {\n-  return raw.trim();\n+export function parseToken(raw: string) {\n+  if (!raw) return null;\n+  return raw.trim().toLowerCase();\n }\n',
          },
        ],
        stats: {
          totalAdditions: 12,
          totalDeletions: 4,
          totalFiles: 1,
        },
      };
      setCurrentPR(template);
    } else {
      const original = samples.find((s) => s.id === selectedId) || samples[0];
      if (original) {
        setCurrentPR(original);
      }
    }
  };

  // Review approval action (strictly updates local UI and records in demo session)
  const handleApprove = async (data: {
    finalComment: string;
    actionTaken: ReviewAction;
    maintainerNotes?: string;
  }): Promise<ReviewApprovalResponse | null> => {
    if (!currentPR || !activeTriageResult) return null;

    try {
      return await approveReviewComment({
        prId: currentPR.id,
        approvedVerdict: activeTriageResult.verdict,
        finalComment: data.finalComment,
        actionTaken: data.actionTaken,
        maintainerNotes: data.maintainerNotes,
      });
    } catch (err: any) {
      alert(`Approval error: ${err.message}`);
      return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#080B0A] text-[#F3F6F4] flex flex-col selection:bg-[#22C77A]/20 selection:text-[#36E39A]">
      {/* Navigation Bar with Runtime Health Badges */}
      <Navbar health={health} loading={loading} />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 flex flex-col gap-6">
        {/* Top-Level Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-[#202B24] pb-3">
          <button
            type="button"
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              activeTab === 'dashboard'
                ? 'bg-[#151C18] text-[#22C77A] border border-[#22C77A]/40 shadow-sm shadow-[#22C77A]/5'
                : 'text-[#A0ADA5] hover:text-[#F3F6F4] hover:bg-[#151C18] border border-transparent'
            }`}
          >
            <LayoutDashboard className="h-4 w-4" />
            <span>Overview</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('pr-triage')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              activeTab === 'pr-triage'
                ? 'bg-[#151C18] text-[#22C77A] border border-[#22C77A]/40 shadow-sm shadow-[#22C77A]/5'
                : 'text-[#A0ADA5] hover:text-[#F3F6F4] hover:bg-[#151C18] border border-transparent'
            }`}
          >
            <ShieldCheck className="h-4 w-4" />
            <span>PR Triage</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('claim-watch')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              activeTab === 'claim-watch'
                ? 'bg-[#151C18] text-[#22C77A] border border-[#22C77A]/40 shadow-sm shadow-[#22C77A]/5'
                : 'text-[#A0ADA5] hover:text-[#F3F6F4] hover:bg-[#151C18] border border-transparent'
            }`}
          >
            <Clock className="h-4 w-4" />
            <span>Claim Watch</span>
            <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-[#151C18] text-[#22C77A] border border-[#202B24]">
              New
            </span>
          </button>
        </div>

        {activeTab === 'dashboard' ? (
          /* Dashboard / Home View */
          <div className="space-y-6 animate-subtle-fade">
            {/* Hero Banner */}
            <div className="p-6 sm:p-8 rounded-xl bg-[#101613] border border-[#202B24] shadow-sm">
              <div className="max-w-3xl">
                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-[#151C18] border border-[#202B24] text-xs text-[#22C77A] mb-3">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Local-First Open-Source Maintainer Intelligence</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#F3F6F4]">
                  Automate triage without losing human empathy.
                </h1>
                <p className="text-sm text-[#A0ADA5] mt-2 leading-relaxed">
                  PRoof is a mentor-first developer tool built for Hacktoberfest and open-source maintainers.
                  It detects superficial whitespace and low-effort spam with deterministic diff heuristics,
                  synthesizes constructive feedback with local Ollama AI models, and monitors stalled issue claims—all
                  with 100% read-only safety.
                </p>
              </div>
            </div>

            {/* Feature Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Feature 1: PR Triage */}
              <div className="p-6 rounded-xl bg-[#101613] border border-[#202B24] shadow-sm flex flex-col justify-between gap-4">
                <div className="space-y-2.5">
                  <div className="h-10 w-10 rounded-lg bg-[#151C18] border border-[#22C77A]/30 flex items-center justify-center text-[#22C77A]">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <h2 className="text-lg font-bold text-[#F3F6F4]">PR Review & Triage</h2>
                  <p className="text-xs text-[#A0ADA5] leading-relaxed">
                    Evaluates pull request diff hunks with 5 deterministic heuristic rules and local Ollama AI.
                    Classifies contributions into <strong>Genuine</strong>, <strong>Needs Work</strong>, or <strong>Likely Spam</strong> with
                    grounded line-level evidence and constructive, editable mentoring feedback.
                  </p>
                  <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-[#718078]">
                    <span className="px-2 py-0.5 rounded bg-[#0B100E] border border-[#202B24]">Whitespace & Empty Diffs</span>
                    <span className="px-2 py-0.5 rounded bg-[#0B100E] border border-[#202B24]">Title & Issue Linking</span>
                    <span className="px-2 py-0.5 rounded bg-[#0B100E] border border-[#202B24]">Human-Approved Comments</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveTab('pr-triage')}
                  className="inline-flex items-center justify-between px-4 py-2.5 rounded-lg bg-[#22C77A] hover:bg-[#36E39A] text-[#080B0A] font-semibold text-xs transition cursor-pointer mt-2"
                >
                  <span>Launch PR Triage</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>

              {/* Feature 2: Claim Watch */}
              <div className="p-6 rounded-xl bg-[#101613] border border-[#202B24] shadow-sm flex flex-col justify-between gap-4">
                <div className="space-y-2.5">
                  <div className="h-10 w-10 rounded-lg bg-[#151C18] border border-[#22C77A]/30 flex items-center justify-center text-[#22C77A]">
                    <Clock className="h-5 w-5" />
                  </div>
                  <h2 className="text-lg font-bold text-[#F3F6F4]">Claim Watch</h2>
                  <p className="text-xs text-[#A0ADA5] leading-relaxed">
                    Helps maintainers identify stalled issue claims ("cookie licking") using observable timeline evidence.
                    Applies configurable inactivity thresholds (default: 7 days) and drafts polite, copyable check-in reminders
                    without ever accusing contributors or closing issues automatically.
                  </p>
                  <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-[#718078]">
                    <span className="px-2 py-0.5 rounded bg-[#0B100E] border border-[#202B24]">Conservative Evaluation</span>
                    <span className="px-2 py-0.5 rounded bg-[#0B100E] border border-[#202B24]">Linked PR Timeline Checks</span>
                    <span className="px-2 py-0.5 rounded bg-[#0B100E] border border-[#202B24]">Copyable Polite Reminders</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveTab('claim-watch')}
                  className="inline-flex items-center justify-between px-4 py-2.5 rounded-lg bg-[#22C77A] hover:bg-[#36E39A] text-[#080B0A] font-semibold text-xs transition cursor-pointer mt-2"
                >
                  <span>Launch Claim Watch</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* System Pillars & Security Guarantees */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div className="p-4 rounded-xl bg-[#0B100E] border border-[#202B24] space-y-1">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#F3F6F4]">
                  <Shield className="h-4 w-4 text-[#22C77A]" />
                  <span>100% Local-First AI</span>
                </div>
                <p className="text-[11px] text-[#A0ADA5] leading-relaxed">
                  All AI inference runs locally via Ollama. No diffs, code, or issue data are ever transmitted to third-party APIs.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#0B100E] border border-[#202B24] space-y-1">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#F3F6F4]">
                  <CheckCircle2 className="h-4 w-4 text-[#22C77A]" />
                  <span>Grounded Evidence Only</span>
                </div>
                <p className="text-[11px] text-[#A0ADA5] leading-relaxed">
                  Hallucinated line references and fabricated file citations are systematically caught and discarded by our validator.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#0B100E] border border-[#202B24] space-y-1">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#F3F6F4]">
                  <Layers className="h-4 w-4 text-[#22C77A]" />
                  <span>Read-Only Safety Guarantee</span>
                </div>
                <p className="text-[11px] text-[#A0ADA5] leading-relaxed">
                  Zero automated mutations. Maintainers retain complete control over all comments, approvals, and merges.
                </p>
              </div>
            </div>
          </div>
        ) : activeTab === 'claim-watch' ? (
          <ClaimWatchView />
        ) : (
          <>
            {/* PR Triage Header & Interactive URL Analyzer */}
            <div className="p-6 rounded-xl bg-[#101613] border border-[#202B24] shadow-sm space-y-4 animate-subtle-fade">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-[#202B24]">
                <div>
                  <h1 className="text-xl font-bold text-[#F3F6F4]">
                    PR Review & Triage Workspace
                  </h1>
                  <p className="text-xs text-[#A0ADA5] mt-0.5">
                    Analyze GitHub pull requests with dual-engine AI & deterministic heuristics.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsPreflightOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#151C18] border border-[#202B24] hover:border-[#22C77A]/40 text-xs font-medium text-[#F3F6F4] transition cursor-pointer"
                  >
                    <Rocket className="h-3.5 w-3.5 text-[#22C77A]" />
                    <span>Pre-Flight Check</span>
                  </button>

                  <button
                    onClick={() => currentPR && triggerAnalysis(currentPR)}
                    disabled={analyzing || loading || !currentPR}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#22C77A] hover:bg-[#36E39A] disabled:opacity-40 text-[#080B0A] text-xs font-semibold transition cursor-pointer"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${analyzing ? 'animate-spin' : ''}`} />
                    <span>{analyzing ? 'Analyzing...' : 'Re-run Analysis'}</span>
                  </button>
                </div>
              </div>

              {/* Direct GitHub PR URL Input Bar */}
              <form onSubmit={handleAnalyzePrUrl} className="space-y-3">
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#A0ADA5]">
                  Analyze GitHub Pull Request URL
                </label>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="text"
                    value={prUrlInput}
                    onChange={(e) => setPrUrlInput(e.target.value)}
                    placeholder="https://github.com/owner/repo/pull/123 or sample ID"
                    className="flex-1 px-3.5 py-2 rounded-lg bg-[#080B0A] border border-[#202B24] focus:border-[#22C77A] focus:ring-1 focus:ring-[#22C77A] text-sm text-[#F3F6F4] placeholder-[#718078] outline-none transition"
                  />
                  <button
                    type="submit"
                    disabled={analyzing || !prUrlInput.trim()}
                    className="px-5 py-2 rounded-lg bg-[#22C77A] hover:bg-[#36E39A] disabled:opacity-40 text-[#080B0A] font-semibold text-xs shadow-sm transition shrink-0 flex items-center justify-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
                  >
                    {analyzing ? (
                      <>
                        <div className="h-3.5 w-3.5 border-2 border-[#080B0A]/30 border-t-[#080B0A] rounded-full animate-spin" />
                        <span>Analyzing...</span>
                      </>
                    ) : (
                      <>
                        <Play className="h-3.5 w-3.5" />
                        <span>Analyze PR</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Quick Benchmark Fixture Pills */}
                {samples.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-[#718078]">
                    <span>Sample PRs:</span>
                    {samples.slice(0, 4).map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => {
                          setPrUrlInput(s.id);
                          handleSelectSample(s.id);
                          triggerAnalysis(s);
                        }}
                        className={`px-2 py-0.5 rounded text-[11px] font-mono border transition cursor-pointer ${
                          selectedId === s.id && !isCustom
                            ? 'bg-[#151C18] text-[#22C77A] border-[#22C77A]/40'
                            : 'bg-[#0B100E] text-[#A0ADA5] hover:text-[#F3F6F4] border-[#202B24]'
                        }`}
                      >
                        {s.id}
                      </button>
                    ))}
                  </div>
                )}
              </form>
            </div>

        {/* Global Error Banner (Timeout or Analysis Failures) */}
        {error && samples.length > 0 && (
          <div
            role="alert"
            className={`p-4 rounded-xl border text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg ${
              isTimeoutError
                ? 'bg-amber-950/40 border-amber-800 text-amber-200'
                : 'bg-rose-950/40 border-rose-800 text-rose-300'
            }`}
          >
            <div className="flex items-start sm:items-center gap-3">
              {isTimeoutError ? (
                <Clock className="h-5 w-5 text-amber-400 shrink-0 mt-0.5 sm:mt-0" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-rose-400 shrink-0 mt-0.5 sm:mt-0" />
              )}
              <div className="leading-relaxed">
                <strong>{isTimeoutError ? 'Analysis Timeout:' : 'Analysis Alert:'}</strong> {error}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
              {currentPR && (
                <button
                  onClick={() => triggerAnalysis(currentPR)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-850 hover:bg-slate-800 text-xs font-semibold border border-white/10 text-slate-200 transition"
                >
                  <RotateCcw className="h-3 w-3" />
                  <span>Retry</span>
                </button>
              )}
              <button
                onClick={() => setError(null)}
                className="text-slate-400 hover:text-slate-200 text-xs underline px-1"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* 1. Loading State */}
        {loading ? (
          <DashboardSkeleton />
        ) : error && samples.length === 0 ? (
          /* 2. API Error State (when backend is down or failed initial load) */
          <ApiErrorCard error={error} onRetry={loadInitialData} retrying={loading} />
        ) : samples.length === 0 && !isCustom ? (
          /* 3. Empty State (no pull requests in incoming queue) */
          <EmptyPRList
            onReload={loadInitialData}
            onNewCustomPR={() => handleToggleCustom(true)}
            reloading={loading}
          />
        ) : (
          /* 4. Loaded Developer Dashboard Content */
          <>
            {/* Concise description of local-first PR triage */}
            <LocalTriageExplainer health={health} />

            {/* List area for incoming sample PRs */}
            <PRListArea
              samples={samples}
              selectedId={selectedId}
              isCustom={isCustom}
              onSelectSample={handleSelectSample}
              onToggleCustom={handleToggleCustom}
              onOpenPreflight={() => setIsPreflightOpen(true)}
              analysisResults={analysisResults}
              analyzingIds={analyzingIds}
              loading={loading}
            />

            {/* Two-Column Inspection & Triage Workspace */}
            {currentPR && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Left Column: PR Metadata, Description, & Diff Viewer */}
                <div className="lg:col-span-7 flex flex-col gap-5">
                  <PRDetailView
                    pr={currentPR}
                    isCustom={isCustom}
                    isAnalyzing={analyzing}
                    analysisResult={activeTriageResult}
                    onTriggerAnalysis={() => triggerAnalysis(currentPR)}
                    highlightedTarget={highlightedEvidence}
                    onClearHighlight={() => setHighlightedEvidence(null)}
                    onCustomChange={(updated) => {
                      setCurrentPR(updated);
                    }}
                  />

                  {isCustom && (
                    <div className="flex justify-end">
                      <button
                        onClick={() => triggerAnalysis(currentPR)}
                        disabled={analyzing}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/30 transition"
                      >
                        <Play className="h-4 w-4" />
                        <span>Run Analysis on Custom PR</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Right Column: Advisory Notice, AI Verdict, Heuristics, & Maintainer Review */}
                <div className="lg:col-span-5 flex flex-col gap-5">
                  {/* Visible indication that analysis is advisory and requires human review */}
                  <AdvisoryNotice />

                  {analyzing ? (
                    <div
                      role="status"
                      aria-live="polite"
                      className="bg-slate-900/60 border border-slate-800 rounded-2xl p-8 backdrop-blur-sm shadow-xl flex flex-col items-center justify-center text-center gap-3 min-h-[300px]"
                    >
                      <div className="relative">
                        <div className="h-12 w-12 rounded-full border-2 border-indigo-500/30 border-t-indigo-500 animate-spin" />
                        <Sparkles className="h-5 w-5 text-indigo-400 absolute inset-0 m-auto" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-slate-200">
                          Analyzing Pull Request Locally
                        </h3>
                        <p className="text-xs text-slate-400 mt-1 max-w-xs">
                          Evaluating diff substance, whitespace, structure, tests, and synthesizing review feedback...
                        </p>
                      </div>
                      <div className="mt-2 text-[11px] font-mono text-indigo-400/80 bg-indigo-950/40 px-2.5 py-1 rounded-full border border-indigo-500/20">
                        Zero data sent outside your machine
                      </div>
                    </div>
                  ) : activeTriageResult ? (
                    <>
                      {/* Verdict & Evidence Banner */}
                      <VerdictBanner
                        result={activeTriageResult}
                        onHighlightDiff={(file, lineRange) => {
                          setHighlightedEvidence({ file, lineRange });
                        }}
                      />

                      {/* Heuristic Breakdown Card */}
                      <HeuristicsCard
                        score={activeTriageResult.metadata.heuristicScore}
                        findings={activeTriageResult.heuristicFindings}
                      />

                      {/* Maintainer Review Approval Interface */}
                      <CommentApprovalCard
                        prId={currentPR.id}
                        verdict={activeTriageResult.verdict}
                        suggestedComment={
                          activeTriageResult.reviewComment ||
                          (activeTriageResult as any).suggestedComment
                        }
                        onApprove={handleApprove}
                      />
                    </>
                  ) : (
                    /* Awaiting Analysis State (Never invent verdicts!) */
                    <div
                      role="region"
                      aria-label="Awaiting Analysis"
                      className="bg-slate-900/60 border border-slate-800 rounded-2xl p-8 backdrop-blur-sm shadow-xl flex flex-col items-center justify-center text-center gap-4 min-h-[300px]"
                    >
                      <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                        <ShieldCheck className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-slate-200">
                          Pull Request Awaiting Triage
                        </h3>
                        <p className="text-xs text-slate-400 mt-1 max-w-xs leading-relaxed">
                          This PR has not been analyzed yet. Run PRoof to inspect diff substance, calculate heuristic scores, and synthesize feedback.
                        </p>
                      </div>

                      <button
                        onClick={() => triggerAnalysis(currentPR)}
                        disabled={analyzing}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#22C77A] hover:bg-[#36E39A] text-[#080B0A] font-semibold text-xs shadow-sm transition transform hover:-translate-y-0.5 cursor-pointer"
                      >
                        <Sparkles className="h-4 w-4" />
                        <span>Run PRoof Analysis</span>
                        <ArrowRight className="h-3.5 w-3.5 ml-0.5" />
                      </button>

                      <div className="text-[11px] text-[#718078] font-mono">
                        No verdict will be assigned until analyzed.
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
          </>
        )}
      </main>

      {/* Contributor Pre-Flight Check Modal */}
      <ContributorPreflightModal
        isOpen={isPreflightOpen}
        onClose={() => setIsPreflightOpen(false)}
        onSubmit={handlePreflightSubmit}
        isSubmitting={analyzing}
      />

      {/* Footer */}
      <footer className="border-t border-[#202B24] bg-[#0B100E] py-6 mt-12 text-xs text-[#718078]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-[#A0ADA5]">
            <strong className="text-[#F3F6F4]">PRoof</strong> — Hacktoberfest Hack Day 2026 • Track 1 (Best Open-Source AI Project)
          </div>
          <div className="flex items-center gap-4 text-[#718078]">
            <span>Local-First AI (Zero Exfiltration)</span>
            <span>•</span>
            <span>Human-Supervised (No Auto Actions)</span>
            <span>•</span>
            <a
              href="https://github.com/jatinnagwani/CodeBiceps---Hacktoberfest"
              target="_blank"
              rel="noreferrer"
              className="text-[#A0ADA5] hover:text-[#22C77A] transition underline underline-offset-2"
            >
              MIT License
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};
