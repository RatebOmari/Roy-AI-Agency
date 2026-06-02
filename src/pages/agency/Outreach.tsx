import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useAgencyOutreach } from "@/hooks/useOutreach";
import {
  Send, Eye, MessageCircle, Users, MessageSquare, Mail, Phone,
  Megaphone, TrendingUp, BarChart2, Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { OutreachChannel, OutreachStatus } from "@/types";

// ── Helpers ───────────────────────────────────────────────────────────────────

const CHANNEL_ICON: Record<OutreachChannel, React.ElementType> = {
  whatsapp: MessageCircle,
  sms:      Phone,
  email:    Mail,
};

const CHANNEL_COLOR: Record<OutreachChannel, string> = {
  whatsapp: "bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400",
  sms:      "bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400",
  email:    "bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400",
};

const STATUS_STYLE: Record<OutreachStatus, string> = {
  draft:     "bg-muted text-muted-foreground",
  scheduled: "bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400",
  sending:   "bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400",
  sent:      "bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400",
  failed:    "bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400",
};

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function rate(num: number, den: number) {
  return den > 0 ? Math.round((num / den) * 100) : 0;
}

// ── KPI Card ──────────────────────────────────────────────────────────────────

function KpiCard({ label, value, icon: Icon, iconBg, iconColor, sub }: {
  label: string; value: string | number;
  icon: React.ElementType; iconBg: string; iconColor: string; sub?: string;
}) {
  return (
    <div className="bg-card border border-border rounded-2xl p-4">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-9 h-9 rounded-xl ${iconBg} flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
      </div>
      <p className="text-2xl font-bold text-foreground leading-none">{value}</p>
      <p className="text-xs text-muted-foreground mt-1.5">{label}</p>
      {sub && <p className="text-[11px] text-muted-foreground/60 mt-0.5">{sub}</p>}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function AgencyOutreach() {
  const { user } = useAuth();
  const { data: messages = [], isLoading } = useAgencyOutreach();

  const [channelFilter, setChannelFilter] = useState<OutreachChannel | "all">("all");
  const [statusFilter,  setStatusFilter]  = useState<OutreachStatus  | "all">("all");
  const [clientFilter,  setClientFilter]  = useState("all");

  // ── Derived KPIs ─────────────────────────────────────────────────────────

  const sentMessages  = messages.filter(m => m.status === "sent");
  const totalSent     = sentMessages.reduce((s, m) => s + m.sentCount, 0);
  const totalOpened   = sentMessages.reduce((s, m) => s + m.openedCount, 0);
  const totalReplied  = sentMessages.reduce((s, m) => s + m.repliedCount, 0);
  const totalReach    = sentMessages.reduce((s, m) => s + m.actualReach, 0);
  const openRate      = rate(totalOpened, totalSent);
  const replyRate     = rate(totalReplied, totalSent);

  // Channel breakdown
  const byChannel = (["whatsapp", "sms", "email"] as OutreachChannel[]).map(ch => {
    const chMsgs  = sentMessages.filter(m => m.channel === ch);
    const sent    = chMsgs.reduce((s, m) => s + m.sentCount, 0);
    const opened  = chMsgs.reduce((s, m) => s + m.openedCount, 0);
    const replied = chMsgs.reduce((s, m) => s + m.repliedCount, 0);
    return { channel: ch, sent, opened, replied, openRate: rate(opened, sent), replyRate: rate(replied, sent) };
  });

  // Unique clients
  const clientNames = Array.from(new Set(
    messages.map(m => m.clientBusinessName ?? m.clientName ?? "Unknown")
  )).sort();

  // Filtered list
  const filtered = messages.filter(m => {
    if (channelFilter !== "all" && m.channel !== channelFilter) return false;
    if (statusFilter  !== "all" && m.status  !== statusFilter)  return false;
    if (clientFilter  !== "all") {
      const name = m.clientBusinessName ?? m.clientName ?? "Unknown";
      if (name !== clientFilter) return false;
    }
    return true;
  });

  return (
    <AppLayout role="agency" businessName={user?.businessName}>
      <div className="space-y-5">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Outreach</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Read-only view of all client broadcast campaigns
          </p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard label="Total Broadcasts" value={messages.length}
            icon={Megaphone} iconBg="bg-primary/10" iconColor="text-primary"
            sub={`${sentMessages.length} sent`} />
          <KpiCard label="Total Reach" value={totalReach.toLocaleString()}
            icon={Users} iconBg="bg-blue-100 dark:bg-blue-900/20" iconColor="text-blue-600"
            sub={`${totalSent.toLocaleString()} delivered`} />
          <KpiCard label="Open Rate" value={`${openRate}%`}
            icon={Eye} iconBg="bg-green-100 dark:bg-green-900/20" iconColor="text-green-600"
            sub={`${totalOpened.toLocaleString()} opens`} />
          <KpiCard label="Reply Rate" value={`${replyRate}%`}
            icon={Send} iconBg="bg-violet-100 dark:bg-violet-900/20" iconColor="text-violet-600"
            sub={`${totalReplied.toLocaleString()} replies`} />
        </div>

        {/* Channel Breakdown */}
        <div className="bg-card border border-border rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart2 className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-foreground text-sm">Channel Performance</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {byChannel.map(ch => {
              const Icon = CHANNEL_ICON[ch.channel];
              return (
                <div key={ch.channel} className="p-4 rounded-xl bg-muted/40 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className={cn("flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full capitalize", CHANNEL_COLOR[ch.channel])}>
                      <Icon className="w-3 h-3" />
                      {ch.channel}
                    </span>
                    <span className="text-xs text-muted-foreground ml-auto">{ch.sent.toLocaleString()} sent</span>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-10 shrink-0">Open</span>
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${ch.openRate}%` }} />
                      </div>
                      <span className="text-xs font-medium text-foreground w-8 text-right">{ch.openRate}%</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-10 shrink-0">Reply</span>
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-green-500 rounded-full" style={{ width: `${ch.replyRate}%` }} />
                      </div>
                      <span className="text-xs font-medium text-foreground w-8 text-right">{ch.replyRate}%</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground shrink-0" />

          {/* Client filter */}
          <select
            value={clientFilter}
            onChange={e => setClientFilter(e.target.value)}
            className="text-xs border border-border rounded-lg px-2 py-1.5 bg-card text-foreground"
          >
            <option value="all">All Clients</option>
            {clientNames.map(n => <option key={n} value={n}>{n}</option>)}
          </select>

          {/* Channel filter */}
          <div className="flex items-center gap-1 bg-muted/60 rounded-xl p-1">
            {(["all", "whatsapp", "sms", "email"] as const).map(ch => (
              <button
                key={ch}
                onClick={() => setChannelFilter(ch)}
                className={cn(
                  "px-2.5 py-1 text-xs font-medium rounded-lg transition-colors capitalize",
                  channelFilter === ch
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {ch === "all" ? "All Channels" : ch}
              </button>
            ))}
          </div>

          {/* Status filter */}
          <div className="flex items-center gap-1 bg-muted/60 rounded-xl p-1">
            {(["all", "draft", "scheduled", "sent", "failed"] as const).map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={cn(
                  "px-2.5 py-1 text-xs font-medium rounded-lg transition-colors capitalize",
                  statusFilter === s
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {s === "all" ? "All Statuses" : s}
              </button>
            ))}
          </div>

          <span className="ml-auto text-xs text-muted-foreground">{filtered.length} results</span>
        </div>

        {/* Message list */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-muted/40 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-card border border-border rounded-2xl p-12 text-center">
            <Megaphone className="w-8 h-8 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-sm font-medium text-foreground">No outreach found</p>
            <p className="text-xs text-muted-foreground mt-1">Adjust your filters or check back when clients send broadcasts.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(msg => {
              const Icon = CHANNEL_ICON[msg.channel];
              const sentAt = msg.sentAt ?? msg.scheduledAt ?? msg.createdAt;
              const deliverRate = rate(msg.deliveredCount, msg.sentCount);
              const openRt     = rate(msg.openedCount,    msg.sentCount);
              const replyRt    = rate(msg.repliedCount,   msg.sentCount);

              return (
                <div key={msg.id} className="bg-card border border-border rounded-2xl p-5 space-y-4">
                  {/* Top row */}
                  <div className="flex items-start gap-3">
                    <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", CHANNEL_COLOR[msg.channel])}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-foreground text-sm truncate">{msg.title}</p>
                        <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full capitalize", STATUS_STYLE[msg.status])}>
                          {msg.status}
                        </span>
                        <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full capitalize", CHANNEL_COLOR[msg.channel])}>
                          {msg.channel}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground flex-wrap">
                        {(msg.clientBusinessName ?? msg.clientName) && (
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {msg.clientBusinessName ?? msg.clientName}
                          </span>
                        )}
                        <span>{fmtDate(sentAt)}</span>
                        {msg.estimatedReach > 0 && (
                          <span>{msg.estimatedReach.toLocaleString()} recipients</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Message preview */}
                  <p className="text-xs text-muted-foreground line-clamp-2 pl-12">{msg.messageBody}</p>

                  {/* Stats (only for sent) */}
                  {msg.status === "sent" && msg.sentCount > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pl-12">
                      {[
                        { label: "Sent",       value: msg.sentCount.toLocaleString(),  sub: "" },
                        { label: "Delivered",  value: msg.deliveredCount.toLocaleString(), sub: `${deliverRate}%` },
                        { label: "Opened",     value: msg.openedCount.toLocaleString(),    sub: `${openRt}%` },
                        { label: "Replied",    value: msg.repliedCount.toLocaleString(),   sub: `${replyRt}%` },
                      ].map(s => (
                        <div key={s.label} className="text-center p-2 rounded-xl bg-muted/40">
                          <p className="text-sm font-bold text-foreground">{s.value}</p>
                          <p className="text-[10px] text-muted-foreground">{s.label}</p>
                          {s.sub && <p className="text-[10px] text-muted-foreground/60">{s.sub}</p>}
                        </div>
                      ))}
                    </div>
                  )}

                  {msg.status === "scheduled" && msg.scheduledAt && (
                    <p className="text-xs text-blue-600 dark:text-blue-400 pl-12">
                      Scheduled for {new Date(msg.scheduledAt).toLocaleString("en-US", {
                        month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                      })}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Empty state — no messages at all */}
        {!isLoading && messages.length === 0 && (
          <div className="bg-card border border-border rounded-2xl p-12 text-center">
            <MessageSquare className="w-8 h-8 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-sm font-medium text-foreground">No outreach yet</p>
            <p className="text-xs text-muted-foreground mt-1">Clients' broadcast campaigns will appear here.</p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
