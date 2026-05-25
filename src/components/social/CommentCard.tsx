import { useState } from "react";
import { Check, X, Pencil, ChevronDown, ChevronUp } from "lucide-react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import type { Platform } from "@/types";
import type { ReplyStatus } from "@/types";

export type { ReplyStatus };

export interface Comment {
  id: string;
  platform: Platform;
  username: string;
  text: string;
  aiReply: string;
  status: ReplyStatus;
  timestamp: string;
}

interface CommentCardProps {
  comment: Comment;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onEdit: (id: string, reply: string) => void;
}

const platformBadge: Record<Platform, string> = {
  tiktok: "bg-black text-white",
  instagram: "bg-pink-500 text-white",
  facebook: "bg-blue-600 text-white",
  whatsapp: "bg-green-500 text-white",
};

export function CommentCard({ comment, onApprove, onReject, onEdit }: CommentCardProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(comment.status === "pending");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(comment.aiReply);

  const statusCls: Partial<Record<ReplyStatus, string>> = {
    pending:   "bg-yellow-100 text-yellow-700",
    approved:  "bg-green-100 text-green-700",
    rejected:  "bg-red-100 text-red-700",
    edited:    "bg-blue-100 text-blue-700",
    auto_sent: "bg-green-100 text-green-700",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm"
    >
      <div className="flex items-center gap-3 p-4 cursor-pointer" onClick={() => setOpen(v => !v)}>
        <span className={`text-xs font-bold px-2 py-0.5 rounded ${platformBadge[comment.platform]}`}>
          {comment.platform.charAt(0).toUpperCase() + comment.platform.slice(1)}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">@{comment.username}</p>
          <p className="text-xs text-muted-foreground truncate">{comment.text}</p>
        </div>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${statusCls[comment.status] ?? "bg-muted text-muted-foreground"}`}>
          {t(`comments.status.${comment.status}`)}
        </span>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
      </div>

      {open && (
        <div className="px-4 pb-4 border-t border-border space-y-3 pt-4">
          <div>
            <p className="text-xs text-muted-foreground font-medium mb-1">{t("comments.originalComment")}</p>
            <p className="text-sm bg-muted rounded-xl p-3" dir="auto">{comment.text}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium mb-1">{t("comments.aiReply")}</p>
            {editing ? (
              <div className="space-y-2">
                <textarea
                  value={draft}
                  onChange={e => setDraft(e.target.value)}
                  rows={3}
                  dir="auto"
                  className="w-full text-sm border border-border rounded-xl p-3 resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => { onEdit(comment.id, draft); setEditing(false); }}
                    className="flex-1 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary/90"
                  >
                    {t("comments.save")}
                  </button>
                  <button
                    onClick={() => setEditing(false)}
                    className="px-4 py-2 border border-border rounded-xl text-sm text-muted-foreground hover:bg-muted"
                  >
                    {t("comments.cancel")}
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-sm bg-primary/5 border border-primary/20 rounded-xl p-3" dir="auto">{comment.aiReply}</p>
            )}
          </div>

          {comment.status === "pending" && !editing && (
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => onApprove(comment.id)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary/90"
              >
                <Check className="w-4 h-4" /> {t("comments.approve")}
              </button>
              <button
                onClick={() => setEditing(true)}
                className="flex items-center gap-1.5 px-3 py-2 border border-border rounded-xl text-sm text-muted-foreground hover:bg-muted"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                onClick={() => onReject(comment.id)}
                className="flex items-center gap-1.5 px-3 py-2 border border-red-200 rounded-xl text-sm text-red-600 hover:bg-red-50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
          <p className="text-xs text-muted-foreground">{comment.timestamp}</p>
        </div>
      )}
    </motion.div>
  );
}
