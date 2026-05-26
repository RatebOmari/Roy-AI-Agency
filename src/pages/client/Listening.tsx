import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import {
  useListeningKeywords,
  useCreateKeyword,
  useUpdateKeyword,
  useDeleteKeyword,
  useMentions,
} from "@/hooks/useListening";
import type { ListeningKeyword, Mention, MentionSentiment, Platform } from "@/types";
import {
  Plus,
  Radio,
  Trash2,
  X,
  ToggleLeft,
  ToggleRight,
  ExternalLink,
  MessageSquare,
  Send,
  ChevronDown,
} from "lucide-react";

// ── Platform config ────────────────────────────────────────────────────────────

const PLATFORM_COLORS: Record<Platform, string> = {
  instagram: "bg-pink-500",
  tiktok: "bg-black",
  facebook: "bg-blue-600",
  whatsapp: "bg-green-500",
};

const PLATFORM_LABELS: Record<Platform, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  facebook: "Facebook",
  whatsapp: "WhatsApp",
};

const ALL_PLATFORMS: Platform[] = ["instagram", "tiktok", "facebook", "whatsapp"];

// ── Sentiment config ───────────────────────────────────────────────────────────

const SENTIMENT_CONFIG: Record<
  MentionSentiment,
  { label: string; emoji: string; cls: string; tabCls: string }
> = {
  positive: {
    label: "Positive",
    emoji: "😊",
    cls: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400",
    tabCls: "text-green-600 dark:text-green-400 border-green-500",
  },
  neutral: {
    label: "Neutral",
    emoji: "😐",
    cls: "bg-muted text-muted-foreground",
    tabCls: "text-muted-foreground border-muted-foreground",
  },
  negative: {
    label: "Negative",
    emoji: "😞",
    cls: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400",
    tabCls: "text-red-600 dark:text-red-400 border-red-500",
  },
};

// ── Date filter helpers ────────────────────────────────────────────────────────

type DateRange = "24h" | "7d" | "30d";

const DATE_RANGE_LABELS: Record<DateRange, string> = {
  "24h": "Last 24h",
  "7d": "Last 7 days",
  "30d": "Last 30 days",
};

function isWithinRange(timestamp: string, range: DateRange): boolean {
  const ms = Date.now() - new Date(timestamp).getTime();
  const days = ms / 86_400_000;
  if (range === "24h") return days <= 1;
  if (range === "7d") return days <= 7;
  return days <= 30;
}

// ── Relative time ─────────────────────────────────────────────────────────────

function relativeTime(timestamp: string): string {
  const ms = Date.now() - new Date(timestamp).getTime();
  const mins = Math.floor(ms / 60_000);
  if (mins < 60) return mins <= 1 ? "just now" : `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "yesterday";
  return `${days}d ago`;
}

// ── Keyword highlighter ────────────────────────────────────────────────────────

function HighlightedContent({
  content,
  keyword,
}: {
  content: string;
  keyword: string;
}) {
  if (!keyword) return <span>{content}</span>;
  const parts = content.split(new RegExp(`(${keyword})`, "gi"));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === keyword.toLowerCase() ? (
          <strong key={i} className="font-semibold text-foreground">
            {part}
          </strong>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

// ── Mention card ──────────────────────────────────────────────────────────────

function MentionCard({ mention }: { mention: Mention }) {
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [replySent, setReplySent] = useState(false);
  const sentiment = SENTIMENT_CONFIG[mention.sentiment];

  const handleSendReply = () => {
    if (!replyText.trim()) return;
    setReplySent(true);
    setReplyText("");
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-4">
      {/* Top row: platform + user + time */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span
            className={`w-2.5 h-2.5 rounded-full shrink-0 ${PLATFORM_COLORS[mention.platform]}`}
          />
          <span className="text-xs font-medium text-muted-foreground">
            {PLATFORM_LABELS[mention.platform]}
          </span>
          <span className="text-xs text-foreground font-medium">{mention.username}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{relativeTime(mention.timestamp)}</span>
          {mention.url && (
            <a
              href={mention.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      </div>

      {/* Content */}
      <p className="text-sm text-muted-foreground leading-relaxed mb-3">
        <HighlightedContent content={mention.content} keyword={mention.keyword} />
      </p>

      {/* Bottom row: sentiment + keyword + reply */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${sentiment.cls}`}>
            {sentiment.emoji} {sentiment.label}
          </span>
          <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full">
            {mention.keyword}
          </span>
        </div>
        <button
          onClick={() => setReplyOpen((prev) => !prev)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-border rounded-lg text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors"
        >
          <MessageSquare className="w-3.5 h-3.5" />
          Reply
        </button>
      </div>

      {/* Inline reply */}
      {replyOpen && (
        <div className="mt-3 pt-3 border-t border-border">
          {replySent ? (
            <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400">
              <Send className="w-3.5 h-3.5" />
              Reply sent successfully
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendReply()}
                placeholder={`Reply to ${mention.username}...`}
                className="flex-1 px-3 py-1.5 bg-background border border-border rounded-lg text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              <button
                onClick={handleSendReply}
                disabled={!replyText.trim()}
                className="px-3 py-1.5 bg-primary text-white text-xs rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Listening() {
  const { user } = useAuth();

  const { data: keywords = [], isLoading: kwLoading } = useListeningKeywords();
  const { data: allMentions = [] } = useMentions();
  const createKeyword = useCreateKeyword();
  const updateKeyword = useUpdateKeyword();
  const deleteKeyword = useDeleteKeyword();

  // Keyword add form state
  const [newKeyword, setNewKeyword] = useState("");
  const [newPlatforms, setNewPlatforms] = useState<Platform[]>(["instagram", "tiktok"]);
  const [confirmDeleteKw, setConfirmDeleteKw] = useState<string | null>(null);

  // Mention filters
  const [sentimentFilter, setSentimentFilter] = useState<MentionSentiment | "all">("all");
  const [platformFilter, setPlatformFilter] = useState<Platform | "all">("all");
  const [dateRange, setDateRange] = useState<DateRange>("7d");

  // Compute stats (based on 7d)
  const recentMentions = allMentions.filter((m) => isWithinRange(m.timestamp, "7d"));
  const posCount = recentMentions.filter((m) => m.sentiment === "positive").length;
  const negCount = recentMentions.filter((m) => m.sentiment === "negative").length;
  const platformsMonitored = new Set(keywords.flatMap((k) => k.platforms)).size;

  // Filter mentions
  const filteredMentions = allMentions.filter((m) => {
    if (!isWithinRange(m.timestamp, dateRange)) return false;
    if (sentimentFilter !== "all" && m.sentiment !== sentimentFilter) return false;
    if (platformFilter !== "all" && m.platform !== platformFilter) return false;
    return true;
  });

  // Sentiment counts for filter tabs
  const sentimentCounts = {
    all: allMentions.filter((m) => isWithinRange(m.timestamp, dateRange)).length,
    positive: allMentions.filter(
      (m) => isWithinRange(m.timestamp, dateRange) && m.sentiment === "positive"
    ).length,
    neutral: allMentions.filter(
      (m) => isWithinRange(m.timestamp, dateRange) && m.sentiment === "neutral"
    ).length,
    negative: allMentions.filter(
      (m) => isWithinRange(m.timestamp, dateRange) && m.sentiment === "negative"
    ).length,
  };

  const toggleNewPlatform = (p: Platform) => {
    setNewPlatforms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    );
  };

  const handleAddKeyword = () => {
    if (!newKeyword.trim() || newPlatforms.length === 0) return;
    createKeyword.mutate({ keyword: newKeyword.trim(), platforms: newPlatforms, active: true });
    setNewKeyword("");
    setNewPlatforms(["instagram", "tiktok"]);
  };

  const handleToggleKeyword = (kw: ListeningKeyword) => {
    updateKeyword.mutate({ id: kw.id, active: !kw.active });
  };

  const handleDeleteKeyword = (id: string) => {
    deleteKeyword.mutate(id);
    setConfirmDeleteKw(null);
  };

  const posPercent =
    recentMentions.length > 0 ? Math.round((posCount / recentMentions.length) * 100) : 0;
  const negPercent =
    recentMentions.length > 0 ? Math.round((negCount / recentMentions.length) * 100) : 0;

  return (
    <AppLayout role="client" businessName={user?.businessName}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Social Listening</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Track brand mentions and respond instantly
            </p>
          </div>
        </div>

        {/* Stats bar */}
        <div className="flex flex-wrap gap-3">
          {[
            { label: "Mentions (7d)", value: recentMentions.length },
            {
              label: "Positive",
              value: `${posPercent}%`,
              cls: "text-green-600 dark:text-green-400",
            },
            {
              label: "Negative",
              value: `${negPercent}%`,
              cls: "text-red-600 dark:text-red-400",
            },
            { label: "Platforms Monitored", value: platformsMonitored },
          ].map((stat) => (
            <div
              key={stat.label}
              className="flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-2xl"
            >
              <span className={`text-lg font-bold ${stat.cls ?? "text-foreground"}`}>
                {stat.value}
              </span>
              <span className="text-xs text-muted-foreground">{stat.label}</span>
            </div>
          ))}
        </div>

        {/* Two-panel layout */}
        <div className="flex gap-5 items-start">
          {/* ── Left: Keywords sidebar ─────────────────────────────────────────── */}
          <div className="w-72 shrink-0 bg-card border border-border rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h3 className="text-sm font-semibold text-foreground">Tracked Keywords</h3>
              <span className="text-xs px-2 py-0.5 bg-muted rounded-full text-muted-foreground">
                {keywords.length}
              </span>
            </div>

            {/* Keyword list */}
            <div className="divide-y divide-border">
              {kwLoading ? (
                <div className="p-4 space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-14 bg-muted rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : keywords.length === 0 ? (
                <div className="p-6 text-center">
                  <Radio className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">No keywords yet</p>
                </div>
              ) : (
                keywords.map((kw) => (
                  <div key={kw.id} className="px-4 py-3">
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <p className="text-sm font-medium text-foreground leading-tight flex-1 min-w-0 truncate">
                        {kw.keyword}
                      </p>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleToggleKeyword(kw)}
                          className="text-muted-foreground hover:text-primary transition-colors"
                        >
                          {kw.active ? (
                            <ToggleRight className="w-5 h-5 text-primary" />
                          ) : (
                            <ToggleLeft className="w-5 h-5" />
                          )}
                        </button>
                        {confirmDeleteKw === kw.id ? (
                          <div className="flex items-center gap-0.5">
                            <button
                              onClick={() => handleDeleteKeyword(kw.id)}
                              className="p-1 text-red-500 hover:text-red-600 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setConfirmDeleteKw(null)}
                              className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmDeleteKw(kw.id)}
                            className="p-1 text-muted-foreground hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        {kw.platforms.map((p) => (
                          <span
                            key={p}
                            title={PLATFORM_LABELS[p]}
                            className={`w-2 h-2 rounded-full ${PLATFORM_COLORS[p]}`}
                          />
                        ))}
                      </div>
                      <span className="text-xs px-1.5 py-0.5 bg-primary/10 text-primary rounded-full">
                        {kw.mentionCount}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Add keyword form */}
            <div className="px-4 py-3 border-t border-border space-y-2">
              <input
                type="text"
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddKeyword()}
                placeholder="Add keyword..."
                className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              <div className="flex flex-wrap gap-1">
                {ALL_PLATFORMS.map((p) => (
                  <button
                    key={p}
                    onClick={() => toggleNewPlatform(p)}
                    className={`flex items-center gap-1 px-2 py-0.5 text-[10px] rounded-full border transition-colors ${
                      newPlatforms.includes(p)
                        ? "bg-primary/10 border-primary/30 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/30"
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${PLATFORM_COLORS[p]}`} />
                    {PLATFORM_LABELS[p]}
                  </button>
                ))}
              </div>
              <button
                onClick={handleAddKeyword}
                disabled={!newKeyword.trim() || newPlatforms.length === 0}
                className="flex items-center gap-1.5 w-full justify-center px-3 py-1.5 bg-primary text-white text-xs rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Keyword
              </button>
            </div>
          </div>

          {/* ── Right: Mentions feed ────────────────────────────────────────────── */}
          <div className="flex-1 min-w-0 space-y-4">
            {/* Filter row */}
            <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
              {/* Sentiment tabs */}
              <div className="flex items-center gap-1 flex-wrap">
                {(["all", "positive", "neutral", "negative"] as const).map((s) => {
                  const isActive = sentimentFilter === s;
                  const cfg = s !== "all" ? SENTIMENT_CONFIG[s] : null;
                  return (
                    <button
                      key={s}
                      onClick={() => setSentimentFilter(s)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg font-medium border transition-colors ${
                        isActive
                          ? s === "all"
                            ? "bg-primary text-white border-primary"
                            : `${cfg?.cls} border-current`
                          : "border-border text-muted-foreground hover:border-primary/30 hover:text-foreground"
                      }`}
                    >
                      {cfg && <span>{cfg.emoji}</span>}
                      {s === "all" ? "All" : cfg?.label}
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                          isActive ? "bg-white/20" : "bg-muted"
                        }`}
                      >
                        {sentimentCounts[s]}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Platform + date filters */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Platform chips */}
                <div className="flex items-center gap-1 flex-wrap">
                  <button
                    onClick={() => setPlatformFilter("all")}
                    className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                      platformFilter === "all"
                        ? "bg-primary text-white border-primary"
                        : "border-border text-muted-foreground hover:border-primary/30"
                    }`}
                  >
                    All
                  </button>
                  {ALL_PLATFORMS.map((p) => (
                    <button
                      key={p}
                      onClick={() => setPlatformFilter(p)}
                      className={`flex items-center gap-1.5 px-3 py-1 text-xs rounded-full border transition-colors ${
                        platformFilter === p
                          ? "bg-primary text-white border-primary"
                          : "border-border text-muted-foreground hover:border-primary/30"
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${PLATFORM_COLORS[p]}`} />
                      {PLATFORM_LABELS[p]}
                    </button>
                  ))}
                </div>

                {/* Date range */}
                <div className="ml-auto relative">
                  <select
                    value={dateRange}
                    onChange={(e) => setDateRange(e.target.value as DateRange)}
                    className="appearance-none pl-3 pr-8 py-1.5 bg-background border border-border rounded-lg text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  >
                    {(Object.keys(DATE_RANGE_LABELS) as DateRange[]).map((r) => (
                      <option key={r} value={r}>
                        {DATE_RANGE_LABELS[r]}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Feed */}
            {filteredMentions.length === 0 ? (
              <div className="bg-card border border-border rounded-2xl p-12 text-center">
                <Radio className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
                <p className="font-medium text-foreground">No mentions found</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Try adjusting your filters or adding new keywords to track.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredMentions.map((mention) => (
                  <MentionCard key={mention.id} mention={mention} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
