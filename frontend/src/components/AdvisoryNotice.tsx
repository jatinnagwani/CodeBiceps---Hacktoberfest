import React from 'react';
import { ShieldAlert, UserCheck } from 'lucide-react';

interface AdvisoryNoticeProps {
  className?: string;
}

/**
 * High-visibility notice stating that all AI and heuristic triage results
 * are strictly advisory and require human maintainer review and approval.
 */
export const AdvisoryNotice: React.FC<AdvisoryNoticeProps> = ({ className = '' }) => {
  return (
    <div
      role="region"
      aria-label="Human Review Advisory Notice"
      className={`p-3.5 rounded-xl bg-gradient-to-r from-indigo-950/50 via-slate-900/60 to-purple-950/40 border border-indigo-500/30 text-xs shadow-lg shadow-indigo-950/20 backdrop-blur-sm ${className}`}
    >
      <div className="flex items-start gap-3">
        <div className="p-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 shrink-0 mt-0.5">
          <ShieldAlert className="h-4 w-4" />
        </div>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-slate-100 tracking-tight">
              Advisory Analysis • Human Review Required
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
              <UserCheck className="h-3 w-3" />
              Human-in-the-Loop
            </span>
          </div>
          <p className="text-slate-300 mt-1 leading-relaxed">
            PRoof provides evidence-based recommendations to accelerate triage, but{' '}
            <strong className="text-white font-semibold">never automatically merges, closes, or comments on PRs</strong>.
            Maintainers retain complete control to inspect evidence, edit feedback, and approve every action.
          </p>
        </div>
      </div>
    </div>
  );
};
