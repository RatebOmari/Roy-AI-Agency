import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import {
  TrendingUp, MessageCircle, Zap, Clock, Users, Heart, Eye, Share2,
  Radio, Megaphone, GitBranch, CheckCircle2, Phone, MessageSquare,
  BarChart2, TrendingDown, Send,
} from "lucide-react";
import { usePostMetrics } from "@/hooks/useContent";
import { useConversations } from "@/hooks/useConversations";
import { useCampaigns } from "@/hooks/useCampaigns";
import { useFlows } from "@/hooks/useFlows";
import { useMentions } from "@/hooks/useListening";
import { useAnalytics } from "@/hooks/useAnalytics";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

type Tab = "overview" | "inbox" | "content" | "listening" | "campaigns";
type DateRange = "7d" | "30d" | "90d";

// ── Static chart data (mock — replace with API when available) ────────────────

const MSG_7D = [
  { date: "Mon", autoSent: 31, manual: 8, escalated: 3 },
  { date: "Tue", autoSent: 44, manual: 11, escalated: 3 },
  { date: "Wed", autoSent: 28, manual: 5, escalated: 2 },
  { date: "Thu", autoSent: 51, manual: 13, escalated: 3 },
  { date: "Fri", autoSent: 70, manual: 15, escalated: 4 },
  { date: "Sat", autoSent: 89, manual: 19, escalated: 4 },
  { date: "Sun", autoSent: 60, manual: 12, escalated: 4 },
];

const MSG_30D = [
  { date: "W1", autoSent: 198, manual: 52, escalated: 16 },
  { date: "W2", autoSent: 243, manual: 65, escalated: 19 },
  { date: "W3", autoSent: 312, manual: 78, escalated: 22 },
  { date: "W4", autoSent: 373, manual: 83, escalated: 25 },
];

const MSG_90D = [
  { date: "May",  autoSent: 820,  manual: 195, escalated: 64 },
  { date: "Apr",  autoSent: 1120, manual: 270, escalated: 88 },
  { date: "Mar",  autoSent: 940,  manual: 228, escalated: 72 },
];

const RESP_7D = [
  { date: "Mon", time: 1.8 },
  { date: "Tue", time: 1.6 },
  { date: "Wed", time: 1.7 },
  { date: "Thu", time: 1.4 },
  { date: "Fri", time: 1.3 },
  { date: "Sat", time: 1.5 },
  { date: "Sun", time: 1.4 },
];

const CHANNEL_PIE = [
  { name: "Instagram", value: 38, color: "#a855f7" },
  { name: "TikTok",    value: 27, color: "#1a1a1a" },
  { name: "Facebook",  value: 18, color: "#3b82f6" },
  { name: "SMS",       value: 12, color: "#f97316" },
  { name: "WhatsApp",  value: 5,  color: "#22c55e" },
];

const SENTIMENT_7D = [
  { date: "Mon", positive: 8,  neutral: 5, negative: 2 },
  { date: "Tue", positive: 12, neutral: 6, negative: 3 },
  { date: "Wed", positive: 7,  neutral: 4, negative: 1 },
  { date: "Thu", positive: 15, neutral: 8, negative: 4 },
  { date: "Fri", positive: 11, neutral: 7, negative: 2 },
  { date: "Sat", positive: 9,  neutral: 5, negative: 1 },
  { date: "Sun", positive: 6,  neutral: 3, negative: 2 },
];

const MENTIONS_BY_PLATFORM = [
  { platform: "Instagram", mentions: 28 },
  { platform: "TikTok",    mentions: 19 },
  { platform: "Facebook",  mentions: 12 },
  { platform: "WhatsApp",  mentions: 5  },
];

const PLATFORM_COLOR: Record<string, string> = {
  instagram: "bg-gradient-to-br from-purple-500 to-pink-500",
  tiktok:    "bg-zinc-900",
  facebook:  "bg-blue-600",
  whatsapp:  "bg-green-500",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function TrendBadge({ value, inverse }: { value: string; inverse?: boolean }) {
  const positive = value.startsWith("+");
  const negative = value.startsWith("-");
  const good = inverse ? negative : positive;
  return (
    <span className={cn(
      "text-xs font-medium px-2 py-0.5 rounded-full",
      good
        ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
        : positive || negative
          ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
          : "bg-muted text-muted-foreground"
    )}>
      {value}
    </span>
  );
}

interface KpiCardProps {
  label: string;
  value: string | number;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  trend?: string;
  trendInverse?: boolean;
  sub?: string;
}

function KpiCard({ label, value, icon: Icon, iconBg, iconColor, trend, trendInverse, sub }: KpiCardProps) {
  return (
    <div className="bg-card border border-border rounded-2xl p-4">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-9 h-9 rounded-xl ${iconBg} flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
        {trend && <TrendBadge value={trend} inverse={trendInverse} />}
      </div>
      <p className="text-2xl font-bold text-foreground leading-none">{value}</p>
      <p className="text-xs text-muted-foreground mt-1.5">{label}</p>
      {sub && <p className="text-[11px] text-muted-foreground/60 mt-0.5">{sub}</p>}
    </div>
  );
}

function ChartCard({ title, icon: Icon, children, className }: {
  title: string;
  icon?: React.ElementType;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("bg-card border border-border rounded-2xl p-5", className)}>
      <div className="flex items-center gap-2 mb-5">
        {Icon && <Icon className="w-4 h-4 text-primary" />}
        <h3 className="font-semibold text-foreground text-sm">{title}</h3>
      </div>
      {children}
    </div>
  );
}

const TOOLTIP_STYLE = {
  borderRadius: 12,
  border: "1px solid hsl(var(--border))",
  fontSize: 12,
  background: "hsl(var(--card))",
  color: "hsl(var(--foreground))",
};

// ── Tab definitions ───────────────────────────────────────────────────────────

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "overview",   label: "Overview",   icon: BarChart2 },
  { id: "inbox",      label: "Inbox",      icon: MessageSquare },
  { id: "content",    label: "Content",    icon: Eye },
  { id: "listening",  label: "Listening",  icon: Radio },
  { id: "campaigns",  label: "Campaigns",  icon: Megaphone },
];

// ── Main component ────────────────────────────────────────────────────────────

export default function Analytics() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("overview");
  const [range, setRange] = useState<DateRange>("7d");

  const { data: analytics }      = useAnalytics(range);
  const { data: conversations = [] } = useConversations();
  const { data: campaigns     = [] } = useCampaigns();
  const { data: flows         = [] } = useFlows();
  const { data: mentions      = [] } = useMentions();
  const { data: postMetrics   = [] } = usePostMetrics();

  // ── Real data from analytics endpoint (falls back to mock when empty) ──────

  const summary    = analytics?.summary;
  const msgData    = (analytics?.msgChart?.length ?? 0) > 0
    ? analytics!.msgChart
    : (range === "7d" ? MSG_7D : range === "30d" ? MSG_30D : MSG_90D);
  const totalMsgs  = summary?.totalMessages
    ?? msgData.reduce((s, d) => s + d.autoSent + d.manual + d.escalated, 0);

  const autoSentCount  = summary?.totalAutoSent  ?? 6;
  const manualCount    = summary?.totalManual    ?? 2;
  const escalatedCount = summary?.totalEscalated ?? 1;
  const pendingCount   = summary?.pendingConversations ?? 0;

  const confidencePie = [
    { name: "Auto-sent (≥85%)",  value: autoSentCount  || 6, color: "#22c55e" },
    { name: "Reviewed (50–84%)", value: manualCount     || 2, color: "#eab308" },
    { name: "Escalated (<50%)",  value: escalatedCount  || 1, color: "#ef4444" },
  ];

  const campStats  = analytics?.campaigns;
  const readRate   = campStats?.readRate  ?? 0;
  const replyRate  = campStats?.replyRate ?? 0;

  const activeFlows   = flows.filter(f => f.active).length;
  const totalTriggers = flows.reduce((s, f) => s + f.triggerCount, 0);

  const posMentions = mentions.filter(m => m.sentiment === "positive").length;
  const negMentions = mentions.filter(m => m.sentiment === "negative").length;
  const posRate     = mentions.length > 0 ? Math.round((posMentions / mentions.length) * 100) : 0;

  const sentCampaigns = campaigns.filter(c => c.status === "sent");
  const totalCampSent = sentCampaigns.reduce((s, c) => s + c.sentCount, 0);
  const allMsgs       = conversations;

  return (
    <AppLayout role="client" businessName={user?.businessName}>
      <div className="space-y-5">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Performance across all features and workflows
            </p>
          </div>
          <div className="flex items-center gap-1 bg-muted/60 rounded-xl p-1">
            {(["7d", "30d", "90d"] as DateRange[]).map(r => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium rounded-lg transition-colors",
                  range === r
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <span className="hidden sm:inline">{r === "7d" ? "Last 7 days" : r === "30d" ? "Last 30 days" : "Last 90 days"}</span>
                <span className="sm:hidden">{r}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Tabs ───────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-1 border-b border-border overflow-x-auto no-scrollbar pb-0">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "flex items-center gap-2 px-3 sm:px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap",
                tab === t.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <t.icon className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          ))}
        </div>

        {/* ══ OVERVIEW ══════════════════════════════════════════════════════ */}
        {tab === "overview" && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard label="Total Messages" value={totalMsgs} icon={MessageCircle}
                iconBg="bg-primary/10" iconColor="text-primary" trend="+12%" />
              <KpiCard label="Auto-Sent by AI" value={`${Math.round((msgData.reduce((s,d)=>s+d.autoSent,0)/totalMsgs)*100)||0}%`}
                icon={Zap} iconBg="bg-green-100 dark:bg-green-900/20" iconColor="text-green-600" trend="+9%" sub="of all replies" />
              <KpiCard label="Avg Response Time" value="1.4 min"
                icon={Clock} iconBg="bg-blue-100 dark:bg-blue-900/20" iconColor="text-blue-600" trend="-0.3m" trendInverse />
              <KpiCard label="Unique Contacts" value="214"
                icon={Users} iconBg="bg-purple-100 dark:bg-purple-900/20" iconColor="text-purple-600" trend="+18%" />
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard label="Posts Published" value={postMetrics.length}
                icon={Eye} iconBg="bg-orange-100 dark:bg-orange-900/20" iconColor="text-orange-600" trend="+3" />
              <KpiCard label="Brand Mentions" value={mentions.length}
                icon={Radio} iconBg="bg-pink-100 dark:bg-pink-900/20" iconColor="text-pink-600" trend="+8%" />
              <KpiCard label="Campaigns Sent" value={totalCampSent.toLocaleString()}
                icon={Megaphone} iconBg="bg-amber-100 dark:bg-amber-900/20" iconColor="text-amber-600" sub={`${readRate}% read rate`} />
              <KpiCard label="Active Flows" value={activeFlows}
                icon={GitBranch} iconBg="bg-violet-100 dark:bg-violet-900/20" iconColor="text-violet-600" sub={`${totalTriggers} total triggers`} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <ChartCard title="Message Volume" icon={TrendingUp} className="lg:col-span-2">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={msgData} barGap={2}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="autoSent"  name="Auto-Sent" fill="hsl(var(--primary))" radius={[3,3,0,0]} />
                    <Bar dataKey="manual"    name="Manual"    fill="#94a3b8"              radius={[3,3,0,0]} />
                    <Bar dataKey="escalated" name="Escalated" fill="#f87171"              radius={[3,3,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="Channel Distribution" icon={BarChart2}>
                <div className="flex flex-col items-center gap-4">
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie data={CHANNEL_PIE} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" paddingAngle={2}>
                        {CHANNEL_PIE.map(e => <Cell key={e.name} fill={e.color} />)}
                      </Pie>
                      <Tooltip contentStyle={TOOLTIP_STYLE} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="w-full space-y-1.5">
                    {CHANNEL_PIE.map(d => (
                      <div key={d.name} className="flex items-center gap-2 text-xs">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: d.color }} />
                        <span className="text-muted-foreground flex-1">{d.name}</span>
                        <span className="font-semibold text-foreground">{d.value}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </ChartCard>
            </div>
          </div>
        )}

        {/* ══ INBOX ═════════════════════════════════════════════════════════ */}
        {tab === "inbox" && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard label="Total Replies" value={allMsgs.length || 9}
                icon={MessageCircle} iconBg="bg-primary/10" iconColor="text-primary" trend="+12%" />
              <KpiCard label="AI Auto-Sent" value={autoSentCount || 6}
                icon={Zap} iconBg="bg-green-100 dark:bg-green-900/20" iconColor="text-green-600"
                trend="+3" sub={`${Math.round(((autoSentCount||6)/((allMsgs.length||9)))*100)}% of replies`} />
              <KpiCard label="Pending Review" value={pendingCount}
                icon={Clock} iconBg="bg-yellow-100 dark:bg-yellow-900/20" iconColor="text-yellow-600" />
              <KpiCard label="Escalated" value={escalatedCount || 1}
                icon={TrendingDown} iconBg="bg-red-100 dark:bg-red-900/20" iconColor="text-red-600"
                trend="-2" trendInverse sub="low confidence" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <ChartCard title="Reply Volume" icon={TrendingUp} className="lg:col-span-2">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={msgData} barGap={2}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="autoSent"  name="AI Auto-Sent" fill="#22c55e" radius={[3,3,0,0]} />
                    <Bar dataKey="manual"    name="Human Review" fill="#94a3b8" radius={[3,3,0,0]} />
                    <Bar dataKey="escalated" name="Escalated"    fill="#f87171" radius={[3,3,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="AI Confidence Split" icon={Zap}>
                <div className="flex flex-col items-center gap-4">
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie data={confidencePie} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" paddingAngle={3}>
                        {confidencePie.map(e => <Cell key={e.name} fill={e.color} />)}
                      </Pie>
                      <Tooltip contentStyle={TOOLTIP_STYLE} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="w-full space-y-1.5">
                    {confidencePie.map(d => (
                      <div key={d.name} className="flex items-center gap-2 text-xs">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: d.color }} />
                        <span className="text-muted-foreground flex-1 truncate">{d.name}</span>
                        <span className="font-semibold text-foreground">{d.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </ChartCard>
            </div>

            <ChartCard title="Response Time Trend (minutes)" icon={Clock}>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={RESP_7D}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis domain={[0.5, 2.5]} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => [`${v} min`, "Avg Response"]} />
                  <Line type="monotone" dataKey="time" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4, fill: "hsl(var(--primary))" }} />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* Recent conversations */}
            <ChartCard title="Recent Conversations" icon={MessageSquare}>
              <div className="space-y-2">
                {conversations.slice(0, 6).map(conv => {
                  const lastMsg = conv.messages[conv.messages.length - 1];
                  const conf = lastMsg?.aiConfidence;
                  const confColor = conf === undefined ? "bg-muted text-muted-foreground"
                    : conf >= 0.85 ? "bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400"
                    : conf >= 0.50 ? "bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400"
                    : "bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400";
                  return (
                    <div key={conv.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/40">
                      <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground shrink-0">
                        {conv.contactName.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{conv.contactName}</p>
                        <p className="text-xs text-muted-foreground truncate">{conv.lastMessage}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {conf !== undefined && (
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${confColor}`}>
                            {Math.round(conf * 100)}%
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground capitalize px-2 py-0.5 bg-muted rounded-full">
                          {conv.status}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ChartCard>
          </div>
        )}

        {/* ══ CONTENT ═══════════════════════════════════════════════════════ */}
        {tab === "content" && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard label="Posts Published" value={postMetrics.length}
                icon={Eye} iconBg="bg-primary/10" iconColor="text-primary" trend="+3" />
              <KpiCard label="Total Reach" value={postMetrics.reduce((s,m)=>s+m.reach,0).toLocaleString()}
                icon={Users} iconBg="bg-blue-100 dark:bg-blue-900/20" iconColor="text-blue-600" trend="+22%" />
              <KpiCard label="Total Likes" value={postMetrics.reduce((s,m)=>s+m.likes,0).toLocaleString()}
                icon={Heart} iconBg="bg-pink-100 dark:bg-pink-900/20" iconColor="text-pink-600" trend="+14%" />
              <KpiCard label="Total Shares" value={postMetrics.reduce((s,m)=>s+m.shares,0).toLocaleString()}
                icon={Share2} iconBg="bg-green-100 dark:bg-green-900/20" iconColor="text-green-600" trend="+7%" />
            </div>

            {/* Post performance table */}
            {postMetrics.length > 0 ? (
              <ChartCard title="Post Performance" icon={BarChart2}>
                <div className="space-y-2">
                  {postMetrics.map((m, i) => (
                    <div key={m.postId + i} className="flex items-start gap-3 p-3 rounded-xl bg-muted/40 hover:bg-muted/70 transition-colors">
                      <div className="flex flex-col gap-1 mt-0.5 shrink-0">
                        {(m.postPlatforms ?? []).slice(0, 3).map(p => (
                          <div key={p} className={cn("w-2 h-2 rounded-full", PLATFORM_COLOR[p] ?? "bg-muted-foreground")} />
                        ))}
                      </div>
                      <p className="flex-1 text-xs text-foreground line-clamp-2 min-w-0">{m.postContent}</p>
                      <div className="flex items-center gap-4 shrink-0 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Heart className="w-3 h-3 text-red-400" />{m.likes.toLocaleString()}</span>
                        <span className="flex items-center gap-1"><MessageCircle className="w-3 h-3 text-blue-400" />{m.comments.toLocaleString()}</span>
                        <span className="flex items-center gap-1"><Eye className="w-3 h-3 text-purple-400" />{m.reach.toLocaleString()}</span>
                        <span className="flex items-center gap-1"><Share2 className="w-3 h-3 text-green-400" />{m.shares.toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </ChartCard>
            ) : (
              <div className="bg-card border border-border rounded-2xl p-12 text-center">
                <Eye className="w-8 h-8 text-muted-foreground/20 mx-auto mb-3" />
                <p className="text-sm font-medium text-foreground">No posts yet</p>
                <p className="text-xs text-muted-foreground mt-1">Publish content to see performance data here.</p>
              </div>
            )}

            {/* Engagement by platform */}
            <ChartCard title="Engagement by Platform" icon={TrendingUp}>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={[
                  { platform: "Instagram", likes: 1240, comments: 312, shares: 89 },
                  { platform: "TikTok",    likes: 4820, comments: 641, shares: 320 },
                  { platform: "Facebook",  likes: 380,  comments: 92,  shares: 41  },
                  { platform: "WhatsApp",  likes: 0,    comments: 280, shares: 0   },
                ]}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="platform" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="likes"    name="Likes"    fill="#f43f5e" radius={[3,3,0,0]} />
                  <Bar dataKey="comments" name="Comments" fill="hsl(var(--primary))" radius={[3,3,0,0]} />
                  <Bar dataKey="shares"   name="Shares"   fill="#22c55e" radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        )}

        {/* ══ LISTENING ═════════════════════════════════════════════════════ */}
        {tab === "listening" && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard label="Total Mentions" value={mentions.length || 10}
                icon={Radio} iconBg="bg-primary/10" iconColor="text-primary" trend="+8%" />
              <KpiCard label="Positive Sentiment" value={`${posRate || 62}%`}
                icon={CheckCircle2} iconBg="bg-green-100 dark:bg-green-900/20" iconColor="text-green-600" trend="+5%" />
              <KpiCard label="Negative Mentions" value={negMentions || 3}
                icon={TrendingDown} iconBg="bg-red-100 dark:bg-red-900/20" iconColor="text-red-600"
                trend="-2" trendInverse sub="this period" />
              <KpiCard label="Platforms Tracked" value={4}
                icon={Users} iconBg="bg-purple-100 dark:bg-purple-900/20" iconColor="text-purple-600" />
            </div>

            <ChartCard title="Sentiment Over Time" icon={TrendingUp}>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={SENTIMENT_7D}>
                  <defs>
                    <linearGradient id="gPos" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#22c55e" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gNeg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#ef4444" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 11 }} />
                  <Area type="monotone" dataKey="positive" name="Positive" stroke="#22c55e" fill="url(#gPos)" strokeWidth={2} />
                  <Area type="monotone" dataKey="neutral"  name="Neutral"  stroke="#94a3b8" fill="transparent" strokeWidth={2} strokeDasharray="4 2" />
                  <Area type="monotone" dataKey="negative" name="Negative" stroke="#ef4444" fill="url(#gNeg)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Mentions by Platform" icon={Radio}>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={MENTIONS_BY_PLATFORM} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis dataKey="platform" type="category" width={72} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Bar dataKey="mentions" name="Mentions" fill="hsl(var(--primary))" radius={[0,4,4,0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* Mention feed */}
            {mentions.length > 0 && (
              <ChartCard title="Recent Mentions" icon={MessageCircle}>
                <div className="space-y-2">
                  {mentions.slice(0, 5).map(m => (
                    <div key={m.id} className="flex items-start gap-3 p-3 rounded-xl bg-muted/40">
                      <span className={cn("mt-0.5 shrink-0 w-2 h-2 rounded-full",
                        m.sentiment === "positive" ? "bg-green-500" :
                        m.sentiment === "negative" ? "bg-red-500" : "bg-muted-foreground"
                      )} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground">{m.username}</p>
                        <p className="text-xs text-muted-foreground truncate">{m.content}</p>
                      </div>
                      <span className="text-[10px] text-muted-foreground capitalize shrink-0 px-2 py-0.5 bg-muted rounded-full">
                        {m.platform}
                      </span>
                    </div>
                  ))}
                </div>
              </ChartCard>
            )}
          </div>
        )}

        {/* ══ CAMPAIGNS ═════════════════════════════════════════════════════ */}
        {tab === "campaigns" && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard label="Total Sent" value={totalCampSent.toLocaleString()}
                icon={Send} iconBg="bg-primary/10" iconColor="text-primary" trend="+854" />
              <KpiCard label="Read Rate" value={`${readRate}%`}
                icon={Eye} iconBg="bg-blue-100 dark:bg-blue-900/20" iconColor="text-blue-600" trend="+3%" />
              <KpiCard label="Reply Rate" value={`${replyRate}%`}
                icon={MessageCircle} iconBg="bg-green-100 dark:bg-green-900/20" iconColor="text-green-600" trend="+2%" />
              <KpiCard label="Active Flows" value={activeFlows}
                icon={GitBranch} iconBg="bg-violet-100 dark:bg-violet-900/20" iconColor="text-violet-600"
                sub={`${totalTriggers} triggers total`} />
            </div>

            {/* Campaign breakdown */}
            <ChartCard title="Campaign Performance" icon={Megaphone}>
              {sentCampaigns.length > 0 ? (
                <div className="space-y-3">
                  {sentCampaigns.map(c => {
                    const rr = c.sentCount > 0 ? Math.round((c.readCount  / c.sentCount) * 100) : 0;
                    const rpr = c.sentCount > 0 ? Math.round((c.replyCount / c.sentCount) * 100) : 0;
                    return (
                      <div key={c.id} className="p-3 rounded-xl bg-muted/40 space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-foreground">{c.name}</p>
                          <span className="text-xs text-muted-foreground">{c.sentCount.toLocaleString()} sent</span>
                        </div>
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground w-12 shrink-0">Read</span>
                            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                              <div className="h-full bg-blue-500 rounded-full" style={{ width: `${rr}%` }} />
                            </div>
                            <span className="text-xs font-medium text-foreground w-8 text-right">{rr}%</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground w-12 shrink-0">Reply</span>
                            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                              <div className="h-full bg-green-500 rounded-full" style={{ width: `${rpr}%` }} />
                            </div>
                            <span className="text-xs font-medium text-foreground w-8 text-right">{rpr}%</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">No campaigns sent yet.</p>
              )}
            </ChartCard>

            {/* Flows */}
            <ChartCard title="Chatbot Flows" icon={GitBranch}>
              {flows.length > 0 ? (
                <div className="space-y-2">
                  {flows.map(f => (
                    <div key={f.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/40">
                      <span className={cn("w-2 h-2 rounded-full shrink-0", f.active ? "bg-green-500" : "bg-muted-foreground/30")} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{f.name}</p>
                        <p className="text-xs text-muted-foreground capitalize">{f.trigger} · {f.platform} · {f.steps.length} steps</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-foreground">{f.triggerCount}</p>
                        <p className="text-[10px] text-muted-foreground">triggers</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">No flows created yet.</p>
              )}
            </ChartCard>

            {/* Phone summary */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard label="SMS Sent"        value="128"  icon={Phone}         iconBg="bg-orange-100 dark:bg-orange-900/20" iconColor="text-orange-600" trend="+12%" />
              <KpiCard label="SMS Received"    value="94"   icon={MessageSquare} iconBg="bg-blue-100 dark:bg-blue-900/20"   iconColor="text-blue-600"   trend="+8%" />
              <KpiCard label="Calls Made"      value="34"   icon={Phone}         iconBg="bg-green-100 dark:bg-green-900/20" iconColor="text-green-600"  trend="+3" />
              <KpiCard label="Missed Calls"    value="5"    icon={TrendingDown}  iconBg="bg-red-100 dark:bg-red-900/20"    iconColor="text-red-600"    trend="-2" trendInverse />
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
