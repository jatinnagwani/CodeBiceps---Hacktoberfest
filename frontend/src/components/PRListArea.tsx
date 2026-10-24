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
} from 'lucide-react';
import { PullRequestPayload } from '@proof/shared';

interface PRListAreaProps {
  samples: PullRequestPayload[];
  selectedId: string;
  isCustom: boolean;
  onSelectSample: (id: string) => void;
  onToggleCustom: (custom: boolean) => void;
}

type FilterCategory = 'ALL' | 'GENUINE' | 'NEEDS_WORK' | 'LIKELY_SPAM';

export const PRListArea: React.FC<PRListAreaProps> = ({
  samples,
  selectedId,
  isCustom,
  onSelectSample,
  onToggleCustom,
}) => {
  const [activeTab, setActiveTab] = useState<FilterCategory>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Category visual styles and metadata
  const getCategoryMeta = (cat?: string) => {
    switch (cat) {
      case 'GENUINE':
        return {
          icon: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />,
          label: 'Genuine',
          badgeClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
          dotClass: 'bg-emerald-400',
          activeRow: 'border-emerald-500/60 bg-emerald-950/20 shadow-emerald-950/30',
          hoverRow: 'hover:border-emerald-500/30 hover:bg-emerald-950/10',
        };
      case 'NEEDS_WORK':
        return {
          icon: <AlertCircle className="h-3.5 w-3.5 text-amber-400" />,
          label: 'Needs Work',
          badgeClass: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
          dotClass: 'bg-amber-400',
          activeRow: 'border-amber-500/60 bg-amber-950/20 shadow-amber-950/30',
          hoverRow: 'hover:border-amber-500/30 hover:bg-amber-950/10',
        };
      case 'LIKELY_SPAM':
        return {
          icon: <Ban className="h-3.5 w-3.5 text-rose-400" />,
          label: 'Likely Spam',
          badgeClass: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
          dotClass: 'bg-rose-400',
          activeRow: 'border-rose-500/60 bg-rose-950/20 shadow-rose-950/30',
          hoverRow: 'hover:border-rose-500/30 hover:bg-rose-950/10',
        };
      default:
        return {
          icon: <GitPullRequest className="h-3.5 w-3.5 text-slate-400" />,
          label: 'PR',
          badgeClass: 'bg-slate-800 text-slate-300 border-slate-700',
          dotClass: 'bg-slate-400',
          activeRow: 'border-slate-600 bg-slate-900',
          hoverRow: 'hover:border-slate-700',
        };
    }
  };

  // Counts by category
  const counts = useMemo(() => {
    return {
      ALL: samples.length,
      GENUINE: samples.filter((s) => s.category === 'GENUINE').length,
      NEEDS_WORK: samples.filter((s) => s.category === 'NEEDS_WORK').length,
      LIKELY_SPAM: samples.filter((s) => s.category === 'LIKELY_SPAM').length,
    };
  }, [samples]);

  // Filtered samples based on active tab and search query
  const filteredSamples = useMemo(() => {
    return samples.filter((sample) => {
      const matchesTab = activeTab === 'ALL' || sample.category === activeTab;
      if (!matchesTab) return false;

      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase();
      const titleMatch = sample.title.toLowerCase().includes(q);
      const authorMatch = sample.author.toLowerCase().includes(q);
      const idMatch = sample.id.toLowerCase().includes(q);
      const issueMatch = sample.linkedIssue ? sample.linkedIssue.toLowerCase().includes(q) : false;
      const branchMatch = sample.branch ? sample.branch.toLowerCase().includes(q) : false;

      return titleMatch || authorMatch || idMatch || issueMatch || branchMatch;
    });
  }, [samples, activeTab, searchQuery]);

  return (
    <div
      role="region"
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
            Select a pull request from the incoming queue to inspect its diff and trigger local AI analysis.
          </p>
        </div>

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
          <span>{isCustom ? 'Viewing Custom PR' : '+ Test Custom PR'}</span>
        </button>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1 border-t border-slate-800/60">
        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0" role="tablist">
          <button
            role="tab"
            aria-selected={activeTab === 'ALL'}
            onClick={() => setActiveTab('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 ${
              activeTab === 'ALL'
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
            aria-selected={activeTab === 'GENUINE'}
            onClick={() => setActiveTab('GENUINE')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 ${
              activeTab === 'GENUINE'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                : 'text-slate-400 hover:text-emerald-300 hover:bg-slate-800/50'
            }`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <span>Genuine</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800 text-slate-300">
              {counts.GENUINE}
            </span>
          </button>

          <button
            role="tab"
            aria-selected={activeTab === 'NEEDS_WORK'}
            onClick={() => setActiveTab('NEEDS_WORK')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 ${
              activeTab === 'NEEDS_WORK'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                : 'text-slate-400 hover:text-amber-300 hover:bg-slate-800/50'
            }`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
            <span>Needs Work</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800 text-slate-300">
              {counts.NEEDS_WORK}
            </span>
          </button>

          <button
            role="tab"
            aria-selected={activeTab === 'LIKELY_SPAM'}
            onClick={() => setActiveTab('LIKELY_SPAM')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 ${
              activeTab === 'LIKELY_SPAM'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm'
                : 'text-slate-400 hover:text-rose-300 hover:bg-slate-800/50'
            }`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
            <span>Likely Spam</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800 text-slate-300">
              {counts.LIKELY_SPAM}
            </span>
          </button>
        </div>

        {/* Search input */}
        <div className="relative w-full sm:w-64">
          <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter by title, author, #..."
            className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition"
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
        {filteredSamples.length === 0 ? (
          <div className="text-center py-8 px-4 rounded-xl border border-dashed border-slate-800 bg-slate-950/30 flex flex-col items-center gap-2">
            <Filter className="h-6 w-6 text-slate-500" />
            <div className="text-xs font-medium text-slate-400">
              No pull requests match the current filter or search criteria.
            </div>
            <button
              onClick={() => {
                setActiveTab('ALL');
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
            const meta = getCategoryMeta(sample.category);
            const isSelected = !isCustom && sample.id === selectedId;

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
                className={`text-left p-3.5 sm:p-4 rounded-xl border transition-all duration-200 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                  isSelected
                    ? `${meta.activeRow} ring-1 ring-inset shadow-lg`
                    : `border-slate-800/80 bg-slate-950/40 ${meta.hoverRow}`
                }`}
              >
                {/* Left Side: Category Icon, Title, Metadata */}
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className="mt-1 shrink-0">
                    <span
                      className={`inline-flex items-center justify-center h-7 w-7 rounded-lg border ${meta.badgeClass}`}
                    >
                      {meta.icon}
                    </span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1 text-xs">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-semibold text-[11px] border ${meta.badgeClass}`}>
                        {meta.label}
                      </span>
                      <span className="font-mono text-slate-400 text-[11px]">
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

                    <h3 className="text-sm font-semibold text-slate-100 line-clamp-1 leading-snug">
                      {sample.title}
                    </h3>
                  </div>
                </div>

                {/* Right Side: Diff Volume Stats & Select/Inspect Indicator */}
                <div className="flex items-center justify-between md:justify-end gap-3 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-800/60">
                  <div className="flex items-center gap-2 text-xs font-mono">
                    <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300 text-[11px]">
                      {sample.stats.totalFiles} {sample.stats.totalFiles === 1 ? 'file' : 'files'}
                    </span>
                    <span className="text-emerald-400 font-semibold">
                      +{sample.stats.totalAdditions}
                    </span>
                    <span className="text-slate-500">/</span>
                    <span className="text-rose-400 font-semibold">
                      -{sample.stats.totalDeletions}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
                    {isSelected ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 font-semibold text-[11px]">
                        Active Triage
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-slate-400 group-hover:text-slate-200">
                        Inspect <ArrowRight className="h-3 w-3" />
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
