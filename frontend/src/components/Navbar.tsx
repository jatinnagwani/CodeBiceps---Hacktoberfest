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
    <header className="border-b border-[#202B24] bg-[#0B100E]/90 backdrop-blur-md sticky top-0 z-50 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-[#151C18] border border-[#22C77A]/30 flex items-center justify-center shadow-sm shadow-[#22C77A]/10">
            <ShieldCheck className="h-5 w-5 text-[#22C77A]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold tracking-tight text-[#F3F6F4]">
                PRoof
              </span>
              <span className="px-2 py-0.5 text-[10px] font-semibold tracking-wide rounded border border-[#202B24] bg-[#101613] text-[#22C77A]">
                Hacktoberfest
              </span>
            </div>
            <p className="text-[11px] text-[#A0ADA5] hidden sm:block">
              Mentor-first AI PR review & claim watch
            </p>
          </div>
        </div>

        {/* Runtime Status & Badges */}
        <div className="flex items-center gap-3">
          {/* Engine Status Indicator */}
          {loading ? (
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-[#101613] border border-[#202B24] text-xs text-[#A0ADA5]">
              <div className="h-1.5 w-1.5 rounded-full bg-[#718078] animate-pulse" />
              <span>Connecting engine...</span>
            </div>
          ) : isOllamaConnected ? (
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-[#101613] border border-[#22C77A]/40 text-xs text-[#22C77A] shadow-sm">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#36E39A] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#22C77A]"></span>
              </span>
              <Cpu className="h-3.5 w-3.5 text-[#22C77A]" />
              <span className="font-medium">Ollama Active</span>
              <span className="text-[#A0ADA5] text-[11px] hidden md:inline">({health?.ollama.model || 'proof-reviewer'})</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-[#101613] border border-amber-500/30 text-xs text-amber-300 shadow-sm" title="Ollama is offline. Operating in transparent rule-based heuristics mode.">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
              <span className="font-medium">Heuristics Fallback</span>
              <span className="text-[#718078] text-[11px] hidden md:inline">(Ollama Offline)</span>
            </div>
          )}

          {/* Track 1 Pill */}
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#101613] border border-[#202B24] text-xs text-[#A0ADA5]">
            <Sparkles className="h-3.5 w-3.5 text-[#22C77A]" />
            <span>Track 1: Open-Source AI</span>
          </div>

          {/* GitHub Link */}
          <a
            href="https://github.com/jatinnagwani/CodeBiceps---Hacktoberfest"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 text-xs text-[#A0ADA5] hover:text-[#F3F6F4] transition px-2 py-1 rounded-md hover:bg-[#151C18]"
          >
            <span className="hidden sm:inline">GitHub</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>
    </header>
  );
};
