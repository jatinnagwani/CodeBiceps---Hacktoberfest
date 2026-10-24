import React from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Gauge, Activity } from 'lucide-react';
import { HeuristicFinding } from '@proof/shared';

interface HeuristicsCardProps {
  score: number;
  findings: HeuristicFinding[];
}

export const HeuristicsCard: React.FC<HeuristicsCardProps> = ({ score, findings }) => {
  const getScoreColor = (s: number) => {
    if (s >= 70) return { bar: 'bg-emerald-500', text: 'text-emerald-400', badge: 'bg-emerald-500/10 border-emerald-500/30' };
    if (s >= 40) return { bar: 'bg-amber-500', text: 'text-amber-400', badge: 'bg-amber-500/10 border-amber-500/30' };
    return { bar: 'bg-rose-500', text: 'text-rose-400', badge: 'bg-rose-500/10 border-rose-500/30' };
  };

  const scoreMeta = getScoreColor(score);

  return (
    <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-sm shadow-xl flex flex-col gap-4">
      {/* Title & Score Indicator */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-indigo-400" />
          <h2 className="text-base font-bold text-slate-100">
            Deterministic Heuristic Analysis
          </h2>
        </div>

        <div className={`flex items-center gap-2 px-3 py-1 rounded-xl border ${scoreMeta.badge}`}>
          <Gauge className={`h-4 w-4 ${scoreMeta.text}`} />
          <span className="text-xs text-slate-400">Score:</span>
          <span className={`text-sm font-extrabold ${scoreMeta.text}`}>
            {score} / 100
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
        <div
          className={`h-full transition-all duration-500 rounded-full ${scoreMeta.bar}`}
          style={{ width: `${score}%` }}
        />
      </div>

      {/* Findings List */}
      <div className="space-y-2.5 mt-1">
        {findings.map((f) => {
          const isPassed = f.passed;
          const isCritical = f.severity === 'CRITICAL';

          return (
            <div
              key={f.id}
              className={`p-3 rounded-xl border transition ${
                isPassed
                  ? 'bg-slate-950/40 border-slate-800/80'
                  : isCritical
                  ? 'bg-rose-950/20 border-rose-800/40'
                  : 'bg-amber-950/20 border-amber-800/40'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2.5">
                  <div className="mt-0.5 shrink-0">
                    {isPassed ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    ) : isCritical ? (
                      <XCircle className="h-4 w-4 text-rose-400" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-amber-400" />
                    )}
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-slate-200">
                      {f.name}
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                      {f.evidence}
                    </p>
                  </div>
                </div>

                <span
                  className={`text-[11px] font-mono font-bold shrink-0 px-1.5 py-0.5 rounded ${
                    f.scoreImpact > 0
                      ? 'text-emerald-400 bg-emerald-500/10'
                      : f.scoreImpact < 0
                      ? 'text-rose-400 bg-rose-500/10'
                      : 'text-slate-400 bg-slate-800'
                  }`}
                >
                  {f.scoreImpact > 0 ? `+${f.scoreImpact}` : f.scoreImpact}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
