import { cn } from "@/lib/utils";
import type { Conversation, Channel } from "@/types";
import {
  MessageCircle, MessageSquare, Phone, AtSign, Mail,
  Smartphone, AlertTriangle,
} from "lucide-react";

interface ConversationListProps {
  conversations: Conversation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  search: string;
  onSearchChange: (v: string) => void;
  activeTab: string;
  onTabChange: (t: string) => void;
}

const TABS = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "open", label: "Open" },
  { key: "resolved", label: "Resolved" },
];

const CHANNEL_ICONS: Record<Channel, React.ComponentType<{ className?: string }>> = {
  tiktok_comment: MessageCircle,
  tiktok_dm: MessageCircle,
  instagram_comment: AtSign,
  instagram_dm: AtSign,
  facebook_comment: MessageSquare,
  facebook_messenger: MessageSquare,
  whatsapp_business: Phone,
  sms: Smartphone,
  phone_call: Phone,
};

const CHANNEL_COLORS: Record<Channel, string> = {
  tiktok_comment: "bg-black text-white",
  tiktok_dm: "bg-black text-white",
  instagram_comment: "bg-gradient-to-br from-purple-500 to-pink-500 text-white",
  instagram_dm: "bg-gradient-to-br from-purple-500 to-pink-500 text-white",
  facebook_comment: "bg-blue-600 text-white",
  facebook_messenger: "bg-blue-500 text-white",
  whatsapp_business: "bg-green-500 text-white",
  sms: "bg-slate-600 text-white",
  phone_call: "bg-slate-700 text-white",
};

const CHANNEL_LABEL: Record<Channel, string> = {
  tiktok_comment: "TikTok",
  tiktok_dm: "TikTok DM",
  instagram_comment: "Instagram",
  instagram_dm: "Instagram DM",
  facebook_comment: "Facebook",
  facebook_messenger: "Messenger",
  whatsapp_business: "WhatsApp",
  sms: "SMS",
  phone_call: "Call",
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

export function ConversationList({
  conversations, selectedId, onSelect,
  search, onSearchChange, activeTab, onTabChange,
}: ConversationListProps) {
  const filtered = conversations.filter(c => {
    const matchTab = activeTab === "all" || c.status === activeTab;
    const matchSearch = !search
      || c.contactName.toLowerCase().includes(search.toLowerCase())
      || c.lastMessage.toLowerCase().includes(search.toLowerCase())
      || c.contactHandle.toLowerCase().includes(search.toLowerCase());
    return matchTab && matchSearch;
  });

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

        {/* Search */}
        <div className="relative">
          <input
            value={search}
            onChange={e => onSearchChange(e.target.value)}
            placeholder="Search conversations…"
            className="w-full h-9 pl-3 pr-3 rounded-lg bg-muted border-0 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        {TABS.map(tab => {
          const count = tab.key === "all"
            ? conversations.length
            : conversations.filter(c => c.status === tab.key).length;
          return (
            <button
              key={tab.key}
              onClick={() => onTabChange(tab.key)}
              className={cn(
                "flex-1 py-2 text-xs font-medium transition-colors relative",
                activeTab === tab.key
                  ? "text-primary border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
              {count > 0 && (
                <span className={cn(
                  "ml-1 text-[10px] px-1 rounded",
                  activeTab === tab.key ? "text-primary" : "text-muted-foreground"
                )}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-muted-foreground text-sm">
            <Mail className="w-6 h-6 mb-2 opacity-40" />
            No conversations
          </div>
        ) : (
          filtered.map(conv => {
            const Icon = CHANNEL_ICONS[conv.channel];
            const isSelected = conv.id === selectedId;
            return (
              <button
                key={conv.id}
                onClick={() => onSelect(conv.id)}
                className={cn(
                  "w-full flex items-start gap-3 px-4 py-3.5 border-b border-border/50 text-left transition-colors hover:bg-muted/50",
                  isSelected && "bg-primary/5 border-l-2 border-l-primary"
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

                  <div className="flex items-center gap-1 mb-1">
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                      {CHANNEL_LABEL[conv.channel]}
                    </span>
                    {conv.priority === "urgent" && (
                      <AlertTriangle className="w-3 h-3 text-red-500 flex-shrink-0" />
                    )}
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
