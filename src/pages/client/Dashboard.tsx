import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { AppLayout } from "@/components/layout/AppLayout";
import { PlatformCard } from "@/components/social/PlatformCard";
import { MessageSquare, TrendingUp, Clock, CheckCircle2, Settings, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useDashboard } from "@/hooks/useDashboard";
import { useConnectPlatformFeature, useDisconnectPlatformFeature } from "@/hooks/usePlatforms";
import type { ExtendedPlatform, PlatformFeatureType, PlatformFeatureStatus } from "@/types";

const ALL_PLATFORMS: ExtendedPlatform[] = ["tiktok", "instagram", "facebook", "whatsapp", "sms", "phone"];

export default function Dashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { data, isLoading } = useDashboard();
  const connectMutation = useConnectPlatformFeature();
  const disconnectMutation = useDisconnectPlatformFeature();

  const platformsV2 = data?.platformsV2 ?? [];
  const permissions = user?.platformPermissions;

  const total   = data?.totalReplies ?? 0;
  const pending = data?.pendingReview ?? 0;

  const stats = [
    { label: t("dashboard.totalReplies"),   value: total,                          icon: MessageSquare, color: "text-primary",    bg: "bg-primary/10" },
    { label: t("dashboard.pendingReview"),  value: pending,                         icon: Clock,         color: "text-yellow-600", bg: "bg-yellow-100 dark:bg-yellow-900/20" },
    { label: t("dashboard.responseTime"),   value: data?.avgResponseTime ?? "–",   icon: TrendingUp,    color: "text-blue-600",   bg: "bg-blue-100 dark:bg-blue-900/20" },
    { label: t("dashboard.engagementRate"), value: data ? `${data.engagementRate}%` : "–", icon: CheckCircle2, color: "text-green-600", bg: "bg-green-100 dark:bg-green-900/20" },
  ];

  const handleConnect = (platform: ExtendedPlatform, feature: PlatformFeatureType) => {
    connectMutation.mutate({ platform, feature });
  };

  const handleDisconnect = (platform: ExtendedPlatform, feature: PlatformFeatureType) => {
    disconnectMutation.mutate({ platform, feature });
  };

  return (
    <AppLayout role="client" businessName={user?.businessName ?? "SocialPilot"}>
      <div className="space-y-8">
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
              {isLoading
                ? <Loader2 className="w-6 h-6 animate-spin text-white/70 mt-1" />
                : <>
                    <p className="text-3xl font-bold">{total}</p>
                    <p className="text-white/70 text-sm">{t("dashboard.repliesMonth")}</p>
                  </>
              }
            </div>
          </div>
        </motion.div>

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
                  <p className="text-xl font-bold text-foreground">{isLoading ? "–" : s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="flex gap-3 flex-wrap">
          <Link to="/inbox" className="flex items-center gap-2 px-4 py-2 border border-border rounded-xl text-sm font-medium hover:bg-muted transition-colors">
            <MessageSquare className="w-4 h-4" />
            Open Inbox
            {pending > 0 && <span className="bg-primary text-white text-xs rounded-full px-1.5 py-0.5 font-bold">{pending}</span>}
          </Link>
          <Link to="/settings" className="flex items-center gap-2 px-4 py-2 border border-border rounded-xl text-sm font-medium hover:bg-muted transition-colors">
            <Settings className="w-4 h-4" />
            {t("dashboard.toneSettings")}
          </Link>
        </div>

        <div>
          <h2 className="text-base font-semibold text-foreground mb-4">{t("dashboard.platforms")}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {ALL_PLATFORMS.map((p, i) => {
              const info = platformsV2.find(pl => pl.platform === p);
              const perm = permissions?.[p];

              const commentsStatus: PlatformFeatureStatus = info?.comments ?? {
                connected: false,
                enabled: perm?.comments ?? false,
              };
              const messagesStatus: PlatformFeatureStatus = info?.messages ?? {
                connected: false,
                enabled: perm?.messages ?? false,
              };

              // Merge permissions with mock data: if admin disabled a feature, override enabled
              const effectiveComments: PlatformFeatureStatus = perm
                ? { ...commentsStatus, enabled: perm.comments }
                : commentsStatus;
              const effectiveMessages: PlatformFeatureStatus = perm
                ? { ...messagesStatus, enabled: perm.messages }
                : messagesStatus;

              return (
                <motion.div key={p} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.05 }}>
                  <PlatformCard
                    platform={p}
                    commentsStatus={effectiveComments}
                    messagesStatus={effectiveMessages}
                    onConnect={handleConnect}
                    onDisconnect={handleDisconnect}
                  />
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
