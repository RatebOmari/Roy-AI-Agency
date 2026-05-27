import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { AppLayout } from "@/components/layout/AppLayout";
import { CommentCard } from "@/components/social/CommentCard";
import type { Comment, ReplyStatus, Platform } from "@/types";
import { Search, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useComments, useApproveComment, useEditComment, useGenerateCommentReply } from "@/hooks/useComments";

const PLATFORM_FILTER_IDS: { id: Platform | "all"; activeClass: string }[] = [
  { id: "all",       activeClass: "bg-primary text-white" },
  { id: "instagram", activeClass: "bg-gradient-to-r from-purple-500 to-pink-500 text-white" },
  { id: "tiktok",    activeClass: "bg-zinc-900 text-white dark:bg-zinc-700" },
  { id: "facebook",  activeClass: "bg-blue-600 text-white" },
  { id: "whatsapp",  activeClass: "bg-green-500 text-white" },
];

const PLATFORM_BRAND_LABELS: Record<string, string> = {
  instagram: "Instagram",
  tiktok:    "TikTok",
  facebook:  "Facebook",
  whatsapp:  "WhatsApp",
};

const STATUS_FILTER_IDS: { id: ReplyStatus | "all"; countKey?: "pending" | "sent" | "autoSent" }[] = [
  { id: "all" },
  { id: "pending",   countKey: "pending"  },
  { id: "approved",  countKey: "sent"     },
  { id: "auto_sent", countKey: "autoSent" },
];

export default function Comments() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [pFilter, setPFilter] = useState<Platform | "all">("all");
  const [sFilter, setSFilter] = useState<ReplyStatus | "all">("pending");
  const [search,  setSearch]  = useState("");
  const [localComments, setLocalComments] = useState<Comment[]>([]);

  // Fetch all comments (unfiltered) to detect new ones needing AI generation
  const { data: allData } = useComments({});
  const { data, isLoading } = useComments({ platform: pFilter, status: sFilter });
  const approveMutation    = useApproveComment();
  const editMutation       = useEditComment();
  const generateMutation   = useGenerateCommentReply();
  // Track which comment IDs we've already submitted for generation (prevent duplicates)
  const pendingGenerationRef = useRef(new Set<string>());

  // Auto-generate AI replies for any comment that arrived without one.
  // 3-tier routing happens in the backend:
  //   ≥85% → auto_sent (removed from review queue, no human needed)
  //   50–84% → pending  (stays in review queue)
  //   <50%  → escalated (flagged for human handling)
  useEffect(() => {
    if (!allData) return;
    const unprocessed = allData.filter(
      c => !c.aiReply && !pendingGenerationRef.current.has(c.id)
    );
    if (unprocessed.length === 0) return;
    unprocessed.forEach(c => {
      pendingGenerationRef.current.add(c.id);
      generateMutation.mutate(c.id);
    });
  }, [allData]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (data) setLocalComments(data); }, [data]);

  const filtered = localComments
    .filter(c => {
      const matchPlatform = pFilter === "all" || c.platform === pFilter;
      const matchStatus = sFilter === "all"
        || c.status === sFilter
        || (sFilter === "approved" && (c.status === "approved" || c.status === "edited"));
      const matchSearch   = !search
        || c.text.toLowerCase().includes(search.toLowerCase())
        || c.username.toLowerCase().includes(search.toLowerCase());
      return matchPlatform && matchStatus && matchSearch;
    })
    .sort((a, b) => {
      // pending always first, then by timestamp descending
      if (a.status === "pending" && b.status !== "pending") return -1;
      if (b.status === "pending" && a.status !== "pending") return  1;
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });

  const counts = {
    pending:   localComments.filter(c => c.status === "pending").length,
    sent:      localComments.filter(c => c.status === "approved" || c.status === "auto_sent" || c.status === "edited").length,
    autoSent:  localComments.filter(c => c.status === "auto_sent").length,
  };

  const STATUS_FILTER_LABELS: Record<string, string> = {
    all:       t("common.all"),
    pending:   t("comments.filterReview"),
    approved:  t("comments.status.approved"),
    auto_sent: t("comments.autoSent"),
  };

  const approve = (id: string) => {
    setLocalComments(p => p.map(c => c.id === id ? { ...c, status: "approved" as ReplyStatus } : c));
    approveMutation.mutate(id);
  };
  const edit = (id: string, aiReply: string) => {
    setLocalComments(p => p.map(c => c.id === id ? { ...c, aiReply, status: "edited" as ReplyStatus } : c));
    editMutation.mutate({ id, aiReply });
  };

  return (
    <AppLayout role="client" businessName={user?.businessName ?? "SocialPilot"}>
      <div className="space-y-6 max-w-2xl">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{t("nav.comments")}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {t("comments.pageSubtitle")}
            </p>
          </div>

          {/* Stats row */}
          {localComments.length > 0 && (
            <div className="flex gap-3 mt-4 flex-wrap">
              {[
                { label: t("comments.needsReview"), count: counts.pending,  color: "text-yellow-600 dark:text-yellow-400" },
                { label: t("comments.status.approved"), count: counts.sent, color: "text-green-600 dark:text-green-400"  },
                { label: t("comments.autoSent"),    count: counts.autoSent, color: "text-primary"                        },
              ].map(s => (
                <div key={s.label} className="flex items-center gap-1.5 px-3 py-1.5 bg-card border border-border rounded-xl">
                  <span className={cn("text-sm font-bold", s.color)}>{s.count}</span>
                  <span className="text-xs text-muted-foreground">{s.label}</span>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Filters */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="space-y-3"
        >
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t("comments.searchPlaceholder")}
              className="w-full h-9 pl-9 pr-4 rounded-xl bg-card border border-border text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {/* Platform chips */}
          <div className="flex gap-1.5 flex-wrap">
            {PLATFORM_FILTER_IDS.map(f => (
              <button
                key={f.id}
                onClick={() => setPFilter(f.id)}
                className={cn(
                  "px-2.5 py-1 rounded-full text-xs font-medium transition-colors",
                  pFilter === f.id ? f.activeClass : "bg-muted text-muted-foreground hover:text-foreground"
                )}
              >
                {f.id === "all" ? t("common.all") : PLATFORM_BRAND_LABELS[f.id] ?? f.id}
              </button>
            ))}
          </div>

          {/* Status chips */}
          <div className="flex gap-1.5 flex-wrap">
            {STATUS_FILTER_IDS.map(f => {
              const count = f.countKey ? counts[f.countKey] : null;
              return (
                <button
                  key={f.id}
                  onClick={() => setSFilter(f.id)}
                  className={cn(
                    "px-2.5 py-1 rounded-full text-xs font-medium transition-colors border",
                    sFilter === f.id
                      ? "bg-foreground text-background border-foreground"
                      : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
                  )}
                >
                  {STATUS_FILTER_LABELS[f.id]}
                  {count !== null && (
                    <span className="ml-1 opacity-60">{count}</span>
                  )}
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* List */}
        {isLoading && localComments.length === 0 ? (
          <div className="flex justify-center py-16">
            <div className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <MessageSquare className="w-10 h-10 mb-3 opacity-20" />
            <p className="text-sm font-medium">{t("comments.noComments")}</p>
            <p className="text-xs mt-1 opacity-60">{t("comments.tryFilters")}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((c, i) => (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <CommentCard comment={c} onApprove={approve} onEdit={edit} />
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
