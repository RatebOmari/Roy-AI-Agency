import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { AppLayout } from "@/components/layout/AppLayout";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import {
  CheckCircle2, Loader2, Bell, Palette, Wand2,
  Zap, Clock, Shield, Plus, ToggleLeft, ToggleRight,
  Trash2, Pencil, X, MessageCircle,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useSettings, useSaveSettings, useBrandSettings, useSaveBrandStyle } from "@/hooks/useSettings";
import type { ToneSettingsMap, PlatformSettings, AutomationRule, Channel } from "@/types";
import type { Platform } from "@/types";
import { cn } from "@/lib/utils";

// ── AI Platform tabs ──────────────────────────────────────────────────────────

const AI_PLATFORMS: { id: Platform; label: string }[] = [
  { id: "tiktok",    label: "TikTok"    },
  { id: "instagram", label: "Instagram" },
  { id: "facebook",  label: "Facebook"  },
  { id: "whatsapp",  label: "WhatsApp"  },
];

const toneKeys     = ["friendly", "professional", "fun", "informative"] as const;
const languageKeys = ["ar", "en", "ar_en"] as const;
const defaultConfig: PlatformSettings = { tone: "friendly", language: "ar", blocked: "", extra: "" };

// ── Brand presets ─────────────────────────────────────────────────────────────

const BRAND_PRESETS: { label: string; emoji: string; value: string }[] = [
  { label: "Restaurant/Café", emoji: "🍽️", value: "Warm golden lighting, rustic wooden surfaces, fresh herbs, appetizing food close-up photography, soft bokeh background, cozy inviting atmosphere" },
  { label: "Retail/Fashion",  emoji: "👗", value: "Clean bright backgrounds, lifestyle photography, vibrant product shots, minimalist modern aesthetic, natural daylight, aspirational" },
  { label: "Beauty/Wellness", emoji: "✨", value: "Soft pastel tones, natural diffused lighting, clean skincare and wellness aesthetic, calm luxurious spa-like mood, airy and fresh" },
  { label: "Fitness/Sports",  emoji: "💪", value: "High energy bold colors, dynamic action shots, motivational mood, modern gym aesthetic, strong contrast, vibrant and powerful" },
  { label: "Tech/Digital",    emoji: "💻", value: "Minimalist clean design, blue and white tones, crisp sharp imagery, futuristic professional look, flat lay or device mockups" },
  { label: "Luxury/Premium",  emoji: "👑", value: "Dark moody cinematic lighting, gold and black accents, premium textures like marble or velvet, sophisticated elegant, high-end editorial style" },
];

// ── Automation constants ──────────────────────────────────────────────────────

const MOCK_RULES: AutomationRule[] = [
  {
    id: "r1",
    name: "Auto-send high-confidence replies",
    trigger: "sentiment_positive",
    action: "auto_send",
    channels: ["instagram_comment", "tiktok_comment", "facebook_comment"],
    active: true,
  },
  {
    id: "r2",
    name: "Escalate complaints",
    trigger: "sentiment_negative",
    action: "escalate",
    channels: ["instagram_dm", "facebook_messenger", "sms"],
    active: true,
  },
  {
    id: "r3",
    name: "Auto-reply to pricing questions",
    trigger: "contains_word",
    triggerValue: "price,cost,how much,pricing",
    action: "skip_review",
    channels: ["instagram_comment", "tiktok_comment"],
    active: false,
  },
];

const TRIGGER_OPTIONS: { value: AutomationRule["trigger"]; label: string }[] = [
  { value: "contains_word",      label: "Contains keyword"    },
  { value: "is_question",        label: "Is a question"       },
  { value: "sentiment_positive", label: "Positive sentiment"  },
  { value: "sentiment_negative", label: "Negative sentiment"  },
  { value: "new_follower",       label: "New follower"        },
];

const ACTION_OPTIONS: { value: AutomationRule["action"]; label: string }[] = [
  { value: "auto_send",   label: "Auto-send reply"     },
  { value: "skip_review", label: "Skip review queue"   },
  { value: "escalate",    label: "Escalate to human"   },
  { value: "assign_to",   label: "Assign to agent"     },
];

const ACTION_COLORS: Record<AutomationRule["action"], string> = {
  auto_send:   "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400",
  skip_review: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400",
  escalate:    "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400",
  assign_to:   "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400",
};

const CHANNEL_OPTIONS: { value: Channel; label: string }[] = [
  { value: "instagram_comment",  label: "Instagram Comment" },
  { value: "instagram_dm",       label: "Instagram DM"      },
  { value: "tiktok_comment",     label: "TikTok Comment"    },
  { value: "tiktok_dm",          label: "TikTok DM"         },
  { value: "facebook_comment",   label: "Facebook Comment"  },
  { value: "facebook_messenger", label: "Messenger"         },
  { value: "whatsapp_business",  label: "WhatsApp"          },
  { value: "sms",                label: "SMS"               },
];

const CHANNEL_LABEL: Record<string, string> = Object.fromEntries(
  CHANNEL_OPTIONS.map(c => [c.value, c.label])
);

const TRIGGER_LABEL: Record<AutomationRule["trigger"], string> = Object.fromEntries(
  TRIGGER_OPTIONS.map(t => [t.value, t.label])
) as Record<AutomationRule["trigger"], string>;

// ── Rule Dialog ───────────────────────────────────────────────────────────────

interface RuleForm {
  name: string;
  trigger: AutomationRule["trigger"];
  triggerValue: string;
  action: AutomationRule["action"];
  channels: Channel[];
}

const DEFAULT_FORM: RuleForm = {
  name: "",
  trigger: "sentiment_positive",
  triggerValue: "",
  action: "auto_send",
  channels: [],
};

function RuleDialog({
  initial,
  onSave,
  onClose,
}: {
  initial?: AutomationRule;
  onSave: (form: RuleForm) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<RuleForm>(
    initial
      ? { name: initial.name, trigger: initial.trigger, triggerValue: initial.triggerValue ?? "", action: initial.action, channels: [...initial.channels] }
      : DEFAULT_FORM
  );

  const set = <K extends keyof RuleForm>(key: K, val: RuleForm[K]) =>
    setForm(p => ({ ...p, [key]: val }));

  const toggleChannel = (ch: Channel) =>
    set("channels", form.channels.includes(ch)
      ? form.channels.filter(c => c !== ch)
      : [...form.channels, ch]
    );

  const valid = !!form.name.trim() && form.channels.length > 0
    && (form.trigger !== "contains_word" || !!form.triggerValue.trim());

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-card rounded-2xl border border-border shadow-xl p-6 space-y-4 max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-foreground">{initial ? "Edit Rule" : "New Rule"}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Name */}
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1.5">Rule Name</label>
          <input
            value={form.name}
            onChange={e => set("name", e.target.value)}
            placeholder="e.g. Auto-send greetings"
            className="w-full px-3 py-2.5 text-sm rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        {/* Trigger */}
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1.5">When</label>
          <select
            value={form.trigger}
            onChange={e => {
              const trigger = e.target.value as AutomationRule["trigger"];
              setForm(p => ({
                ...p,
                trigger,
                triggerValue: trigger === "contains_word" ? p.triggerValue : "",
              }));
            }}
            className="w-full px-3 py-2.5 text-sm rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            {TRIGGER_OPTIONS.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        {/* Trigger value — only for contains_word */}
        {form.trigger === "contains_word" && (
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">
              Keywords <span className="opacity-60">(comma-separated)</span>
            </label>
            <input
              value={form.triggerValue}
              onChange={e => set("triggerValue", e.target.value)}
              placeholder="e.g. price,cost,how much"
              className="w-full px-3 py-2.5 text-sm rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        )}

        {/* Action */}
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1.5">Then</label>
          <select
            value={form.action}
            onChange={e => set("action", e.target.value as AutomationRule["action"])}
            className="w-full px-3 py-2.5 text-sm rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            {ACTION_OPTIONS.map(a => (
              <option key={a.value} value={a.value}>{a.label}</option>
            ))}
          </select>
        </div>

        {/* Channels */}
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-2">
            Apply to channels <span className="opacity-60">(select at least one)</span>
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            {CHANNEL_OPTIONS.map(ch => {
              const active = form.channels.includes(ch.value);
              return (
                <button
                  key={ch.value}
                  onClick={() => toggleChannel(ch.value)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium border transition-colors text-left",
                    active
                      ? "bg-primary/10 border-primary text-primary"
                      : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/20"
                  )}
                >
                  <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", active ? "bg-primary" : "bg-muted-foreground/40")} />
                  {ch.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <button
            onClick={() => valid && onSave(form)}
            disabled={!valid}
            className="flex-1 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary/90 disabled:opacity-40 transition-colors"
          >
            {initial ? "Save Changes" : "Create Rule"}
          </button>
          <button onClick={onClose} className="px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground rounded-xl hover:bg-muted transition-colors">
            Cancel
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Settings tabs ─────────────────────────────────────────────────────────────

type TabKey = "ai" | "automation" | "brand" | "appearance" | "notifications";

const TABS: { key: TabKey; label: string }[] = [
  { key: "ai",            label: "AI Reply"    },
  { key: "automation",    label: "Automation"  },
  { key: "brand",         label: "Brand"       },
  { key: "appearance",    label: "Appearance"  },
  { key: "notifications", label: "Alerts"      },
];

// ── Main component ────────────────────────────────────────────────────────────

export default function ToneSettings() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { data: serverSettings, isLoading } = useSettings();
  const saveMutation = useSaveSettings();
  const { data: brandData } = useBrandSettings();
  const saveBrandMutation = useSaveBrandStyle();

  // ── Tab ──────────────────────────────────────────────────────────────────────
  const [tab, setTab] = useState<TabKey>("ai");

  // ── AI Reply state ───────────────────────────────────────────────────────────
  const [active, setActive] = useState<Platform>("tiktok");
  const [saved,  setSaved]  = useState(false);
  const [configs, setConfigs] = useState<ToneSettingsMap>({
    tiktok:    { ...defaultConfig },
    instagram: { ...defaultConfig },
    facebook:  { ...defaultConfig, tone: "professional" },
    whatsapp:  { ...defaultConfig, tone: "informative"  },
  });

  useEffect(() => { if (serverSettings) setConfigs(serverSettings); }, [serverSettings]);

  const cfg    = configs[active];
  const update = (field: keyof PlatformSettings, val: string) =>
    setConfigs(p => ({ ...p, [active]: { ...p[active], [field]: val } }));

  const handleSave = async () => {
    await saveMutation.mutateAsync(configs);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  // ── Brand state ──────────────────────────────────────────────────────────────
  const [imageStyle,  setImageStyle]  = useState("");
  const [brandSaved,  setBrandSaved]  = useState(false);
  useEffect(() => { if (brandData) setImageStyle(brandData.imageStyle); }, [brandData]);

  const handleBrandSave = async () => {
    await saveBrandMutation.mutateAsync({ imageStyle });
    setBrandSaved(true);
    setTimeout(() => setBrandSaved(false), 2000);
  };

  // ── Automation state ─────────────────────────────────────────────────────────
  const [autoSendPct,   setAutoSendPct]   = useState(85);
  const [escalatePct,   setEscalatePct]   = useState(50);
  const [threshDirty,   setThreshDirty]   = useState(false);
  const [threshSaved,   setThreshSaved]   = useState(false);
  const [rules,         setRules]         = useState<AutomationRule[]>(MOCK_RULES);
  const [ruleDialog,    setRuleDialog]    = useState<{ open: boolean; editing?: AutomationRule }>({ open: false });
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Clear pending delete confirm whenever user switches away from automation tab
  useEffect(() => { if (tab !== "automation") setDeleteConfirm(null); }, [tab]);

  const reviewLow  = escalatePct;
  const reviewHigh = autoSendPct - 1;

  const setAutoSend = (raw: string) => {
    const val = parseInt(raw, 10);
    if (isNaN(val)) return;
    setAutoSendPct(Math.max(escalatePct + 2, Math.min(100, val)));
    setThreshDirty(true);
  };

  const setEscalate = (raw: string) => {
    const val = parseInt(raw, 10);
    if (isNaN(val)) return;
    setEscalatePct(Math.max(1, Math.min(autoSendPct - 2, val)));
    setThreshDirty(true);
  };

  const saveThresholds = () => {
    setThreshDirty(false);
    setThreshSaved(true);
    setTimeout(() => setThreshSaved(false), 2000);
  };

  const toggleRule = (id: string) =>
    setRules(prev => prev.map(r => r.id === id ? { ...r, active: !r.active } : r));

  const deleteRule = (id: string) => {
    setRules(prev => prev.filter(r => r.id !== id));
    setDeleteConfirm(null);
  };

  const saveRule = (form: RuleForm) => {
    if (ruleDialog.editing) {
      setRules(prev => prev.map(r =>
        r.id === ruleDialog.editing!.id
          ? { ...r, ...form, triggerValue: form.triggerValue || undefined }
          : r
      ));
    } else {
      setRules(prev => [
        ...prev,
        {
          id: `r${Date.now()}`,
          active: true,
          ...form,
          triggerValue: form.triggerValue || undefined,
        },
      ]);
    }
    setRuleDialog({ open: false });
  };

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <AppLayout role="client" businessName={user?.businessName ?? "SocialPilot"}>
      <div className="space-y-6 max-w-2xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-bold text-foreground">Settings</h1>
          <p className="text-sm text-muted-foreground">Manage your account preferences</p>
        </motion.div>

        {/* Tab bar */}
        <div className="flex gap-1 bg-muted p-1 rounded-xl overflow-x-auto">
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0",
                tab === key
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ── AI Reply tab ─────────────────────────────────────────────────────── */}
        {tab === "ai" && (
          <motion.div key="ai" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex gap-2 flex-wrap mb-6">
              {AI_PLATFORMS.map(p => (
                <button key={p.id} onClick={() => setActive(p.id)}
                  className={cn(
                    "px-4 py-2 rounded-xl text-sm font-medium border transition-colors",
                    active === p.id
                      ? "bg-primary text-white border-primary"
                      : "bg-card border-border text-muted-foreground hover:border-primary/40"
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : (
              <motion.div key={active} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="bg-card rounded-2xl border border-border p-6 shadow-sm space-y-6"
              >
                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground">{t("settings.toneLabel")}</p>
                  <div className="grid grid-cols-2 gap-2">
                    {toneKeys.map(key => (
                      <button key={key} onClick={() => update("tone", key)}
                        className={cn(
                          "p-3 rounded-xl text-left border transition-colors",
                          cfg.tone === key
                            ? "bg-primary/10 border-primary"
                            : "bg-muted border-transparent hover:border-border"
                        )}
                      >
                        <p className={cn("text-sm font-medium", cfg.tone === key ? "text-primary" : "text-foreground")}>
                          {t(`settings.tones.${key}`)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {t(`settings.tones.${key}Desc`)}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground">{t("settings.languageLabel")}</p>
                  <div className="flex gap-2">
                    {languageKeys.map(key => (
                      <button key={key} onClick={() => update("language", key)}
                        className={cn(
                          "flex-1 py-2 rounded-xl text-sm font-medium border transition-colors",
                          cfg.language === key
                            ? "bg-primary text-white border-primary"
                            : "bg-muted border-transparent text-muted-foreground"
                        )}
                      >
                        {t(`settings.languages.${key}`)}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground">{t("settings.blockedLabel")}</p>
                  <input
                    value={cfg.blocked}
                    onChange={e => update("blocked", e.target.value)}
                    placeholder={t("settings.blockedPlaceholder")}
                    className="w-full px-4 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-background"
                  />
                  <p className="text-xs text-muted-foreground">{t("settings.blockedHint")}</p>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground">{t("settings.extraLabel")}</p>
                  <textarea
                    value={cfg.extra}
                    onChange={e => update("extra", e.target.value)}
                    rows={3}
                    placeholder={t("settings.extraPlaceholder")}
                    className="w-full px-4 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-background resize-none"
                  />
                </div>

                <button
                  onClick={handleSave}
                  disabled={saveMutation.isPending}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-primary text-white rounded-xl font-medium hover:bg-primary/90 transition-colors disabled:opacity-60"
                >
                  {saveMutation.isPending
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : saved
                      ? <><CheckCircle2 className="w-4 h-4" /> {t("settings.saved")}</>
                      : t("settings.save")
                  }
                </button>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* ── Automation tab ──────────────────────────────────────────────────── */}
        {tab === "automation" && (
          <motion.div key="automation" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* AI Confidence Thresholds */}
            <div className="bg-card rounded-2xl border border-border overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
                <Zap className="w-4 h-4 text-primary" />
                <div className="flex-1">
                  <p className="font-semibold text-foreground text-sm">AI Confidence Thresholds</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Control when the AI sends automatically vs. waits for your review
                  </p>
                </div>
              </div>

              <div className="divide-y divide-border">
                {/* Auto-send tier */}
                <div className="flex items-center gap-4 px-5 py-4 bg-green-50/50 dark:bg-green-900/10">
                  <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/40 flex items-center justify-center flex-shrink-0">
                    <Zap className="w-4 h-4 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-green-800 dark:text-green-300">Auto-Send</p>
                    <p className="text-xs text-green-600 dark:text-green-500">
                      Reply sent immediately — no approval needed
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className="text-sm text-muted-foreground">≥</span>
                    <input
                      type="number"
                      min={escalatePct + 2}
                      max={100}
                      value={autoSendPct}
                      onChange={e => setAutoSend(e.target.value)}
                      className="w-14 text-center px-2 py-1 text-sm font-bold text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800 rounded-lg bg-white dark:bg-green-900/20 focus:outline-none focus:ring-2 focus:ring-green-400/30"
                    />
                    <span className="text-sm font-bold text-green-700 dark:text-green-400">%</span>
                  </div>
                </div>

                {/* Review queue tier — derived, not editable */}
                <div className="flex items-center gap-4 px-5 py-4 bg-yellow-50/50 dark:bg-yellow-900/10">
                  <div className="w-8 h-8 rounded-lg bg-yellow-100 dark:bg-yellow-900/40 flex items-center justify-center flex-shrink-0">
                    <Clock className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300">Review Queue</p>
                    <p className="text-xs text-yellow-600 dark:text-yellow-500">
                      Goes to your inbox for approval before sending
                    </p>
                  </div>
                  <span className="text-sm font-bold text-yellow-700 dark:text-yellow-400 flex-shrink-0">
                    {reviewLow}%–{reviewHigh}%
                  </span>
                </div>

                {/* Escalate tier */}
                <div className="flex items-center gap-4 px-5 py-4 bg-red-50/50 dark:bg-red-900/10">
                  <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-900/40 flex items-center justify-center flex-shrink-0">
                    <Shield className="w-4 h-4 text-red-600 dark:text-red-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-red-800 dark:text-red-300">Human Escalation</p>
                    <p className="text-xs text-red-600 dark:text-red-500">
                      Flagged — AI won't reply, your team must respond
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className="text-sm text-muted-foreground">&lt;</span>
                    <input
                      type="number"
                      min={1}
                      max={autoSendPct - 2}
                      value={escalatePct}
                      onChange={e => setEscalate(e.target.value)}
                      className="w-14 text-center px-2 py-1 text-sm font-bold text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-lg bg-white dark:bg-red-900/20 focus:outline-none focus:ring-2 focus:ring-red-400/30"
                    />
                    <span className="text-sm font-bold text-red-700 dark:text-red-400">%</span>
                  </div>
                </div>
              </div>

              {(threshDirty || threshSaved) && (
                <div className="px-5 py-3 border-t border-border">
                  {threshSaved ? (
                    <div className="flex items-center gap-1.5 text-xs font-medium text-green-700 dark:text-green-400">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Thresholds saved
                    </div>
                  ) : (
                    <button
                      onClick={saveThresholds}
                      className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                    >
                      Save threshold changes
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Automation Rules */}
            <div className="bg-card rounded-2xl border border-border overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
                <MessageCircle className="w-4 h-4 text-primary" />
                <div className="flex-1">
                  <p className="font-semibold text-foreground text-sm">Automation Rules</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Override AI thresholds based on trigger conditions
                  </p>
                </div>
                <button
                  onClick={() => setRuleDialog({ open: true })}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white text-xs font-medium rounded-lg hover:bg-primary/90 transition-colors flex-shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Rule
                </button>
              </div>

              {rules.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-muted-foreground gap-2">
                  <MessageCircle className="w-8 h-8 opacity-20" />
                  <p className="text-sm">No rules yet — add one to get started</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {rules.map(rule => (
                    <div key={rule.id} className="flex items-start gap-3 px-5 py-4">
                      {/* Toggle — always full opacity so it stays clickable */}
                      <button
                        onClick={() => toggleRule(rule.id)}
                        className="mt-0.5 flex-shrink-0 text-muted-foreground hover:text-primary transition-colors"
                      >
                        {rule.active
                          ? <ToggleRight className="w-6 h-6 text-primary" />
                          : <ToggleLeft  className="w-6 h-6" />
                        }
                      </button>

                      {/* Content — dims when rule is off */}
                      <div className={cn(
                        "flex-1 min-w-0 transition-opacity",
                        !rule.active && "opacity-40"
                      )}>
                        <p className="text-sm font-medium text-foreground mb-1.5">
                          {rule.name}
                        </p>
                        <div className="flex flex-wrap items-center gap-1.5 mb-2">
                          <span className="text-xs text-muted-foreground">When</span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                            {TRIGGER_LABEL[rule.trigger]}
                            {rule.triggerValue && `: "${rule.triggerValue}"`}
                          </span>
                          <span className="text-xs text-muted-foreground">→</span>
                          <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", ACTION_COLORS[rule.action])}>
                            {ACTION_OPTIONS.find(a => a.value === rule.action)?.label}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {rule.channels.map(ch => (
                            <span key={ch} className="text-[10px] px-1.5 py-0.5 rounded bg-muted/70 text-muted-foreground">
                              {CHANNEL_LABEL[ch] ?? ch}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Edit / Delete */}
                      <div className="flex items-center gap-1 flex-shrink-0 mt-0.5">
                        <button
                          onClick={() => setRuleDialog({ open: true, editing: rule })}
                          className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                          title="Edit rule"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        {deleteConfirm === rule.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => deleteRule(rule.id)}
                              className="text-[11px] px-2 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                            >
                              Yes
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(null)}
                              className="text-[11px] px-2 py-1 bg-muted text-muted-foreground rounded-lg hover:text-foreground transition-colors"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirm(rule.id)}
                            className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-muted-foreground hover:text-red-600 transition-colors"
                            title="Delete rule"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ── Brand tab ───────────────────────────────────────────────────────── */}
        {tab === "brand" && (
          <motion.div key="brand" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-2xl border border-border p-6 shadow-sm space-y-6"
          >
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Palette className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Image Style Guide</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Describe your brand's visual look once. Every AI-generated image will automatically match it.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Quick-start presets</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {BRAND_PRESETS.map(p => (
                  <button
                    key={p.label}
                    onClick={() => setImageStyle(p.value)}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border text-left text-xs hover:border-primary/50 hover:bg-primary/5 transition-colors"
                  >
                    <span className="text-base">{p.emoji}</span>
                    <span className="font-medium text-foreground leading-tight">{p.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Wand2 className="w-3.5 h-3.5 text-primary" />
                <p className="text-sm font-medium text-foreground">Your brand style</p>
              </div>
              <textarea
                value={imageStyle}
                onChange={e => setImageStyle(e.target.value)}
                rows={4}
                placeholder="e.g. Warm golden lighting, rustic wooden surfaces, cozy restaurant atmosphere…"
                className="w-full px-4 py-3 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-background resize-none"
              />
              <p className="text-xs text-muted-foreground">
                Use plain language — include colors, lighting, mood, textures, and photography style.
              </p>
            </div>

            {imageStyle.trim() && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-primary/5 border border-primary/20">
                <CheckCircle2 className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                <p className="text-xs text-primary font-medium">Style guide active — applied to all image generations</p>
              </div>
            )}

            <button
              onClick={handleBrandSave}
              disabled={saveBrandMutation.isPending}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-primary text-white rounded-xl font-medium hover:bg-primary/90 transition-colors disabled:opacity-60"
            >
              {saveBrandMutation.isPending
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : brandSaved
                  ? <><CheckCircle2 className="w-4 h-4" /> Saved</>
                  : "Save Brand Style"
              }
            </button>
          </motion.div>
        )}

        {/* ── Appearance tab ──────────────────────────────────────────────────── */}
        {tab === "appearance" && (
          <motion.div key="appearance" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-2xl border border-border p-6 shadow-sm space-y-6"
          >
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">Theme</p>
              <p className="text-xs text-muted-foreground">Auto switches dark at 7 pm and light at 6 am</p>
              <div className="mt-2">
                <ThemeToggle />
              </div>
            </div>
            <div className="border-t border-border" />
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">Language</p>
              <p className="text-xs text-muted-foreground">App interface language — saved to your account</p>
              <div className="mt-2">
                <LanguageSwitcher expanded />
              </div>
            </div>
          </motion.div>
        )}

        {/* ── Alerts tab ──────────────────────────────────────────────────────── */}
        {tab === "notifications" && (
          <motion.div key="notifications" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-2xl border border-border p-6 shadow-sm"
          >
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Bell className="w-10 h-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm font-medium text-foreground">Notifications</p>
              <p className="text-xs text-muted-foreground mt-1">Notification preferences are coming soon</p>
            </div>
          </motion.div>
        )}
      </div>

      {/* Rule Dialog */}
      <AnimatePresence>
        {ruleDialog.open && (
          <RuleDialog
            initial={ruleDialog.editing}
            onSave={saveRule}
            onClose={() => setRuleDialog({ open: false })}
          />
        )}
      </AnimatePresence>
    </AppLayout>
  );
}
