import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { AppLayout } from "@/components/layout/AppLayout";
import { CommentCard } from "@/components/social/CommentCard";
import type { Comment, ReplyStatus, Platform } from "@/types";
import { Search, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useComments, useApproveComment, useEditComment } from "@/hooks/useComments";

const PLATFORM_FILTERS: { id: Platform | "all"; label: string; activeClass: string }[] = [
  { id: "all",       label: "All",       activeClass: "bg-primary text-white" },
  { id: "instagram", label: "Instagram", activeClass: "bg-gradient-to-r from-purple-500 to-pink-500 text-white" },
  { id: "tiktok",    label: "TikTok",    activeClass: "bg-zinc-900 text-white dark:bg-zinc-700" },
  { id: "facebook",  label: "Facebook",  activeClass: "bg-blue-600 text-white" },
  { id: "whatsapp",  label: "WhatsApp",  activeClass: "bg-green-500 text-white" },
];

const STATUS_FILTERS: { id: ReplyStatus | "all"; label: string }[] = [
  { id: "all",      label: "All"      },
  { id: "pending",  label: "Pending"  },
  { id: "approved", label: "Approved" },
  { id: "rejected", label: "Rejected" },
];

export default function Comments() {
  const { user } = useAuth();
  const [pFilter, setPFilter] = useState<Platform | "all">("all");
  const [sFilter, setSFilter] = useState<ReplyStatus | "all">("pending");
  const [search,  setSearch]  = useState("");
  const [localComments, setLocalComments] = useState<Comment[]>([]);

  const { data, isLoading } = useComments({ platform: pFilter, status: sFilter });
  const approveMutation = useApproveComment();
  const editMutation    = useEditComment();

  useEffect(() => { if (data) setLocalComments(data); }, [data]);

  const filtered = localComments
    .filter(c => {
      const matchPlatform = pFilter === "all" || c.platform === pFilter;
      const matchStatus   = sFilter === "all" || c.status   === sFilter;
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
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Comments</h1>
              <p className="text-sm text-muted-foreground mt-0.5">Review and manage AI replies to comments</p>
            </div>
            {counts.pending > 0 && (
              <span className="flex-shrink-0 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 text-sm font-semibold px-3 py-1.5 rounded-xl">
                {counts.pending} pending
              </span>
            )}
          </div>

          {/* Stats row */}
          {localComments.length > 0 && (
            <div className="flex gap-3 mt-4 flex-wrap">
              {[
                { label: "Needs Review", count: counts.pending,  color: "text-yellow-600 dark:text-yellow-400" },
                { label: "Sent",         count: counts.sent,     color: "text-green-600 dark:text-green-400"  },
                { label: "Auto-Sent",    count: counts.autoSent, color: "text-primary"                        },
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
              placeholder="Search by username or comment…"
              className="w-full h-9 pl-9 pr-4 rounded-xl bg-card border border-border text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {/* Platform chips */}
          <div className="flex gap-1.5 flex-wrap">
            {PLATFORM_FILTERS.map(f => (
              <button
                key={f.id}
                onClick={() => setPFilter(f.id)}
                className={cn(
                  "px-2.5 py-1 rounded-full text-xs font-medium transition-colors",
                  pFilter === f.id ? f.activeClass : "bg-muted text-muted-foreground hover:text-foreground"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Status chips */}
          <div className="flex gap-1.5 flex-wrap">
            {STATUS_FILTERS.map(f => (
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
                {f.label}
                {f.id !== "all" && (
                  <span className="ml-1 opacity-60">
                    {f.id === "pending"  ? counts.pending  :
                     f.id === "approved" ? counts.approved :
                     f.id === "rejected" ? counts.rejected : ""}
                  </span>
                )}
              </button>
            ))}
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
            <p className="text-sm font-medium">No comments found</p>
            <p className="text-xs mt-1 opacity-60">Try adjusting your filters</p>
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
