import React, { useState, useMemo } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  Ban,
  PenSquare,
  Search,
  GitPullRequest,
  Link as LinkIcon,
  Filter,
  ArrowRight,
  RotateCcw,
  Clock,
  Sparkles,
  FileCode2,
  Rocket,
} from 'lucide-react';
import { PullRequestPayload, AnalysisResult, TriageResult, ReviewVerdict } from '@proof/shared';

export interface PRListAreaProps {
  samples: PullRequestPayload[];
  selectedId: string;
  isCustom: boolean;
  onSelectSample: (id: string) => void;
  onToggleCustom: (custom: boolean) => void;
  onOpenPreflight?: () => void;
  analysisResults?: Record<string, AnalysisResult | TriageResult>;
  analyzingIds?: Set<string>;
  loading?: boolean;
}

type FilterStatus = 'ALL' | 'ANALYZED' | 'AWAITING_TRIAGE';

export const PRListArea: React.FC<PRListAreaProps> = ({
  samples,
  selectedId,
  isCustom,
  onSelectSample,
  onToggleCustom,
  onOpenPreflight,
  analysisResults = {},
  analyzingIds = new Set(),
  loading = false,
}) => {
  const [activeFilter, setActiveFilter] = useState<FilterStatus>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Extract a clean, short plain-text summary of the PR description
  const getShortDescription = (desc?: string): string => {
    if (!desc || !desc.trim()) return 'No description provided by author.';
    const cleaned = desc
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#') && !line.startsWith('- ['))
      .join(' ');
    return cleaned.length > 130 ? `${cleaned.slice(0, 127)}...` : cleaned || 'No additional description.';
  };

  // Render analysis status badge without ever inventing verdicts
  const renderStatusBadge = (prId: string) => {
    const isAnalyzing = analyzingIds.has(prId);
    const result = analysisResults[prId];

    if (isAnalyzing) {
      return (
        <span
          className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 animate-pulse"
          role="status"
          aria-label="Analysis in progress"
        >
          <Sparkles className="h-3 w-3 animate-spin text-indigo-400" />
          <span>Analyzing...</span>
        </span>
      );
    }

    if (result) {
      const verdict = result.verdict;
      if (verdict === 'GENUINE') {
        return (
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
            title={`Verdict: Genuine (${result.confidence} confidence)`}
          >
            <CheckCircle2 className="h-3 w-3 text-emerald-400" />
            <span>Genuine</span>
          </span>
        );
      }
      if (verdict === 'NEEDS_WORK') {
        return (
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30"
            title={`Verdict: Needs Work (${result.confidence} confidence)`}
          >
            <AlertCircle className="h-3 w-3 text-amber-400" />
            <span>Needs Work</span>
          </span>
        );
      }
      if (verdict === 'LIKELY_SPAM') {
        return (
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/15 text-rose-300 border border-rose-500/30"
            title={`Verdict: Likely Spam (${result.confidence} confidence)`}
          >
            <Ban className="h-3 w-3 text-rose-400" />
            <span>Likely Spam</span>
          </span>
        );
      }
    }

    // Default: Unanalyzed (Do NOT invent verdicts before analysis)
    return (
      <span
        className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-800 text-slate-400 border border-slate-700/60"
        title="This pull request has not yet been analyzed by the review engine."
      >
        <Clock className="h-3 w-3 text-slate-500" />
        <span>Not Analyzed</span>
      </span>
    );
  };

  // Compute counts for the filter tabs
  const counts = useMemo(() => {
    let analyzed = 0;
    let pending = 0;
    for (const s of samples) {
      if (analysisResults[s.id]) {
        analyzed++;
      } else {
        pending++;
      }
    }
    return {
      ALL: samples.length,
      ANALYZED: analyzed,
      AWAITING_TRIAGE: pending,
    };
  }, [samples, analysisResults]);

  // Filtered samples based on active tab and search query
  const filteredSamples = useMemo(() => {
    return samples.filter((sample) => {
      const hasResult = Boolean(analysisResults[sample.id]);
      if (activeFilter === 'ANALYZED' && !hasResult) return false;
      if (activeFilter === 'AWAITING_TRIAGE' && hasResult) return false;

      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase();
      const titleMatch = sample.title.toLowerCase().includes(q);
      const authorMatch = sample.author.toLowerCase().includes(q);
      const idMatch = sample.id.toLowerCase().includes(q);
      const issueMatch = sample.linkedIssue ? sample.linkedIssue.toLowerCase().includes(q) : false;
      const fileMatch = sample.filesChanged?.some((f) => f.filename.toLowerCase().includes(q)) ?? false;

      return titleMatch || authorMatch || idMatch || issueMatch || fileMatch;
    });
  }, [samples, activeFilter, searchQuery, analysisResults]);

  return (
    <section
      aria-label="Incoming Sample Pull Requests"
      className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 sm:p-5 backdrop-blur-sm shadow-xl flex flex-col gap-4"
    >
      {/* Top Header & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <GitPullRequest className="h-4 w-4 text-indigo-400" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200">
              Incoming Pull Request Queue ({samples.length})
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Select a pull request from the queue to inspect its verified diff and trigger local AI triage.
          </p>
        </div>

        {/* Header Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {onOpenPreflight && (
            <button
              onClick={onOpenPreflight}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-md shadow-indigo-600/30 transition"
              title="Open Contributor Pre-Flight Form"
            >
              <Rocket className="h-3.5 w-3.5" />
              <span>+ Pre-Flight Check</span>
            </button>
          )}

          {/* Custom Input Toggle Button */}
          <button
            onClick={() => onToggleCustom(!isCustom)}
            aria-pressed={isCustom}
            className={`inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-xl border transition shadow-sm ${
              isCustom
                ? 'bg-indigo-600 text-white border-indigo-500 shadow-indigo-600/30'
                : 'bg-slate-800/90 text-slate-200 border-slate-700 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <PenSquare className="h-3.5 w-3.5" />
            <span>{isCustom ? 'Viewing Custom PR' : 'Direct Edit PR'}</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 border-t border-slate-800/60">
        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0" role="tablist">
          <button
            role="tab"
            aria-selected={activeFilter === 'ALL'}
            onClick={() => setActiveFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 ${
              activeFilter === 'ALL'
                ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <span>All PRs</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800 text-slate-300">
              {counts.ALL}
            </span>
          </button>

          <button
            role="tab"
            aria-selected={activeFilter === 'ANALYZED'}
            onClick={() => setActiveFilter('ANALYZED')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 ${
              activeFilter === 'ANALYZED'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                : 'text-slate-400 hover:text-emerald-300 hover:bg-slate-800/50'
            }`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <span>Analyzed</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800 text-slate-300">
              {counts.ANALYZED}
            </span>
          </button>

          <button
            role="tab"
            aria-selected={activeFilter === 'AWAITING_TRIAGE'}
            onClick={() => setActiveFilter('AWAITING_TRIAGE')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 ${
              activeFilter === 'AWAITING_TRIAGE'
                ? 'bg-slate-700/40 text-slate-200 border border-slate-600 shadow-sm'
                : 'text-slate-400 hover:text-slate-300 hover:bg-slate-800/50'
            }`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
            <span>Awaiting Triage</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800 text-slate-300">
              {counts.AWAITING_TRIAGE}
            </span>
          </button>
        </div>

        {/* Search input */}
        <div className="relative w-full sm:w-72">
          <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title, author, file..."
            className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-9 pr-7 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 text-xs"
              title="Clear search"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* PR List Rows */}
      <div className="flex flex-col gap-2.5" role="list">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
            <div className="h-6 w-6 rounded-full border-2 border-indigo-500/40 border-t-indigo-500 animate-spin" />
            <span>Loading pull requests from backend...</span>
          </div>
        ) : filteredSamples.length === 0 ? (
          <div className="text-center py-8 px-4 rounded-xl border border-dashed border-slate-800 bg-slate-950/30 flex flex-col items-center gap-2">
            <Filter className="h-6 w-6 text-slate-500" />
            <div className="text-xs font-medium text-slate-400">
              No pull requests match the current filter or search criteria.
            </div>
            <button
              onClick={() => {
                setActiveFilter('ALL');
                setSearchQuery('');
              }}
              className="inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-lg text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Reset Filters</span>
            </button>
          </div>
        ) : (
          filteredSamples.map((sample) => {
            const isSelected = !isCustom && sample.id === selectedId;
            const shortDesc = getShortDescription(sample.description);

            return (
              <div
                key={sample.id}
                role="listitem"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onToggleCustom(false);
                    onSelectSample(sample.id);
                  }
                }}
                onClick={() => {
                  onToggleCustom(false);
                  onSelectSample(sample.id);
                }}
                className={`text-left p-3.5 sm:p-4 rounded-xl border transition-all duration-200 cursor-pointer flex flex-col gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                  isSelected
                    ? 'border-indigo-500/70 bg-indigo-950/20 shadow-lg shadow-indigo-950/30 ring-1 ring-indigo-500/30'
                    : 'border-slate-800/80 bg-slate-950/40 hover:border-slate-700 hover:bg-slate-950/70'
                }`}
              >
                {/* Row Header: ID, Author, Linked Issue, Analysis Status Badge */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-indigo-400 font-semibold text-[11px]">
                      {sample.id}
                    </span>
                    <span className="text-slate-600">•</span>
                    <span className="text-slate-300 font-medium truncate">
                      by @{sample.author}
                    </span>
                    {sample.authorAssociation && (
                      <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-800/80 text-slate-400 border border-slate-700/60 hidden sm:inline">
                        {sample.authorAssociation.replace(/_/g, ' ')}
                      </span>
                    )}
                    {sample.linkedIssue && (
                      <span className="inline-flex items-center gap-1 text-emerald-400 text-[11px] font-medium">
                        <LinkIcon className="h-3 w-3" />
                        {sample.linkedIssue}
                      </span>
                    )}
                  </div>

                  {/* Analysis Status Badge (Genuine, Needs Work, Likely Spam, Analyzing, or Not Analyzed) */}
                  <div className="shrink-0">{renderStatusBadge(sample.id)}</div>
                </div>

                {/* PR Title */}
                <div>
                  <h3 className="text-sm font-semibold text-slate-100 line-clamp-1 leading-snug">
                    {sample.title}
                  </h3>
                  {/* Short Description */}
                  <p className="text-xs text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                    {shortDesc}
                  </p>
                </div>

                {/* Changed-File Summary & Inspect Footer */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-800/60 text-xs">
                  {/* Changed Files Pill & Filenames */}
                  <div className="flex flex-wrap items-center gap-2 font-mono text-[11px]">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300">
                      <FileCode2 className="h-3 w-3 text-slate-400" />
                      <span>
                        {sample.stats.totalFiles} {sample.stats.totalFiles === 1 ? 'file' : 'files'}
                      </span>
                    </span>

                    <span className="text-emerald-400 font-semibold">
                      +{sample.stats.totalAdditions}
                    </span>
                    <span className="text-slate-500">/</span>
                    <span className="text-rose-400 font-semibold">
                      -{sample.stats.totalDeletions}
                    </span>

                    {/* Show up to 2 filenames changed */}
                    {sample.filesChanged && sample.filesChanged.length > 0 && (
                      <div className="hidden md:flex items-center gap-1.5 text-slate-400 font-mono text-[11px]">
                        <span className="text-slate-600">|</span>
                        {sample.filesChanged.slice(0, 2).map((fc) => (
                          <span
                            key={fc.filename}
                            className="truncate max-w-[140px] text-slate-400 bg-slate-900/60 px-1.5 py-0.5 rounded border border-slate-800/80"
                            title={fc.filename}
                          >
                            {fc.filename.split('/').pop()}
                          </span>
                        ))}
                        {sample.filesChanged.length > 2 && (
                          <span className="text-slate-500 text-[10px]">
                            +{sample.filesChanged.length - 2} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Active / Inspect indicator */}
                  <div className="flex items-center gap-1.5 self-end sm:self-auto text-xs font-medium text-slate-400">
                    {isSelected ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 font-semibold text-[11px]">
                        Active In Triage
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-slate-400 group-hover:text-slate-200">
                        Inspect Details <ArrowRight className="h-3 w-3" />
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
};
