import { useState } from "react";
import { motion } from "framer-motion";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  Clock4, CheckCircle, Loader2,
  AlertCircle, Filter, Users, Calendar, Sparkles,
  ArrowRight, MessageSquare, X,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  useAgencyContent, useOverridePublish, useApprovePost,
} from "@/hooks/useContent";
import type { ScheduledPost, Platform, PostStatus } from "@/types";
import { cn } from "@/lib/utils";

// ── Helpers ───────────────────────────────────────────────────────────────────

const PLATFORM_BADGE: Record<Platform, { label: string; className: string }> = {
  instagram: { label: "IG", className: "bg-gradient-to-r from-purple-500 to-pink-500 text-white" },
  tiktok:    { label: "TT", className: "bg-zinc-900 text-white dark:bg-zinc-700" },
  facebook:  { label: "FB", className: "bg-blue-600 text-white" },
  whatsapp:  { label: "WA", className: "bg-green-500 text-white" },
};

const STATUS_STYLE: Record<PostStatus, string> = {
  draft:             "bg-muted text-muted-foreground",
  scheduled:         "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400",
  published:         "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400",
  failed:            "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400",
  pending_approval:  "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400",
  changes_requested: "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400",
};

const STATUS_LABEL: Record<PostStatus, string> = {
  draft:             "Draft",
  scheduled:         "Scheduled",
  published:         "Published",
  failed:            "Failed",
  pending_approval:  "Pending Approval",
  changes_requested: "Changes Requested",
};

const STATUS_BORDER: Record<PostStatus, string> = {
  draft:             "border-l-zinc-300 dark:border-l-zinc-600",
  scheduled:         "border-l-blue-500",
  published:         "border-l-green-500",
  failed:            "border-l-red-500",
  pending_approval:  "border-l-amber-500",
  changes_requested: "border-l-orange-500",
};

function relativeTime(iso?: string | null): string {
  if (!iso) return "Unscheduled";
  const d = new Date(iso);
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffDays = Math.floor((d.getTime() - todayStart.getTime()) / 86_400_000);
  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  if (diffDays === 0) return `Today · ${time}`;
  if (diffDays === 1) return `Tomorrow · ${time}`;
  if (diffDays < 0) return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  if (diffDays < 7) return `${d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} · ${time}`;
  return `${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })} · ${time}`;
}

function timeSince(iso?: string | null): string {
  if (!iso) return "";
  const ms = Date.now() - new Date(iso).getTime();
  const h = Math.floor(ms / 3_600_000);
  if (h < 1) return "< 1h ago";
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

// ── Override confirm dialog ───────────────────────────────────────────────────

function OverrideDialog({ post, onConfirm, onClose, loading }: {
  post: ScheduledPost;
  onConfirm: () => void;
  onClose: () => void;
  loading: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-card rounded-2xl border border-border shadow-xl p-6 space-y-4"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-foreground">Override & Publish</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
          <p className="text-xs text-red-700 dark:text-red-300 font-medium">
            This will publish the post without client approval. The client will be notified.
          </p>
        </div>
        <p className="text-xs text-muted-foreground line-clamp-3 bg-muted rounded-lg px-3 py-2">{post.content}</p>
        <div className="flex gap-2">
          <button onClick={onConfirm} disabled={loading}
            className="flex items-center gap-1.5 px-4 py-2 bg-red-500 text-white text-sm font-medium rounded-xl hover:bg-red-600 disabled:opacity-50 transition-colors">
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />}
            Publish Anyway
          </button>
          <button onClick={onClose} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground rounded-xl hover:bg-muted transition-colors">
            Cancel
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Post card ─────────────────────────────────────────────────────────────────

function PostCard({ post, onOverride, onApprove }: {
  post: ScheduledPost;
  onOverride: (p: ScheduledPost) => void;
  onApprove: (id: string) => void;
}) {
  const isPending   = post.status === "pending_approval";
  const isChanges   = post.status === "changes_requested";
  const is72h       = isPending && post.submittedForApprovalAt
    ? (Date.now() - new Date(post.submittedForApprovalAt).getTime()) >= 72 * 3_600_000
    : false;

  return (
    <div className={cn("bg-card rounded-2xl border border-border border-l-4 overflow-hidden", STATUS_BORDER[post.status])}>
      <div className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start gap-2 flex-wrap">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-foreground truncate">{post.clientBusinessName ?? post.clientName ?? "Unknown Client"}</p>
            <p className="text-[11px] text-muted-foreground">{relativeTime(post.scheduledAt)}</p>
          </div>
          <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0", STATUS_STYLE[post.status])}>
            {STATUS_LABEL[post.status]}
          </span>
        </div>

        {/* Platform badges */}
        <div className="flex gap-1 flex-wrap">
          {post.platforms.map(p => (
            <span key={p} className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-md", PLATFORM_BADGE[p as Platform].className)}>
              {PLATFORM_BADGE[p as Platform].label}
            </span>
          ))}
          {post.aiGenerated && (
            <span className="flex items-center gap-0.5 text-[10px] text-primary/70 font-medium">
              <Sparkles className="w-2.5 h-2.5" /> AI
            </span>
          )}
        </div>

        {/* Content */}
        <div className="flex gap-3">
          {post.mediaUrl && (
            <div className="w-12 h-12 rounded-lg overflow-hidden border border-border flex-shrink-0">
              <img src={post.mediaUrl} alt="Post" className="w-full h-full object-cover" />
            </div>
          )}
          <p className="text-sm text-foreground leading-relaxed line-clamp-2 flex-1">{post.content}</p>
        </div>

        {/* Feedback (changes_requested) */}
        {isChanges && post.approvalFeedback && (
          <div className="text-xs text-orange-700 dark:text-orange-300 bg-orange-50 dark:bg-orange-900/20 rounded-lg px-3 py-2">
            <span className="font-semibold">Client feedback:</span> {post.approvalFeedback}
          </div>
        )}

        {/* 72h alert */}
        {is72h && (
          <div className="flex items-center gap-2 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            Awaiting approval for 72+ hours — override available
          </div>
        )}

        {/* Submitted note */}
        {isPending && post.submittedForApprovalAt && (
          <p className="text-[11px] text-muted-foreground">Submitted {timeSince(post.submittedForApprovalAt)}</p>
        )}

        {/* Actions */}
        {isPending && (
          <div className="flex items-center gap-2 pt-1">
            <button onClick={() => onApprove(post.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500 text-white text-xs font-medium rounded-xl hover:bg-green-600 transition-colors">
              <CheckCircle className="w-3 h-3" /> Approve
            </button>
            <button onClick={() => onOverride(post)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 text-white text-xs font-medium rounded-xl hover:bg-red-600 transition-colors">
              <ArrowRight className="w-3 h-3" /> Override Publish
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

type FilterStatus = "all" | "pending_approval" | "changes_requested" | "scheduled" | "published";

export default function AgencyContent() {
  const { user } = useAuth();
  const businessName = user?.businessName ?? "Agency";
  const { data: posts = [], isLoading } = useAgencyContent();
  const overridePublish = useOverridePublish();
  const approvePost     = useApprovePost();

  const [statusFilter, setStatusFilter]   = useState<FilterStatus>("all");
  const [clientFilter, setClientFilter]   = useState<string>("all");
  const [overridePost, setOverridePost]   = useState<ScheduledPost | null>(null);

  const pendingCount          = posts.filter(p => p.status === "pending_approval").length;
  const changesCount          = posts.filter(p => p.status === "changes_requested").length;
  const overdueCount          = posts.filter(p =>
    p.status === "pending_approval" && p.submittedForApprovalAt &&
    (Date.now() - new Date(p.submittedForApprovalAt).getTime()) >= 72 * 3_600_000
  ).length;

  // Unique clients
  const clients = Array.from(
    new Map(posts.map(p => [p.userId, { id: p.userId ?? "", name: p.clientBusinessName ?? p.clientName ?? p.userId ?? "" }])).values()
  );

  const filtered = posts.filter(p => {
    if (statusFilter !== "all" && p.status !== statusFilter) return false;
    if (clientFilter !== "all" && p.userId !== clientFilter) return false;
    return true;
  });

  const FILTER_OPTIONS: { key: FilterStatus; label: string; count?: number }[] = [
    { key: "all",              label: "All",               count: posts.length },
    { key: "pending_approval", label: "Pending Approval",  count: pendingCount },
    { key: "changes_requested",label: "Changes Requested", count: changesCount },
    { key: "scheduled",        label: "Scheduled" },
    { key: "published",        label: "Published" },
  ];

  return (
    <AppLayout role="agency" businessName={businessName}>
      <div className="space-y-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Content — All Clients</h1>
              <p className="text-sm text-muted-foreground mt-1">Review and manage posts across all your clients</p>
            </div>
          </div>
        </motion.div>

        {/* KPI row */}
        {(pendingCount > 0 || changesCount > 0) && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {pendingCount > 0 && (
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-2xl p-4 flex items-center gap-3">
                <Clock4 className="w-6 h-6 text-amber-500 flex-shrink-0" />
                <div>
                  <p className="text-xl font-bold text-amber-700 dark:text-amber-400">{pendingCount}</p>
                  <p className="text-xs text-amber-600 dark:text-amber-300">Awaiting Approval</p>
                </div>
              </div>
            )}
            {changesCount > 0 && (
              <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded-2xl p-4 flex items-center gap-3">
                <MessageSquare className="w-6 h-6 text-orange-500 flex-shrink-0" />
                <div>
                  <p className="text-xl font-bold text-orange-700 dark:text-orange-400">{changesCount}</p>
                  <p className="text-xs text-orange-600 dark:text-orange-300">Changes Requested</p>
                </div>
              </div>
            )}
            {overdueCount > 0 && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-2xl p-4 flex items-center gap-3">
                <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0" />
                <div>
                  <p className="text-xl font-bold text-red-700 dark:text-red-400">{overdueCount}</p>
                  <p className="text-xs text-red-600 dark:text-red-300">Overdue (72h+)</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-2 items-center">
          <Filter className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
          <div className="flex gap-1.5 flex-wrap">
            {FILTER_OPTIONS.map(f => (
              <button key={f.key} onClick={() => setStatusFilter(f.key)}
                className={cn("px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                  statusFilter === f.key ? "bg-primary text-white" : "bg-muted text-muted-foreground hover:text-foreground"
                )}>
                {f.label}{f.count != null ? ` (${f.count})` : ""}
              </button>
            ))}
          </div>

          {clients.length > 1 && (
            <div className="flex items-center gap-1.5 ml-2">
              <Users className="w-3.5 h-3.5 text-muted-foreground" />
              <select value={clientFilter} onChange={e => setClientFilter(e.target.value)}
                className="text-xs border border-border rounded-lg px-2.5 py-1.5 bg-background focus:outline-none focus:ring-2 focus:ring-primary/30">
                <option value="all">All Clients</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          )}
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Calendar className="w-10 h-10 mx-auto mb-3 opacity-20" />
            <p className="text-sm font-medium">
              {statusFilter === "all" ? "No posts across clients yet" : `No ${STATUS_LABEL[statusFilter as PostStatus]} posts`}
            </p>
            <p className="text-xs mt-1 opacity-70">Posts will appear here once created for your clients</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered
              .sort((a, b) => {
                // Pending first, then changes_requested, then by scheduledAt
                const order: Record<string, number> = { pending_approval: 0, changes_requested: 1, scheduled: 2, draft: 3, published: 4, failed: 5 };
                const ao = order[a.status] ?? 9;
                const bo = order[b.status] ?? 9;
                if (ao !== bo) return ao - bo;
                return (a.scheduledAt ?? "zzz").localeCompare(b.scheduledAt ?? "zzz");
              })
              .map((post, i) => (
                <motion.div key={post.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                  <PostCard
                    post={post}
                    onOverride={setOverridePost}
                    onApprove={(id) => approvePost.mutate(id)}
                  />
                </motion.div>
              ))}
          </div>
        )}
      </div>

      {overridePost && (
        <OverrideDialog
          post={overridePost}
          loading={overridePublish.isPending}
          onConfirm={() => {
            overridePublish.mutate(overridePost.id, { onSuccess: () => setOverridePost(null) });
          }}
          onClose={() => setOverridePost(null)}
        />
      )}
    </AppLayout>
  );
}
