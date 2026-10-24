import React from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  HelpCircle,
  Cpu,
  Layers,
  FileCheck,
  Tag,
  AlertCircle,
} from 'lucide-react';
import { TriageResult, Verdict, Confidence } from '@proof/shared';

interface VerdictBannerProps {
  result: TriageResult;
}

export const VerdictBanner: React.FC<VerdictBannerProps> = ({ result }) => {
  const getVerdictDetails = (v: Verdict) => {
    switch (v) {
      case 'GENUINE':
        return {
          title: 'Genuine Contribution',
          subtitle: 'Relevant changes with constructive context and test validation.',
          icon: <ShieldCheck className="h-7 w-7 text-emerald-400" />,
          cardBg: 'bg-emerald-950/30 border-emerald-500/50',
          badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
          glow: 'shadow-emerald-950/50',
        };
      case 'NEEDS_WORK':
        return {
          title: 'Needs Work',
          subtitle: 'Well-intentioned contribution requiring tests, issue linking, or edge-case refinement.',
          icon: <HelpCircle className="h-7 w-7 text-amber-400" />,
          cardBg: 'bg-amber-950/30 border-amber-500/50',
          badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
          glow: 'shadow-amber-950/50',
        };
      case 'LIKELY_SPAM':
        return {
          title: 'Likely Spam / Low Effort',
          subtitle: 'Identified trivial whitespace, trailing space, or superficial edits without substance.',
          icon: <ShieldAlert className="h-7 w-7 text-rose-400" />,
          cardBg: 'bg-rose-950/30 border-rose-500/50',
          badgeBg: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
          glow: 'shadow-rose-950/50',
        };
    }
  };

  const getConfidenceBadge = (c: Confidence) => {
    switch (c) {
      case 'HIGH':
        return 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40';
      case 'MEDIUM':
        return 'bg-sky-500/20 text-sky-300 border-sky-500/40';
      case 'LOW':
        return 'bg-slate-700 text-slate-300 border-slate-600';
    }
  };

  const details = getVerdictDetails(result.verdict);
  const isFallback = result.engine === 'HEURISTICS_FALLBACK';

  return (
    <div
      className={`border rounded-2xl p-5 backdrop-blur-sm shadow-xl transition duration-300 ${details.cardBg} ${details.glow}`}
    >
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div className="flex items-center gap-3.5">
          <div className="p-2.5 rounded-xl bg-slate-900/80 border border-white/10 shadow-inner">
            {details.icon}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-extrabold text-white tracking-tight">
                {details.title}
              </h2>
              <span
                className={`px-2.5 py-0.5 rounded-md text-xs font-bold border tracking-wide uppercase ${details.badgeBg}`}
              >
                {result.verdict.replace('_', ' ')}
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">{details.subtitle}</p>
          </div>
        </div>

        {/* Engine & Confidence Pills */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Confidence */}
          <span
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold border flex items-center gap-1.5 ${getConfidenceBadge(
              result.confidence
            )}`}
          >
            <Layers className="h-3.5 w-3.5" />
            {result.confidence} Confidence
          </span>

          {/* Engine Origin */}
          {isFallback ? (
            <span
              className="px-2.5 py-1 rounded-lg text-xs font-semibold border bg-amber-500/15 text-amber-300 border-amber-500/30 flex items-center gap-1.5"
              title="Ollama is currently offline. Deterministic rule-based engine was used."
            >
              <AlertCircle className="h-3.5 w-3.5 text-amber-400" />
              Heuristics-Only (Ollama Offline)
            </span>
          ) : (
            <span className="px-2.5 py-1 rounded-lg text-xs font-semibold border bg-indigo-500/15 text-indigo-300 border-indigo-500/30 flex items-center gap-1.5">
              <Cpu className="h-3.5 w-3.5 text-indigo-400" />
              Local AI ({result.engineDetails.modelName || 'Qwen 3.5 4B'})
            </span>
          )}
        </div>
      </div>

      {/* Summary Box */}
      <div className="mt-4 bg-slate-950/50 border border-white/5 rounded-xl p-3.5">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
          Executive Summary
        </h3>
        <p className="text-sm text-slate-200 leading-relaxed font-medium">
          {result.summary}
        </p>
      </div>

      {/* Supporting Evidence List */}
      <div className="mt-4">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <FileCheck className="h-3.5 w-3.5 text-indigo-400" />
          Supporting Evidence & Observations ({result.evidence.length})
        </h3>

        <div className="space-y-2">
          {result.evidence.map((ev) => (
            <div
              key={ev.id}
              className="flex items-start gap-2.5 p-2.5 rounded-lg bg-slate-950/40 border border-white/5 text-xs"
            >
              <Tag className="h-3.5 w-3.5 text-slate-400 mt-0.5 shrink-0" />
              <div className="flex-1">
                <span className="text-slate-200 font-medium">
                  {ev.description}
                </span>
                {ev.file && (
                  <span className="ml-2 font-mono text-[11px] text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                    {ev.file} {ev.lineRange && `(${ev.lineRange})`}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
