import { useState } from "react";
import { CheckCheck, Edit3, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Comment, ReplyStatus } from "@/types";
import { PLATFORM_CONFIG } from "@/constants/platforms";
import { ConfidenceBanner } from "@/components/shared/ConfidenceBanner";

export type { ReplyStatus };

interface CommentCardProps {
  comment: Comment;
  onApprove: (id: string) => void;
  onEdit:    (id: string, reply: string) => void;
}

const STATUS_CONFIG: Record<ReplyStatus, { label: string; className: string }> = {
  pending:   { label: "Needs Review", className: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400" },
  approved:  { label: "Sent",         className: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"   },
  auto_sent: { label: "Auto-Sent",    className: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"   },
  edited:    { label: "Sent (Edited)",className: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"       },
  rejected:  { label: "Skipped",      className: "bg-muted text-muted-foreground"                                         },
  escalated: { label: "Escalated",    className: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"           },
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1)  return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function CommentCard({ comment, onApprove, onEdit }: CommentCardProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft]     = useState(comment.aiReply);

  const isPending = comment.status === "pending";
  const platform  = PLATFORM_CONFIG[comment.platform];
  const status    = STATUS_CONFIG[comment.status];
  const PlatIcon  = platform.icon;
  const initials  = comment.username.replace(/[^a-zA-Z؀-ۿ]/g, "").slice(0, 2).toUpperCase() || "??";

  return (
    <div className={cn(
      "bg-card rounded-2xl border overflow-hidden",
      isPending ? "border-border shadow-sm" : "border-border/50 opacity-90"
    )}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-3">
        <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-sm font-semibold text-foreground flex-shrink-0">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-sm font-semibold text-foreground">@{comment.username}</span>
            <span className={cn(
              "inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0",
              platform.color
            )}>
              <PlatIcon className="w-2.5 h-2.5" />
              {platform.label}
            </span>
          </div>
          <span className="text-xs text-muted-foreground">{timeAgo(comment.timestamp)}</span>
        </div>
        <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0", status.className)}>
          {status.label}
        </span>
      </div>

      {/* Comment text */}
      <div className="px-4 pb-3">
        <p className="text-sm text-foreground bg-muted/50 rounded-xl px-3 py-2.5 leading-relaxed" dir="auto">
          {comment.text}
        </p>
      </div>

      {/* Pending — confidence banner + AI reply + actions */}
      {isPending && !editing && (
        <div className="px-4 pb-4 space-y-3">
          {comment.aiConfidence !== undefined && (
            <ConfidenceBanner confidence={comment.aiConfidence} />
          )}
          <div className="flex items-start gap-2 bg-primary/5 border border-primary/15 rounded-xl px-3 py-2.5 text-sm">
            <span className="text-primary font-bold text-xs mt-0.5 flex-shrink-0">AI</span>
            <span className="leading-relaxed text-foreground" dir="auto">{comment.aiReply}</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => onApprove(comment.id)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700 transition-colors"
            >
              <CheckCheck className="w-4 h-4" />
              Approve & Post
            </button>
            <button
              onClick={() => setEditing(true)}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-muted text-foreground rounded-xl text-sm font-medium hover:bg-muted/80 transition-colors"
            >
              <Edit3 className="w-3.5 h-3.5" />
              Edit
            </button>
          </div>
        </div>
      )}

      {/* Editing mode */}
      {isPending && editing && (
        <div className="px-4 pb-4 space-y-2">
          <textarea
            value={draft}
            onChange={e => setDraft(e.target.value)}
            rows={3}
            dir="auto"
            className="w-full px-3 py-2 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
          />
          <div className="flex gap-2">
            <button
              onClick={() => { onEdit(comment.id, draft); setEditing(false); }}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
              Send Edited Reply
            </button>
            <button
              onClick={() => { setDraft(comment.aiReply); setEditing(false); }}
              className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground rounded-xl hover:bg-muted transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Handled — compact sent reply */}
      {!isPending && (
        <div className="px-4 pb-3 flex items-start gap-1.5">
          <span className="text-[10px] font-bold text-primary flex-shrink-0 mt-0.5">↩</span>
          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2" dir="auto">
            {comment.aiReply}
          </p>
        </div>
      )}
    </div>
  );
}
