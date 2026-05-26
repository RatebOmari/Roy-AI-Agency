import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  CalendarDays, List, Sparkles, Plus, Pencil, Trash2,
  Loader2, ChevronLeft, ChevronRight, X, CheckCircle2,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useScheduledPosts, useCreatePost, useUpdatePost, useDeletePost, useGeneratePost } from "@/hooks/useContent";
import type { ScheduledPost, Platform, ToneType, PostStatus } from "@/types";
import { cn } from "@/lib/utils";

// ── Constants ─────────────────────────────────────────────────────────────────

const PLATFORMS: { key: Platform; label: string; color: string }[] = [
  { key: "instagram", label: "Instagram", color: "bg-gradient-to-br from-purple-500 to-pink-500" },
  { key: "tiktok",    label: "TikTok",    color: "bg-black" },
  { key: "facebook",  label: "Facebook",  color: "bg-blue-600" },
  { key: "whatsapp",  label: "WhatsApp",  color: "bg-green-500" },
];

const PLATFORM_COLOR: Record<Platform, string> = {
  instagram: "bg-gradient-to-br from-purple-500 to-pink-500",
  tiktok:    "bg-black",
  facebook:  "bg-blue-600",
  whatsapp:  "bg-green-500",
};

const STATUS_STYLE: Record<PostStatus, string> = {
  draft:     "bg-muted text-muted-foreground",
  scheduled: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400",
  published: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400",
  failed:    "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400",
};

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function formatDate(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

// ── New Post Dialog ───────────────────────────────────────────────────────────

interface PostDialogProps {
  initial?: Partial<ScheduledPost>;
  onSave: (data: Omit<ScheduledPost, "id" | "createdAt">) => void;
  onClose: () => void;
  saving: boolean;
}

function PostDialog({ initial, onSave, onClose, saving }: PostDialogProps) {
  const [platforms, setPlatforms] = useState<Platform[]>(initial?.platforms ?? ["instagram"]);
  const [content, setContent]     = useState(initial?.content ?? "");
  const [scheduledAt, setScheduledAt] = useState(
    initial?.scheduledAt ? initial.scheduledAt.slice(0, 16) : ""
  );
  const [status, setStatus] = useState<PostStatus>(initial?.status ?? "scheduled");

  const toggle = (p: Platform) =>
    setPlatforms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);

  const handleSave = () => {
    if (!content.trim() || platforms.length === 0) return;
    onSave({
      platforms,
      content: content.trim(),
      scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
      status,
      aiGenerated: initial?.aiGenerated ?? false,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-lg bg-card rounded-2xl border border-border shadow-xl p-6 space-y-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-foreground">{initial?.id ? "Edit Post" : "New Post"}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Platform selector */}
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">Platforms</p>
          <div className="flex gap-2 flex-wrap">
            {PLATFORMS.map(p => (
              <button
                key={p.key}
                onClick={() => toggle(p.key)}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-medium transition-all border",
                  platforms.includes(p.key)
                    ? "bg-primary text-white border-primary"
                    : "border-border text-muted-foreground hover:border-primary/50"
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">Caption</p>
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            rows={4}
            placeholder="Write your post caption…"
            className="w-full px-3 py-2.5 text-sm rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
          />
          <p className="text-[11px] text-muted-foreground mt-1 text-right">{content.length} chars</p>
        </div>

        {/* Schedule */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Schedule Date & Time</p>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={e => setScheduledAt(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Status</p>
            <select
              value={status}
              onChange={e => setStatus(e.target.value as PostStatus)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="draft">Draft</option>
              <option value="scheduled">Scheduled</option>
            </select>
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          <button
            onClick={handleSave}
            disabled={saving || !content.trim() || platforms.length === 0}
            className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white text-sm font-medium rounded-xl hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
            {initial?.id ? "Save Changes" : "Add to Queue"}
          </button>
          <button onClick={onClose} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground rounded-xl hover:bg-muted transition-colors">
            Cancel
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Queue Tab ─────────────────────────────────────────────────────────────────

function QueueTab({ posts, onEdit, onDelete, onNew }: {
  posts: ScheduledPost[];
  onEdit: (p: ScheduledPost) => void;
  onDelete: (id: string) => void;
  onNew: () => void;
}) {
  const [platformFilter, setPlatformFilter] = useState<Platform | "all">("all");
  const filtered = platformFilter === "all"
    ? posts
    : posts.filter(p => p.platforms.includes(platformFilter));
  const sorted = [...filtered].sort((a, b) =>
    (a.scheduledAt ?? "zzz").localeCompare(b.scheduledAt ?? "zzz")
  );

  return (
    <div className="space-y-4">
      {/* Platform filter */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setPlatformFilter("all")}
          className={cn("px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
            platformFilter === "all" ? "bg-primary text-white" : "bg-muted text-muted-foreground hover:text-foreground"
          )}
        >
          All
        </button>
        {PLATFORMS.map(p => (
          <button
            key={p.key}
            onClick={() => setPlatformFilter(p.key)}
            className={cn("px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
              platformFilter === p.key ? "bg-primary text-white" : "bg-muted text-muted-foreground hover:text-foreground"
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      {sorted.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <CalendarDays className="w-10 h-10 mx-auto mb-3 opacity-20" />
          <p className="text-sm font-medium">No posts yet</p>
          <p className="text-xs mt-1 opacity-70">Schedule your first post to get started</p>
          <button
            onClick={onNew}
            className="mt-4 flex items-center gap-1.5 px-4 py-2 bg-primary text-white text-sm font-medium rounded-xl mx-auto hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Create Post
          </button>
        </div>
      ) : (
        sorted.map((post, i) => (
          <motion.div
            key={post.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className="bg-card rounded-2xl border border-border p-4 flex items-start gap-3"
          >
            {/* Platform dots */}
            <div className="flex flex-col gap-1 mt-0.5 flex-shrink-0">
              {post.platforms.map(p => (
                <div key={p} className={cn("w-2.5 h-2.5 rounded-full", PLATFORM_COLOR[p])} title={p} />
              ))}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full", STATUS_STYLE[post.status])}>
                  {post.status}
                </span>
                {post.aiGenerated && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium flex items-center gap-1">
                    <Sparkles className="w-2.5 h-2.5" /> AI
                  </span>
                )}
                <span className="text-[11px] text-muted-foreground ml-auto">{formatDate(post.scheduledAt)}</span>
              </div>
              <p className="text-sm text-foreground leading-relaxed line-clamp-2">{post.content}</p>
              <div className="flex items-center gap-1 mt-2 flex-wrap">
                {post.platforms.map(p => (
                  <span key={p} className="text-[10px] px-2 py-0.5 rounded bg-muted text-muted-foreground">
                    {PLATFORMS.find(pl => pl.key === p)?.label ?? p}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={() => onEdit(post)}
                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onDelete(post.id)}
                className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-muted-foreground hover:text-red-600 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        ))
      )}
    </div>
  );
}

// ── Calendar Tab ──────────────────────────────────────────────────────────────

function CalendarTab({ posts, onNew }: { posts: ScheduledPost[]; onNew: (date?: string) => void }) {
  const today = new Date();
  const [year, setYear]   = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = Array.from({ length: firstDay + daysInMonth }, (_, i) =>
    i < firstDay ? null : i - firstDay + 1
  );

  const postsForDay = (day: number) => posts.filter(p => {
    if (!p.scheduledAt) return false;
    const d = new Date(p.scheduledAt);
    return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
  });

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); setSelectedDay(null); };
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); setSelectedDay(null); };

  const selectedPosts = selectedDay ? postsForDay(selectedDay) : [];

  return (
    <div className="space-y-4">
      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <h3 className="font-semibold text-foreground">{MONTHS[month]} {year}</h3>
        <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Grid */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-border">
          {DAYS.map(d => (
            <div key={d} className="py-2 text-center text-[11px] font-medium text-muted-foreground">{d}</div>
          ))}
        </div>
        {/* Cells */}
        <div className="grid grid-cols-7">
          {cells.map((day, i) => {
            if (!day) return <div key={i} className="h-16 border-b border-r border-border/50 last:border-r-0" />;
            const dayPosts = postsForDay(day);
            const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
            const isSelected = selectedDay === day;
            return (
              <button
                key={i}
                onClick={() => setSelectedDay(isSelected ? null : day)}
                className={cn(
                  "h-16 p-1.5 border-b border-r border-border/50 last:border-r-0 text-left transition-colors hover:bg-muted/50 flex flex-col",
                  isSelected && "bg-primary/5 border-primary/30"
                )}
              >
                <span className={cn(
                  "text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full",
                  isToday ? "bg-primary text-white" : "text-foreground"
                )}>
                  {day}
                </span>
                <div className="flex flex-wrap gap-0.5 mt-0.5">
                  {dayPosts.slice(0, 3).map(p => (
                    p.platforms.slice(0, 1).map(pl => (
                      <span key={p.id + pl} className={cn("w-1.5 h-1.5 rounded-full", PLATFORM_COLOR[pl])} />
                    ))
                  ))}
                  {dayPosts.length > 3 && <span className="text-[9px] text-muted-foreground">+{dayPosts.length - 3}</span>}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected day detail */}
      <AnimatePresence>
        {selectedDay && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="bg-card rounded-2xl border border-border p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-foreground text-sm">{MONTHS[month]} {selectedDay}</h4>
              <button
                onClick={() => onNew(new Date(year, month, selectedDay, 10).toISOString())}
                className="flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <Plus className="w-3 h-3" /> Add post
              </button>
            </div>
            {selectedPosts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No posts scheduled for this day.</p>
            ) : (
              selectedPosts.map(p => (
                <div key={p.id} className="flex items-start gap-2 p-2 bg-muted/50 rounded-xl">
                  <div className="flex gap-1 mt-1">
                    {p.platforms.map(pl => <span key={pl} className={cn("w-2 h-2 rounded-full flex-shrink-0", PLATFORM_COLOR[pl])} />)}
                  </div>
                  <p className="text-xs text-foreground line-clamp-2">{p.content}</p>
                </div>
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── AI Generate Tab ───────────────────────────────────────────────────────────

function GenerateTab({ onAddToQueue }: { onAddToQueue: (content: string, platform: Platform) => void }) {
  const [prompt, setPrompt]     = useState("");
  const [platform, setPlatform] = useState<Platform>("instagram");
  const [tone, setTone]         = useState<ToneType>("friendly");
  const generateMutation = useGeneratePost();

  const handleGenerate = () => {
    if (!prompt.trim()) return;
    generateMutation.mutate({ prompt: prompt.trim(), platform, tone });
  };

  const result = generateMutation.data;

  return (
    <div className="max-w-2xl space-y-5">
      <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 text-sm text-foreground">
        <p className="font-medium flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" /> AI Content Generator
        </p>
        <p className="text-muted-foreground text-xs mt-1">
          Describe what you want to post about and the AI will write a caption optimized for your chosen platform and tone.
          In production, the AI also reads your Resources (menu, offers, hours) for context.
        </p>
      </div>

      {/* Prompt */}
      <div>
        <label className="text-xs font-medium text-muted-foreground block mb-2">What do you want to post about?</label>
        <textarea
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          rows={3}
          placeholder="e.g. Our new weekend brunch menu launching this Saturday…"
          className="w-full px-4 py-3 text-sm rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
        />
      </div>

      {/* Options */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-2">Platform</label>
          <div className="flex flex-wrap gap-2">
            {PLATFORMS.map(p => (
              <button
                key={p.key}
                onClick={() => setPlatform(p.key)}
                className={cn("px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors",
                  platform === p.key ? "bg-primary text-white border-primary" : "border-border text-muted-foreground hover:border-primary/50"
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-2">Tone</label>
          <div className="flex flex-wrap gap-2">
            {(["friendly","professional","fun","informative"] as ToneType[]).map(t => (
              <button
                key={t}
                onClick={() => setTone(t)}
                className={cn("px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors capitalize",
                  tone === t ? "bg-primary text-white border-primary" : "border-border text-muted-foreground hover:border-primary/50"
                )}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      <button
        onClick={handleGenerate}
        disabled={!prompt.trim() || generateMutation.isPending}
        className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-sm font-medium rounded-xl hover:bg-primary/90 disabled:opacity-50 transition-colors"
      >
        {generateMutation.isPending
          ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating…</>
          : <><Sparkles className="w-4 h-4" /> Generate Caption</>
        }
      </button>

      {/* Result */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-2xl border border-border p-5 space-y-3"
          >
            <p className="text-xs font-medium text-muted-foreground">Generated Caption</p>
            <p className="text-sm text-foreground leading-relaxed">{result.caption}</p>
            {result.hashtags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {result.hashtags.map(tag => (
                  <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">{tag}</span>
                ))}
              </div>
            )}
            <button
              onClick={() => onAddToQueue(result.caption + "\n\n" + result.hashtags.join(" "), platform)}
              className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white text-sm font-medium rounded-xl hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Add to Queue
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

type Tab = "queue" | "calendar" | "generate";

export default function Content() {
  const { user } = useAuth();
  const { data: posts = [], isLoading } = useScheduledPosts();
  const createPost  = useCreatePost();
  const updatePost  = useUpdatePost();
  const deletePost  = useDeletePost();

  const [activeTab, setActiveTab] = useState<Tab>("queue");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editPost, setEditPost]     = useState<ScheduledPost | null>(null);
  const [prefillContent, setPrefillContent] = useState("");
  const [prefillPlatform, setPrefillPlatform] = useState<Platform | null>(null);
  const [prefillDate, setPrefillDate] = useState<string | undefined>();

  const openNew = (date?: string) => {
    setEditPost(null);
    setPrefillContent("");
    setPrefillPlatform(null);
    setPrefillDate(date);
    setDialogOpen(true);
  };

  const openEdit = (p: ScheduledPost) => {
    setEditPost(p);
    setPrefillContent("");
    setPrefillPlatform(null);
    setPrefillDate(undefined);
    setDialogOpen(true);
  };

  const handleSave = (data: Omit<ScheduledPost, "id" | "createdAt">) => {
    if (editPost) {
      updatePost.mutate({ id: editPost.id, ...data }, { onSuccess: () => setDialogOpen(false) });
    } else {
      createPost.mutate(data, { onSuccess: () => setDialogOpen(false) });
    }
  };

  const TABS: { key: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { key: "queue",    label: "Queue",       icon: List },
    { key: "calendar", label: "Calendar",    icon: CalendarDays },
    { key: "generate", label: "AI Generate", icon: Sparkles },
  ];

  return (
    <AppLayout role="client" businessName={user?.businessName}>
      <div className="space-y-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Content</h1>
            <p className="text-sm text-muted-foreground mt-1">Schedule and generate posts for your social channels</p>
          </div>
          <button
            onClick={() => openNew()}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-xl hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" /> New Post
          </button>
        </motion.div>

        {/* Tabs */}
        <div className="flex bg-muted p-1 rounded-xl w-fit gap-1">
          {TABS.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                  activeTab === tab.key
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {activeTab === "queue" && (
              <QueueTab posts={posts} onEdit={openEdit} onDelete={id => deletePost.mutate(id)} onNew={() => openNew()} />
            )}
            {activeTab === "calendar" && (
              <CalendarTab posts={posts} onNew={openNew} />
            )}
            {activeTab === "generate" && (
              <GenerateTab
                onAddToQueue={(content, platform) => {
                  setPrefillContent(content);
                  setPrefillPlatform(platform);
                  setEditPost(null);
                  setPrefillDate(undefined);
                  setDialogOpen(true);
                }}
              />
            )}
          </>
        )}
      </div>

      {/* New/Edit Post Dialog */}
      <AnimatePresence>
        {dialogOpen && (
          <PostDialog
            initial={editPost ?? {
              content:    prefillContent,
              platforms:  prefillPlatform ? [prefillPlatform] : ["instagram"],
              scheduledAt: prefillDate,
            }}
            onSave={handleSave}
            onClose={() => setDialogOpen(false)}
            saving={createPost.isPending || updatePost.isPending}
          />
        )}
      </AnimatePresence>
    </AppLayout>
  );
}
