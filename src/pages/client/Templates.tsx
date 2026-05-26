import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import {
  Plus, Search, MessageSquare, Copy, Check, Pencil, Trash2,
  X, Loader2, ToggleLeft, ToggleRight,
} from "lucide-react";
import {
  useTemplates,
  useCreateTemplate,
  useUpdateTemplate,
  useDeleteTemplate,
} from "@/hooks/useTemplates";
import type { ReplyTemplate, Platform, LanguageType } from "@/types";
import { cn } from "@/lib/utils";

// ── Constants ─────────────────────────────────────────────────────────────────

const PLATFORMS: { key: Platform; label: string }[] = [
  { key: "instagram", label: "Instagram" },
  { key: "tiktok",    label: "TikTok" },
  { key: "facebook",  label: "Facebook" },
  { key: "whatsapp",  label: "WhatsApp" },
];

const PLATFORM_BADGE: Record<Platform, string> = {
  instagram: "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400",
  tiktok:    "bg-zinc-900 text-zinc-100 dark:bg-zinc-800 dark:text-zinc-200",
  facebook:  "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400",
  whatsapp:  "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400",
};

const LANGUAGE_OPTIONS: { key: LanguageType; label: string; short: string }[] = [
  { key: "en",    label: "English",   short: "EN" },
  { key: "ar",    label: "Arabic",    short: "AR" },
  { key: "ar_en", label: "Bilingual", short: "AR+EN" },
];

const LANGUAGE_BADGE: Record<LanguageType, string> = {
  en:    "bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400",
  ar:    "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400",
  ar_en: "bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400",
};

// ── Template Dialog ───────────────────────────────────────────────────────────

interface TemplateDialogProps {
  initial?: Partial<ReplyTemplate>;
  onSave: (data: Omit<ReplyTemplate, "id" | "createdAt">) => void;
  onClose: () => void;
  saving: boolean;
}

function TemplateDialog({ initial, onSave, onClose, saving }: TemplateDialogProps) {
  const [title, setTitle]       = useState(initial?.title ?? "");
  const [content, setContent]   = useState(initial?.content ?? "");
  const [platforms, setPlatforms] = useState<Platform[]>(initial?.platforms ?? ["instagram"]);
  const [language, setLanguage] = useState<LanguageType>(initial?.language ?? "en");
  const [active, setActive]     = useState(initial?.active ?? true);

  const togglePlatform = (p: Platform) =>
    setPlatforms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);

  const handleSave = () => {
    if (!title.trim() || !content.trim() || platforms.length === 0) return;
    onSave({ title: title.trim(), content: content.trim(), platforms, language, active });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-lg bg-card rounded-2xl border border-border shadow-xl p-6 space-y-4 max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-foreground">
            {initial?.id ? "Edit Template" : "New Template"}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Title */}
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-2">Title</label>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="e.g. How to Order"
            className="w-full px-3 py-2.5 text-sm rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        {/* Content */}
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-2">Content</label>
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            rows={5}
            placeholder="Write your reply template…"
            className="w-full px-3 py-2.5 text-sm rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
          />
          <p className="text-[11px] text-muted-foreground mt-1 text-right">{content.length} chars</p>
        </div>

        {/* Platforms */}
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-2">Platforms</label>
          <div className="flex flex-wrap gap-2">
            {PLATFORMS.map(p => (
              <label key={p.key} className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={platforms.includes(p.key)}
                  onChange={() => togglePlatform(p.key)}
                  className="w-3.5 h-3.5 accent-primary"
                />
                <span className="text-xs text-foreground">{p.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Language */}
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-2">Language</label>
          <select
            value={language}
            onChange={e => setLanguage(e.target.value as LanguageType)}
            className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            {LANGUAGE_OPTIONS.map(l => (
              <option key={l.key} value={l.key}>{l.label}</option>
            ))}
          </select>
        </div>

        {/* Active toggle */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setActive(a => !a)}
            className="text-muted-foreground hover:text-primary transition-colors"
          >
            {active
              ? <ToggleRight className="w-7 h-7 text-primary" />
              : <ToggleLeft className="w-7 h-7" />
            }
          </button>
          <span className="text-sm text-foreground">Active</span>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <button
            onClick={handleSave}
            disabled={saving || !title.trim() || !content.trim() || platforms.length === 0}
            className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white text-sm font-medium rounded-xl hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {saving
              ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…</>
              : <><Check className="w-3.5 h-3.5" /> Save Template</>
            }
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground rounded-xl hover:bg-muted transition-colors"
          >
            Cancel
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function Templates() {
  const { user } = useAuth();
  const { data: templates = [], isLoading } = useTemplates();
  const createTemplate = useCreateTemplate();
  const updateTemplate = useUpdateTemplate();
  const deleteTemplate = useDeleteTemplate();

  const [search, setSearch]             = useState("");
  const [platformFilter, setPlatformFilter] = useState<Platform | "all">("all");
  const [languageFilter, setLanguageFilter] = useState<LanguageType | "all">("all");
  const [dialogOpen, setDialogOpen]     = useState(false);
  const [editTemplate, setEditTemplate] = useState<ReplyTemplate | null>(null);
  const [copiedId, setCopiedId]         = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // ── Derived ────────────────────────────────────────────────────────────────

  const filtered = templates.filter(t => {
    const matchSearch =
      !search ||
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.content.toLowerCase().includes(search.toLowerCase());
    const matchPlatform =
      platformFilter === "all" || t.platforms.includes(platformFilter);
    const matchLanguage =
      languageFilter === "all" || t.language === languageFilter;
    return matchSearch && matchPlatform && matchLanguage;
  });

  const activeCount = templates.filter(t => t.active).length;
  const enCount     = templates.filter(t => t.language === "en").length;
  const arCount     = templates.filter(t => t.language === "ar").length;
  const biCount     = templates.filter(t => t.language === "ar_en").length;

  // ── Handlers ───────────────────────────────────────────────────────────────

  const openNew = () => {
    setEditTemplate(null);
    setDialogOpen(true);
  };

  const openEdit = (t: ReplyTemplate) => {
    setEditTemplate(t);
    setDialogOpen(true);
  };

  const handleSave = (data: Omit<ReplyTemplate, "id" | "createdAt">) => {
    if (editTemplate) {
      updateTemplate.mutate(
        { id: editTemplate.id, ...data },
        { onSuccess: () => setDialogOpen(false) },
      );
    } else {
      createTemplate.mutate(data, { onSuccess: () => setDialogOpen(false) });
    }
  };

  const handleCopy = async (t: ReplyTemplate) => {
    await navigator.clipboard.writeText(t.content);
    setCopiedId(t.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleToggleActive = (t: ReplyTemplate) => {
    updateTemplate.mutate({ id: t.id, active: !t.active });
  };

  const handleDelete = (id: string) => {
    deleteTemplate.mutate(id);
    setDeleteConfirmId(null);
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <AppLayout role="client" businessName={user?.businessName}>
      <div className="space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start justify-between"
        >
          <div>
            <h1 className="text-2xl font-bold text-foreground">Reply Templates</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Save common replies and insert them directly from the Inbox
            </p>
          </div>
          <button
            onClick={openNew}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-xl hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Template
          </button>
        </motion.div>

        {/* Stats chips */}
        <div className="flex flex-wrap gap-2">
          <span className="text-xs px-3 py-1.5 rounded-full bg-muted text-muted-foreground font-medium">
            {templates.length} total
          </span>
          <span className="text-xs px-3 py-1.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-medium">
            {activeCount} active
          </span>
          {enCount > 0 && (
            <span className={cn("text-xs px-3 py-1.5 rounded-full font-medium", LANGUAGE_BADGE.en)}>
              {enCount} EN
            </span>
          )}
          {arCount > 0 && (
            <span className={cn("text-xs px-3 py-1.5 rounded-full font-medium", LANGUAGE_BADGE.ar)}>
              {arCount} AR
            </span>
          )}
          {biCount > 0 && (
            <span className={cn("text-xs px-3 py-1.5 rounded-full font-medium", LANGUAGE_BADGE.ar_en)}>
              {biCount} Bilingual
            </span>
          )}
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search templates…"
            className="w-full h-10 pl-9 pr-3 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        {/* Platform filter chips */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setPlatformFilter("all")}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
              platformFilter === "all"
                ? "bg-primary text-white"
                : "bg-muted text-muted-foreground hover:text-foreground",
            )}
          >
            All Platforms
          </button>
          {PLATFORMS.map(p => (
            <button
              key={p.key}
              onClick={() => setPlatformFilter(p.key)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                platformFilter === p.key
                  ? "bg-primary text-white"
                  : "bg-muted text-muted-foreground hover:text-foreground",
              )}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Language filter chips */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setLanguageFilter("all")}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
              languageFilter === "all"
                ? "bg-primary text-white"
                : "bg-muted text-muted-foreground hover:text-foreground",
            )}
          >
            All Languages
          </button>
          {LANGUAGE_OPTIONS.map(l => (
            <button
              key={l.key}
              onClick={() => setLanguageFilter(l.key)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                languageFilter === l.key
                  ? "bg-primary text-white"
                  : "bg-muted text-muted-foreground hover:text-foreground",
              )}
            >
              {l.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-20" />
            <p className="text-sm font-medium">No templates yet</p>
            <p className="text-xs mt-1 opacity-70">Create your first reply template to get started</p>
            <button
              onClick={openNew}
              className="mt-4 flex items-center gap-1.5 px-4 py-2 bg-primary text-white text-sm font-medium rounded-xl mx-auto hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Create Template
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map((t, i) => (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="bg-card rounded-2xl border border-border p-4 space-y-3 flex flex-col"
              >
                {/* Title row */}
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-foreground leading-snug">{t.title}</p>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {/* Copy button */}
                    <button
                      onClick={() => handleCopy(t)}
                      title={copiedId === t.id ? "Copied!" : "Copy content"}
                      className={cn(
                        "p-1.5 rounded-lg transition-colors text-muted-foreground",
                        copiedId === t.id
                          ? "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20"
                          : "hover:bg-muted hover:text-foreground",
                      )}
                    >
                      {copiedId === t.id
                        ? <Check className="w-3.5 h-3.5" />
                        : <Copy className="w-3.5 h-3.5" />
                      }
                    </button>
                    {/* Edit button */}
                    <button
                      onClick={() => openEdit(t)}
                      className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    {/* Delete button */}
                    {deleteConfirmId === t.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleDelete(t.id)}
                          className="text-[11px] px-2 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                        >
                          Yes
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(null)}
                          className="text-[11px] px-2 py-1 bg-muted text-muted-foreground rounded-lg hover:text-foreground transition-colors"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirmId(t.id)}
                        className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-muted-foreground hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Content preview */}
                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3 flex-1">
                  {t.content}
                </p>

                {/* Badges + active toggle */}
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Platform badges */}
                  {t.platforms.map(p => (
                    <span
                      key={p}
                      className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium", PLATFORM_BADGE[p])}
                    >
                      {PLATFORMS.find(pl => pl.key === p)?.label ?? p}
                    </span>
                  ))}
                  {/* Language badge */}
                  <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium", LANGUAGE_BADGE[t.language])}>
                    {LANGUAGE_OPTIONS.find(l => l.key === t.language)?.short ?? t.language}
                  </span>

                  {/* Active toggle — pushed to right */}
                  <div className="ml-auto flex items-center gap-1.5">
                    <button
                      onClick={() => handleToggleActive(t)}
                      className="text-muted-foreground hover:text-primary transition-colors"
                      title={t.active ? "Disable template" : "Enable template"}
                    >
                      {t.active
                        ? <ToggleRight className="w-6 h-6 text-primary" />
                        : <ToggleLeft className="w-6 h-6" />
                      }
                    </button>
                    <span className="text-[11px] text-muted-foreground">
                      {t.active ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* New / Edit Dialog */}
      <AnimatePresence>
        {dialogOpen && (
          <TemplateDialog
            initial={editTemplate ?? {}}
            onSave={handleSave}
            onClose={() => setDialogOpen(false)}
            saving={createTemplate.isPending || updateTemplate.isPending}
          />
        )}
      </AnimatePresence>
    </AppLayout>
  );
}
