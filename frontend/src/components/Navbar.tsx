import React from 'react';
import { ShieldCheck, Cpu, AlertTriangle, ExternalLink, Sparkles } from 'lucide-react';
import { HealthStatusResponse } from '@proof/shared';

interface NavbarProps {
  health: HealthStatusResponse | null;
  loading: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ health, loading }) => {
  const isOllamaConnected = health?.ollama.connected ?? false;

  return (
    <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/25 ring-1 ring-white/20">
            <ShieldCheck className="h-6 w-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                PRoof
              </span>
              <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
                Hacktoberfest
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              Local-First AI PR Review & Triage
            </p>
          </div>
        </div>

        {/* Runtime Status & Badges */}
        <div className="flex items-center gap-3">
          {/* Engine Status Indicator */}
          {loading ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs text-slate-400">
              <div className="h-2 w-2 rounded-full bg-slate-500 animate-pulse" />
              <span>Connecting engine...</span>
            </div>
          ) : isOllamaConnected ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-950/60 border border-emerald-800/80 text-xs text-emerald-300 shadow-sm shadow-emerald-950">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <Cpu className="h-3.5 w-3.5 text-emerald-400" />
              <span className="font-semibold">Ollama Active</span>
              <span className="text-emerald-500/80 hidden md:inline">({health?.ollama.model || 'Qwen 3.5 4B'})</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-950/60 border border-amber-800/80 text-xs text-amber-300 shadow-sm shadow-amber-950" title="Ollama is offline. Operating in transparent rule-based heuristics mode.">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
              <span className="font-semibold">Heuristics-Only Mode</span>
              <span className="text-amber-500/80 hidden md:inline">(Ollama Offline)</span>
            </div>
          )}

          {/* Track 1 Pill */}
          <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/90 border border-slate-800 text-xs text-slate-300">
            <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
            <span>Track 1: Open-Source AI</span>
          </div>

          {/* GitHub Link */}
          <a
            href="https://github.com/jatinnagwani/CodeBiceps---Hacktoberfest"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-100 transition px-2 py-1"
          >
            <span className="hidden sm:inline">GitHub</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>
    </header>
  );
};
