import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAgencyClient } from "@/contexts/AgencyClientContext";
import { useClients } from "@/hooks/useClients";
import { useCommandCenter } from "@/hooks/useCommandCenter";
import type { UrgentType, UrgentItem } from "@/hooks/useCommandCenter";
import {
  AlertTriangle, Clock, XCircle, ArrowRight, Loader2,
  RefreshCw, Zap, CheckCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── helpers ───────────────────────────────────────────────────────────────────

const PLATFORM_COLORS: Record<string, string> = {
  instagram: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",
  tiktok:    "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  facebook:  "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  whatsapp:  "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
};

const PLATFORM_LABELS: Record<string, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  facebook: "Facebook",
  whatsapp: "WhatsApp",
};

type FilterType = UrgentType | "all";

interface FilterOption {
  id: FilterType;
  label: string;
  icon: React.ElementType;
  borderClass: string;
  textClass: string;
}

const FILTERS: FilterOption[] = [
  { id: "all",        label: "All",         icon: Zap,           borderClass: "border-border",        textClass: "text-foreground" },
  { id: "escalation", label: "Escalations", icon: AlertTriangle, borderClass: "border-red-300",       textClass: "text-red-600 dark:text-red-400" },
  { id: "pending",    label: "Pending",     icon: Clock,         borderClass: "border-amber-300",     textClass: "text-amber-600 dark:text-amber-400" },
  { id: "failed_post",label: "Failed Posts",icon: XCircle,       borderClass: "border-slate-300",     textClass: "text-slate-600 dark:text-slate-400" },
];

const TYPE_META: Record<UrgentType, { label: string; icon: React.ElementType; border: string; badge: string }> = {
  escalation: {
    label: "Escalation",
    icon: AlertTriangle,
    border: "border-l-red-500",
    badge: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  },
  pending: {
    label: "Pending",
    icon: Clock,
    border: "border-l-amber-500",
    badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  },
  failed_post: {
    label: "Failed Post",
    icon: XCircle,
    border: "border-l-slate-400",
    badge: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  },
};

const JUMP_ROUTE: Record<UrgentType, string> = {
  escalation:  "/inbox",
  pending:     "/inbox",
  failed_post: "/content",
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1)  return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ── UrgentCard ────────────────────────────────────────────────────────────────

function UrgentCard({ item, onJumpIn }: { item: UrgentItem; onJumpIn: (item: UrgentItem) => void }) {
  const meta = TYPE_META[item.type];
  const Icon = meta.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      layout
      className={cn(
        "bg-card border border-border border-l-4 rounded-xl px-4 py-3.5 flex items-start gap-3 shadow-sm",
        meta.border,
      )}
    >
      {/* Icon */}
      <div className="mt-0.5 shrink-0">
        <Icon className={cn("w-4 h-4", item.type === "escalation" ? "text-red-500" : item.type === "pending" ? "text-amber-500" : "text-slate-400")} />
      </div>

      {/* Body */}
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          {/* Type badge */}
          <span className={cn("text-[11px] font-semibold px-1.5 py-0.5 rounded-full", meta.badge)}>
            {meta.label}
          </span>
          {/* Platform chip */}
          <span className={cn("text-[11px] font-medium px-1.5 py-0.5 rounded-full", PLATFORM_COLORS[item.platform] ?? "bg-muted text-muted-foreground")}>
            {PLATFORM_LABELS[item.platform] ?? item.platform}
          </span>
        </div>

        {/* Client name */}
        <p className="text-sm font-semibold text-foreground truncate">{item.clientName}</p>

        {/* Description */}
        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{item.description}</p>

        {/* Age */}
        <p className="text-[11px] text-muted-foreground/70 mt-1">{timeAgo(item.timestamp)}</p>
      </div>

      {/* Jump In button */}
      <button
        onClick={() => onJumpIn(item)}
        className="shrink-0 flex items-center gap-1 px-3 py-1.5 bg-primary text-white text-xs font-medium rounded-lg hover:bg-primary/90 transition-colors"
      >
        Jump In
        <ArrowRight className="w-3 h-3" />
      </button>
    </motion.div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState({ filter }: { filter: FilterType }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-14 h-14 rounded-2xl bg-green-100 dark:bg-green-900/20 flex items-center justify-center mb-4">
        <CheckCircle className="w-7 h-7 text-green-600 dark:text-green-400" />
      </div>
      <p className="font-semibold text-foreground">All clear!</p>
      <p className="text-sm text-muted-foreground mt-1">
        {filter === "all"
          ? "No urgent items across your clients."
          : `No ${FILTERS.find(f => f.id === filter)?.label.toLowerCase()} right now.`}
      </p>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function CommandCenter() {
  const navigate = useNavigate();
  const { data: clients = [] } = useClients();
  const { selectClient } = useAgencyClient();
  const { data: items = [], isLoading, refetch, isFetching } = useCommandCenter();

  const [filter, setFilter] = useState<FilterType>("all");

  const filtered = filter === "all" ? items : items.filter(i => i.type === filter);

  const countFor = (f: FilterType) =>
    f === "all" ? items.length : items.filter(i => i.type === f).length;

  const handleJumpIn = (item: UrgentItem) => {
    const client = clients.find(c => c.id === item.clientId);
    if (client) selectClient(client);
    navigate(JUMP_ROUTE[item.type]);
  };

  return (
    <AppLayout role="agency">
      <div className="space-y-6 max-w-3xl mx-auto">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-foreground">Command Center</h1>
              {items.length > 0 && (
                <span className="px-2 py-0.5 text-xs font-bold bg-red-500 text-white rounded-full">
                  {items.length}
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Urgent items across all clients — act before they escalate further
            </p>
          </div>

          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground border border-border rounded-lg transition-colors"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", isFetching && "animate-spin")} />
            Refresh
          </button>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 flex-wrap">
          {FILTERS.map(f => {
            const count = countFor(f.id);
            const active = filter === f.id;
            return (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium border transition-colors",
                  active
                    ? "bg-card shadow-sm " + f.borderClass + " " + f.textClass
                    : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted",
                )}
              >
                <f.icon className="w-3.5 h-3.5" />
                {f.label}
                {count > 0 && (
                  <span className={cn(
                    "text-[11px] font-bold px-1.5 py-0.5 rounded-full",
                    active ? "bg-current/10" : "bg-muted",
                  )}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Feed */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {filtered.length === 0 ? (
              <EmptyState key="empty" filter={filter} />
            ) : (
              <div className="space-y-3">
                {filtered
                  .slice()
                  .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
                  .map(item => (
                    <UrgentCard key={item.id} item={item} onJumpIn={handleJumpIn} />
                  ))}
              </div>
            )}
          </AnimatePresence>
        )}
      </div>
    </AppLayout>
  );
}
