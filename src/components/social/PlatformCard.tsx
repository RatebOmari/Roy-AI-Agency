import { motion } from "framer-motion";
import { Lock, MessageCircle, Inbox } from "lucide-react";
import type { ExtendedPlatform, PlatformFeatureStatus, PlatformFeatureType } from "@/types";

interface PlatformCardProps {
  platform: ExtendedPlatform;
  commentsStatus: PlatformFeatureStatus;
  messagesStatus: PlatformFeatureStatus;
  onConnect: (platform: ExtendedPlatform, feature: PlatformFeatureType) => void;
  onDisconnect: (platform: ExtendedPlatform, feature: PlatformFeatureType) => void;
}

const META: Record<ExtendedPlatform, { name: string; bg: string; letter: string }> = {
  tiktok:    { name: "TikTok",    bg: "bg-black",                                      letter: "T" },
  instagram: { name: "Instagram", bg: "bg-gradient-to-br from-purple-500 to-pink-500", letter: "I" },
  facebook:  { name: "Facebook",  bg: "bg-blue-600",                                   letter: "F" },
  whatsapp:  { name: "WhatsApp",  bg: "bg-green-500",                                  letter: "W" },
  sms:       { name: "SMS",       bg: "bg-slate-600",                                  letter: "S" },
  phone:     { name: "Phone",     bg: "bg-slate-700",                                  letter: "P" },
};

function statusBadge(comments: PlatformFeatureStatus, messages: PlatformFeatureStatus) {
  const cc = comments.connected;
  const mc = messages.connected;
  if (cc && mc) return { label: "Full",           cls: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" };
  if (cc)       return { label: "Comments Only",   cls: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" };
  if (mc)       return { label: "Messages Only",   cls: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" };
  return         { label: "Disconnected",          cls: "bg-muted text-muted-foreground" };
}

interface FeatureRowProps {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  status: PlatformFeatureStatus;
  isPhone: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
}

function FeatureRow({ label, icon: Icon, status, isPhone, onConnect, onDisconnect }: FeatureRowProps) {
  if (isPhone) {
    return (
      <div className="flex items-center justify-between py-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Icon className="w-4 h-4" />
          <span>{label}</span>
        </div>
        <span className="text-xs text-muted-foreground italic">Coming soon</span>
      </div>
    );
  }

  const { connected, enabled, replies, pending } = status;

  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-2 min-w-0">
        <Icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">{label}</p>
          {connected && (replies !== undefined || pending !== undefined) && (
            <p className="text-[11px] text-muted-foreground">
              {replies ?? 0} replies · {pending ?? 0} pending
            </p>
          )}
        </div>
      </div>

      {!enabled ? (
        <div className="flex items-center gap-1 text-muted-foreground" title="Contact your agency to enable this">
          <Lock className="w-3.5 h-3.5" />
          <span className="text-xs">Locked</span>
        </div>
      ) : connected ? (
        <button
          onClick={onDisconnect}
          className="text-xs px-2.5 py-1 rounded-lg border border-border text-muted-foreground hover:text-red-600 hover:border-red-300 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
        >
          Disconnect
        </button>
      ) : (
        <button
          onClick={onConnect}
          className="text-xs px-2.5 py-1 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors"
        >
          Connect
        </button>
      )}
    </div>
  );
}

export function PlatformCard({ platform, commentsStatus, messagesStatus, onConnect, onDisconnect }: PlatformCardProps) {
  const m = META[platform];
  const badge = statusBadge(commentsStatus, messagesStatus);
  const isPhone = platform === "phone";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-2xl p-4 border border-border flex flex-col gap-3 shadow-sm"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className={`w-9 h-9 rounded-xl ${m.bg} flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}>
            {m.letter}
          </div>
          <p className="font-semibold text-foreground">{m.name}</p>
        </div>
        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${badge.cls}`}>
          {isPhone ? "Coming Soon" : badge.label}
        </span>
      </div>

      {/* Divider */}
      <div className="border-t border-border/60" />

      {/* Feature rows */}
      <div className="divide-y divide-border/40">
        <FeatureRow
          label="Comments"
          icon={MessageCircle}
          status={commentsStatus}
          isPhone={isPhone}
          onConnect={() => onConnect(platform, "comments")}
          onDisconnect={() => onDisconnect(platform, "comments")}
        />
        <FeatureRow
          label="Messages"
          icon={Inbox}
          status={messagesStatus}
          isPhone={isPhone}
          onConnect={() => onConnect(platform, "messages")}
          onDisconnect={() => onDisconnect(platform, "messages")}
        />
      </div>
    </motion.div>
  );
}
