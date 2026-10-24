import React from 'react';
import { Lock, Cpu, Zap, HeartHandshake, ShieldCheck } from 'lucide-react';
import { HealthStatusResponse } from '@proof/shared';

interface LocalTriageExplainerProps {
  health: HealthStatusResponse | null;
}

/**
 * Concise developer explanation of Local-First PR Triage and its guarantees.
 */
export const LocalTriageExplainer: React.FC<LocalTriageExplainerProps> = ({ health }) => {
  const isOllamaConnected = health?.ollama.connected ?? false;
  const activeRulesCount = health?.heuristics.activeRulesCount ?? 5;

  return (
    <section
      aria-label="Local-First PR Triage Overview"
      className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 sm:p-5 backdrop-blur-sm shadow-xl"
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Description */}
        <div className="max-w-3xl">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="p-1 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <ShieldCheck className="h-4 w-4" />
            </span>
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200">
              What is Local-First PR Triage?
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            PRoof runs deterministic heuristics and open-weight AI models locally on your workstation to
            evaluate pull requests in real time. It protects maintainers by flagging low-effort spam while
            drafting constructive, evidence-backed feedback for genuine first-time contributors—
            <strong className="text-slate-100 font-semibold">with zero code exfiltration</strong>.
          </p>
        </div>

        {/* Feature Badges / Guarantees */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4 gap-2.5 shrink-0">
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-950/60 border border-slate-800 text-xs">
            <Lock className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
            <div>
              <div className="font-semibold text-slate-200">Zero Exfiltration</div>
              <div className="text-[10px] text-slate-400">100% On-Device</div>
            </div>
          </div>

          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-950/60 border border-slate-800 text-xs">
            <Zap className="h-3.5 w-3.5 text-amber-400 shrink-0" />
            <div>
              <div className="font-semibold text-slate-200">{activeRulesCount} Heuristics</div>
              <div className="text-[10px] text-slate-400">Offline Guaranteed</div>
            </div>
          </div>

          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-950/60 border border-slate-800 text-xs">
            <Cpu className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
            <div>
              <div className="font-semibold text-slate-200">
                {isOllamaConnected ? 'Local Ollama' : 'Heuristic Engine'}
              </div>
              <div className="text-[10px] text-slate-400">
                {isOllamaConnected ? (health?.ollama.model || 'Qwen') : 'Rule-Based Mode'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-950/60 border border-slate-800 text-xs">
            <HeartHandshake className="h-3.5 w-3.5 text-sky-400 shrink-0" />
            <div>
              <div className="font-semibold text-slate-200">Mentorship First</div>
              <div className="text-[10px] text-slate-400">Polite & Actionable</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
