import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { AppLayout } from "@/components/layout/AppLayout";
import { CommentCard } from "@/components/social/CommentCard";
import type { Comment, ReplyStatus } from "@/types";
import type { Platform } from "@/components/social/PlatformCard";
import { Search, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useComments, useApproveComment, useRejectComment, useEditComment } from "@/hooks/useComments";

export default function Comments() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [pFilter, setPFilter] = useState<Platform | "all">("all");
  const [sFilter, setSFilter] = useState<ReplyStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [localComments, setLocalComments] = useState<Comment[]>([]);

  const { data, isLoading } = useComments({ platform: pFilter, status: sFilter });
  const approveMutation = useApproveComment();
  const rejectMutation = useRejectComment();
  const editMutation = useEditComment();

  useEffect(() => {
    if (data) setLocalComments(data);
  }, [data]);

  const filtered = localComments.filter(c =>
    (!search || c.text.toLowerCase().includes(search.toLowerCase()) || c.username.toLowerCase().includes(search.toLowerCase()))
  );

  const pending = localComments.filter(c => c.status === "pending").length;

  const approve = (id: string) => {
    setLocalComments(p => p.map(c => c.id === id ? { ...c, status: "approved" as ReplyStatus } : c));
    approveMutation.mutate(id);
  };

  const reject = (id: string) => {
    setLocalComments(p => p.map(c => c.id === id ? { ...c, status: "rejected" as ReplyStatus } : c));
    rejectMutation.mutate(id);
  };

  const edit = (id: string, aiReply: string) => {
    setLocalComments(p => p.map(c => c.id === id ? { ...c, aiReply, status: "edited" as ReplyStatus } : c));
    editMutation.mutate({ id, aiReply });
  };

  const platforms: { id: Platform | "all"; label: string }[] = [
    { id: "all",       label: t("comments.all") },
    { id: "tiktok",    label: "TikTok" },
    { id: "instagram", label: "Instagram" },
    { id: "facebook",  label: "Facebook" },
    { id: "whatsapp",  label: "WhatsApp" },
  ];

  const statuses: { id: ReplyStatus | "all"; label: string }[] = [
    { id: "all",      label: t("comments.all") },
    { id: "pending",  label: t("comments.status.pending") },
    { id: "approved", label: t("comments.status.approved") },
    { id: "rejected", label: t("comments.status.rejected") },
  ];

  return (
    <AppLayout role="client" businessName={user?.businessName ?? "SocialPilot"}>
      <div className="space-y-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{t("comments.title")}</h1>
            <p className="text-sm text-muted-foreground">{t("comments.subtitle")}</p>
          </div>
          {pending > 0 && (
            <span className="bg-yellow-100 text-yellow-700 rounded-xl px-4 py-2 text-sm font-medium">
              {pending} {t("comments.pending")}
            </span>
          )}
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-card rounded-2xl p-4 border border-border shadow-sm space-y-3"
        >
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t("comments.searchPlaceholder")}
              className="w-full pl-10 pr-4 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-background"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {platforms.map(f => (
              <button key={f.id} onClick={() => setPFilter(f.id as Platform | "all")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${pFilter === f.id ? "bg-primary text-white border-primary" : "bg-muted border-transparent text-muted-foreground"}`}>
                {f.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {statuses.map(f => (
              <button key={f.id} onClick={() => setSFilter(f.id as ReplyStatus | "all")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${sFilter === f.id ? "bg-foreground text-background border-foreground" : "bg-muted border-transparent text-muted-foreground"}`}>
                {f.label}
              </button>
            ))}
          </div>
        </motion.div>

        {isLoading && localComments.length === 0 ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.length === 0
              ? <div className="text-center py-12 text-muted-foreground">{t("comments.noResults")}</div>
              : filtered.map((c, i) => (
                  <motion.div key={c.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                    <CommentCard comment={c} onApprove={approve} onReject={reject} onEdit={edit} />
                  </motion.div>
                ))
            }
          </div>
        )}
      </div>
    </AppLayout>
  );
}
