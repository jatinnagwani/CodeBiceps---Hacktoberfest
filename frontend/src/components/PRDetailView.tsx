import React, { useState } from 'react';
import {
  GitPullRequest,
  FileCode,
  CheckSquare,
  ChevronDown,
  ChevronUp,
  Link as LinkIcon,
  Play,
  RotateCcw,
  AlertTriangle,
  FileDiff,
  Calendar,
  Sparkles,
  GitBranch,
} from 'lucide-react';
import { PullRequestPayload, TriageResult } from '@proof/shared';

export interface PRDetailViewProps {
  pr: PullRequestPayload | null;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  isCustom?: boolean;
  onCustomChange?: (updated: PullRequestPayload) => void;
  onTriggerAnalysis?: () => void;
  isAnalyzing?: boolean;
  analysisResult?: TriageResult | null;
}

export const PRDetailView: React.FC<PRDetailViewProps> = ({
  pr,
  loading = false,
  error = null,
  onRetry,
  isCustom = false,
  onCustomChange,
  onTriggerAnalysis,
  isAnalyzing = false,
  analysisResult,
}) => {
  const [descExpanded, setDescExpanded] = useState(true);
  const [selectedFileIdx, setSelectedFileIdx] = useState(0);

  // 1. Loading State
  if (loading) {
    return (
      <div
        role="status"
        aria-busy="true"
        aria-label="Loading pull request details"
        className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-sm shadow-xl flex flex-col gap-4 animate-pulse"
      >
        <div className="flex items-center justify-between">
          <div className="h-4 bg-slate-800 rounded w-1/3" />
          <div className="h-4 bg-slate-800 rounded w-1/6" />
        </div>
        <div className="h-7 bg-slate-800 rounded w-3/4" />
        <div className="h-24 bg-slate-950/80 rounded-xl border border-slate-800" />
        <div className="h-48 bg-slate-950/80 rounded-xl border border-slate-800" />
        <span className="sr-only">Loading pull request details and unified diff...</span>
      </div>
    );
  }

  // 2. Error State
  if (error) {
    return (
      <div
        role="alert"
        className="bg-slate-900/60 border border-rose-800/80 rounded-2xl p-6 backdrop-blur-sm shadow-xl flex flex-col items-center justify-center text-center gap-3"
      >
        <div className="h-10 w-10 rounded-full bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-rose-200">Failed to Load PR Details</h3>
          <p className="text-xs text-rose-300/80 mt-1 max-w-sm">{error}</p>
        </div>
        {onRetry && (
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
          >
            <RotateCcw className="h-3 w-3" />
            <span>Retry</span>
          </button>
        )}
      </div>
    );
  }

  // 3. Empty State (No PR Selected)
  if (!pr) {
    return (
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-8 backdrop-blur-sm shadow-xl flex flex-col items-center justify-center text-center gap-3 min-h-[300px]">
        <GitPullRequest className="h-10 w-10 text-slate-600" />
        <div className="text-sm font-semibold text-slate-300">No Pull Request Selected</div>
        <p className="text-xs text-slate-400 max-w-xs">
          Select a pull request from the incoming queue above to inspect its details and unified diff.
        </p>
      </div>
    );
  }

  const selectedFile = pr.filesChanged[selectedFileIdx] || pr.filesChanged[0];

  return (
    <article
      aria-label={`Pull Request Details: ${pr.title}`}
      className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 sm:p-5 backdrop-blur-sm shadow-xl flex flex-col gap-4"
    >
      {/* PR Header & Metadata */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2 text-xs text-slate-400">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 font-mono text-indigo-400 font-semibold">
              <GitPullRequest className="h-3.5 w-3.5" />
              {pr.id}
            </span>
            <span>•</span>
            <span>
              by <strong className="text-slate-200">@{pr.author}</strong>
            </span>
            {pr.authorAssociation && (
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-300 font-medium border border-slate-700">
                {pr.authorAssociation.replace(/_/g, ' ')}
              </span>
            )}
            <span>•</span>
            <span className="inline-flex items-center gap-1 font-mono text-slate-400">
              <GitBranch className="h-3 w-3 text-slate-500" />
              {pr.branch || 'feature-branch'} ➔ {pr.targetBranch || 'main'}
            </span>
            {pr.linkedIssue && (
              <>
                <span>•</span>
                <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
                  <LinkIcon className="h-3 w-3" />
                  {pr.linkedIssue}
                </span>
              </>
            )}
            {pr.createdAt && (
              <>
                <span>•</span>
                <span className="inline-flex items-center gap-1 text-slate-500 text-[11px]">
                  <Calendar className="h-3 w-3" />
                  {new Date(pr.createdAt).toLocaleDateString()}
                </span>
              </>
            )}
          </div>

          {/* Quick Analysis Trigger Button */}
          {onTriggerAnalysis && !isCustom && (
            <button
              onClick={onTriggerAnalysis}
              disabled={isAnalyzing}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-sm shadow-indigo-600/30 transition disabled:opacity-50"
              title="Trigger local AI review for this pull request"
            >
              <Sparkles className={`h-3 w-3 ${isAnalyzing ? 'animate-spin' : ''}`} />
              <span>{isAnalyzing ? 'Analyzing...' : analysisResult ? 'Re-analyze' : 'Analyze PR'}</span>
            </button>
          )}
        </div>

        {isCustom ? (
          <div className="space-y-3 mt-2">
            <div>
              <label className="text-xs text-slate-400 block mb-1 font-medium">PR Title</label>
              <input
                type="text"
                value={pr.title}
                onChange={(e) =>
                  onCustomChange?.({
                    ...pr,
                    title: e.target.value,
                  })
                }
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                placeholder="e.g. fix: solve race condition"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1 font-medium">Author Handle</label>
              <input
                type="text"
                value={pr.author}
                onChange={(e) =>
                  onCustomChange?.({
                    ...pr,
                    author: e.target.value,
                  })
                }
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                placeholder="github-username"
              />
            </div>
          </div>
        ) : (
          <h2 className="text-lg sm:text-xl font-bold text-slate-100 tracking-tight leading-snug">
            {pr.title}
          </h2>
        )}
      </div>

      {/* Description Section */}
      <div className="border border-slate-800 rounded-xl bg-slate-950/40 overflow-hidden">
        <button
          onClick={() => setDescExpanded(!descExpanded)}
          className="w-full px-4 py-2 bg-slate-900/40 border-b border-slate-800/80 flex items-center justify-between text-xs font-semibold text-slate-300 hover:bg-slate-900/60 transition"
          aria-expanded={descExpanded}
        >
          <span className="flex items-center gap-2">
            <CheckSquare className="h-4 w-4 text-indigo-400" />
            Pull Request Description
          </span>
          {descExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>

        {descExpanded && (
          <div className="p-3.5 sm:p-4">
            {isCustom ? (
              <textarea
                value={pr.description}
                onChange={(e) =>
                  onCustomChange?.({
                    ...pr,
                    description: e.target.value,
                  })
                }
                rows={5}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-xs text-slate-200 font-mono focus:outline-none focus:border-indigo-500 leading-relaxed"
                placeholder="Enter PR description, checklist items, or issue links..."
              />
            ) : (
              <div className="text-xs text-slate-300 whitespace-pre-wrap font-sans leading-relaxed max-h-48 overflow-y-auto pr-1">
                {pr.description || (
                  <span className="text-slate-500 italic">No description provided by author.</span>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Changed Files & Unified Diff Viewer */}
      <div className="border border-slate-800 rounded-xl bg-slate-950/60 overflow-hidden flex flex-col">
        {/* File Tabs Header */}
        <div className="bg-slate-900/80 border-b border-slate-800 px-3 py-2 flex items-center justify-between gap-2 overflow-x-auto">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-400 px-1 flex items-center gap-1.5 shrink-0">
              <FileCode className="h-3.5 w-3.5 text-slate-400" />
              Files ({pr.filesChanged.length}):
            </span>

            <div className="flex items-center gap-1.5 overflow-x-auto" role="tablist">
              {pr.filesChanged.map((file, idx) => (
                <button
                  key={file.filename}
                  role="tab"
                  aria-selected={selectedFileIdx === idx}
                  onClick={() => setSelectedFileIdx(idx)}
                  className={`px-2.5 py-1 text-xs font-mono rounded-md transition flex items-center gap-1.5 whitespace-nowrap focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-400 ${
                    selectedFileIdx === idx
                      ? 'bg-indigo-600 text-white font-medium shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
                  }`}
                >
                  <span className="truncate max-w-[180px]">{file.filename}</span>
                  <span className="text-[10px] text-emerald-400 font-semibold">+{file.additions}</span>
                  <span className="text-[10px] text-rose-400 font-semibold">-{file.deletions}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-[11px] font-mono text-slate-400 shrink-0">
            <span className="text-emerald-400 font-semibold">+{pr.stats.totalAdditions}</span>
            <span className="text-slate-600">/</span>
            <span className="text-rose-400 font-semibold">-{pr.stats.totalDeletions}</span>
          </div>
        </div>

        {/* Diff Content Box */}
        <div className="p-0 overflow-x-auto max-h-[380px] lg:max-h-[420px] overflow-y-auto">
          {isCustom ? (
            <div className="p-3">
              <label className="text-xs text-slate-400 block mb-1 font-mono">
                Diff Patch for {selectedFile?.filename || 'selected file'}
              </label>
              <textarea
                value={selectedFile?.patch || ''}
                onChange={(e) => {
                  const updatedFiles = [...pr.filesChanged];
                  if (updatedFiles[selectedFileIdx]) {
                    updatedFiles[selectedFileIdx] = {
                      ...updatedFiles[selectedFileIdx],
                      patch: e.target.value,
                    };
                    onCustomChange?.({
                      ...pr,
                      filesChanged: updatedFiles,
                    });
                  }
                }}
                rows={10}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
                placeholder="Paste unified diff patch starting with @@..."
              />
            </div>
          ) : (
            <div className="font-mono text-xs leading-5">
              {selectedFile?.patch ? (
                selectedFile.patch.split('\n').map((line, i) => {
                  const isAdd = line.startsWith('+') && !line.startsWith('+++');
                  const isDel = line.startsWith('-') && !line.startsWith('---');
                  const isHunk = line.startsWith('@@');

                  return (
                    <div
                      key={i}
                      className={`px-3 py-0.5 flex items-start gap-3 select-text ${
                        isAdd
                          ? 'bg-emerald-500/10 text-emerald-200 border-l-2 border-emerald-500'
                          : isDel
                          ? 'bg-rose-500/10 text-rose-200 border-l-2 border-rose-500'
                          : isHunk
                          ? 'bg-indigo-500/15 text-indigo-300 font-semibold border-l-2 border-indigo-400'
                          : 'text-slate-400 hover:bg-slate-900/50'
                      }`}
                    >
                      <span className="text-slate-600 select-none w-7 text-right shrink-0">
                        {i + 1}
                      </span>
                      <pre className="whitespace-pre-wrap break-all font-mono">
                        {line}
                      </pre>
                    </div>
                  );
                })
              ) : (
                <div className="p-8 text-center text-slate-500 text-xs font-mono flex flex-col items-center gap-2">
                  <FileDiff className="h-6 w-6 text-slate-600" />
                  <span>No unified diff patch content supplied for this file.</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Diff Footer: Active file status */}
        <div className="bg-slate-900/90 border-t border-slate-800 px-3 py-1.5 flex items-center justify-between text-[11px] text-slate-400 font-mono">
          <span className="truncate">
            Status: <span className="text-slate-200 uppercase">{selectedFile?.status || 'modified'}</span> • {selectedFile?.filename}
          </span>
          <span className="text-slate-500">
            {selectedFile?.patch ? `${selectedFile.patch.split('\n').length} lines` : '0 lines'}
          </span>
        </div>
      </div>
    </article>
  );
};
