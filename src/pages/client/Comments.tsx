import { useState } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { AppLayout } from "@/components/layout/AppLayout";
import { CommentCard, type Comment, type ReplyStatus } from "@/components/social/CommentCard";
import type { Platform } from "@/components/social/PlatformCard";
import { Search } from "lucide-react";

const mock: Comment[] = [
  { id: "1", platform: "tiktok",    username: "sara_foodie",   text: "Where are you located? 😍",           aiReply: "Thanks Sara! We're in the city center, check the bio for full details 📍",  status: "pending",  timestamp: "5 min ago" },
  { id: "2", platform: "instagram", username: "ahmed_reviews", text: "Food was amazing! What are your hours?", aiReply: "Thank you Ahmed! We're open daily from 12pm to midnight 😊",               status: "pending",  timestamp: "12 min ago" },
  { id: "3", platform: "tiktok",    username: "foodlover99",   text: "Do you have delivery?",                aiReply: "Yes! Delivery available via food apps 🛵",                                  status: "approved", timestamp: "25 min ago" },
  { id: "4", platform: "facebook",  username: "Mohammed Ali",  text: "Visited and loved it, highly recommend!", aiReply: "Thank you so much Mohammed! Your kind words mean a lot ❤️",             status: "approved", timestamp: "1 hr ago" },
  { id: "5", platform: "whatsapp",  username: "+966 5X XXX",   text: "No reply for so long!",               aiReply: "We sincerely apologize! Our team will reach out immediately 🙏",           status: "rejected", timestamp: "2 hrs ago" },
];

export default function Comments() {
  const { t } = useTranslation();
  const [comments, setComments] = useState(mock);
  const [pFilter, setPFilter] = useState<Platform | "all">("all");
  const [sFilter, setSFilter] = useState<ReplyStatus | "all">("all");
  const [search, setSearch] = useState("");

  const platforms: { id: Platform | "all"; label: string }[] = [
    { id: "all", label: t("comments.all") },
    { id: "tiktok", label: "TikTok" },
    { id: "instagram", label: "Instagram" },
    { id: "facebook", label: "Facebook" },
    { id: "whatsapp", label: "WhatsApp" },
  ];

  const statuses: { id: ReplyStatus | "all"; label: string }[] = [
    { id: "all",      label: t("comments.all") },
    { id: "pending",  label: t("comments.status.pending") },
    { id: "approved", label: t("comments.status.approved") },
    { id: "rejected", label: t("comments.status.rejected") },
  ];

  const filtered = comments.filter(c =>
    (pFilter === "all" || c.platform === pFilter) &&
    (sFilter === "all" || c.status === sFilter) &&
    (!search || c.text.toLowerCase().includes(search.toLowerCase()) || c.username.toLowerCase().includes(search.toLowerCase()))
  );

  const pending = comments.filter(c => c.status === "pending").length;

  const approve = (id: string) => setComments(p => p.map(c => c.id === id ? { ...c, status: "approved" as ReplyStatus } : c));
  const reject  = (id: string) => setComments(p => p.map(c => c.id === id ? { ...c, status: "rejected" as ReplyStatus } : c));
  const edit    = (id: string, reply: string) => setComments(p => p.map(c => c.id === id ? { ...c, aiReply: reply, status: "edited" as ReplyStatus } : c));

  return (
    <AppLayout role="client" businessName="Al-Asala Restaurant">
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
      </div>
    </AppLayout>
  );
}
