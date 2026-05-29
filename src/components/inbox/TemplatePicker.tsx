import { useState, useRef, useEffect } from "react";
import { X, FileText, Hash } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTemplates, useIncrementTemplateUse } from "@/hooks/useTemplates";
import type { Conversation, Platform } from "@/types";

const CATEGORY_LABELS: Record<string, string> = {
  "":           "All",
  "greeting":   "Greeting",
  "faq":        "FAQ",
  "order":      "Order",
  "complaint":  "Complaint",
  "info":       "Info",
  "promo":      "Promo",
  "follow-up":  "Follow-up",
};

function substituteVariables(text: string, conv: Conversation): string {
  return text
    .replace(/\{\{name\}\}/g,     conv.contactName)
    .replace(/\{\{handle\}\}/g,   conv.contactHandle)
    .replace(/\{\{channel\}\}/g,  conv.channel);
}

interface TemplatePickerProps {
  conversation: Conversation;
  onInsert: (text: string) => void;
  onClose: () => void;
}

export function TemplatePicker({ conversation, onInsert, onClose }: TemplatePickerProps) {
  const [search, setSearch]     = useState("");
  const [category, setCategory] = useState("");
  const { data: allTemplates = [] } = useTemplates();
  const incrementUse = useIncrementTemplateUse();
  const panelRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Focus search on mount
  useEffect(() => { searchRef.current?.focus(); }, []);

  // Close on outside click — use "click" (not "mousedown") so React's onClick
  // toggle fires first; otherwise the picker would reopen after closing.
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [onClose]);

  // Derive conversation platform for filtering
  const convPlatform: Platform | null =
    conversation.channel.startsWith("instagram") ? "instagram" :
    conversation.channel.startsWith("tiktok")    ? "tiktok"    :
    conversation.channel.startsWith("facebook")  ? "facebook"  :
    conversation.channel.startsWith("whatsapp")  ? "whatsapp"  :
    null;

  const filtered = allTemplates.filter(t => {
    if (!t.active) return false;
    if (convPlatform && !t.platforms.includes(convPlatform)) return false;
    if (category && t.category !== category) return false;
    if (search) {
      const q = search.toLowerCase();
      return t.title.toLowerCase().includes(q) || t.content.toLowerCase().includes(q);
    }
    return true;
  });

  // Gather unique categories from active templates
  const availableCategories = ["", ...Array.from(new Set(allTemplates.filter(t => t.active && t.category).map(t => t.category)))];

  const handleInsert = (templateId: string, content: string) => {
    const substituted = substituteVariables(content, conversation);
    onInsert(substituted);
    incrementUse.mutate(templateId);
    onClose();
  };

  return (
    <div
      ref={panelRef}
      className="absolute bottom-full right-0 mb-2 w-80 bg-card border border-border rounded-2xl shadow-xl z-40 max-h-80 flex flex-col overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
        <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        <input
          ref={searchRef}
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search templates…"
          className="flex-1 text-sm bg-transparent focus:outline-none text-foreground placeholder:text-muted-foreground"
        />
        <button onClick={onClose} className="p-1 rounded-lg hover:bg-muted text-muted-foreground">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Category tabs */}
      {availableCategories.length > 1 && (
        <div className="flex gap-1 px-3 py-1.5 border-b border-border overflow-x-auto scrollbar-hide">
          {availableCategories.map(cat => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={cn(
                "px-2.5 py-1 text-[11px] font-medium rounded-full whitespace-nowrap transition-colors",
                category === cat
                  ? "bg-primary text-white"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              {CATEGORY_LABELS[cat] ?? cat}
            </button>
          ))}
        </div>
      )}

      {/* Template list */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground text-xs">
            No templates match this conversation
          </div>
        ) : (
          filtered.map(t => (
            <button
              key={t.id}
              onClick={() => handleInsert(t.id, t.content)}
              className="w-full text-left px-3 py-2.5 hover:bg-muted transition-colors border-b border-border/50 last:border-0 group"
            >
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                  {t.title}
                </span>
                {t.category && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                    {CATEGORY_LABELS[t.category] ?? t.category}
                  </span>
                )}
                {t.usedCount > 0 && (
                  <span className="ml-auto text-[10px] text-muted-foreground flex items-center gap-0.5">
                    <Hash className="w-2.5 h-2.5" />{t.usedCount}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground line-clamp-1 leading-relaxed">
                {substituteVariables(t.content, conversation)}
              </p>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
