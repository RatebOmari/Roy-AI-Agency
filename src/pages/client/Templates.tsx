import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import {
  Plus, Search, MessageSquare, Copy, Check, Pencil, Trash2,
  X, Loader2, ToggleLeft, ToggleRight, SortAsc, Hash,
  ChevronDown, CopyPlus, Eye, Sparkles,
} from "lucide-react";
import {
  useTemplates,
  useCreateTemplate,
  useUpdateTemplate,
  useDeleteTemplate,
} from "@/hooks/useTemplates";
import type { ReplyTemplate, Platform, LanguageType } from "@/types";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";

// ── Constants ─────────────────────────────────────────────────────────────────

const PLATFORMS: { key: Platform; label: string }[] = [
  { key: "instagram", label: "Instagram" },
  { key: "tiktok",    label: "TikTok" },
  { key: "facebook",  label: "Facebook" },
  { key: "whatsapp",  label: "WhatsApp" },
];

const PLATFORM_BADGE: Record<string, string> = {
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

const CATEGORIES: { key: string; label: string }[] = [
  { key: "greeting",  label: "Greeting"  },
  { key: "faq",       label: "FAQ"       },
  { key: "order",     label: "Order"     },
  { key: "complaint", label: "Complaint" },
  { key: "info",      label: "Info"      },
  { key: "promo",     label: "Promo"     },
  { key: "follow-up", label: "Follow-up" },
];

type SortKey = "newest" | "used" | "az";

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "newest", label: "Newest" },
  { key: "used",   label: "Most Used" },
  { key: "az",     label: "A–Z" },
];

const QUICK_VARS = ["{{name}}", "{{handle}}", "{{channel}}"] as const;

// ── Variable chip ─────────────────────────────────────────────────────────────

function VariableChips({ content }: { content: string }) {
  const vars = Array.from(content.matchAll(/\{\{(\w+)\}\}/g)).map(m => m[1]);
  const unique = [...new Set(vars)];
  if (unique.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {unique.map(v => (
        <span key={v} className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-mono">
          {`{{${v}}}`}
        </span>
      ))}
    </div>
  );
}

// ── Inline variable highlighter (for preview modal) ───────────────────────────

function HighlightedContent({ content }: { content: string }) {
  const parts = content.split(/(\{\{\w+\}\})/g);
  return (
    <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
      {parts.map((part, i) => {
        const match = part.match(/^\{\{(\w+)\}\}$/);
        if (match) {
          return (
            <span
              key={i}
              className="inline-block px-1.5 py-0.5 rounded bg-primary/15 text-primary font-mono text-xs mx-0.5 align-middle"
            >
              {part}
            </span>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </p>
  );
}

// ── Preview Modal ─────────────────────────────────────────────────────────────

interface PreviewModalProps {
  template: ReplyTemplate;
  onClose: () => void;
  onEdit: (t: ReplyTemplate) => void;
}

function PreviewModal({ template: t, onClose, onEdit }: PreviewModalProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(t.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-xl bg-card rounded-2xl border border-border shadow-2xl p-6 space-y-5 max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold text-foreground leading-snug">{t.title}</h2>
            {t.category && (
              <span className="text-xs text-muted-foreground">
                {CATEGORIES.find(c => c.key === t.category)?.label ?? t.category}
              </span>
            )}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground flex-shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Full content with variable highlighting */}
        <div className="rounded-xl border border-border bg-muted/30 p-4">
          <HighlightedContent content={t.content} />
        </div>

        {/* Badges row */}
        <div className="flex flex-wrap gap-2 items-center">
          {t.platforms.map(p => (
            <span key={p} className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium", PLATFORM_BADGE[p] ?? "bg-muted text-muted-foreground")}>
              {PLATFORMS.find(pl => pl.key === p)?.label ?? p}
            </span>
          ))}
          <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium", LANGUAGE_BADGE[t.language])}>
            {LANGUAGE_OPTIONS.find(l => l.key === t.language)?.short ?? t.language}
          </span>
          {t.category && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
              {CATEGORIES.find(c => c.key === t.category)?.label ?? t.category}
            </span>
          )}
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Hash className="w-3 h-3" />
            {t.usedCount ?? 0} uses
          </span>
          <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-medium", t.active ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400" : "bg-muted text-muted-foreground")}>
            {t.active ? "Active" : "Inactive"}
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-1 border-t border-border">
          <button
            onClick={handleCopy}
            className={cn("flex items-center gap-1.5 px-3 py-2 text-sm rounded-xl border transition-colors",
              copied ? "border-green-500 text-green-600 bg-green-50 dark:bg-green-900/20" : "border-border hover:bg-muted text-foreground")}
          >
            {copied ? <><Check className="w-3.5 h-3.5" /> Copied!</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
          </button>
          <button
            onClick={() => { onEdit(t); onClose(); }}
            className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-xl bg-primary text-white hover:bg-primary/90 transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" /> Edit
          </button>
          <button onClick={onClose} className="ml-auto px-3 py-2 text-sm text-muted-foreground hover:text-foreground rounded-xl hover:bg-muted transition-colors">
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Template Dialog ───────────────────────────────────────────────────────────

interface TemplateDialogProps {
  initial?: Partial<ReplyTemplate>;
  onSave: (data: Omit<ReplyTemplate, "id" | "createdAt" | "usedCount">) => void;
  onClose: () => void;
  saving: boolean;
}

function TemplateDialog({ initial, onSave, onClose, saving }: TemplateDialogProps) {
  const [title, setTitle]         = useState(initial?.title ?? "");
  const [content, setContent]     = useState(initial?.content ?? "");
  const [platforms, setPlatforms] = useState<Platform[]>(initial?.platforms ?? ["instagram"]);
  const [language, setLanguage]   = useState<LanguageType>(initial?.language ?? "en");
  const [category, setCategory]   = useState<string>(initial?.category ?? "");
  const [active, setActive]       = useState(initial?.active ?? true);

  // AI generate state
  const [aiDesc, setAiDesc]           = useState("");
  const [aiLoading, setAiLoading]     = useState(false);
  const [aiError, setAiError]         = useState("");

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const togglePlatform = (p: Platform) =>
    setPlatforms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);

  const handleSave = () => {
    if (!title.trim() || !content.trim() || platforms.length === 0) return;
    onSave({ title: title.trim(), content: content.trim(), platforms, language, category, active });
  };

  const charLimit = platforms.includes("tiktok") ? 150 : platforms.includes("instagram") ? 2200 : 4096;
  const over = content.length > charLimit;
  const charPct = Math.min((content.length / charLimit) * 100, 100);

  const insertVar = useCallback((varText: string) => {
    const el = textareaRef.current;
    if (!el) {
      setContent(prev => prev + varText);
      return;
    }
    const start = el.selectionStart ?? content.length;
    const end   = el.selectionEnd   ?? content.length;
    const newContent = content.slice(0, start) + varText + content.slice(end);
    setContent(newContent);
    // Restore cursor position after React re-render
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + varText.length;
      el.setSelectionRange(pos, pos);
    });
  }, [content]);

  const handleAiGenerate = async () => {
    if (!aiDesc.trim()) return;
    setAiLoading(true);
    setAiError("");
    try {
      const result = await api.post<{ title: string; content: string }>("/templates/generate", {
        description: aiDesc.trim(),
        platforms,
        language,
      });
      if (result.title) setTitle(result.title);
      if (result.content) setContent(result.content);
    } catch {
      setAiError("AI generation failed. Please try again.");
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-lg bg-card rounded-2xl border border-border shadow-xl p-6 space-y-4 max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-foreground">
            {initial?.id ? "Edit Template" : "New Template"}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* AI Generate Section */}
        <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            AI Generate
          </div>
          <div className="flex gap-2">
            <input
              value={aiDesc}
              onChange={e => setAiDesc(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") handleAiGenerate(); }}
              placeholder="Describe what this template should do…"
              className="flex-1 px-3 py-2 text-xs rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <button
              onClick={handleAiGenerate}
              disabled={aiLoading || !aiDesc.trim()}
              className="flex items-center gap-1.5 px-3 py-2 bg-primary text-white text-xs font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors whitespace-nowrap"
            >
              {aiLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              Generate
            </button>
          </div>
          {aiError && <p className="text-[11px] text-red-500">{aiError}</p>}
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

        {/* Category */}
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-2">Category</label>
          <select
            value={category}
            onChange={e => setCategory(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="">— None —</option>
            {CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
          </select>
        </div>

        {/* Content */}
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1">Content</label>
          <p className="text-[10px] text-muted-foreground mb-2">
            Use <code className="bg-muted px-1 rounded">{"{{name}}"}</code>, <code className="bg-muted px-1 rounded">{"{{handle}}"}</code> for dynamic values
          </p>
          <textarea
            ref={textareaRef}
            value={content}
            onChange={e => setContent(e.target.value)}
            rows={5}
            placeholder="Write your reply template…"
            className="w-full px-3 py-2.5 text-sm rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
          />

          {/* Quick variable insert buttons */}
          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
            <span className="text-[10px] text-muted-foreground">Insert:</span>
            {QUICK_VARS.map(v => (
              <button
                key={v}
                type="button"
                onClick={() => insertVar(v)}
                className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-mono hover:bg-primary/20 transition-colors"
              >
                {v}
              </button>
            ))}
          </div>

          {/* Visual progress bar */}
          <div className="mt-2 space-y-1">
            <div className="w-full h-1 rounded-full bg-muted overflow-hidden">
              <div
                className={cn("h-full rounded-full transition-all duration-200",
                  over       ? "bg-red-500"    :
                  charPct >= 80 ? "bg-yellow-500" :
                  "bg-primary"
                )}
                style={{ width: `${charPct}%` }}
              />
            </div>
            <div className="flex items-center justify-between">
              <VariableChips content={content} />
              <span className={cn("text-[11px] ml-auto", over ? "text-red-500 font-medium" : "text-muted-foreground")}>
                {content.length}{over ? ` / ${charLimit} ⚠️` : ""}
              </span>
            </div>
          </div>
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
            {LANGUAGE_OPTIONS.map(l => <option key={l.key} value={l.key}>{l.label}</option>)}
          </select>
        </div>

        {/* Active toggle */}
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => setActive(a => !a)} className="text-muted-foreground hover:text-primary transition-colors">
            {active ? <ToggleRight className="w-7 h-7 text-primary" /> : <ToggleLeft className="w-7 h-7" />}
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
            {saving ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…</> : <><Check className="w-3.5 h-3.5" /> Save Template</>}
          </button>
          <button onClick={onClose} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground rounded-xl hover:bg-muted transition-colors">
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

  const [search, setSearch]                 = useState("");
  const [platformFilter, setPlatformFilter] = useState<Platform | "all">("all");
  const [languageFilter, setLanguageFilter] = useState<LanguageType | "all">("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [sort, setSort]                     = useState<SortKey>("newest");
  const [showSortMenu, setShowSortMenu]     = useState(false);
  const sortMenuRef = useRef<HTMLDivElement>(null);
  const [dialogOpen, setDialogOpen]         = useState(false);
  const [editTemplate, setEditTemplate]     = useState<ReplyTemplate | null>(null);
  const [copiedId, setCopiedId]             = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<ReplyTemplate | null>(null);

  // Derived
  const sorted = [...templates].sort((a, b) => {
    if (sort === "used")   return (b.usedCount ?? 0) - (a.usedCount ?? 0);
    if (sort === "az")     return a.title.localeCompare(b.title);
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const filtered = sorted.filter(t => {
    const matchSearch   = !search || t.title.toLowerCase().includes(search.toLowerCase()) || t.content.toLowerCase().includes(search.toLowerCase());
    const matchPlatform = platformFilter === "all" || t.platforms.includes(platformFilter);
    const matchLanguage = languageFilter === "all" || t.language === languageFilter;
    const matchCategory = categoryFilter === "all" || t.category === categoryFilter;
    return matchSearch && matchPlatform && matchLanguage && matchCategory;
  });

  const activeCount = templates.filter(t => t.active).length;
  const totalUses   = templates.reduce((s, t) => s + (t.usedCount ?? 0), 0);
  const maxUsedCount = Math.max(...templates.map(t => t.usedCount ?? 0), 0);
  const hasUsage = maxUsedCount > 0;

  // Close sort menu on outside click
  useEffect(() => {
    if (!showSortMenu) return;
    function handleClick(e: MouseEvent) {
      if (sortMenuRef.current && !sortMenuRef.current.contains(e.target as Node)) {
        setShowSortMenu(false);
      }
    }
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [showSortMenu]);

  const openNew = () => { setEditTemplate(null); setDialogOpen(true); };
  const openEdit = (t: ReplyTemplate) => { setEditTemplate(t); setDialogOpen(true); };

  const handleSave = (data: Omit<ReplyTemplate, "id" | "createdAt" | "usedCount">) => {
    if (editTemplate) {
      updateTemplate.mutate({ id: editTemplate.id, ...data }, { onSuccess: () => setDialogOpen(false) });
    } else {
      createTemplate.mutate(data, { onSuccess: () => setDialogOpen(false) });
    }
  };

  const handleCopy = async (t: ReplyTemplate) => {
    await navigator.clipboard.writeText(t.content);
    setCopiedId(t.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDuplicate = (t: ReplyTemplate) => {
    createTemplate.mutate({
      title:     `Copy of ${t.title}`,
      content:   t.content,
      platforms: t.platforms,
      language:  t.language,
      category:  t.category,
      active:    t.active,
    });
  };

  const handleToggleActive = (t: ReplyTemplate) => {
    updateTemplate.mutate({ id: t.id, active: !t.active });
  };

  const handleDelete = (id: string) => {
    deleteTemplate.mutate(id);
    setDeleteConfirmId(null);
  };

  return (
    <AppLayout role="client" businessName={user?.businessName}>
      <div className="space-y-5">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Reply Templates</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Reusable replies — insert directly from the Inbox with <code className="bg-muted px-1 rounded text-xs">{"{{name}}"}</code> substitution
            </p>
          </div>
          <button onClick={openNew} className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-xl hover:bg-primary/90 transition-colors">
            <Plus className="w-4 h-4" /> New Template
          </button>
        </motion.div>

        {/* Stats */}
        <div className="flex flex-wrap gap-2">
          <span className="text-xs px-3 py-1.5 rounded-full bg-muted text-muted-foreground font-medium">{templates.length} total</span>
          <span className="text-xs px-3 py-1.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-medium">{activeCount} active</span>
          <span className="text-xs px-3 py-1.5 rounded-full bg-primary/10 text-primary font-medium flex items-center gap-1">
            <Hash className="w-3 h-3" />{totalUses} uses
          </span>
        </div>

        {/* Unified filter bar */}
        <div className="flex flex-col gap-2">
          {/* Row 1: search + sort */}
          <div className="flex gap-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search templates…"
                className="w-full h-9 pl-9 pr-3 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div className="relative" ref={sortMenuRef}>
              <button
                onClick={() => setShowSortMenu(v => !v)}
                className="flex items-center gap-1.5 h-9 px-3 text-xs font-medium border border-border rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <SortAsc className="w-3.5 h-3.5" />
                {SORT_OPTIONS.find(s => s.key === sort)?.label}
                <ChevronDown className="w-3 h-3" />
              </button>
              {showSortMenu && (
                <div className="absolute right-0 top-full mt-1 bg-card border border-border rounded-xl shadow-lg z-20 min-w-32 overflow-hidden">
                  {SORT_OPTIONS.map(s => (
                    <button
                      key={s.key}
                      onClick={() => { setSort(s.key); setShowSortMenu(false); }}
                      className={cn("w-full text-left px-3 py-2 text-xs hover:bg-muted transition-colors", sort === s.key ? "text-primary font-medium" : "text-foreground")}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Row 2: platform + language + category chips (one scrollable row) */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
            {/* Platform */}
            {[{ key: "all", label: "All" }, ...PLATFORMS.map(p => ({ key: p.key, label: p.label }))].map(p => (
              <button
                key={p.key}
                onClick={() => setPlatformFilter(p.key as Platform | "all")}
                className={cn("px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors flex-shrink-0",
                  platformFilter === p.key ? "bg-primary text-white" : "bg-muted text-muted-foreground hover:text-foreground")}
              >{p.label}</button>
            ))}
            <div className="w-px bg-border mx-1 flex-shrink-0" />
            {/* Language */}
            {[{ key: "all", label: "All Lang" }, ...LANGUAGE_OPTIONS.map(l => ({ key: l.key, label: l.short }))].map(l => (
              <button
                key={l.key}
                onClick={() => setLanguageFilter(l.key as LanguageType | "all")}
                className={cn("px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors flex-shrink-0",
                  languageFilter === l.key ? "bg-primary text-white" : "bg-muted text-muted-foreground hover:text-foreground")}
              >{l.label}</button>
            ))}
            <div className="w-px bg-border mx-1 flex-shrink-0" />
            {/* Category */}
            {[{ key: "all", label: "All Types" }, ...CATEGORIES].map(c => (
              <button
                key={c.key}
                onClick={() => setCategoryFilter(c.key)}
                className={cn("px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors flex-shrink-0",
                  categoryFilter === c.key ? "bg-primary text-white" : "bg-muted text-muted-foreground hover:text-foreground")}
              >{c.label}</button>
            ))}
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-20" />
            <p className="text-sm font-medium">No templates found</p>
            <p className="text-xs mt-1 opacity-70">Try adjusting filters or create a new template</p>
            <button onClick={openNew} className="mt-4 flex items-center gap-1.5 px-4 py-2 bg-primary text-white text-sm font-medium rounded-xl mx-auto hover:bg-primary/90 transition-colors">
              <Plus className="w-3.5 h-3.5" /> Create Template
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map((t, i) => {
              const usageBarPct = hasUsage ? ((t.usedCount ?? 0) / maxUsedCount) * 100 : 0;
              return (
                <motion.div
                  key={t.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className={cn("bg-card rounded-2xl border border-border flex flex-col overflow-hidden", !t.active && "opacity-60")}
                >
                  {/* Card inner (clickable body for preview) */}
                  <div className="p-4 space-y-3 flex-1">
                    {/* Title row */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground leading-snug">{t.title}</p>
                        {t.category && (
                          <span className="text-[10px] text-muted-foreground">{CATEGORIES.find(c => c.key === t.category)?.label ?? t.category}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {/* Eye / Preview button */}
                        <button
                          onClick={() => setPreviewTemplate(t)}
                          title="Preview"
                          className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        {/* Copy content button */}
                        <button
                          onClick={() => handleCopy(t)}
                          title={copiedId === t.id ? "Copied!" : "Copy content"}
                          className={cn("p-1.5 rounded-lg transition-colors text-muted-foreground",
                            copiedId === t.id ? "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20" : "hover:bg-muted hover:text-foreground")}
                        >
                          {copiedId === t.id ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                        {/* Duplicate button */}
                        <button
                          onClick={() => handleDuplicate(t)}
                          title="Duplicate"
                          className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <CopyPlus className="w-3.5 h-3.5" />
                        </button>
                        {/* Edit button */}
                        <button onClick={() => openEdit(t)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        {/* Delete button */}
                        {deleteConfirmId === t.id ? (
                          <div className="flex items-center gap-1">
                            <button onClick={() => handleDelete(t.id)} className="text-[11px] px-2 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">Yes</button>
                            <button onClick={() => setDeleteConfirmId(null)} className="text-[11px] px-2 py-1 bg-muted text-muted-foreground rounded-lg hover:text-foreground transition-colors">No</button>
                          </div>
                        ) : (
                          <button onClick={() => setDeleteConfirmId(t.id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-muted-foreground hover:text-red-600 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Content preview — clicking opens preview modal */}
                    <button
                      className="text-left w-full"
                      onClick={() => setPreviewTemplate(t)}
                    >
                      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3 hover:text-foreground transition-colors">{t.content}</p>
                    </button>

                    {/* Variable chips */}
                    <VariableChips content={t.content} />

                    {/* Badges + stats + active toggle */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {t.platforms.map(p => (
                        <span key={p} className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium", PLATFORM_BADGE[p] ?? "bg-muted text-muted-foreground")}>
                          {PLATFORMS.find(pl => pl.key === p)?.label ?? p}
                        </span>
                      ))}
                      <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium", LANGUAGE_BADGE[t.language])}>
                        {LANGUAGE_OPTIONS.find(l => l.key === t.language)?.short ?? t.language}
                      </span>
                      {(t.usedCount ?? 0) > 0 && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium flex items-center gap-0.5">
                          <Hash className="w-2.5 h-2.5" />{t.usedCount} uses
                        </span>
                      )}
                      <div className="ml-auto flex items-center gap-1.5">
                        <button onClick={() => handleToggleActive(t)} className="text-muted-foreground hover:text-primary transition-colors" title={t.active ? "Disable" : "Enable"}>
                          {t.active ? <ToggleRight className="w-6 h-6 text-primary" /> : <ToggleLeft className="w-6 h-6" />}
                        </button>
                        <span className="text-[11px] text-muted-foreground">{t.active ? "Active" : "Inactive"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Usage bar (Feature E) — always render container, show bar only when usage exists */}
                  {hasUsage && (
                    <div className="px-0 pb-0">
                      <div className="w-full h-[3px] bg-muted rounded-full overflow-hidden opacity-60">
                        <div
                          className="h-full bg-primary rounded-full transition-all duration-500"
                          style={{ width: `${usageBarPct}%` }}
                        />
                      </div>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      <AnimatePresence>
        {dialogOpen && (
          <TemplateDialog
            key={editTemplate?.id ?? "new"}
            initial={editTemplate ?? {}}
            onSave={handleSave}
            onClose={() => setDialogOpen(false)}
            saving={createTemplate.isPending || updateTemplate.isPending}
          />
        )}
        {previewTemplate && (
          <PreviewModal
            template={previewTemplate}
            onClose={() => setPreviewTemplate(null)}
            onEdit={(t) => { openEdit(t); setPreviewTemplate(null); }}
          />
        )}
      </AnimatePresence>
    </AppLayout>
  );
}
