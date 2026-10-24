import React from 'react';
import { Sparkles } from 'lucide-react';

/**
 * Polished developer-tool skeleton loading state while initial health and PR list data loads.
 */
export const DashboardSkeleton: React.FC = () => {
  return (
    <div className="flex flex-col gap-6 animate-pulse" aria-busy="true" aria-label="Loading dashboard">
      {/* Overview explainer skeleton */}
      <div className="bg-slate-900/40 border border-slate-800/60 rounded-2xl p-5">
        <div className="h-5 w-48 bg-slate-800 rounded-md mb-3" />
        <div className="h-4 w-full max-w-2xl bg-slate-800/60 rounded-md mb-2" />
        <div className="h-4 w-3/4 bg-slate-800/40 rounded-md mb-4" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="h-12 bg-slate-800/40 rounded-xl" />
          <div className="h-12 bg-slate-800/40 rounded-xl" />
          <div className="h-12 bg-slate-800/40 rounded-xl" />
          <div className="h-12 bg-slate-800/40 rounded-xl" />
        </div>
      </div>

      {/* PR List area skeleton */}
      <div className="bg-slate-900/40 border border-slate-800/60 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="h-5 w-56 bg-slate-800 rounded-md" />
          <div className="h-8 w-32 bg-slate-800/60 rounded-xl" />
        </div>
        <div className="space-y-3">
          <div className="h-20 bg-slate-950/40 border border-slate-800/50 rounded-xl" />
          <div className="h-20 bg-slate-950/40 border border-slate-800/50 rounded-xl" />
          <div className="h-20 bg-slate-950/40 border border-slate-800/50 rounded-xl" />
        </div>
      </div>

      {/* Two column detail skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-slate-900/40 border border-slate-800/60 rounded-2xl p-5 h-96" />
        <div className="lg:col-span-5 flex flex-col gap-5">
          <div className="bg-slate-900/40 border border-slate-800/60 rounded-2xl p-5 h-44" />
          <div className="bg-slate-900/40 border border-slate-800/60 rounded-2xl p-5 h-64" />
        </div>
      </div>

      {/* Loading message */}
      <div className="flex items-center justify-center gap-2 text-xs text-slate-400 py-4">
        <Sparkles className="h-4 w-4 text-indigo-400 animate-spin" />
        <span>Connecting to local PRoof backend engine and loading triage queue...</span>
      </div>
    </div>
  );
};
