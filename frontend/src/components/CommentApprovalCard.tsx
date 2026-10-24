import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  Send,
  Edit3,
  CheckCircle,
  Copy,
  Sparkles,
  Info,
} from 'lucide-react';
import {
  SuggestedComment,
  ReviewAction,
  ReviewApprovalResponse,
  Verdict,
} from '@proof/shared';

interface CommentApprovalCardProps {
  prId: string;
  verdict: Verdict;
  suggestedComment: SuggestedComment;
  onApprove: (data: {
    finalComment: string;
    actionTaken: ReviewAction;
    maintainerNotes?: string;
  }) => Promise<ReviewApprovalResponse | null>;
}

export const CommentApprovalCard: React.FC<CommentApprovalCardProps> = ({
  prId,
  verdict,
  suggestedComment,
  onApprove,
}) => {
  const [commentText, setCommentText] = useState(suggestedComment.markdown);
  const [action, setAction] = useState<ReviewAction>('COMMENT_ONLY');
  const [notes, setNotes] = useState('');
  const [copied, setCopied] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [approvalRecord, setApprovalRecord] = useState<ReviewApprovalResponse | null>(null);

  useEffect(() => {
    setCommentText(suggestedComment.markdown);
    setApprovalRecord(null);
  }, [suggestedComment, prId]);

  const handleCopy = () => {
    navigator.clipboard.writeText(commentText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleApprove = async () => {
    setSubmitting(true);
    const res = await onApprove({
      finalComment: commentText,
      actionTaken: action,
      maintainerNotes: notes,
    });
    setSubmitting(false);
    if (res) {
      setApprovalRecord(res);
    }
  };

  const getToneBadge = (tone: string) => {
    switch (tone) {
      case 'ENCOURAGING':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'CONSTRUCTIVE_GUIDANCE':
        return 'bg-sky-500/10 text-sky-400 border-sky-500/30';
      case 'POLITE_CAUTION':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-sm shadow-xl flex flex-col gap-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-indigo-400" />
          <h2 className="text-base font-bold text-slate-100">
            Maintainer Supervised Review Comment
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border ${getToneBadge(
              suggestedComment.tone
            )}`}
          >
            Tone: {suggestedComment.tone.replace('_', ' ')}
          </span>
          <span className="text-[11px] text-slate-400 hidden sm:inline">
            Human-in-the-Loop
          </span>
        </div>
      </div>

      {/* Safety Notice */}
      <div className="p-3 rounded-xl bg-indigo-950/20 border border-indigo-900/30 text-xs text-indigo-300/90 flex items-start gap-2.5">
        <Info className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
        <p>
          <strong>Maintainer Control Guarantee:</strong> PRoof never executes automated merges, closures, or rejections. You can review, refine, and approve the generated draft below before posting.
        </p>
      </div>

      {/* Comment Editor */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <Edit3 className="h-3.5 w-3.5 text-slate-400" />
            Review Comment (Editable Markdown)
          </label>
          <button
            onClick={handleCopy}
            className="text-xs text-slate-400 hover:text-slate-200 transition flex items-center gap-1 font-medium"
          >
            {copied ? (
              <>
                <CheckCircle className="h-3 w-3 text-emerald-400" />
                <span className="text-emerald-400">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="h-3 w-3" />
                <span>Copy Draft</span>
              </>
            )}
          </button>
        </div>

        <textarea
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          rows={6}
          className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl p-3.5 text-xs text-slate-200 font-mono leading-relaxed focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50"
          placeholder="Edit review comment..."
        />
      </div>

      {/* Maintainer Action & Notes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold text-slate-300 block mb-1">
            Maintainer Action
          </label>
          <select
            value={action}
            onChange={(e) => setAction(e.target.value as ReviewAction)}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-medium"
          >
            <option value="COMMENT_ONLY">Comment Only (General Feedback)</option>
            <option value="REQUEST_CHANGES">Request Changes (Needs Adjustments)</option>
            <option value="APPROVE_FOR_REVIEW">Approve for Review (Mark Qualified)</option>
          </select>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-300 block mb-1">
            Maintainer Internal Notes (Optional)
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            placeholder="e.g. Good beginner contributor"
          />
        </div>
      </div>

      {/* Action Button & Confirmation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        <div className="text-[11px] text-slate-400">
          Target PR: <span className="font-mono text-slate-300">{prId}</span>
        </div>

        <button
          onClick={handleApprove}
          disabled={submitting || !commentText.trim()}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-semibold text-xs shadow-lg shadow-indigo-600/30 hover:from-indigo-500 hover:to-violet-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? (
            <>
              <div className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Recording Approval...</span>
            </>
          ) : (
            <>
              <Send className="h-3.5 w-3.5" />
              <span>Approve & Record Review</span>
            </>
          )}
        </button>
      </div>

      {/* Success Record Banner */}
      {approvalRecord && (
        <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-xs text-emerald-200 flex items-start gap-2.5 animate-in fade-in slide-in-from-top-1 duration-300">
          <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Review Approved & Logged!</span>
            <p className="mt-0.5 text-emerald-300/80">
              Approval ID: <span className="font-mono font-semibold">{approvalRecord.approvalId}</span> • Recorded at {new Date(approvalRecord.recordedAt).toLocaleTimeString()}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
