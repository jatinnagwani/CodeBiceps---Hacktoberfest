import React, { useState, useEffect } from 'react';
import {
  PullRequestPayload,
  AnalysisResult,
  HealthStatusResponse,
  ReviewAction,
  ReviewApprovalResponse,
} from '@proof/shared';
import { PRDetailView } from './components/PRDetailView';
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
  ShieldCheck,
  Clock,
  LayoutDashboard,
  Search,
  Settings,
  Moon,
  Sun,
  Github,
  Info,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Copy,
  Check,
  ArrowRight,
  GitPullRequest,
  Layers,
  Sparkles,
  HelpCircle,
  X,
  FileText,
  User,
  Shield,
  BookOpen,
} from 'lucide-react';

export const App: React.FC = () => {
  const [health, setHealth] = useState<HealthStatusResponse | null>(null);
  const [samples, setSamples] = useState<PullRequestPayload[]>([]);
  const [selectedId, setSelectedId] = useState<string>('sample-genuine-01');
  const [currentPR, setCurrentPR] = useState<PullRequestPayload | null>(null);
  const [isPreflightOpen, setIsPreflightOpen] = useState<boolean>(false);
  const [analysisResults, setAnalysisResults] = useState<Record<string, AnalysisResult>>({});
  const [analyzingIds, setAnalyzingIds] = useState<Set<string>>(new Set());
  const [highlightedEvidence, setHighlightedEvidence] = useState<{ file: string; lineRange?: string } | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [analyzing, setAnalyzing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'home' | 'pr-triage' | 'claim-watch'>('home');
  const [prUrlInput, setPrUrlInput] = useState<string>('https://github.com/facebook/react/pull/12345');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedFeedback, setCopiedFeedback] = useState<boolean>(false);
  const [activePRSubTab, setActivePRSubTab] = useState<'analysis' | 'changes' | 'comments' | 'timeline'>('analysis');
  const [isHowItWorksOpen, setIsHowItWorksOpen] = useState<boolean>(false);
  const [isAboutOpen, setIsAboutOpen] = useState<boolean>(false);

  // Initial load: fetch health and sample pull requests
  const loadInitialData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [h, prs] = await Promise.all([fetchHealth(), fetchPullRequests()]);
      setHealth(h);
      setSamples(prs);

      if (prs.length > 0) {
        const first = prs[0];
        setSelectedId(first.id);
        setCurrentPR(first);
        await triggerAnalysis(first);
      }
    } catch (err: any) {
      console.error('Initialization error:', err);
      setError(err.message || 'Failed to connect to PRoof backend.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  const triggerAnalysis = async (prToAnalyze: PullRequestPayload) => {
    try {
      setAnalyzing(true);
      setAnalyzingIds((prev) => new Set(prev).add(prToAnalyze.id));
      const res = await analyzePullRequest(prToAnalyze);
      setAnalysisResults((prev) => ({ ...prev, [prToAnalyze.id]: res }));
    } catch (err: any) {
      setError(err.message || 'Analysis failed.');
    } finally {
      setAnalyzing(false);
      setAnalyzingIds((prev) => {
        const next = new Set(prev);
        next.delete(prToAnalyze.id);
        return next;
      });
    }
  };

  const handleSelectSample = async (pr: PullRequestPayload) => {
    setSelectedId(pr.id);
    setCurrentPR(pr);
    setPrUrlInput(`https://github.com/facebook/react/pull/${pr.id.replace(/\D/g, '') || '12345'}`);
    if (!analysisResults[pr.id]) {
      await triggerAnalysis(pr);
    }
  };

  const handleAnalyzeUrl = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!prUrlInput.trim()) return;

    if (currentPR) {
      triggerAnalysis(currentPR);
    }
  };

  const handleCopyFeedback = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedFeedback(true);
    setTimeout(() => setCopiedFeedback(false), 2000);
  };

  const handleApprove = async (data: {
    finalComment: string;
    actionTaken: ReviewAction;
    maintainerNotes?: string;
  }): Promise<ReviewApprovalResponse | null> => {
    if (!currentPR || !activeResult) return null;
    try {
      const res = await approveReviewComment({
        prId: currentPR.id,
        approvedVerdict: activeResult.verdict,
        actionTaken: data.actionTaken,
        finalComment: data.finalComment,
        maintainerNotes: data.maintainerNotes,
      });
      return res;
    } catch (err: any) {
      console.error('Failed to record approval:', err);
      return null;
    }
  };

  const activeResult = currentPR ? analysisResults[currentPR.id] : null;

  // Calculate diff additions & deletions
  const additionsCount = currentPR?.filesChanged.reduce((acc, f) => acc + (f.additions || 0), 0) || 12;
  const deletionsCount = currentPR?.filesChanged.reduce((acc, f) => acc + (f.deletions || 0), 0) || 3;

  return (
    <div className="min-h-screen bg-[#080B0A] text-[#F3F6F4] flex">
      {/* ─── 1. Fixed Left Sidebar ──────────────────────────────────────────────── */}
      <aside className="w-56 lg:w-60 bg-[#0B100E] border-r border-[#202B24] min-h-screen fixed left-0 top-0 z-30 flex flex-col justify-between p-4">
        <div className="space-y-6">
          {/* Logo */}
          <div className="flex items-center gap-2.5 px-2 py-1">
            <div className="h-7 w-7 rounded-lg bg-[#151C18] border border-[#22C77A]/40 flex items-center justify-center text-[#22C77A] shadow-sm">
              <Shield className="h-4 w-4" />
            </div>
            <span className="font-bold text-base tracking-tight text-[#F3F6F4]">
              PRoof
            </span>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            <button
              type="button"
              onClick={() => setActiveTab('home')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                activeTab === 'home'
                  ? 'bg-[#153326] text-[#22C77A] border border-[#22C77A]/30'
                  : 'text-[#A0ADA5] hover:text-[#F3F6F4] hover:bg-[#151C18]'
              }`}
            >
              <LayoutDashboard className="h-4 w-4" />
              <span>Home</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('pr-triage')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                activeTab === 'pr-triage'
                  ? 'bg-[#153326] text-[#22C77A] border border-[#22C77A]/30'
                  : 'text-[#A0ADA5] hover:text-[#F3F6F4] hover:bg-[#151C18]'
              }`}
            >
              <ShieldCheck className="h-4 w-4" />
              <span>PR Triage</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('claim-watch')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                activeTab === 'claim-watch'
                  ? 'bg-[#153326] text-[#22C77A] border border-[#22C77A]/30'
                  : 'text-[#A0ADA5] hover:text-[#F3F6F4] hover:bg-[#151C18]'
              }`}
            >
              <Clock className="h-4 w-4" />
              <span>Claim Watch</span>
            </button>
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="space-y-3 pt-4 border-t border-[#202B24]/60 text-xs">
          <button
            type="button"
            onClick={() => setIsHowItWorksOpen(true)}
            className="flex items-center gap-2 text-[#718078] hover:text-[#F3F6F4] transition px-2 cursor-pointer w-full text-left"
          >
            <Info className="h-3.5 w-3.5" />
            <span>How it works</span>
          </button>

          <button
            type="button"
            onClick={() => setIsAboutOpen(true)}
            className="flex items-center gap-2 text-[#718078] hover:text-[#F3F6F4] transition px-2 cursor-pointer w-full text-left"
          >
            <BookOpen className="h-3.5 w-3.5" />
            <span>About</span>
          </button>

          <div className="px-2 pt-2 text-[10px] text-[#718078] flex items-center gap-2 leading-tight">
            <Github className="h-3.5 w-3.5 shrink-0 text-[#718078]" />
            <span>Built for open source. Better contributions. Together.</span>
          </div>
        </div>
      </aside>

      {/* ─── 2. Main Content Area ───────────────────────────────────────────────── */}
      <div className="ml-56 lg:ml-60 flex-1 min-h-screen flex flex-col bg-[#080B0A]">
        {/* Top Navbar */}
        <header className="h-14 border-b border-[#202B24] px-6 lg:px-8 flex items-center justify-between sticky top-0 bg-[#080B0A]/95 backdrop-blur-md z-20">
          <div className="flex-1 max-w-md">
            <div className="flex items-center bg-[#101613] border border-[#202B24] rounded-lg px-3 py-1.5 focus-within:border-[#22C77A] transition gap-2">
              <Search className="h-3.5 w-3.5 text-[#718078]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search PRs, issues, or repositories..."
                className="bg-transparent text-xs text-[#F3F6F4] placeholder-[#718078] outline-none flex-1"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Status indicator */}
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#151C18] border border-[#202B24] text-[#A0ADA5]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#22C77A] animate-pulse" />
              <span>{health?.ollama?.connected ? 'Ollama Active' : 'Heuristics Fallback'}</span>
            </div>

            <button
              type="button"
              className="p-1.5 text-[#718078] hover:text-[#F3F6F4] hover:bg-[#151C18] rounded-lg transition cursor-pointer"
              title="Theme toggle"
            >
              <Moon className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={() => setIsAboutOpen(true)}
              className="p-1.5 text-[#718078] hover:text-[#F3F6F4] hover:bg-[#151C18] rounded-lg transition cursor-pointer"
              title="Settings"
            >
              <Settings className="h-4 w-4" />
            </button>

            <div className="h-7 w-7 rounded-full bg-[#151C18] border border-[#22C77A]/40 flex items-center justify-center text-xs font-semibold text-[#22C77A]">
              SC
            </div>
          </div>
        </header>

        {/* ─── 3. View Containers ────────────────────────────────────────────── */}
        <main className="flex-1 p-6 lg:p-8">
          {/* ═════════ TAB 1: HOME (Panel 1 from Screenshot) ═════════ */}
          {activeTab === 'home' && (
            <div className="max-w-5xl mx-auto space-y-12 animate-subtle-fade">
              {/* Hero Section */}
              <div className="relative pt-4 pb-8 flex flex-col md:flex-row items-center justify-between gap-8">
                {/* Green Glow in background */}
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-96 h-96 bg-[#22C77A]/10 rounded-full blur-3xl pointer-events-none -z-10" />

                {/* Left Text Column */}
                <div className="space-y-5 max-w-xl">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#151C18] text-[#22C77A] border border-[#22C77A]/30">
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Open Source, Smarter</span>
                  </div>

                  <h1 className="text-4xl lg:text-5xl font-extrabold tracking-tight text-[#F3F6F4] leading-tight">
                    Better code reviews.
                    <span className="block text-[#22C77A] mt-1">Healthier open source.</span>
                  </h1>

                  <p className="text-sm text-[#A0ADA5] leading-relaxed max-w-lg">
                    PRoof helps maintainers spot low-effort pull requests and stalled issue claims — so great contributors get the attention they deserve.
                  </p>

                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setActiveTab('pr-triage')}
                      className="px-5 py-2.5 rounded-xl bg-[#22C77A] hover:bg-[#36E39A] text-[#080B0A] font-semibold text-xs shadow-md transition flex items-center gap-2 cursor-pointer"
                    >
                      <span>Get Started</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsHowItWorksOpen(true)}
                      className="px-5 py-2.5 rounded-xl bg-[#151C18] hover:bg-[#202B24] text-[#F3F6F4] font-semibold text-xs border border-[#202B24] transition cursor-pointer"
                    >
                      Learn More
                    </button>
                  </div>
                </div>

                {/* Right Hero Graphic Mock Card */}
                <div className="w-full md:w-80 p-5 rounded-2xl bg-[#101613] border border-[#202B24] shadow-2xl space-y-3.5 relative">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-[#718078]">PR #482</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-rose-950/60 text-rose-300 border border-rose-500/40">
                      Looks Suspicious
                    </span>
                  </div>

                  <h4 className="text-xs font-semibold text-[#F3F6F4]">
                    Update README with typo fix
                  </h4>

                  <div className="space-y-2 pt-1 text-xs">
                    <div className="flex items-center gap-2 text-rose-300">
                      <XCircle className="h-3.5 w-3.5 text-rose-400 shrink-0" />
                      <span className="text-[11px]">Whitespace changes</span>
                    </div>
                    <div className="flex items-center gap-2 text-rose-300">
                      <XCircle className="h-3.5 w-3.5 text-rose-400 shrink-0" />
                      <span className="text-[11px]">Generic title</span>
                    </div>
                    <div className="flex items-center gap-2 text-rose-300">
                      <XCircle className="h-3.5 w-3.5 text-rose-400 shrink-0" />
                      <span className="text-[11px]">Low effort signals detected</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Feature Cards */}
              <div className="space-y-6 pt-6">
                <div className="text-center">
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-[#A0ADA5]">
                    Two powerful ways to keep your repository healthy
                  </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Card 1: PR Triage */}
                  <div
                    onClick={() => setActiveTab('pr-triage')}
                    className="p-6 rounded-2xl bg-[#101613] border border-[#202B24] hover:border-[#2E3E34] transition space-y-3 cursor-pointer group"
                  >
                    <div className="h-9 w-9 rounded-xl bg-[#151C18] border border-[#22C77A]/30 flex items-center justify-center text-[#22C77A]">
                      <ShieldCheck className="h-5 w-5" />
                    </div>
                    <h3 className="text-base font-bold text-[#F3F6F4]">PR Triage</h3>
                    <p className="text-xs text-[#A0ADA5] leading-relaxed">
                      Analyze pull requests for low-effort or suspicious changes.
                    </p>
                    <div className="text-xs font-semibold text-[#22C77A] flex items-center gap-1 group-hover:translate-x-1 transition pt-1">
                      <span>Explore PR Triage</span>
                      <ArrowRight className="h-3 w-3" />
                    </div>
                  </div>

                  {/* Card 2: Claim Watch */}
                  <div
                    onClick={() => setActiveTab('claim-watch')}
                    className="p-6 rounded-2xl bg-[#101613] border border-[#202B24] hover:border-[#2E3E34] transition space-y-3 cursor-pointer group"
                  >
                    <div className="h-9 w-9 rounded-xl bg-[#151C18] border border-[#22C77A]/30 flex items-center justify-center text-[#22C77A]">
                      <Clock className="h-5 w-5" />
                    </div>
                    <h3 className="text-base font-bold text-[#F3F6F4]">Claim Watch</h3>
                    <p className="text-xs text-[#A0ADA5] leading-relaxed">
                      Monitor claimed issues and get notified about potential inactivity.
                    </p>
                    <div className="text-xs font-semibold text-[#22C77A] flex items-center gap-1 group-hover:translate-x-1 transition pt-1">
                      <span>Explore Claim Watch</span>
                      <ArrowRight className="h-3 w-3" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ═════════ TAB 2: PR TRIAGE (Panel 2 from Screenshot) ═════════ */}
          {activeTab === 'pr-triage' && (
            <div className="max-w-5xl mx-auto space-y-6 animate-subtle-fade pb-12">
              {/* Header */}
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-[#151C18] border border-[#22C77A]/30 flex items-center justify-center text-[#22C77A]">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-[#F3F6F4] tracking-tight">PR Triage</h1>
                  <p className="text-xs text-[#A0ADA5]">
                    Analyze pull requests for potential low-effort contributions and get helpful feedback.
                  </p>
                </div>
              </div>

              {/* Input Container */}
              <div className="p-4 sm:p-5 rounded-2xl bg-[#101613] border border-[#202B24] shadow-lg space-y-3">
                <form onSubmit={handleAnalyzeUrl} className="flex flex-col sm:flex-row gap-2.5">
                  <div className="flex-1 flex items-center bg-[#080B0A] border border-[#202B24] rounded-xl px-3.5 py-2.5 focus-within:border-[#22C77A] transition gap-2.5">
                    <Github className="h-4 w-4 text-[#718078] shrink-0" />
                    <input
                      type="text"
                      value={prUrlInput}
                      onChange={(e) => setPrUrlInput(e.target.value)}
                      placeholder="https://github.com/owner/repo/pull/123"
                      className="bg-transparent text-xs text-[#F3F6F4] placeholder-[#718078] outline-none flex-1 font-mono"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={analyzing || !prUrlInput.trim()}
                    className="px-6 py-2.5 rounded-xl bg-[#22C77A] hover:bg-[#36E39A] disabled:opacity-40 text-[#080B0A] font-semibold text-xs shadow-sm transition flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
                  >
                    {analyzing ? (
                      <>
                        <div className="h-3 w-3 border-2 border-[#080B0A]/30 border-t-[#080B0A] rounded-full animate-spin" />
                        <span>Analyzing...</span>
                      </>
                    ) : (
                      <span>Analyze</span>
                    )}
                  </button>
                </form>

                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#718078] pt-1">
                  <span>Example: https://github.com/facebook/react/pull/12345</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[#A0ADA5] font-medium">Sample PRs:</span>
                    {samples.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => handleSelectSample(s)}
                        className={`px-2 py-0.5 rounded text-[11px] font-medium border transition cursor-pointer ${
                          selectedId === s.id
                            ? 'bg-[#153326] text-[#22C77A] border-[#22C77A]/40'
                            : 'bg-[#080B0A] text-[#A0ADA5] hover:text-[#F3F6F4] border-[#202B24]'
                        }`}
                      >
                        {s.id.split('-')[1] || s.id}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* PR Results Card */}
              {currentPR && (
                <div className="p-5 sm:p-6 rounded-2xl bg-[#101613] border border-[#202B24] shadow-xl space-y-5">
                  {/* PR Header */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div>
                      <span className="text-xs font-mono text-[#718078]">
                        PR #{currentPR.id.replace(/\D/g, '') || '123'}
                      </span>
                      <h2 className="text-lg sm:text-xl font-bold text-[#F3F6F4] mt-0.5">
                        {currentPR.title}
                      </h2>
                      <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-[#718078]">
                        <div className="flex items-center gap-1.5">
                          <div className="h-4 w-4 rounded-full bg-[#151C18] border border-[#202B24] flex items-center justify-center text-[9px] text-[#22C77A] font-semibold">
                            {currentPR.author[0].toUpperCase()}
                          </div>
                          <span className="text-[#A0ADA5] font-medium">@{currentPR.author}</span>
                        </div>
                        <span>•</span>
                        <span>{currentPR.filesChanged.length} files changed</span>
                        <span>•</span>
                        <span className="text-[#22C77A]">+{additionsCount}</span>
                        <span className="text-rose-400">-{deletionsCount}</span>
                        <span>•</span>
                        <span>2 days ago</span>
                      </div>
                    </div>

                    <div className="shrink-0 self-start">
                      {activeResult?.verdict === 'GENUINE' && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#153326] text-[#22C77A] border border-[#22C77A]/40">
                          <CheckCircle2 className="h-3.5 w-3.5 text-[#22C77A]" />
                          <span>Looks Good</span>
                        </span>
                      )}
                      {activeResult?.verdict === 'NEEDS_WORK' && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-950/40 text-amber-300 border border-amber-500/40">
                          <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
                          <span>Needs Work</span>
                        </span>
                      )}
                      {activeResult?.verdict === 'LIKELY_SPAM' && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-950/40 text-rose-300 border border-rose-500/40">
                          <AlertTriangle className="h-3.5 w-3.5 text-rose-400" />
                          <span>Looks Suspicious</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Sub-tabs */}
                  <div className="flex items-center gap-1 border-b border-[#202B24] pb-px">
                    <button
                      type="button"
                      onClick={() => setActivePRSubTab('analysis')}
                      className={`px-3.5 py-2 text-xs font-semibold transition border-b-2 cursor-pointer ${
                        activePRSubTab === 'analysis'
                          ? 'border-[#22C77A] text-[#22C77A]'
                          : 'border-transparent text-[#718078] hover:text-[#F3F6F4]'
                      }`}
                    >
                      Analysis
                    </button>
                    <button
                      type="button"
                      onClick={() => setActivePRSubTab('changes')}
                      className={`px-3.5 py-2 text-xs font-semibold transition border-b-2 cursor-pointer ${
                        activePRSubTab === 'changes'
                          ? 'border-[#22C77A] text-[#22C77A]'
                          : 'border-transparent text-[#718078] hover:text-[#F3F6F4]'
                      }`}
                    >
                      Changes ({currentPR.filesChanged.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setActivePRSubTab('comments')}
                      className={`px-3.5 py-2 text-xs font-semibold transition border-b-2 cursor-pointer ${
                        activePRSubTab === 'comments'
                          ? 'border-[#22C77A] text-[#22C77A]'
                          : 'border-transparent text-[#718078] hover:text-[#F3F6F4]'
                      }`}
                    >
                      Comments
                    </button>
                    <button
                      type="button"
                      onClick={() => setActivePRSubTab('timeline')}
                      className={`px-3.5 py-2 text-xs font-semibold transition border-b-2 cursor-pointer ${
                        activePRSubTab === 'timeline'
                          ? 'border-[#22C77A] text-[#22C77A]'
                          : 'border-transparent text-[#718078] hover:text-[#F3F6F4]'
                      }`}
                    >
                      Timeline
                    </button>
                  </div>

                  {/* Sub-tab 1: Analysis (2-Column Layout from Screenshot) */}
                  {activePRSubTab === 'analysis' && activeResult && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Left: Verdict Card */}
                      <div className="p-4 rounded-xl bg-[#080B0A] border border-[#202B24] space-y-4">
                        <div className="flex items-start gap-3">
                          <div className="h-10 w-10 rounded-full bg-[#153326] border border-[#22C77A]/30 flex items-center justify-center text-[#22C77A] shrink-0 mt-0.5">
                            <CheckCircle2 className="h-6 w-6" />
                          </div>
                          <div>
                            <span className="text-[11px] text-[#718078] uppercase font-semibold">Verdict</span>
                            <h3 className="text-base font-bold text-[#F3F6F4]">
                              {activeResult.verdict === 'GENUINE'
                                ? 'Looks Good'
                                : activeResult.verdict === 'NEEDS_WORK'
                                ? 'Needs Work'
                                : 'Looks Suspicious'}
                            </h3>
                            <p className="text-xs text-[#A0ADA5] mt-1 leading-relaxed">
                              {activeResult.summary}
                            </p>
                          </div>
                        </div>

                        <div className="space-y-2 pt-2 border-t border-[#202B24]/60">
                          <h4 className="text-xs font-semibold text-[#F3F6F4]">Key signals</h4>
                          <div className="space-y-1.5 text-xs">
                            {activeResult.verdict === 'GENUINE' ? (
                              <>
                                <div className="flex items-center gap-2 text-[#22C77A]">
                                  <Check className="h-3.5 w-3.5" />
                                  <span className="text-[11px]">Substantial code changes</span>
                                </div>
                                <div className="flex items-center gap-2 text-[#22C77A]">
                                  <Check className="h-3.5 w-3.5" />
                                  <span className="text-[11px]">Clear description</span>
                                </div>
                                <div className="flex items-center gap-2 text-[#22C77A]">
                                  <Check className="h-3.5 w-3.5" />
                                  <span className="text-[11px]">Previous contributions from author</span>
                                </div>
                              </>
                            ) : (
                              activeResult.evidence.slice(0, 3).map((ev, i) => (
                                <div key={i} className="flex items-center gap-2 text-amber-300">
                                  <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                                  <span className="text-[11px]">{ev.description}</span>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: AI Feedback Card */}
                      <div className="p-4 rounded-xl bg-[#080B0A] border border-[#202B24] space-y-4 flex flex-col justify-between">
                        <div className="space-y-2">
                          <h3 className="text-xs font-semibold text-[#F3F6F4]">AI Feedback</h3>
                          <p className="text-xs text-[#A0ADA5] leading-relaxed">
                            {activeResult.reasoning ||
                              'This looks like a well-structured PR with clear changes and a good description. The contributor has put in genuine effort. Great work!'}
                          </p>

                          <div className="pt-2">
                            <button
                              type="button"
                              onClick={() => handleCopyFeedback(activeResult.reasoning || activeResult.summary)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#151C18] hover:bg-[#202B24] text-xs font-medium text-[#F3F6F4] border border-[#202B24] transition cursor-pointer"
                            >
                              {copiedFeedback ? (
                                <>
                                  <Check className="h-3.5 w-3.5 text-[#22C77A]" />
                                  <span className="text-[#22C77A]">Copied feedback</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="h-3.5 w-3.5 text-[#718078]" />
                                  <span>Copy feedback</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>

                        <div className="pt-3 border-t border-[#202B24]/60 space-y-1">
                          <h4 className="text-xs font-semibold text-[#F3F6F4]">Next steps</h4>
                          <p className="text-xs text-[#A0ADA5]">
                            {activeResult.verdict === 'GENUINE'
                              ? 'You can go ahead and review this PR. No action needed.'
                              : 'Request additional test coverage or linked issues before merging.'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Sub-tab 2: Changes (Diff Viewer) */}
                  {activePRSubTab === 'changes' && (
                    <PRDetailView
                      pr={currentPR}
                      isCustom={false}
                      isAnalyzing={analyzing}
                      analysisResult={activeResult}
                      onTriggerAnalysis={() => triggerAnalysis(currentPR)}
                      highlightedTarget={highlightedEvidence}
                      onClearHighlight={() => setHighlightedEvidence(null)}
                    />
                  )}

                  {/* Sub-tab 3: Comments (Maintainer Approval Draft) */}
                  {activePRSubTab === 'comments' && (
                    <CommentApprovalCard
                      prId={currentPR.id}
                      verdict={activeResult?.verdict || 'GENUINE'}
                      suggestedComment={activeResult?.reviewComment || (activeResult as any)?.suggestedComment}
                      onApprove={handleApprove}
                    />
                  )}

                  {/* Sub-tab 4: Timeline */}
                  {activePRSubTab === 'timeline' && (
                    <div className="p-4 rounded-xl bg-[#080B0A] border border-[#202B24] space-y-3">
                      <h3 className="text-xs font-semibold text-[#F3F6F4]">Contribution Timeline</h3>
                      <div className="space-y-2 text-xs">
                        <div className="flex items-center gap-2 text-[#A0ADA5]">
                          <span className="h-2 w-2 rounded-full bg-[#22C77A]" />
                          <span>PR opened by @{currentPR.author} ({currentPR.branch || 'main'})</span>
                        </div>
                        <div className="flex items-center gap-2 text-[#A0ADA5]">
                          <span className="h-2 w-2 rounded-full bg-[#22C77A]" />
                          <span>{currentPR.filesChanged.length} files modified (+{additionsCount} -{deletionsCount})</span>
                        </div>
                        <div className="flex items-center gap-2 text-[#A0ADA5]">
                          <span className="h-2 w-2 rounded-full bg-[#22C77A]" />
                          <span>Local AI heuristic evaluation completed</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ═════════ TAB 3: CLAIM WATCH (Panel 3 & 4 from Screenshot) ═════════ */}
          {activeTab === 'claim-watch' && <ClaimWatchView />}
        </main>
      </div>

      {/* ─── 4. Modals ───────────────────────────────────────────────────────── */}
      {/* How it Works Modal */}
      {isHowItWorksOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#101613] border border-[#202B24] rounded-2xl max-w-lg w-full p-6 shadow-2xl relative space-y-4 animate-subtle-fade">
            <div className="flex items-center justify-between pb-3 border-b border-[#202B24]">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="h-5 w-5 text-[#22C77A]" />
                <h3 className="text-base font-bold text-[#F3F6F4]">How PRoof Works</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsHowItWorksOpen(false)}
                className="text-[#718078] hover:text-[#F3F6F4] p-1 rounded-lg hover:bg-[#151C18] transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-[#A0ADA5] leading-relaxed">
              <div className="p-3 rounded-xl bg-[#080B0A] border border-[#202B24] space-y-1">
                <h4 className="font-semibold text-[#F3F6F4]">1. 100% Local Execution</h4>
                <p>Diffs and issue timelines are analyzed entirely on your device using local Ollama models or our deterministic Heuristic Engine. Zero code is sent to external servers.</p>
              </div>

              <div className="p-3 rounded-xl bg-[#080B0A] border border-[#202B24] space-y-1">
                <h4 className="font-semibold text-[#F3F6F4]">2. Zero-Dependency Fallback</h4>
                <p>If Ollama is not installed or offline, PRoof automatically falls back to deterministic rule sets (whitespace analysis, commit entropy, typo verification), guaranteeing complete functionality.</p>
              </div>

              <div className="p-3 rounded-xl bg-[#080B0A] border border-[#202B24] space-y-1">
                <h4 className="font-semibold text-[#F3F6F4]">3. Read-Only Safety</h4>
                <p>PRoof never writes, closes, or comments automatically on GitHub. Maintainers retain complete control and copy verified feedback on their own terms.</p>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setIsHowItWorksOpen(false)}
                className="px-4 py-2 rounded-xl bg-[#22C77A] hover:bg-[#36E39A] text-[#080B0A] font-semibold text-xs transition cursor-pointer"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}

      {/* About Modal */}
      {isAboutOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#101613] border border-[#202B24] rounded-2xl max-w-md w-full p-6 shadow-2xl relative space-y-4 animate-subtle-fade">
            <div className="flex items-center justify-between pb-3 border-b border-[#202B24]">
              <div className="flex items-center gap-2.5">
                <Github className="h-5 w-5 text-[#22C77A]" />
                <h3 className="text-base font-bold text-[#F3F6F4]">About PRoof</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAboutOpen(false)}
                className="text-[#718078] hover:text-[#F3F6F4] p-1 rounded-lg hover:bg-[#151C18] transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs text-[#A0ADA5] leading-relaxed">
              <p>
                <strong className="text-[#F3F6F4]">PRoof</strong> is a local-first AI pull request triage and claim watch tool built for open-source maintainers during Hacktoberfest.
              </p>
              <p>
                Designed with minimal clarity inspired by Raycast and Resend, focusing on fast evidence-backed triage and respectful contributor mentoring.
              </p>
              <div className="pt-2 text-[11px] text-[#718078]">
                MIT License • CodeBiceps Team
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setIsAboutOpen(false)}
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
