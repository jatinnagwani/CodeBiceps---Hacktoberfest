import React from 'react';
import { AlertTriangle, RefreshCw, Terminal, ServerOff } from 'lucide-react';

interface ApiErrorCardProps {
  error: string;
  onRetry: () => void;
  retrying?: boolean;
}

/**
 * Polished developer-tool error state for backend connection failures.
 */
export const ApiErrorCard: React.FC<ApiErrorCardProps> = ({
  error,
  onRetry,
  retrying = false,
}) => {
  return (
    <div
      role="alert"
      aria-live="assertive"
      className="bg-rose-950/20 border border-rose-800/60 rounded-2xl p-6 sm:p-8 backdrop-blur-sm shadow-xl flex flex-col gap-5 max-w-3xl mx-auto my-8 text-slate-200"
    >
      <div className="flex items-start gap-4">
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 shrink-0">
          <ServerOff className="h-6 w-6" />
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <span>Backend API Connection Unavailable</span>
          </h2>
          <p className="text-xs sm:text-sm text-rose-300/90 mt-1">
            {error || 'Unable to connect to the PRoof backend server on port 3001.'}
          </p>
        </div>
      </div>

      {/* Troubleshooting developer box */}
      <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 text-xs font-mono">
        <div className="flex items-center gap-2 text-slate-400 font-semibold mb-2 font-sans">
          <Terminal className="h-3.5 w-3.5 text-indigo-400" />
          <span>Quick Troubleshooting Steps</span>
        </div>
        <ol className="list-decimal list-inside space-y-1.5 text-slate-300">
          <li>
            Start the backend in your terminal:{' '}
            <code className="text-indigo-300 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
              npm run dev:backend
            </code>
          </li>
          <li>
            Verify that the Express server is listening on port 3001:{' '}
            <code className="text-indigo-300 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
              curl http://localhost:3001/api/health
            </code>
          </li>
          <li>
            If running the full stack at once, use{' '}
            <code className="text-indigo-300 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
              npm run dev
            </code>
          </li>
        </ol>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={onRetry}
          disabled={retrying}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs shadow-lg shadow-rose-950/40 transition disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${retrying ? 'animate-spin' : ''}`} />
          <span>{retrying ? 'Retrying Connection...' : 'Retry Connection'}</span>
        </button>
      </div>
    </div>
  );
};
