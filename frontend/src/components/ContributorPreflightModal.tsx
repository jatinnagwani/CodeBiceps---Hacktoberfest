import React, { useState } from 'react';
import {
  Rocket,
  X,
  AlertCircle,
  FileCode,
  CheckCircle2,
  Sparkles,
  HelpCircle,
  RefreshCw,
  Copy,
  Info,
} from 'lucide-react';
import { PullRequestPayload, ChangedFile, PRStats } from '@proof/shared';

export interface ContributorPreflightModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (pr: PullRequestPayload) => Promise<void>;
  isSubmitting?: boolean;
}

/**
 * Parses unified diff patch text into structured ChangedFile[] and computes PRStats.
 * Supports both multi-file git diffs (`diff --git a/... b/...`) and single file patches.
 */
export function parseDiffInput(
  rawDiff: string,
  defaultFilename = 'src/contribution.ts'
): {
  filesChanged: ChangedFile[];
  stats: PRStats;
} {
  const trimmed = rawDiff.trim();
  if (!trimmed) {
    return {
      filesChanged: [
        {
          filename: defaultFilename,
          status: 'modified',
          additions: 0,
          deletions: 0,
          patch: '',
        },
      ],
      stats: { totalAdditions: 0, totalDeletions: 0, totalFiles: 1 },
    };
  }

  // Check if diff contains git diff headers separating multiple files: diff --git a/file b/file
  const fileBlocks = trimmed.split(/(?=diff --git )/);

  if (fileBlocks.length > 1 || trimmed.startsWith('diff --git ')) {
    const files: ChangedFile[] = [];
    let totalAdditions = 0;
    let totalDeletions = 0;

    for (const block of fileBlocks) {
      if (!block.trim()) continue;
      const nameMatch =
        block.match(/\+\+\+ b\/(.+?)(\r?\n|$)/) ||
        block.match(/diff --git a\/.+? b\/(.+?)(\r?\n|$)/);
      const filename = nameMatch ? nameMatch[1].trim() : defaultFilename;

      const lines = block.split('\n');
      let additions = 0;
      let deletions = 0;
      for (const line of lines) {
        if (line.startsWith('+') && !line.startsWith('+++')) additions++;
        else if (line.startsWith('-') && !line.startsWith('---')) deletions++;
      }

      totalAdditions += additions;
      totalDeletions += deletions;

      files.push({
        filename,
        status: 'modified',
        additions,
        deletions,
        patch: block.trim(),
      });
    }

    return {
      filesChanged:
        files.length > 0
          ? files
          : [
              {
                filename: defaultFilename,
                status: 'modified',
                additions: totalAdditions,
                deletions: totalDeletions,
                patch: trimmed,
              },
            ],
      stats: {
        totalAdditions,
        totalDeletions,
        totalFiles: Math.max(1, files.length),
      },
    };
  }

  // Single file patch
  const lines = trimmed.split('\n');
  let additions = 0;
  let deletions = 0;
  for (const line of lines) {
    if (line.startsWith('+') && !line.startsWith('+++')) additions++;
    else if (line.startsWith('-') && !line.startsWith('---')) deletions++;
  }

  const fnMatch =
    trimmed.match(/\+\+\+ b\/(.+?)(\r?\n|$)/) ||
    trimmed.match(/--- a\/(.+?)(\r?\n|$)/);
  const filename = fnMatch ? fnMatch[1].trim() : defaultFilename;

  return {
    filesChanged: [
      {
        filename,
        status: 'modified',
        additions,
        deletions,
        patch: trimmed,
      },
    ],
    stats: {
      totalAdditions: additions,
      totalDeletions: deletions,
      totalFiles: 1,
    },
  };
}

export const ContributorPreflightModal: React.FC<ContributorPreflightModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting = false,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [diff, setDiff] = useState('');
  const [author, setAuthor] = useState('contributor');
  const [linkedIssue, setLinkedIssue] = useState('');
  const [filename, setFilename] = useState('src/feature.ts');

  // Form field error validation state
  const [errors, setErrors] = useState<{
    title?: string;
    description?: string;
    diff?: string;
  }>({});

  if (!isOpen) return null;

  // Validate form inputs
  const validate = (): boolean => {
    const errs: { title?: string; description?: string; diff?: string } = {};

    if (!title.trim()) {
      errs.title = 'PR title is required.';
    } else if (title.trim().length < 5) {
      errs.title = 'Title should be at least 5 characters (e.g. "feat(auth): add OAuth2 provider").';
    }

    if (!description.trim()) {
      errs.description = 'PR description is required.';
    } else if (description.trim().length < 10) {
      errs.description = 'Please provide at least 10 characters explaining what changed and why.';
    }

    if (!diff.trim()) {
      errs.diff = 'Unified diff patch is required.';
    } else {
      const hasDiffHunk = diff.includes('@@') || diff.includes('diff --git') || diff.includes('+') || diff.includes('-');
      if (!hasDiffHunk) {
        errs.diff = 'Diff patch does not appear to contain valid unified diff hunks (expecting lines with @@, +, or -).';
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Submit handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const { filesChanged, stats } = parseDiffInput(diff, filename.trim() || 'src/contribution.ts');

    const prPayload: PullRequestPayload = {
      id: `preflight-${Date.now().toString(36)}`,
      title: title.trim(),
      author: author.trim() || 'contributor',
      authorAssociation: 'FIRST_TIME_CONTRIBUTOR',
      createdAt: new Date().toISOString(),
      branch: 'contributor-patch',
      targetBranch: 'main',
      linkedIssue: linkedIssue.trim() || null,
      description: description.trim(),
      filesChanged,
      stats,
    };

    await onSubmit(prPayload);
    onClose();
  };

  // Preset loaders for quick testing
  const loadPreset = (type: 'GENUINE' | 'NEEDS_WORK' | 'SPAM') => {
    if (type === 'GENUINE') {
      setTitle('feat(cache): add in-memory TTL caching layer for user session lookups');
      setDescription(
        '### Problem\nHigh database load during peak traffic due to repeated session lookups.\n\n### Solution\n- Implemented an LRU cache with 5-minute TTL.\n- Added comprehensive unit tests verifying expiration and eviction.\n\n### Checklist\n- [x] Closes #155\n- [x] Tests added and passing\n- [x] Documentation updated'
      );
      setDiff(
        `@@ -1,5 +1,24 @@\n+export class SessionCache {\n+  private store = new Map<string, { value: any; expiry: number }>();\n+\n+  set(key: string, value: any, ttlMs: number = 300000): void {\n+    this.store.set(key, { value, expiry: Date.now() + ttlMs });\n+  }\n+\n+  get(key: string): any | null {\n+    const item = this.store.get(key);\n+    if (!item) return null;\n+    if (Date.now() > item.expiry) {\n+      this.store.delete(key);\n+      return null;\n+    }\n+    return item.value;\n+  }\n+}\n`
      );
      setLinkedIssue('#155');
      setFilename('src/cache/session-cache.ts');
    } else if (type === 'NEEDS_WORK') {
      setTitle('Add experimental webhook dispatcher');
      setDescription('WIP webhook dispatcher implementation. Needs tests before merging.');
      setDiff(
        `@@ -10,3 +10,12 @@\n+export async function dispatchWebhook(url: string, payload: any) {\n+  // TODO: implement retry logic\n+  return fetch(url, { method: 'POST', body: JSON.stringify(payload) });\n+}`
      );
      setLinkedIssue('');
      setFilename('src/webhooks.ts');
    } else if (type === 'SPAM') {
      setTitle('Docs: fix readme formatting');
      setDescription('clean code');
      setDiff(
        `@@ -1,3 +1,3 @@\n-# Welcome to the Project\n+# Welcome to the Project \n \n`
      );
      setLinkedIssue('');
      setFilename('README.md');
    }
    setErrors({});
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="preflight-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn"
    >
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-600/30">
              <Rocket className="h-5 w-5" />
            </span>
            <div>
              <h2 id="preflight-title" className="text-base font-bold text-white tracking-tight">
                Contributor Pre-Flight Check
              </h2>
              <p className="text-xs text-slate-400">
                Test your pull request locally through PRoof before submitting on GitHub.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1 rounded-lg transition hover:bg-slate-800"
            aria-label="Close Pre-Flight Form"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* Preset Buttons for Quick Testing */}
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="text-slate-400 font-medium flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
              Quick Presets:
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => loadPreset('GENUINE')}
                className="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-[11px] font-semibold transition"
              >
                + Genuine Feature
              </button>
              <button
                type="button"
                onClick={() => loadPreset('NEEDS_WORK')}
                className="px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-[11px] font-semibold transition"
              >
                + Needs Work
              </button>
              <button
                type="button"
                onClick={() => loadPreset('SPAM')}
                className="px-2.5 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-[11px] font-semibold transition"
              >
                + Whitespace Only
              </button>
            </div>
          </div>

          {/* PR Title */}
          <div>
            <label className="text-xs font-semibold text-slate-200 block mb-1">
              Pull Request Title <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (errors.title) setErrors((prev) => ({ ...prev, title: undefined }));
              }}
              placeholder="e.g. feat(auth): add token refresh deduplication"
              className={`w-full bg-slate-950 border rounded-xl px-3.5 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none transition ${
                errors.title
                  ? 'border-rose-500 focus:border-rose-500'
                  : 'border-slate-700/80 focus:border-indigo-500'
              }`}
            />
            {errors.title && (
              <p className="mt-1 text-xs text-rose-400 flex items-center gap-1">
                <AlertCircle className="h-3 w-3 shrink-0" />
                <span>{errors.title}</span>
              </p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-semibold text-slate-200 block mb-1">
              PR Description & Checklist <span className="text-rose-400">*</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                if (errors.description) setErrors((prev) => ({ ...prev, description: undefined }));
              }}
              rows={4}
              placeholder="Describe the motivation, changes, and checklist (e.g. - [x] Tests added)..."
              className={`w-full bg-slate-950 border rounded-xl p-3 text-xs text-slate-100 placeholder:text-slate-500 font-sans leading-relaxed focus:outline-none transition ${
                errors.description
                  ? 'border-rose-500 focus:border-rose-500'
                  : 'border-slate-700/80 focus:border-indigo-500'
              }`}
            />
            {errors.description && (
              <p className="mt-1 text-xs text-rose-400 flex items-center gap-1">
                <AlertCircle className="h-3 w-3 shrink-0" />
                <span>{errors.description}</span>
              </p>
            )}
          </div>

          {/* Unified Diff Patch */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <FileCode className="h-3.5 w-3.5 text-indigo-400" />
                Unified Diff Patch <span className="text-rose-400">*</span>
              </label>
              <span className="text-[11px] text-slate-500 font-mono">
                Git unified format (@@ ... @@)
              </span>
            </div>
            <textarea
              value={diff}
              onChange={(e) => {
                setDiff(e.target.value);
                if (errors.diff) setErrors((prev) => ({ ...prev, diff: undefined }));
              }}
              rows={6}
              placeholder={`Paste output from 'git diff' or 'git format-patch':\n@@ -10,4 +10,12 @@\n-oldLine();\n+newLine();`}
              className={`w-full bg-slate-950 border rounded-xl p-3 text-xs text-slate-200 font-mono leading-relaxed focus:outline-none transition ${
                errors.diff
                  ? 'border-rose-500 focus:border-rose-500'
                  : 'border-slate-700/80 focus:border-indigo-500'
              }`}
            />
            {errors.diff && (
              <p className="mt-1 text-xs text-rose-400 flex items-center gap-1">
                <AlertCircle className="h-3 w-3 shrink-0" />
                <span>{errors.diff}</span>
              </p>
            )}
          </div>

          {/* Optional Fields Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <div>
              <label className="text-xs font-medium text-slate-400 block mb-1">
                Author Username
              </label>
              <input
                type="text"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="contributor"
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-slate-400 block mb-1">
                Primary Filename
              </label>
              <input
                type="text"
                value={filename}
                onChange={(e) => setFilename(e.target.value)}
                placeholder="src/feature.ts"
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-slate-400 block mb-1">
                Linked Issue (Optional)
              </label>
              <input
                type="text"
                value={linkedIssue}
                onChange={(e) => setLinkedIssue(e.target.value)}
                placeholder="e.g. #142"
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Offline Guarantee Notice */}
          <div className="p-3 rounded-xl bg-indigo-950/20 border border-indigo-900/30 text-xs text-indigo-300/90 flex items-start gap-2">
            <Info className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
            <p>
              <strong>100% Offline Pre-Flight:</strong> This submission runs exclusively against your local PRoof instance. No pull request will be opened on GitHub.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-semibold text-xs shadow-lg shadow-indigo-600/30 hover:from-indigo-500 hover:to-violet-500 transition disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span>Evaluating Locally...</span>
                </>
              ) : (
                <>
                  <Rocket className="h-3.5 w-3.5" />
                  <span>Run Pre-Flight Triage</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
