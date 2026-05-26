import { cn } from "@/lib/utils";
import type { Conversation, Channel } from "@/types";
import {
  MessageCircle, MessageSquare, Phone,
  AtSign, Smartphone, Zap, Clock, AlertTriangle, Search, Mail,
} from "lucide-react";

interface ConversationListProps {
  conversations: Conversation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  search: string;
  onSearchChange: (v: string) => void;
  activeTab: string;
  onTabChange: (t: string) => void;
  channelFilter: string;
  onChannelFilterChange: (v: string) => void;
}

// ── Confidence tier helpers ────────────────────────────────────────────────

type ConfTier = "auto" | "review" | "escalated" | "resolved";

function getConvTier(conv: Conversation): ConfTier | null {
  if (conv.status === "resolved" || conv.status === "closed") return "resolved";
  const pending = conv.messages.find(
    m => m.direction === "outbound" && m.replyStatus === "pending"
  );
  if (pending && pending.aiConfidence !== undefined) {
    if (pending.aiConfidence >= 0.85) return "auto";
    if (pending.aiConfidence >= 0.50) return "review";
    return "escalated";
  }
  const sent = conv.messages.find(
    m => m.direction === "outbound" &&
      (m.replyStatus === "auto_sent" || m.replyStatus === "approved" || m.replyStatus === "edited")
  );
  return sent ? "auto" : null;
}

function getPendingConf(conv: Conversation): number | null {
  const msg = conv.messages.find(
    m => m.direction === "outbound" && m.replyStatus === "pending" && m.aiConfidence !== undefined
  );
  return msg?.aiConfidence ?? null;
}

const TIER_META: Record<ConfTier, { dot: string; badge: string; label: string }> = {
  auto:      { dot: "bg-green-500",  badge: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400",  label: "Auto"      },
  review:    { dot: "bg-yellow-500", badge: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400", label: "Review"    },
  escalated: { dot: "bg-red-500",    badge: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400",            label: "Escalated" },
  resolved:  { dot: "bg-muted-foreground/40", badge: "bg-muted text-muted-foreground", label: "Done" },
};

function ConfidenceBadge({ conv }: { conv: Conversation }) {
  const tier = getConvTier(conv);
  if (!tier) return null;
  const meta = TIER_META[tier];
  const pct  = getPendingConf(conv);
  return (
    <span className={cn("inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0", meta.badge)}>
      <span className={cn("w-1.5 h-1.5 rounded-full", meta.dot)} />
      {pct !== null ? `${Math.round(pct * 100)}%` : meta.label}
    </span>
  );
}

// ── Tabs ───────────────────────────────────────────────────────────────────

const TABS = [
  { key: "all",       label: "All"       },
  { key: "auto",      label: "Auto-Sent" },
  { key: "review",    label: "Review"    },
  { key: "escalated", label: "Escalated" },
  { key: "resolved",  label: "Resolved"  },
];

const TAB_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  auto:      Zap,
  review:    Clock,
  escalated: AlertTriangle,
};

// ── Channel maps ───────────────────────────────────────────────────────────

const CHANNEL_FILTERS: { key: string; label: string; activeClass: string }[] = [
  { key: "all",       label: "All",       activeClass: "bg-primary text-white" },
  { key: "instagram", label: "Instagram", activeClass: "bg-gradient-to-r from-purple-500 to-pink-500 text-white" },
  { key: "tiktok",    label: "TikTok",    activeClass: "bg-zinc-900 text-white dark:bg-zinc-700" },
  { key: "facebook",  label: "Facebook",  activeClass: "bg-blue-600 text-white" },
  { key: "whatsapp",  label: "WhatsApp",  activeClass: "bg-green-500 text-white" },
  { key: "sms",       label: "SMS",       activeClass: "bg-slate-500 text-white" },
];

const CHANNEL_ICONS: Record<Channel, React.ComponentType<{ className?: string }>> = {
  tiktok_comment: MessageCircle, tiktok_dm: MessageCircle,
  instagram_comment: AtSign, instagram_dm: AtSign,
  facebook_comment: MessageSquare, facebook_messenger: MessageSquare,
  whatsapp_business: Phone, sms: Smartphone, phone_call: Phone,
};

const CHANNEL_COLORS: Record<Channel, string> = {
  tiktok_comment: "bg-black text-white",        tiktok_dm: "bg-black text-white",
  instagram_comment: "bg-gradient-to-br from-purple-500 to-pink-500 text-white",
  instagram_dm:      "bg-gradient-to-br from-purple-500 to-pink-500 text-white",
  facebook_comment: "bg-blue-600 text-white",    facebook_messenger: "bg-blue-500 text-white",
  whatsapp_business: "bg-green-500 text-white",  sms: "bg-slate-600 text-white",
  phone_call: "bg-slate-700 text-white",
};

const CHANNEL_LABEL: Record<Channel, string> = {
  tiktok_comment: "TikTok",       tiktok_dm: "TikTok DM",
  instagram_comment: "Instagram", instagram_dm: "Instagram DM",
  facebook_comment: "Facebook",   facebook_messenger: "Messenger",
  whatsapp_business: "WhatsApp",  sms: "SMS", phone_call: "Call",
};

function ConvAvatar({ conv }: { conv: Conversation }) {
  const Icon = CHANNEL_ICONS[conv.channel];
  const initials = conv.contactName.split(" ").map(w => w[0] ?? "").join("").toUpperCase().slice(0, 2) || "?";
  return (
    <div className="relative flex-shrink-0">
      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-sm font-semibold text-foreground">
        {initials}
      </div>
      <div className={cn(
        "absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center border-2 border-card",
        CHANNEL_COLORS[conv.channel]
      )}>
        <Icon className="w-2 h-2" />
      </div>
    </div>
  );
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

// ── Component ──────────────────────────────────────────────────────────────

export function ConversationList({
  conversations, selectedId, onSelect,
  search, onSearchChange, activeTab, onTabChange,
  channelFilter, onChannelFilterChange,
}: ConversationListProps) {

  const filtered = conversations.filter(c => {
    const matchSearch = !search
      || c.contactName.toLowerCase().includes(search.toLowerCase())
      || c.lastMessage.toLowerCase().includes(search.toLowerCase())
      || c.contactHandle.toLowerCase().includes(search.toLowerCase());
    const matchChannel = channelFilter === "all"
      || (channelFilter === "instagram" && (c.channel === "instagram_dm" || c.channel === "instagram_comment"))
      || (channelFilter === "tiktok"    && (c.channel === "tiktok_dm"    || c.channel === "tiktok_comment"))
      || (channelFilter === "facebook"  && (c.channel === "facebook_comment" || c.channel === "facebook_messenger"))
      || (channelFilter === "whatsapp"  && c.channel === "whatsapp_business")
      || (channelFilter === "sms"       && c.channel === "sms");
    const matchTab = (() => {
      if (activeTab === "all") return true;
      return getConvTier(c) === activeTab;
    })();
    return matchSearch && matchChannel && matchTab;
  });

  // Count per tier for tab badges
  const tierCounts = {
    all:       conversations.length,
    auto:      conversations.filter(c => getConvTier(c) === "auto").length,
    review:    conversations.filter(c => getConvTier(c) === "review").length,
    escalated: conversations.filter(c => getConvTier(c) === "escalated").length,
    resolved:  conversations.filter(c => getConvTier(c) === "resolved").length,
  } as Record<string, number>;

  const totalUnread = conversations.reduce((s, c) => s + c.unreadCount, 0);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-foreground text-base">Inbox</h2>
          {totalUnread > 0 && (
            <span className="bg-primary text-white text-xs font-bold px-2 py-0.5 rounded-full">
              {totalUnread}
            </span>
          )}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          <input
            value={search}
            onChange={e => onSearchChange(e.target.value)}
            placeholder="Search conversations…"
            className="w-full h-9 pl-9 pr-3 rounded-lg bg-muted border-0 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
      </div>

      {/* Confidence-tier tabs */}
      <div className="flex border-b border-border overflow-x-auto scrollbar-none">
        {TABS.map(tab => {
          const count = tierCounts[tab.key] ?? 0;
          const Icon = TAB_ICONS[tab.key];
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => onTabChange(tab.key)}
              className={cn(
                "flex-shrink-0 flex items-center gap-1 px-3 py-2.5 text-xs font-medium transition-colors relative whitespace-nowrap",
                isActive
                  ? "text-primary border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {Icon && <Icon className="w-3 h-3" />}
              {tab.label}
              {count > 0 && (
                <span className={cn(
                  "ml-0.5 text-[10px] px-1 rounded font-semibold",
                  isActive
                    ? tab.key === "escalated" ? "text-red-500"
                      : tab.key === "review" ? "text-yellow-600"
                      : "text-primary"
                    : "text-muted-foreground"
                )}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Channel filter chips */}
      <div className="flex gap-1.5 px-3 py-2 overflow-x-auto scrollbar-none border-b border-border">
        {CHANNEL_FILTERS.map(cf => (
          <button
            key={cf.key}
            onClick={() => onChannelFilterChange(cf.key)}
            className={cn(
              "flex-shrink-0 px-2.5 py-1 rounded-full text-xs font-medium transition-colors whitespace-nowrap",
              channelFilter === cf.key
                ? cf.activeClass
                : "bg-muted text-muted-foreground hover:text-foreground"
            )}
          >
            {cf.label}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-muted-foreground text-sm gap-2">
            <Mail className="w-6 h-6 opacity-40" />
            No conversations
          </div>
        ) : (
          filtered.map(conv => {
            const isSelected = conv.id === selectedId;
            const tier = getConvTier(conv);
            return (
              <button
                key={conv.id}
                onClick={() => onSelect(conv.id)}
                className={cn(
                  "w-full flex items-start gap-3 px-4 py-3 border-b border-border/40 text-left transition-all hover:bg-muted/40",
                  isSelected && "bg-primary/5 border-l-[3px] border-l-primary",
                  !isSelected && tier === "escalated" && "border-l-[3px] border-l-red-400"
                )}
              >
                <ConvAvatar conv={conv} />

                <div className="flex-1 min-w-0">
                  {/* Row 1: name + time + unread dot */}
                  <div className="flex items-center gap-1 mb-0.5">
                    <span className={cn(
                      "text-sm flex-1 truncate",
                      conv.unreadCount > 0 ? "font-semibold text-foreground" : "font-medium text-foreground"
                    )}>
                      {conv.contactName}
                    </span>
                    <span className="text-[11px] text-muted-foreground flex-shrink-0">{timeAgo(conv.lastMessageAt)}</span>
                    {conv.unreadCount > 0 && (
                      <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                    )}
                  </div>

                  {/* Row 2: last message */}
                  <p className={cn(
                    "text-xs truncate leading-snug",
                    conv.unreadCount > 0 ? "text-foreground font-medium" : "text-muted-foreground"
                  )}>
                    {conv.lastMessage}
                  </p>

                  {/* Row 3: confidence badge (only if actionable) */}
                  {tier && tier !== "resolved" && (
                    <div className="mt-1.5">
                      <ConfidenceBadge conv={conv} />
                    </div>
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
