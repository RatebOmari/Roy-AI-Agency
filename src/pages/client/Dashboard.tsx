import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { AppLayout } from "@/components/layout/AppLayout";
import { PlatformCard, type Platform } from "@/components/social/PlatformCard";
import { MessageSquare, TrendingUp, Clock, CheckCircle2, Settings } from "lucide-react";

const initialPlatforms: Record<Platform, { connected: boolean; replies: number; pending: number }> = {
  tiktok:    { connected: true,  replies: 42, pending: 5 },
  instagram: { connected: true,  replies: 31, pending: 2 },
  facebook:  { connected: false, replies: 0,  pending: 0 },
  whatsapp:  { connected: false, replies: 0,  pending: 0 },
};

export default function Dashboard() {
  const { t } = useTranslation();
  const [platforms, setPlatforms] = useState(initialPlatforms);

  const total   = Object.values(platforms).reduce((s, p) => s + p.replies, 0);
  const pending = Object.values(platforms).reduce((s, p) => s + p.pending, 0);

  const handleConnect    = (p: Platform) => setPlatforms(prev => ({ ...prev, [p]: { ...prev[p], connected: true } }));
  const handleDisconnect = (p: Platform) => setPlatforms(prev => ({ ...prev, [p]: { connected: false, replies: 0, pending: 0 } }));

  const stats = [
    { label: t("dashboard.totalReplies"),   value: total,   icon: MessageSquare, color: "text-primary",    bg: "bg-primary/10" },
    { label: t("dashboard.pendingReview"),  value: pending, icon: Clock,         color: "text-yellow-600", bg: "bg-yellow-100" },
    { label: t("dashboard.responseTime"),   value: "< 3",   icon: TrendingUp,    color: "text-blue-600",   bg: "bg-blue-100" },
    { label: t("dashboard.engagementRate"), value: "87%",   icon: CheckCircle2,  color: "text-green-600",  bg: "bg-green-100" },
  ];

  return (
    <AppLayout role="client" businessName="Al-Asala Restaurant">
      <div className="space-y-8">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-l from-primary to-primary/80 rounded-2xl p-6 text-white"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-white/70 text-sm mb-1">{t("dashboard.welcome")}</p>
              <h1 className="text-2xl font-bold">{t("dashboard.title")}</h1>
              <p className="text-white/70 text-sm mt-1">{t("dashboard.subtitle")}</p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold">{total}</p>
              <p className="text-white/70 text-sm">{t("dashboard.repliesMonth")}</p>
            </div>
          </div>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-card rounded-2xl p-4 border border-border shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center`}>
                  <s.icon className={`w-5 h-5 ${s.color}`} />
                </div>
                <div>
                  <p className="text-xl font-bold text-foreground">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="flex gap-3 flex-wrap">
          <Link to="/comments" className="flex items-center gap-2 px-4 py-2 border border-border rounded-xl text-sm font-medium hover:bg-muted transition-colors">
            <MessageSquare className="w-4 h-4" />
            {t("dashboard.reviewComments")}
            {pending > 0 && <span className="bg-primary text-white text-xs rounded-full px-1.5 py-0.5 font-bold">{pending}</span>}
          </Link>
          <Link to="/settings" className="flex items-center gap-2 px-4 py-2 border border-border rounded-xl text-sm font-medium hover:bg-muted transition-colors">
            <Settings className="w-4 h-4" />
            {t("dashboard.toneSettings")}
          </Link>
        </div>

        {/* Platforms */}
        <div>
          <h2 className="text-base font-semibold text-foreground mb-4">{t("dashboard.platforms")}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {(Object.keys(platforms) as Platform[]).map((p, i) => (
              <motion.div key={p} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.05 }}>
                <PlatformCard
                  platform={p}
                  connected={platforms[p].connected}
                  stats={platforms[p].connected ? { replies: platforms[p].replies, pending: platforms[p].pending } : undefined}
                  onConnect={handleConnect}
                  onDisconnect={handleDisconnect}
                />
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
