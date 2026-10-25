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
  ExternalLink,
  MessageSquareText,
  Clock,
  FileCode,
  Info,
} from 'lucide-react';
import { AnalysisResult, ReviewVerdict, Confidence } from '@proof/shared';

export interface VerdictBannerProps {
  result: AnalysisResult;
  onHighlightDiff?: (file: string, lineRange?: string) => void;
}

export const VerdictBanner: React.FC<VerdictBannerProps> = ({
  result,
  onHighlightDiff,
}) => {
  const getVerdictDetails = (v: ReviewVerdict) => {
    switch (v) {
      case 'GENUINE':
        return {
          title: 'Genuine Contribution',
          subtitle: 'Substantive changes with constructive context and test validation.',
          icon: <ShieldCheck className="h-5 w-5 sm:h-6 sm:w-6 text-[#22C77A]" />,
          cardBg: 'bg-[#101613] border-[#22C77A]/40',
          badgeBg: 'bg-[#151C18] text-[#22C77A] border-[#22C77A]/30',
          glow: 'shadow-sm shadow-[#22C77A]/5',
        };
      case 'NEEDS_WORK':
        return {
          title: 'Needs Work',
          subtitle: 'Well-intentioned contribution requiring tests, issue linking, or implementation refinement.',
          icon: <HelpCircle className="h-5 w-5 sm:h-6 sm:w-6 text-amber-400" />,
          cardBg: 'bg-[#101613] border-amber-500/40',
          badgeBg: 'bg-[#151C18] text-amber-300 border-amber-500/30',
          glow: 'shadow-sm shadow-amber-950/20',
        };
      case 'LIKELY_SPAM':
        return {
          title: 'Likely Spam / Low Effort',
          subtitle: 'Identified superficial formatting, whitespace adjustments, or changes without substance.',
          icon: <ShieldAlert className="h-5 w-5 sm:h-6 sm:w-6 text-rose-400" />,
          cardBg: 'bg-[#101613] border-rose-500/40',
          badgeBg: 'bg-[#151C18] text-rose-300 border-rose-500/30',
          glow: 'shadow-sm shadow-rose-950/20',
        };
    }
  };

  const getConfidenceBadge = (c: Confidence) => {
    switch (c) {
      case 'HIGH':
        return 'bg-[#151C18] text-[#22C77A] border-[#22C77A]/30';
      case 'MEDIUM':
        return 'bg-[#151C18] text-amber-300 border-amber-500/30';
      case 'LOW':
        return 'bg-[#151C18] text-[#A0ADA5] border-[#202B24]';
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'SUPPORTING':
        return 'bg-[#151C18] text-[#22C77A] border-[#22C77A]/30';
      case 'CONCERN':
        return 'bg-[#151C18] text-rose-400 border-rose-500/30';
      default:
        return 'bg-[#151C18] text-[#A0ADA5] border-[#202B24]';
    }
  };

  const details = getVerdictDetails(result.verdict);
  const isFallback = result.engine === 'HEURISTICS_FALLBACK';

  return (
    <section
      aria-label="Triage Analysis Result"
      className={`border rounded-2xl p-4 sm:p-5 backdrop-blur-sm shadow-xl transition duration-300 flex flex-col gap-4 overflow-hidden ${details.cardBg} ${details.glow}`}
    >
      {/* Top Banner: Verdict, Confidence, Engine Attribution */}
      <div className="flex flex-col gap-3 pb-3 border-b border-[#202B24]">
        <div className="flex items-start gap-3">
          <div className="p-2 sm:p-2.5 rounded-xl bg-[#0B100E] border border-[#202B24] shadow-inner shrink-0 mt-0.5">
            {details.icon}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base sm:text-lg font-extrabold text-[#F3F6F4] tracking-tight">
                {details.title}
              </h2>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold border tracking-wide uppercase ${details.badgeBg}`}
              >
                {result.verdict.replace('_', ' ')}
              </span>
            </div>
            <p className="text-xs text-[#A0ADA5] mt-0.5 leading-relaxed">{details.subtitle}</p>
          </div>
        </div>

        {/* Engine Origin & Confidence Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-[#202B24]/40">
          {/* Confidence Indicator */}
          <span
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold border flex items-center gap-1.5 ${getConfidenceBadge(
              result.confidence
            )}`}
            title={`Assessed with ${result.confidence} confidence.`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>{result.confidence} Confidence</span>
          </span>

          {/* Explicit Engine Origin Attribution */}
          {isFallback ? (
            <span
              className="px-2.5 py-1 rounded-lg text-xs font-semibold border bg-amber-500/15 text-amber-300 border-amber-500/30 flex items-center gap-1.5"
              title={
                result.engineDetails.notes ||
                'Ollama daemon is offline. Deterministic rule heuristics used.'
              }
            >
              <AlertCircle className="h-3.5 w-3.5 text-amber-400" />
              <span>Heuristics Fallback</span>
              {result.engineDetails.executionTimeMs > 0 && (
                <span className="text-[10px] text-amber-400/80 font-mono">
                  ({result.engineDetails.executionTimeMs}ms)
                </span>
              )}
            </span>
          ) : (
            <span
              className="px-2.5 py-1 rounded-lg text-xs font-semibold border bg-[#151C18] text-[#22C77A] border-[#22C77A]/30 flex items-center gap-1.5"
              title={`Evaluated locally with model: ${result.engineDetails.modelName}`}
            >
              <Cpu className="h-3.5 w-3.5 text-[#22C77A]" />
              <span>Local AI ({result.engineDetails.modelName || 'proof-reviewer'})</span>
              {result.engineDetails.executionTimeMs > 0 && (
                <span className="text-[10px] text-[#22C77A]/80 font-mono">
                  ({result.engineDetails.executionTimeMs}ms)
                </span>
              )}
            </span>
          )}
        </div>
      </div>

      {/* Engine Fallback Explanation Banner (When Fallback was Triggered) */}
      {isFallback && result.engineDetails.notes && (
        <div className="p-2.5 rounded-xl bg-amber-950/30 border border-amber-800/60 text-amber-200/90 text-xs flex items-center gap-2">
          <Info className="h-4 w-4 text-amber-400 shrink-0" />
          <div className="flex-1 text-[11px] leading-relaxed">
            <strong>Fallback Notice:</strong> {result.engineDetails.notes} No cloud AI or unverified external model was used.
          </div>
        </div>
      )}

      {/* Summary Box */}
      <div className="bg-[#0B100E] border border-[#202B24] rounded-lg p-3 sm:p-3.5">
        <h3 className="text-xs font-semibold text-[#A0ADA5] uppercase tracking-wider mb-1 flex items-center gap-1.5">
          <MessageSquareText className="h-3.5 w-3.5 text-[#22C77A]" />
          Executive Summary
        </h3>
        <p className="text-xs sm:text-sm text-[#F3F6F4] leading-relaxed font-medium">
          {result.summary}
        </p>
      </div>

      {/* Concise Reasoning */}
      {result.reasoning && (
        <div className="bg-[#0B100E] border border-[#202B24] rounded-lg p-3 sm:p-3.5">
          <h3 className="text-xs font-semibold text-[#A0ADA5] uppercase tracking-wider mb-1">
            Concise Reasoning
          </h3>
          <p className="text-xs text-[#A0ADA5] leading-relaxed">
            {result.reasoning}
          </p>
        </div>
      )}

      {/* Supporting Evidence List (Linked to Supplied Diff) */}
      <div>
        <h3 className="text-xs font-semibold text-[#A0ADA5] uppercase tracking-wider mb-2 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <FileCheck className="h-3.5 w-3.5 text-[#22C77A]" />
            Verified Evidence Citations ({result.evidence.length})
          </span>
          <span className="text-[10px] text-[#718078] font-normal">
            Click citation to jump to diff
          </span>
        </h3>

        {result.evidence.length === 0 ? (
          <div className="p-3 text-center text-xs text-[#718078] rounded-lg bg-[#0B100E] border border-[#202B24]">
            No specific diff citations flagged. Verdict synthesized from overall heuristic metrics.
          </div>
        ) : (
          <div className="space-y-2">
            {result.evidence.map((ev) => (
              <div
                key={ev.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-lg bg-[#0B100E] border border-[#202B24] text-xs hover:border-[#2E3E34] transition"
              >
                <div className="flex items-start gap-2.5 min-w-0 flex-1">
                  <Tag className="h-3.5 w-3.5 text-[#718078] mt-0.5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <span className="text-[#F3F6F4] font-medium">
                      {ev.description}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto shrink-0 font-mono text-[11px]">
                  {/* Severity Badge */}
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-semibold border ${getSeverityBadge(
                      ev.severity
                    )}`}
                  >
                    {ev.severity}
                  </span>

                  {/* Interactive File & Line Link to Diff Viewer */}
                  {ev.file && (
                    <button
                      type="button"
                      onClick={() => onHighlightDiff?.(ev.file!, ev.lineRange)}
                      className="inline-flex items-center gap-1.5 font-mono text-[11px] text-[#22C77A] hover:text-[#36E39A] bg-[#151C18] px-2 py-0.5 rounded-md border border-[#22C77A]/30 transition shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#22C77A]"
                      title={`Jump to ${ev.file} ${ev.lineRange || ''} in diff viewer`}
                    >
                      <FileCode className="h-3 w-3 text-[#22C77A]" />
                      <span className="truncate max-w-[150px]">{ev.file.split('/').pop()}</span>
                      {ev.lineRange && <span className="text-[#22C77A] font-semibold">{ev.lineRange}</span>}
                      <ExternalLink className="h-2.5 w-2.5 text-[#22C77A]" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Advisory Epistemic Disclaimer */}
      <div className="pt-2 border-t border-[#202B24] flex items-center justify-between text-[11px] text-[#718078]">
        <span>Advisory verdict for maintainer reference</span>
        <span>Human review required before action</span>
      </div>
    </section>
  );
};
