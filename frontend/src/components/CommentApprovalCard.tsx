import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  Send,
  Edit3,
  CheckCircle2,
  Copy,
  Sparkles,
  Info,
  ShieldAlert,
  RotateCcw,
  Check,
} from 'lucide-react';
import {
  ReviewComment,
  SuggestedComment,
  ReviewAction,
  ReviewApprovalResponse,
  ReviewVerdict,
} from '@proof/shared';

export interface CommentApprovalCardProps {
  prId: string;
  verdict: ReviewVerdict;
  suggestedComment: ReviewComment | SuggestedComment;
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

  // Sync state when selected PR or suggested comment changes
  useEffect(() => {
    setCommentText(suggestedComment.markdown);
    setApprovalRecord(null);
  }, [suggestedComment, prId]);

  const isEdited = commentText.trim() !== suggestedComment.markdown.trim();

  const handleCopy = () => {
    navigator.clipboard.writeText(commentText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReset = () => {
    setCommentText(suggestedComment.markdown);
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

  const getToneBadge = (tone?: string) => {
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
    <section
      aria-label="Maintainer Review Comment Approval"
      className="bg-[#101613] border border-[#202B24] rounded-xl p-4 sm:p-5 shadow-sm flex flex-col gap-4 animate-subtle-fade"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#202B24]">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-[#22C77A]" />
          <h2 className="text-sm font-bold text-[#F3F6F4]">
            Mentoring Review Comment Draft
          </h2>
        </div>

        <div className="flex items-center gap-2">
          {isEdited ? (
            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#151C18] text-[#22C77A] border border-[#22C77A]/40">
              Edited by Maintainer
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#0B100E] text-[#A0ADA5] border border-[#202B24]">
              Original Draft
            </span>
          )}

          {suggestedComment.tone && (
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${getToneBadge(
                suggestedComment.tone
              )}`}
            >
              Tone: {suggestedComment.tone.replace(/_/g, ' ')}
            </span>
          )}
        </div>
      </div>

      {/* Explicit Safety & Zero-Publishing Guarantee */}
      <div className="p-3 rounded-lg bg-[#0B100E] border border-[#202B24] text-xs text-[#A0ADA5] flex items-start gap-2.5">
        <Info className="h-4 w-4 text-[#22C77A] shrink-0 mt-0.5" />
        <p className="leading-relaxed text-[11px]">
          <strong className="text-[#F3F6F4]">Local-Only Approval Guarantee:</strong> PRoof runs entirely offline. Approving this review updates the local UI and records it in your current session. <em>No comment is posted to GitHub, and no automatic merge/close actions are ever executed.</em>
        </p>
      </div>

      {/* Editable Comment Draft Box */}
      <div>
        <div className="flex items-center justify-between mb-1.5 text-xs">
          <label className="font-semibold text-[#A0ADA5] flex items-center gap-1.5">
            <Edit3 className="h-3.5 w-3.5 text-[#718078]" />
            <span>Review Comment (Editable Markdown)</span>
          </label>

          <div className="flex items-center gap-3">
            {isEdited && (
              <button
                type="button"
                onClick={handleReset}
                className="text-[#A0ADA5] hover:text-[#F3F6F4] transition flex items-center gap-1 font-medium cursor-pointer"
                title="Reset text to original generated draft"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Reset</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleCopy}
              className="text-[#A0ADA5] hover:text-[#F3F6F4] transition flex items-center gap-1 font-medium cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="h-3 w-3 text-[#22C77A]" />
                  <span className="text-[#22C77A]">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3" />
                  <span>Copy Draft</span>
                </>
              )}
            </button>
          </div>
        </div>

        <textarea
          value={commentText}
          onChange={(e) => {
            setCommentText(e.target.value);
            // If already approved, editing invalidates current approval record
            if (approvalRecord) setApprovalRecord(null);
          }}
          rows={6}
          className="w-full bg-[#080B0A] border border-[#202B24] rounded-lg p-3 text-xs text-[#F3F6F4] font-mono leading-relaxed focus:outline-none focus:border-[#22C77A] focus:ring-1 focus:ring-[#22C77A]"
          placeholder="Edit mentoring review comment..."
        />
        <div className="mt-1 text-right text-[11px] text-[#718078] font-mono">
          {commentText.length} characters • {commentText.split('\n').length} lines
        </div>
      </div>

      {/* Maintainer Action & Notes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold text-[#A0ADA5] block mb-1">
            Maintainer Action
          </label>
          <select
            value={action}
            onChange={(e) => setAction(e.target.value as ReviewAction)}
            className="w-full bg-[#080B0A] border border-[#202B24] rounded-lg px-3 py-2 text-xs text-[#F3F6F4] focus:outline-none focus:border-[#22C77A] font-medium"
          >
            <option value="COMMENT_ONLY">Comment Only (Mentoring Feedback)</option>
            <option value="REQUEST_CHANGES">Request Changes (Needs Revisions)</option>
            <option value="APPROVE_FOR_REVIEW">Approve for Review (Mark Qualified)</option>
          </select>
        </div>

        <div>
          <label className="text-xs font-semibold text-[#A0ADA5] block mb-1">
            Maintainer Internal Notes (Optional)
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full bg-[#080B0A] border border-[#202B24] rounded-lg px-3 py-2 text-xs text-[#F3F6F4] focus:outline-none focus:border-[#22C77A]"
            placeholder="e.g. Good candidate for first-timers badge"
          />
        </div>
      </div>

      {/* Approval Trigger Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-[#202B24]">
        <div className="text-[11px] text-[#718078] font-mono">
          Target PR: <span className="text-[#F3F6F4] font-semibold">{prId}</span>
        </div>

        <button
          type="button"
          onClick={handleApprove}
          disabled={submitting || !commentText.trim()}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-[#22C77A] hover:bg-[#36E39A] text-[#080B0A] font-semibold text-xs shadow-sm transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          {submitting ? (
            <>
              <div className="h-3.5 w-3.5 border-2 border-[#080B0A]/30 border-t-[#080B0A] rounded-full animate-spin" />
              <span>Verifying & Recording Approval...</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4" />
              <span>Approve Review Draft (Local Session)</span>
            </>
          )}
        </button>
      </div>

      {/* Approval Confirmation Banner (Explicitly Explaining Local State Update) */}
      {approvalRecord && (
        <div
          role="status"
          aria-live="polite"
          className="p-3.5 rounded-lg bg-[#151C18] border border-[#22C77A]/40 text-xs text-[#F3F6F4] flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-subtle-fade shadow-sm"
        >
          <div className="flex items-start gap-2.5">
            <CheckCircle2 className="h-4 w-4 text-[#22C77A] shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-[#F3F6F4] text-xs">
                Review Draft Approved Locally!
              </span>
              <p className="mt-0.5 text-[#A0ADA5] text-[11px] leading-relaxed">
                Confirmation: This review draft was verified and recorded in your local session (ID: <span className="font-mono font-semibold text-[#22C77A]">{approvalRecord.approvalId}</span>). No comment was published to GitHub.
              </p>
            </div>
          </div>

          <div className="self-end sm:self-auto shrink-0 font-mono text-[10px] text-[#22C77A] bg-[#0B100E] px-2 py-0.5 rounded border border-[#202B24]">
            Action: {approvalRecord.actionTaken}
          </div>
        </div>
      )}
    </section>
  );
};
