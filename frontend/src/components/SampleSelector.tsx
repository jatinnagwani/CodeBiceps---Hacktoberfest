import React from 'react';
import { CheckCircle2, AlertCircle, Ban, PenSquare, ArrowRight } from 'lucide-react';
import { PullRequestPayload } from '@proof/shared';

interface SampleSelectorProps {
  samples: PullRequestPayload[];
  selectedId: string;
  isCustom: boolean;
  onSelectSample: (id: string) => void;
  onToggleCustom: (custom: boolean) => void;
}

export const SampleSelector: React.FC<SampleSelectorProps> = ({
  samples,
  selectedId,
  isCustom,
  onSelectSample,
  onToggleCustom,
}) => {
  const getCategoryMeta = (cat?: string) => {
    switch (cat) {
      case 'GENUINE':
        return {
          icon: <CheckCircle2 className="h-4 w-4 text-emerald-400" />,
          label: 'Genuine',
          badgeClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
          activeCard: 'border-emerald-500/50 bg-emerald-950/20 shadow-emerald-900/20',
          hoverCard: 'hover:border-emerald-500/30 hover:bg-emerald-950/10',
        };
      case 'NEEDS_WORK':
        return {
          icon: <AlertCircle className="h-4 w-4 text-amber-400" />,
          label: 'Needs Work',
          badgeClass: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
          activeCard: 'border-amber-500/50 bg-amber-950/20 shadow-amber-900/20',
          hoverCard: 'hover:border-amber-500/30 hover:bg-amber-950/10',
        };
      case 'LIKELY_SPAM':
        return {
          icon: <Ban className="h-4 w-4 text-rose-400" />,
          label: 'Likely Spam',
          badgeClass: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
          activeCard: 'border-rose-500/50 bg-rose-950/20 shadow-rose-900/20',
          hoverCard: 'hover:border-rose-500/30 hover:bg-rose-950/10',
        };
      default:
        return {
          icon: null,
          label: 'PR',
          badgeClass: 'bg-slate-800 text-slate-300 border-slate-700',
          activeCard: 'border-slate-600 bg-slate-900',
          hoverCard: 'hover:border-slate-700',
        };
    }
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 sm:p-5 backdrop-blur-sm shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
            Mid-Evaluation Evaluation Benchmark Demos
          </h2>
          <p className="text-xs text-slate-400">
            Select one of the 3 local pull requests to test the AI review pipeline, or enter a custom diff.
          </p>
        </div>

        {/* Custom Input Toggle Button */}
        <button
          onClick={() => onToggleCustom(!isCustom)}
          className={`inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg border transition ${
            isCustom
              ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/30'
              : 'bg-slate-800/90 text-slate-300 border-slate-700 hover:bg-slate-800 hover:text-white'
          }`}
        >
          <PenSquare className="h-3.5 w-3.5" />
          <span>{isCustom ? 'Viewing Custom PR' : 'Test Custom PR'}</span>
        </button>
      </div>

      {/* PR Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {samples.map((sample) => {
          const meta = getCategoryMeta(sample.category);
          const isSelected = !isCustom && sample.id === selectedId;

          return (
            <button
              key={sample.id}
              onClick={() => {
                onToggleCustom(false);
                onSelectSample(sample.id);
              }}
              className={`text-left p-3.5 rounded-xl border transition duration-200 relative overflow-hidden flex flex-col justify-between ${
                isSelected
                  ? `${meta.activeCard} ring-1 ring-inset shadow-lg`
                  : `border-slate-800/80 bg-slate-950/40 ${meta.hoverCard}`
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold border ${meta.badgeClass}`}
                  >
                    {meta.icon}
                    {meta.label}
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">
                    +{sample.stats.totalAdditions} / -{sample.stats.totalDeletions}
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-slate-100 line-clamp-2 leading-snug">
                  {sample.title}
                </h3>
              </div>

              <div className="mt-3 pt-2.5 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
                <span className="truncate">@{sample.author}</span>
                <span className="flex items-center gap-1 text-slate-400 font-medium">
                  Inspect <ArrowRight className="h-3 w-3" />
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
