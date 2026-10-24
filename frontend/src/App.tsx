import React, { useState, useEffect } from 'react';
import {
  PullRequestPayload,
  TriageResult,
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
import {
  fetchHealth,
  fetchSamples,
  analyzePullRequest,
  approveReviewComment,
} from './api-client';
import { Play, Sparkles, RefreshCw, AlertTriangle, ShieldCheck } from 'lucide-react';

export const App: React.FC = () => {
  const [health, setHealth] = useState<HealthStatusResponse | null>(null);
  const [samples, setSamples] = useState<PullRequestPayload[]>([]);
  const [selectedId, setSelectedId] = useState<string>('sample-genuine-01');
  const [currentPR, setCurrentPR] = useState<PullRequestPayload | null>(null);
  const [isCustom, setIsCustom] = useState<boolean>(false);
  const [triageResult, setTriageResult] = useState<TriageResult | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [analyzing, setAnalyzing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Initial load: health & samples from backend API
  const loadInitialData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [h, s] = await Promise.all([fetchHealth(), fetchSamples()]);
      setHealth(h);
      setSamples(s);

      if (s.length > 0) {
        const first = s[0];
        setSelectedId(first.id);
        setCurrentPR(first);
        await triggerAnalysis(first);
      } else {
        setCurrentPR(null);
        setTriageResult(null);
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

  // Handler for sample selection
  const handleSelectSample = async (id: string) => {
    setSelectedId(id);
    const found = samples.find((s) => s.id === id);
    if (found) {
      setCurrentPR(found);
      await triggerAnalysis(found);
    }
  };

  // Handler for custom PR mode
  const handleToggleCustom = (custom: boolean) => {
    setIsCustom(custom);
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
      triggerAnalysis(template);
    } else {
      const original = samples.find((s) => s.id === selectedId) || samples[0];
      if (original) {
        setCurrentPR(original);
        triggerAnalysis(original);
      }
    }
  };

  // Analysis executor
  const triggerAnalysis = async (prToAnalyze: PullRequestPayload) => {
    try {
      setAnalyzing(true);
      setError(null);
      const res = await analyzePullRequest(prToAnalyze);
      setTriageResult(res);
    } catch (err: any) {
      setError(err.message || 'Analysis failed');
    } finally {
      setAnalyzing(false);
    }
  };

  // Review approval action
  const handleApprove = async (data: {
    finalComment: string;
    actionTaken: ReviewAction;
    maintainerNotes?: string;
  }): Promise<ReviewApprovalResponse | null> => {
    if (!currentPR || !triageResult) return null;

    try {
      return await approveReviewComment({
        prId: currentPR.id,
        approvedVerdict: triageResult.verdict,
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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Navigation Bar with Runtime Health Badges */}
      <Navbar health={health} loading={loading} />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 flex flex-col gap-6">
        {/* Title Bar & Quick Action */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-800/80">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="p-1.5 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-600/30">
                <ShieldCheck className="h-5 w-5" />
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                PR Review & Triage Dashboard
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl leading-relaxed">
              Local-first triage pipeline designed to protect maintainers against spam while mentoring
              first-time contributors through evidence-backed, human-approved reviews.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => currentPR && triggerAnalysis(currentPR)}
              disabled={analyzing || loading || !currentPR}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700/80 text-xs font-semibold shadow-sm transition disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${analyzing ? 'animate-spin text-indigo-400' : ''}`} />
              <span>{analyzing ? 'Analyzing PR...' : 'Re-run Analysis'}</span>
            </button>
          </div>
        </header>

        {/* Global Inline Error (when PR analysis fails but app is otherwise loaded) */}
        {error && samples.length > 0 && (
          <div
            role="alert"
            className="p-4 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-300 text-xs flex items-center gap-3 shadow-lg"
          >
            <AlertTriangle className="h-5 w-5 text-rose-400 shrink-0" />
            <div className="flex-1">
              <strong>Analysis Alert:</strong> {error}
            </div>
            <button
              onClick={() => setError(null)}
              className="text-rose-400 hover:text-rose-200 text-xs underline"
            >
              Dismiss
            </button>
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
            />

            {/* Two-Column Inspection & Triage Workspace */}
            {currentPR && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Left Column: PR Metadata, Description, & Diff Viewer */}
                <div className="lg:col-span-7 flex flex-col gap-5">
                  <PRDetailView
                    pr={currentPR}
                    isCustom={isCustom}
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
                  ) : triageResult ? (
                    <>
                      {/* Verdict & Evidence Banner */}
                      <VerdictBanner result={triageResult} />

                      {/* Heuristic Breakdown Card */}
                      <HeuristicsCard
                        score={triageResult.metadata.heuristicScore}
                        findings={triageResult.heuristicFindings}
                      />

                      {/* Maintainer Review Approval Interface */}
                      <CommentApprovalCard
                        prId={currentPR.id}
                        verdict={triageResult.verdict}
                        suggestedComment={triageResult.suggestedComment}
                        onApprove={handleApprove}
                      />
                    </>
                  ) : null}
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-6 mt-12 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>
            <strong>PRoof</strong> — Hacktoberfest Hack Day 2026 • Track 1 (Best Open-Source AI Project)
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <span>Local-First AI (Zero Exfiltration)</span>
            <span>•</span>
            <span>Human-Supervised (No Auto Actions)</span>
            <span>•</span>
            <a
              href="https://github.com/jatinnagwani/CodeBiceps---Hacktoberfest"
              target="_blank"
              rel="noreferrer"
              className="hover:text-slate-200 transition underline underline-offset-2"
            >
              MIT License
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};
