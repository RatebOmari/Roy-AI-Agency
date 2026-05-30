import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { AppLayout } from "@/components/layout/AppLayout";
import { PlatformCard } from "@/components/social/PlatformCard";
import { useAuth } from "@/contexts/AuthContext";
import { useDashboard } from "@/hooks/useDashboard";
import { useConversations } from "@/hooks/useConversations";
import { useFlows } from "@/hooks/useFlows";
import { useConnectPlatformFeature, useDisconnectPlatformFeature } from "@/hooks/usePlatforms";
import type { ExtendedPlatform, PlatformFeatureType, PlatformFeatureStatus } from "@/types";
import {
  MessageSquare, TrendingUp, Clock, CheckCircle2, Settings, Zap,
  ArrowRight, CalendarDays, Megaphone, GitBranch, Phone, AlertCircle,
  ChevronDown, ChevronUp,
} from "lucide-react";
import { useState } from "react";

// ── Helpers ───────────────────────────────────────────────────────────────────

const ALL_PLATFORMS: ExtendedPlatform[] = ["tiktok", "instagram", "facebook", "whatsapp", "sms", "phone"];

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function formatDate(): string {
  return new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

function relTime(ts: string): string {
  const ms = Date.now() - new Date(ts).getTime();
  const m = Math.floor(ms / 60_000);
  if (m < 60) return m <= 1 ? "just now" : `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const PLATFORM_DOT: Record<string, string> = {
  instagram: "bg-pink-500",
  tiktok:    "bg-neutral-800 dark:bg-neutral-300",
  facebook:  "bg-blue-600",
  whatsapp:  "bg-green-500",
  sms:       "bg-orange-400",
};

function channelDot(channel: string): string {
  if (channel.startsWith("instagram")) return PLATFORM_DOT.instagram;
  if (channel.startsWith("tiktok"))    return PLATFORM_DOT.tiktok;
  if (channel.startsWith("facebook"))  return PLATFORM_DOT.facebook;
  if (channel.startsWith("whatsapp"))  return PLATFORM_DOT.whatsapp;
  if (channel === "sms")               return PLATFORM_DOT.sms;
  return "bg-muted-foreground/30";
}

const CHANNEL_LABEL: Record<string, string> = {
  instagram: "Instagram",
  tiktok:    "TikTok",
  facebook:  "Facebook",
  whatsapp:  "WhatsApp",
  sms:       "SMS",
};

// ── Dashboard ─────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data, isLoading } = useDashboard();
  const { data: conversations = [] } = useConversations();
  const { data: flows = [] } = useFlows();
  const connectMutation = useConnectPlatformFeature();
  const disconnectMutation = useDisconnectPlatformFeature();
  const [platformsExpanded, setPlatformsExpanded] = useState(false);

  const platformsV2  = data?.platformsV2 ?? [];
  const permissions  = user?.platformPermissions;
  const pending      = data?.pendingReview ?? 0;
  const totalReplies = data?.totalReplies ?? 0;
  const activeFlows  = flows.filter(f => f.active).length;

  // Recent activity — social channels only, sorted newest first
  const socialConvs = conversations
    .filter(c => c.channel !== "sms" && c.channel !== "phone_call")
    .sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());

  const totalUnread = socialConvs.reduce((s, c) => s + c.unreadCount, 0);
  const recentConvs = socialConvs.slice(0, 5);

  // Missed calls
  const missedCalls = conversations.filter(
    c => c.channel === "phone_call" && c.status === "open" && c.unreadCount > 0,
  ).length;

  // Attention items
  const attentionItems = [
    pending > 0      && { label: `${pending} pending review`,  href: "/inbox",  color: "text-yellow-600 dark:text-yellow-400", bg: "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800/40" },
    totalUnread > 0  && { label: `${totalUnread} unread`,      href: "/inbox",  color: "text-blue-600 dark:text-blue-400",    bg: "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800/40" },
    missedCalls > 0  && { label: `${missedCalls} missed call${missedCalls > 1 ? "s" : ""}`, href: "/phone", color: "text-red-600 dark:text-red-400", bg: "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/40" },
  ].filter((x): x is { label: string; href: string; color: string; bg: string } => Boolean(x));

  // Platform summary
  const connectedCount = platformsV2.filter(
    p => p.comments?.connected || p.messages?.connected,
  ).length;

  const handleConnect = (platform: ExtendedPlatform, feature: PlatformFeatureType) =>
    connectMutation.mutate({ platform, feature });
  const handleDisconnect = (platform: ExtendedPlatform, feature: PlatformFeatureType) =>
    disconnectMutation.mutate({ platform, feature });

  const stats = [
    {
      label:     "Total Replies",
      value:     isLoading ? "–" : totalReplies,
      icon:      MessageSquare,
      color:     "text-primary",
      bg:        "bg-primary/10",
      href:      "/inbox",
    },
    {
      label:     "Pending Review",
      value:     isLoading ? "–" : pending,
      icon:      Clock,
      color:     "text-yellow-600",
      bg:        "bg-yellow-100 dark:bg-yellow-900/20",
      href:      "/inbox",
      urgent:    pending > 0,
    },
    {
      label:     "Avg Response",
      value:     isLoading ? "–" : (data?.avgResponseTime ?? "–"),
      icon:      TrendingUp,
      color:     "text-blue-600",
      bg:        "bg-blue-100 dark:bg-blue-900/20",
    },
    {
      label:     "Engagement",
      value:     isLoading ? "–" : `${data?.engagementRate ?? "–"}%`,
      icon:      CheckCircle2,
      color:     "text-green-600",
      bg:        "bg-green-100 dark:bg-green-900/20",
    },
  ];

  return (
    <AppLayout role="client" businessName={user?.businessName ?? "SocialPilot"}>
      <div className="space-y-6 max-w-6xl">

        {/* ── Greeting ─────────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start justify-between"
        >
          <div>
            <p className="text-muted-foreground text-sm">{formatDate()}</p>
            <h1 className="text-2xl font-bold text-foreground mt-0.5">
              {getGreeting()}{user?.businessName ? `, ${user.businessName}` : ""}
            </h1>
            {attentionItems.length === 0 ? (
              <p className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1.5 mt-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Everything is up to date
              </p>
            ) : (
              <p className="text-sm text-muted-foreground mt-1">
                {attentionItems.length} item{attentionItems.length > 1 ? "s" : ""} need your attention
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/settings"
              className="flex items-center gap-2 px-3 py-2 border border-border rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Settings</span>
            </Link>
          </div>
        </motion.div>

        {/* ── Attention items ───────────────────────────────────────────────── */}
        {attentionItems.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="flex items-center gap-2 flex-wrap"
          >
            <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <AlertCircle className="w-3.5 h-3.5" />
              Needs attention:
            </span>
            {attentionItems.map(item => (
              <Link
                key={item.href + item.label}
                to={item.href}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border rounded-full transition-opacity hover:opacity-80 ${item.bg} ${item.color}`}
              >
                {item.label}
                <ArrowRight className="w-3 h-3" />
              </Link>
            ))}
          </motion.div>
        )}

        {/* ── Stats row ─────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.04 }}
              onClick={s.href ? () => navigate(s.href!) : undefined}
              className={`bg-card border rounded-2xl p-4 shadow-sm group ${
                s.href ? "cursor-pointer hover:border-primary/40 transition-all" : "border-border"
              } ${s.urgent ? "border-yellow-300 dark:border-yellow-700/60" : "border-border"}`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className={`w-9 h-9 rounded-xl ${s.bg} flex items-center justify-center`}>
                  <s.icon className={`w-5 h-5 ${s.color}`} />
                </div>
                {s.href && (
                  <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors mt-1" />
                )}
              </div>
              <p className="text-2xl font-bold text-foreground leading-none">{s.value}</p>
              <p className="text-xs text-muted-foreground mt-1.5">{s.label}</p>
            </motion.div>
          ))}
        </div>

        {/* ── Two-column body ───────────────────────────────────────────────── */}
        <div className="flex flex-col lg:flex-row gap-5 items-start">

          {/* Left: Recent Activity */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex-1 min-w-0 bg-card border border-border rounded-2xl overflow-hidden"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="text-sm font-semibold text-foreground">Recent Activity</h2>
              <Link
                to="/inbox"
                className="flex items-center gap-1 text-xs text-primary hover:underline"
              >
                View all
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {recentConvs.length === 0 ? (
              <div className="px-5 py-12 text-center">
                <MessageSquare className="w-8 h-8 text-muted-foreground/20 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No recent conversations</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Messages from connected platforms will appear here</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {recentConvs.map(conv => (
                  <button
                    key={conv.id}
                    onClick={() => navigate("/inbox")}
                    className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-muted/50 transition-colors text-left"
                  >
                    {/* Platform dot */}
                    <div className="relative shrink-0">
                      <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-sm font-semibold text-muted-foreground">
                        {conv.contactName.charAt(0).toUpperCase()}
                      </div>
                      <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-card ${channelDot(conv.channel)}`} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium text-foreground truncate">{conv.contactName}</p>
                        <span className="text-xs text-muted-foreground shrink-0">{relTime(conv.lastMessageAt)}</span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{conv.lastMessage}</p>
                    </div>

                    {/* Badges */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {conv.status === "pending" && (
                        <span className="w-2 h-2 rounded-full bg-yellow-400" title="Pending review" />
                      )}
                      {conv.unreadCount > 0 && (
                        <span className="w-5 h-5 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center">
                          {conv.unreadCount > 9 ? "9+" : conv.unreadCount}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </motion.div>

          {/* Right: Quick actions + platform summary */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="w-full lg:w-72 lg:shrink-0 space-y-4"
          >
            {/* Quick Actions */}
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-border">
                <h2 className="text-sm font-semibold text-foreground">Quick Actions</h2>
              </div>
              <div className="p-3 space-y-1.5">
                <Link
                  to="/inbox"
                  className="flex items-center justify-between w-full px-3 py-2.5 rounded-xl text-sm hover:bg-muted transition-colors group"
                >
                  <div className="flex items-center gap-2.5 text-foreground">
                    <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                      <MessageSquare className="w-3.5 h-3.5 text-primary" />
                    </div>
                    Open Inbox
                  </div>
                  <div className="flex items-center gap-1.5">
                    {pending > 0 && (
                      <span className="text-xs font-bold bg-primary text-white px-1.5 py-0.5 rounded-full">{pending}</span>
                    )}
                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
                  </div>
                </Link>
                <Link
                  to="/content"
                  className="flex items-center justify-between w-full px-3 py-2.5 rounded-xl text-sm hover:bg-muted transition-colors group"
                >
                  <div className="flex items-center gap-2.5 text-foreground">
                    <div className="w-7 h-7 rounded-lg bg-blue-500/10 flex items-center justify-center">
                      <CalendarDays className="w-3.5 h-3.5 text-blue-500" />
                    </div>
                    Schedule Post
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
                </Link>
                <Link
                  to="/campaigns"
                  className="flex items-center justify-between w-full px-3 py-2.5 rounded-xl text-sm hover:bg-muted transition-colors group"
                >
                  <div className="flex items-center gap-2.5 text-foreground">
                    <div className="w-7 h-7 rounded-lg bg-orange-500/10 flex items-center justify-center">
                      <Megaphone className="w-3.5 h-3.5 text-orange-500" />
                    </div>
                    New Campaign
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
                </Link>
                <Link
                  to="/flows"
                  className="flex items-center justify-between w-full px-3 py-2.5 rounded-xl text-sm hover:bg-muted transition-colors group"
                >
                  <div className="flex items-center gap-2.5 text-foreground">
                    <div className="w-7 h-7 rounded-lg bg-purple-500/10 flex items-center justify-center">
                      <GitBranch className="w-3.5 h-3.5 text-purple-500" />
                    </div>
                    Create Flow
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
                </Link>
                <Link
                  to="/phone"
                  className="flex items-center justify-between w-full px-3 py-2.5 rounded-xl text-sm hover:bg-muted transition-colors group"
                >
                  <div className="flex items-center gap-2.5 text-foreground">
                    <div className="w-7 h-7 rounded-lg bg-green-500/10 flex items-center justify-center">
                      <Phone className="w-3.5 h-3.5 text-green-500" />
                    </div>
                    Phone & SMS
                  </div>
                  {missedCalls > 0 && (
                    <span className="text-xs font-bold bg-red-500 text-white px-1.5 py-0.5 rounded-full">{missedCalls}</span>
                  )}
                </Link>
              </div>
            </div>

            {/* Platform summary */}
            <div className="bg-card border border-border rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-foreground">Platforms</h2>
                <span className="text-xs text-muted-foreground">{connectedCount} connected</span>
              </div>
              <div className="space-y-2">
                {platformsV2.slice(0, 4).map(p => {
                  const connected = p.comments?.connected || p.messages?.connected;
                  return (
                    <div key={p.platform} className="flex items-center gap-2.5">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${connected ? PLATFORM_DOT[p.platform] ?? "bg-muted" : "bg-muted-foreground/20"}`} />
                      <span className="text-xs text-foreground capitalize flex-1">{CHANNEL_LABEL[p.platform] ?? p.platform}</span>
                      <span className={`text-xs ${connected ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}`}>
                        {connected ? "Connected" : "Not connected"}
                      </span>
                    </div>
                  );
                })}
              </div>
              {activeFlows > 0 && (
                <div className="mt-3 pt-3 border-t border-border flex items-center gap-2">
                  <Zap className="w-3.5 h-3.5 text-primary" />
                  <span className="text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">{activeFlows}</span> active flow{activeFlows > 1 ? "s" : ""} running
                  </span>
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* ── Platform connections (collapsible) ───────────────────────────── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
          className="bg-card border border-border rounded-2xl overflow-hidden"
        >
          <button
            onClick={() => setPlatformsExpanded(prev => !prev)}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-foreground">Platform Connections</h2>
              <span className="text-xs px-2 py-0.5 bg-muted rounded-full text-muted-foreground">
                {connectedCount} / {ALL_PLATFORMS.length} connected
              </span>
            </div>
            {platformsExpanded
              ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
              : <ChevronDown className="w-4 h-4 text-muted-foreground" />
            }
          </button>

          {platformsExpanded && (
            <div className="px-5 pb-5 border-t border-border pt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {ALL_PLATFORMS.map(p => {
                const info = platformsV2.find(pl => pl.platform === p);
                const perm = permissions?.[p];

                const commentsStatus: PlatformFeatureStatus = info?.comments ?? { connected: false, enabled: perm?.comments ?? false };
                const messagesStatus: PlatformFeatureStatus = info?.messages ?? { connected: false, enabled: perm?.messages ?? false };
                const effectiveComments: PlatformFeatureStatus = perm ? { ...commentsStatus, enabled: perm.comments } : commentsStatus;
                const effectiveMessages: PlatformFeatureStatus = perm ? { ...messagesStatus, enabled: perm.messages } : messagesStatus;

                return (
                  <PlatformCard
                    key={p}
                    platform={p}
                    commentsStatus={effectiveComments}
                    messagesStatus={effectiveMessages}
                    onConnect={handleConnect}
                    onDisconnect={handleDisconnect}
                  />
                );
              })}
            </div>
          )}
        </motion.div>

        {/* Onboarding banner — only when nothing connected and 0 replies */}
        {!isLoading && totalReplies === 0 && connectedCount === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-4 p-4 bg-primary/5 border border-primary/20 rounded-2xl"
          >
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
              <Zap className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Get started in 3 steps</p>
              <ol className="mt-1.5 space-y-1 text-xs text-muted-foreground list-decimal list-inside">
                <li>Expand <strong>Platform Connections</strong> above and connect at least one platform</li>
                <li>Set your AI reply tone in <Link to="/settings" className="text-primary hover:underline">Settings</Link></li>
                <li>Replies will start appearing in your <Link to="/inbox" className="text-primary hover:underline">Inbox</Link></li>
              </ol>
            </div>
          </motion.div>
        )}
      </div>
    </AppLayout>
  );
}
