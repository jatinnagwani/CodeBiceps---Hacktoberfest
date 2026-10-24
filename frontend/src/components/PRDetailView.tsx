import React, { useState } from 'react';
import { GitPullRequest, GitCommit, FileCode, CheckSquare, ChevronDown, ChevronUp, Link as LinkIcon } from 'lucide-react';
import { PullRequestPayload } from '@proof/shared';

interface PRDetailViewProps {
  pr: PullRequestPayload;
  isCustom: boolean;
  onCustomChange?: (updated: PullRequestPayload) => void;
}

export const PRDetailView: React.FC<PRDetailViewProps> = ({
  pr,
  isCustom,
  onCustomChange,
}) => {
  const [descExpanded, setDescExpanded] = useState(true);
  const [selectedFileIdx, setSelectedFileIdx] = useState(0);

  const selectedFile = pr.filesChanged[selectedFileIdx] || pr.filesChanged[0];

  return (
    <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-sm shadow-xl flex flex-col gap-5">
      {/* PR Header */}
      <div>
        <div className="flex flex-wrap items-center gap-2 mb-2 text-xs text-slate-400">
          <span className="inline-flex items-center gap-1 font-mono text-indigo-400 font-semibold">
            <GitPullRequest className="h-3.5 w-3.5" />
            {pr.id}
          </span>
          <span>•</span>
          <span>by <strong className="text-slate-200">@{pr.author}</strong></span>
          {pr.authorAssociation && (
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-300 font-medium border border-slate-700">
              {pr.authorAssociation}
            </span>
          )}
          <span>•</span>
          <span className="font-mono text-slate-400">
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
          <h1 className="text-lg sm:text-xl font-bold text-slate-100 tracking-tight leading-snug">
            {pr.title}
          </h1>
        )}
      </div>

      {/* Description Section */}
      <div className="border border-slate-800 rounded-xl bg-slate-950/40 overflow-hidden">
        <button
          onClick={() => setDescExpanded(!descExpanded)}
          className="w-full px-4 py-2.5 bg-slate-900/40 border-b border-slate-800/80 flex items-center justify-between text-xs font-semibold text-slate-300 hover:bg-slate-900/60 transition"
        >
          <span className="flex items-center gap-2">
            <CheckSquare className="h-4 w-4 text-indigo-400" />
            Pull Request Description
          </span>
          {descExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>

        {descExpanded && (
          <div className="p-4">
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
              <div className="text-xs text-slate-300 whitespace-pre-wrap font-sans leading-relaxed">
                {pr.description}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Changed Files & Diff Viewer */}
      <div className="border border-slate-800 rounded-xl bg-slate-950/60 overflow-hidden">
        {/* File Tabs */}
        <div className="bg-slate-900/80 border-b border-slate-800 px-3 py-2 flex items-center gap-2 overflow-x-auto">
          <span className="text-xs font-semibold text-slate-400 px-2 flex items-center gap-1.5">
            <FileCode className="h-3.5 w-3.5 text-slate-400" />
            Files ({pr.filesChanged.length}):
          </span>

          {pr.filesChanged.map((file, idx) => (
            <button
              key={file.filename}
              onClick={() => setSelectedFileIdx(idx)}
              className={`px-2.5 py-1 text-xs font-mono rounded-md transition flex items-center gap-1.5 whitespace-nowrap ${
                selectedFileIdx === idx
                  ? 'bg-indigo-600 text-white font-medium shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
              }`}
            >
              <span className="truncate max-w-[200px]">{file.filename}</span>
              <span className="text-[10px] text-emerald-400 font-semibold">+{file.additions}</span>
              <span className="text-[10px] text-rose-400 font-semibold">-{file.deletions}</span>
            </button>
          ))}
        </div>

        {/* Diff Content Box */}
        <div className="p-0 overflow-x-auto max-h-[380px]">
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
                      className={`px-4 py-0.5 flex items-start gap-3 select-text ${
                        isAdd
                          ? 'bg-emerald-500/10 text-emerald-200 border-l-2 border-emerald-500'
                          : isDel
                          ? 'bg-rose-500/10 text-rose-200 border-l-2 border-rose-500'
                          : isHunk
                          ? 'bg-indigo-500/10 text-indigo-300 font-semibold'
                          : 'text-slate-400 hover:bg-slate-900/50'
                      }`}
                    >
                      <span className="text-slate-600 select-none w-6 text-right shrink-0">
                        {i + 1}
                      </span>
                      <pre className="whitespace-pre-wrap break-all font-mono">
                        {line}
                      </pre>
                    </div>
                  );
                })
              ) : (
                <div className="p-6 text-center text-slate-500 text-xs font-mono">
                  No diff patch content available for this file.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
