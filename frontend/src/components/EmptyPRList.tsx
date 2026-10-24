import React from 'react';
import { Inbox, RefreshCw, PenSquare } from 'lucide-react';

interface EmptyPRListProps {
  onReload: () => void;
  onNewCustomPR: () => void;
  reloading?: boolean;
}

/**
 * Developer empty state for an empty pull request queue.
 */
export const EmptyPRList: React.FC<EmptyPRListProps> = ({
  onReload,
  onNewCustomPR,
  reloading = false,
}) => {
  return (
    <div
      role="status"
      className="bg-slate-900/40 border border-dashed border-slate-800 rounded-2xl p-8 sm:p-12 text-center flex flex-col items-center justify-center gap-4 max-w-2xl mx-auto my-6"
    >
      <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 text-slate-500">
        <Inbox className="h-8 w-8 text-indigo-400" />
      </div>

      <div>
        <h3 className="text-base font-bold text-slate-200">
          Incoming Pull Request Queue is Empty
        </h3>
        <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-md mx-auto leading-relaxed">
          No pull requests are currently waiting in the triage queue. You can reload the sample benchmark
          pull requests or test a custom PR diff.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3 mt-2">
        <button
          onClick={onReload}
          disabled={reloading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${reloading ? 'animate-spin' : ''}`} />
          <span>{reloading ? 'Reloading...' : 'Reload Sample PRs'}</span>
        </button>

        <button
          onClick={onNewCustomPR}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/30 transition"
        >
          <PenSquare className="h-3.5 w-3.5" />
          <span>Test Custom PR</span>
        </button>
      </div>
    </div>
  );
};
