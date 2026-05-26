import { cn } from "@/lib/utils";
import type { Conversation, Channel } from "@/types";
import {
  MessageCircle, MessageSquare, Phone, AtSign, Mail,
  Smartphone, Zap, Clock, AlertTriangle,
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

const CHANNEL_FILTERS = [
  { key: "all",       label: "All Channels" },
  { key: "comments",  label: "💬 Comments"  },
  { key: "dms",       label: "📩 DMs"       },
  { key: "sms",       label: "📱 SMS"       },
  { key: "whatsapp",  label: "WhatsApp"     },
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
      || (channelFilter === "comments" && c.channel.endsWith("_comment"))
      || (channelFilter === "dms" && (c.channel.endsWith("_dm") || c.channel === "facebook_messenger"))
      || (channelFilter === "sms" && c.channel === "sms")
      || (channelFilter === "whatsapp" && c.channel === "whatsapp_business");
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
          <input
            value={search}
            onChange={e => onSearchChange(e.target.value)}
            placeholder="Search conversations…"
            className="w-full h-9 pl-3 pr-3 rounded-lg bg-muted border-0 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
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
                ? "bg-primary text-white"
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
            const Icon = CHANNEL_ICONS[conv.channel];
            const isSelected = conv.id === selectedId;
            const tier = getConvTier(conv);
            return (
              <button
                key={conv.id}
                onClick={() => onSelect(conv.id)}
                className={cn(
                  "w-full flex items-start gap-3 px-4 py-3.5 border-b border-border/50 text-left transition-colors hover:bg-muted/50",
                  isSelected && "bg-primary/5 border-l-2 border-l-primary",
                  // Subtle left accent for escalated
                  !isSelected && tier === "escalated" && "border-l-2 border-l-red-400/50"
                )}
              >
                {/* Channel icon */}
                <div className={cn(
                  "w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5",
                  CHANNEL_COLORS[conv.channel]
                )}>
                  <Icon className="w-4 h-4" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <span className={cn("text-sm font-medium truncate", conv.unreadCount > 0 && "font-semibold")}>
                      {conv.contactName}
                    </span>
                    <span className="text-[11px] text-muted-foreground flex-shrink-0">
                      {timeAgo(conv.lastMessageAt)}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                      {CHANNEL_LABEL[conv.channel]}
                    </span>
                    <ConfidenceBadge conv={conv} />
                  </div>

                  <p className={cn(
                    "text-xs text-muted-foreground truncate",
                    conv.unreadCount > 0 && "text-foreground font-medium"
                  )}>
                    {conv.lastMessage}
                  </p>
                </div>

                {conv.unreadCount > 0 && (
                  <span className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
