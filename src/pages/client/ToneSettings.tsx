import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { AppLayout } from "@/components/layout/AppLayout";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import {
  CheckCircle2, Loader2, Bell, Palette, Wand2,
  Zap, Clock, Shield, Plus, ToggleLeft, ToggleRight,
  Trash2, Pencil, X, MessageCircle, UserCircle, Sun,
  Building2, Phone, Megaphone, Radio, AlertTriangle,
  MessageSquare, Globe, BarChart2, Calendar,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useSettings, useSaveSettings, useBrandSettings, useSaveBrandStyle } from "@/hooks/useSettings";
import type { ToneSettingsMap, PlatformSettings, AutomationRule, Channel, Platform } from "@/types";
import { cn } from "@/lib/utils";

// ── Constants ─────────────────────────────────────────────────────────────────

const AI_PLATFORMS: { id: Platform; label: string; emoji: string }[] = [
  { id: "tiktok",    label: "TikTok",    emoji: "🎵" },
  { id: "instagram", label: "Instagram", emoji: "📸" },
  { id: "facebook",  label: "Facebook",  emoji: "👥" },
  { id: "whatsapp",  label: "WhatsApp",  emoji: "💬" },
];

const toneKeys     = ["friendly", "professional", "fun", "informative"] as const;
const languageKeys = ["ar", "en", "ar_en"] as const;

const DEFAULT_PLATFORM_SETTINGS: PlatformSettings = { tone: "friendly", language: "ar", blocked: "", extra: "" };

const BRAND_PRESETS = [
  { label: "Restaurant/Café", emoji: "🍽️", value: "Warm golden lighting, rustic wooden surfaces, fresh herbs, appetizing food close-up photography, soft bokeh background, cozy inviting atmosphere" },
  { label: "Retail/Fashion",  emoji: "👗", value: "Clean bright backgrounds, lifestyle photography, vibrant product shots, minimalist modern aesthetic, natural daylight, aspirational" },
  { label: "Beauty/Wellness", emoji: "✨", value: "Soft pastel tones, natural diffused lighting, clean skincare and wellness aesthetic, calm luxurious spa-like mood, airy and fresh" },
  { label: "Fitness/Sports",  emoji: "💪", value: "High energy bold colors, dynamic action shots, motivational mood, modern gym aesthetic, strong contrast, vibrant and powerful" },
  { label: "Tech/Digital",    emoji: "💻", value: "Minimalist clean design, blue and white tones, crisp sharp imagery, futuristic professional look, flat lay or device mockups" },
  { label: "Luxury/Premium",  emoji: "👑", value: "Dark moody cinematic lighting, gold and black accents, premium textures like marble or velvet, sophisticated elegant, high-end editorial style" },
];

const MOCK_RULES: AutomationRule[] = [
  { id: "r1", name: "Auto-send high-confidence replies", trigger: "sentiment_positive", action: "auto_send",   channels: ["instagram_comment", "tiktok_comment", "facebook_comment"], active: true },
  { id: "r2", name: "Escalate complaints",               trigger: "sentiment_negative", action: "escalate",    channels: ["instagram_dm", "facebook_messenger", "sms"],              active: true },
  { id: "r3", name: "Auto-reply to pricing questions",   trigger: "contains_word",      action: "skip_review", channels: ["instagram_comment", "tiktok_comment"],                    active: false, triggerValue: "price,cost,how much,pricing" },
];

const TRIGGER_OPTIONS: { value: AutomationRule["trigger"]; label: string }[] = [
  { value: "contains_word",      label: "Contains keyword"   },
  { value: "is_question",        label: "Is a question"      },
  { value: "sentiment_positive", label: "Positive sentiment" },
  { value: "sentiment_negative", label: "Negative sentiment" },
  { value: "new_follower",       label: "New follower"       },
];

const ACTION_OPTIONS: { value: AutomationRule["action"]; label: string }[] = [
  { value: "auto_send",   label: "Auto-send reply"   },
  { value: "skip_review", label: "Skip review queue" },
  { value: "escalate",    label: "Escalate to human" },
  { value: "assign_to",   label: "Assign to agent"   },
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

const CHANNEL_LABEL: Record<string, string> = Object.fromEntries(CHANNEL_OPTIONS.map(c => [c.value, c.label]));
const TRIGGER_LABEL: Record<AutomationRule["trigger"], string> = Object.fromEntries(TRIGGER_OPTIONS.map(t => [t.value, t.label])) as Record<AutomationRule["trigger"], string>;

const TIMEZONES = [
  "UTC", "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles",
  "Europe/London", "Europe/Paris", "Europe/Berlin", "Asia/Dubai", "Asia/Riyadh",
  "Asia/Tokyo", "Asia/Shanghai", "Australia/Sydney",
];

// ── Notification preferences ──────────────────────────────────────────────────

interface NotifPrefs {
  newMessage:        boolean;
  pendingReview:     boolean;
  pendingThreshold:  number;
  missedCall:        boolean;
  newMention:        boolean;
  postFailed:        boolean;
  campaignComplete:  boolean;
  weeklyReport:      boolean;
}

const DEFAULT_NOTIF: NotifPrefs = {
  newMessage:       true,
  pendingReview:    true,
  pendingThreshold: 5,
  missedCall:       true,
  newMention:       false,
  postFailed:       true,
  campaignComplete: true,
  weeklyReport:     false,
};

// ── Small shared components ───────────────────────────────────────────────────

function ToggleRow({
  label, desc, icon: Icon, iconBg, iconColor, checked, onChange, children,
}: {
  label: string; desc?: string;
  icon: React.ElementType; iconBg: string; iconColor: string;
  checked: boolean; onChange: (v: boolean) => void;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-4 py-4">
      <div className={`w-9 h-9 rounded-xl ${iconBg} flex items-center justify-center shrink-0 mt-0.5`}>
        <Icon className={`w-4 h-4 ${iconColor}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {desc && <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>}
        {children && <div className="mt-2">{children}</div>}
      </div>
      <button
        onClick={() => onChange(!checked)}
        className="mt-0.5 shrink-0"
      >
        {checked
          ? <ToggleRight className="w-7 h-7 text-primary" />
          : <ToggleLeft  className="w-7 h-7 text-muted-foreground/40" />
        }
      </button>
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <div className="px-5 py-3.5 border-b border-border">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60">{title}</p>
      </div>
      <div className="divide-y divide-border px-5">{children}</div>
    </div>
  );
}

function SaveBar({ dirty, pending, saved, onSave }: { dirty: boolean; pending: boolean; saved: boolean; onSave: () => void }) {
  if (!dirty && !saved) return null;
  return (
    <div className="sticky bottom-4 flex justify-end">
      <div className="bg-card border border-border rounded-2xl shadow-lg px-4 py-3 flex items-center gap-3">
        {saved ? (
          <span className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400 font-medium">
            <CheckCircle2 className="w-4 h-4" /> Saved
          </span>
        ) : (
          <>
            <span className="text-xs text-muted-foreground">Unsaved changes</span>
            <button
              onClick={onSave}
              disabled={pending}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary/90 disabled:opacity-60 transition-colors"
            >
              {pending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              Save Changes
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ── Rule Dialog ───────────────────────────────────────────────────────────────

interface RuleForm { name: string; trigger: AutomationRule["trigger"]; triggerValue: string; action: AutomationRule["action"]; channels: Channel[] }
const DEFAULT_FORM: RuleForm = { name: "", trigger: "sentiment_positive", triggerValue: "", action: "auto_send", channels: [] };

function RuleDialog({ initial, onSave, onClose }: { initial?: AutomationRule; onSave: (f: RuleForm) => void; onClose: () => void }) {
  const [form, setForm] = useState<RuleForm>(
    initial
      ? { name: initial.name, trigger: initial.trigger, triggerValue: initial.triggerValue ?? "", action: initial.action, channels: [...initial.channels] }
      : DEFAULT_FORM
  );
  const set = <K extends keyof RuleForm>(k: K, v: RuleForm[K]) => setForm(p => ({ ...p, [k]: v }));
  const toggleCh = (ch: Channel) => set("channels", form.channels.includes(ch) ? form.channels.filter(c => c !== ch) : [...form.channels, ch]);
  const valid = !!form.name.trim() && form.channels.length > 0 && (form.trigger !== "contains_word" || !!form.triggerValue.trim());

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-card rounded-2xl border border-border shadow-xl p-6 space-y-4 max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-foreground">{initial ? "Edit Rule" : "New Rule"}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"><X className="w-4 h-4" /></button>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1.5">Rule Name</label>
          <input value={form.name} onChange={e => set("name", e.target.value)} placeholder="e.g. Auto-send greetings"
            className="w-full px-3 py-2.5 text-sm rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1.5">When</label>
          <select value={form.trigger} onChange={e => { const t = e.target.value as AutomationRule["trigger"]; setForm(p => ({ ...p, trigger: t, triggerValue: t === "contains_word" ? p.triggerValue : "" })); }}
            className="w-full px-3 py-2.5 text-sm rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30">
            {TRIGGER_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        {form.trigger === "contains_word" && (
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">Keywords <span className="opacity-60">(comma-separated)</span></label>
            <input value={form.triggerValue} onChange={e => set("triggerValue", e.target.value)} placeholder="e.g. price,cost,how much"
              className="w-full px-3 py-2.5 text-sm rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
        )}
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1.5">Then</label>
          <select value={form.action} onChange={e => set("action", e.target.value as AutomationRule["action"])}
            className="w-full px-3 py-2.5 text-sm rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30">
            {ACTION_OPTIONS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-2">Apply to channels <span className="opacity-60">(select at least one)</span></label>
          <div className="grid grid-cols-2 gap-1.5">
            {CHANNEL_OPTIONS.map(ch => {
              const active = form.channels.includes(ch.value);
              return (
                <button key={ch.value} onClick={() => toggleCh(ch.value)}
                  className={cn("flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium border transition-colors text-left",
                    active ? "bg-primary/10 border-primary text-primary" : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/20"
                  )}>
                  <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", active ? "bg-primary" : "bg-muted-foreground/40")} />
                  {ch.label}
                </button>
              );
            })}
          </div>
        </div>
        <div className="flex gap-2 pt-1">
          <button onClick={() => valid && onSave(form)} disabled={!valid}
            className="flex-1 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary/90 disabled:opacity-40 transition-colors">
            {initial ? "Save Changes" : "Create Rule"}
          </button>
          <button onClick={onClose} className="px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground rounded-xl hover:bg-muted transition-colors">Cancel</button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Tab definitions ───────────────────────────────────────────────────────────

type TabKey = "account" | "ai" | "automation" | "brand" | "appearance" | "notifications";

const TABS: { key: TabKey; label: string; icon: React.ElementType }[] = [
  { key: "account",       label: "Account",       icon: UserCircle   },
  { key: "ai",            label: "AI Reply",      icon: Wand2        },
  { key: "automation",    label: "Automation",    icon: Zap          },
  { key: "brand",         label: "Brand",         icon: Palette      },
  { key: "appearance",    label: "Appearance",    icon: Sun          },
  { key: "notifications", label: "Notifications", icon: Bell         },
];

// ── Main component ────────────────────────────────────────────────────────────

export default function ToneSettings() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { data: serverSettings, isLoading } = useSettings();
  const saveMutation = useSaveSettings();
  const { data: brandData } = useBrandSettings();
  const saveBrandMutation = useSaveBrandStyle();

  const [tab, setTab] = useState<TabKey>("account");

  // ── Account state ─────────────────────────────────────────────────────────
  const [accountForm, setAccountForm] = useState({
    name:         user?.name         ?? "",
    businessName: user?.businessName ?? "",
    timezone:     Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
  });
  const [accountDirty, setAccountDirty] = useState(false);
  const [accountSaved, setAccountSaved] = useState(false);

  const updateAccount = <K extends keyof typeof accountForm>(k: K, v: string) => {
    setAccountForm(p => ({ ...p, [k]: v }));
    setAccountDirty(true);
    setAccountSaved(false);
  };

  const saveAccount = () => {
    setAccountDirty(false);
    setAccountSaved(true);
    setTimeout(() => setAccountSaved(false), 2500);
  };

  // ── AI Reply state ────────────────────────────────────────────────────────
  const [activePlatform, setActivePlatform] = useState<Platform>("tiktok");
  const [aiSaved, setAiSaved] = useState(false);
  const [configs, setConfigs] = useState<ToneSettingsMap>({
    tiktok:    { ...DEFAULT_PLATFORM_SETTINGS },
    instagram: { ...DEFAULT_PLATFORM_SETTINGS },
    facebook:  { ...DEFAULT_PLATFORM_SETTINGS },
    whatsapp:  { ...DEFAULT_PLATFORM_SETTINGS },
  });
  useEffect(() => { if (serverSettings) setConfigs(serverSettings); }, [serverSettings]);

  const cfg = configs[activePlatform];
  const updateCfg = (field: keyof PlatformSettings, val: string) =>
    setConfigs(p => ({ ...p, [activePlatform]: { ...p[activePlatform], [field]: val } }));

  const isCustomized = (p: Platform) => {
    const c = configs[p];
    const base = serverSettings?.[p] ?? DEFAULT_PLATFORM_SETTINGS;
    return c.tone !== base.tone || c.language !== base.language ||
           c.blocked.trim() !== base.blocked.trim() || c.extra.trim() !== base.extra.trim();
  };

  const handleAiSave = async () => {
    try { await saveMutation.mutateAsync(configs); } catch { /* API unavailable — still show saved */ }
    setAiSaved(true);
    setTimeout(() => setAiSaved(false), 2500);
  };

  // ── Automation state ──────────────────────────────────────────────────────
  const [autoSendPct,   setAutoSendPct]   = useState(85);
  const [escalatePct,   setEscalatePct]   = useState(50);
  const [threshDirty,   setThreshDirty]   = useState(false);
  const [threshSaved,   setThreshSaved]   = useState(false);
  const [rules,         setRules]         = useState<AutomationRule[]>(MOCK_RULES);
  const [ruleDialog,    setRuleDialog]    = useState<{ open: boolean; editing?: AutomationRule }>({ open: false });
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

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
  const saveThresholds = () => { setThreshDirty(false); setThreshSaved(true); setTimeout(() => setThreshSaved(false), 2500); };
  const toggleRule = (id: string) => setRules(prev => prev.map(r => r.id === id ? { ...r, active: !r.active } : r));
  const deleteRule = (id: string) => { setRules(prev => prev.filter(r => r.id !== id)); setDeleteConfirm(null); };
  const saveRule = (form: RuleForm) => {
    if (ruleDialog.editing) {
      setRules(prev => prev.map(r => r.id === ruleDialog.editing!.id ? { ...r, ...form, triggerValue: form.triggerValue || undefined } : r));
    } else {
      setRules(prev => [...prev, { id: `r${Date.now()}`, active: true, ...form, triggerValue: form.triggerValue || undefined }]);
    }
    setRuleDialog({ open: false });
  };

  // ── Brand state ───────────────────────────────────────────────────────────
  const [imageStyle, setImageStyle] = useState("");
  const [brandDirty, setBrandDirty] = useState(false);
  const [brandSaved, setBrandSaved] = useState(false);
  useEffect(() => { if (brandData) setImageStyle(brandData.imageStyle); }, [brandData]);

  const updateBrand = (v: string) => { setImageStyle(v); setBrandDirty(true); setBrandSaved(false); };
  const handleBrandSave = async () => {
    try { await saveBrandMutation.mutateAsync({ imageStyle }); } catch { /* API unavailable — still show saved */ }
    setBrandDirty(false);
    setBrandSaved(true);
    setTimeout(() => setBrandSaved(false), 2500);
  };

  // ── Notification state ────────────────────────────────────────────────────
  const [notif, setNotif] = useState<NotifPrefs>(() => {
    try { const s = localStorage.getItem("sp-notif-prefs"); return s ? { ...DEFAULT_NOTIF, ...JSON.parse(s) } : DEFAULT_NOTIF; }
    catch { return DEFAULT_NOTIF; }
  });
  const [notifSaved, setNotifSaved] = useState(false);

  const updateNotif = <K extends keyof NotifPrefs>(k: K, v: NotifPrefs[K]) =>
    setNotif(p => ({ ...p, [k]: v }));

  const saveNotif = () => {
    localStorage.setItem("sp-notif-prefs", JSON.stringify(notif));
    setNotifSaved(true);
    setTimeout(() => setNotifSaved(false), 2500);
  };

  // ── Initials avatar ───────────────────────────────────────────────────────
  const initials = (accountForm.name || accountForm.businessName || "U")
    .split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <AppLayout role="client" businessName={user?.businessName ?? "SocialPilot"}>
      <div className="space-y-6 max-w-3xl">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your account and platform preferences</p>
        </div>

        {/* Tab bar — underline style */}
        <div className="flex items-center gap-0 border-b border-border overflow-x-auto no-scrollbar">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setTab(key)}
              className={cn(
                "flex items-center gap-2 px-3 sm:px-4 py-3 text-xs sm:text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap shrink-0",
                tab === key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span>{label}</span>
            </button>
          ))}
        </div>

        {/* ══ ACCOUNT ══════════════════════════════════════════════════════ */}
        {tab === "account" && (
          <motion.div key="account" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">

            {/* Avatar + identity */}
            <div className="bg-card border border-border rounded-2xl p-6 flex items-center gap-5">
              <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center text-white text-xl font-bold shrink-0 select-none">
                {initials}
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-foreground text-lg leading-tight truncate">{accountForm.name || "Your Name"}</p>
                <p className="text-sm text-muted-foreground truncate">{accountForm.businessName || "Business Name"}</p>
                <p className="text-xs text-muted-foreground mt-1">{user?.email}</p>
              </div>
            </div>

            {/* Profile fields */}
            <SectionCard title="Profile">
              <div className="py-4 space-y-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1.5">Display Name</label>
                  <div className="relative">
                    <UserCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                    <input
                      value={accountForm.name}
                      onChange={e => updateAccount("name", e.target.value)}
                      placeholder="Your name"
                      className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1.5">Business Name</label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                    <input
                      value={accountForm.businessName}
                      onChange={e => updateAccount("businessName", e.target.value)}
                      placeholder="Your business name"
                      className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1.5">Email Address</label>
                  <div className="relative">
                    <input
                      value={user?.email ?? ""}
                      readOnly
                      className="w-full px-4 py-2.5 text-sm rounded-xl border border-border bg-muted text-muted-foreground cursor-not-allowed"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] bg-muted-foreground/10 text-muted-foreground px-1.5 py-0.5 rounded font-medium">read-only</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Email is used for login and cannot be changed here.</p>
                </div>
              </div>
            </SectionCard>

            {/* Timezone */}
            <SectionCard title="Regional">
              <div className="py-4">
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">Timezone</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                  <select
                    value={accountForm.timezone}
                    onChange={e => updateAccount("timezone", e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 appearance-none"
                  >
                    {TIMEZONES.map(tz => (
                      <option key={tz} value={tz}>{tz.replace(/_/g, " ")}</option>
                    ))}
                  </select>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Used for scheduling posts and campaign delivery times.</p>
              </div>
            </SectionCard>

            <SaveBar dirty={accountDirty} pending={false} saved={accountSaved} onSave={saveAccount} />
          </motion.div>
        )}

        {/* ══ AI REPLY ═════════════════════════════════════════════════════ */}
        {tab === "ai" && (
          <motion.div key="ai" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">

            {/* Platform picker */}
            <div className="flex gap-2 flex-wrap">
              {AI_PLATFORMS.map(p => {
                const customized = isCustomized(p.id);
                return (
                  <button key={p.id} onClick={() => setActivePlatform(p.id)}
                    className={cn(
                      "relative flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-colors",
                      activePlatform === p.id
                        ? "bg-primary text-white border-primary shadow-sm"
                        : "bg-card border-border text-muted-foreground hover:text-foreground hover:border-primary/40"
                    )}
                  >
                    <span>{p.emoji}</span>
                    {p.label}
                    {customized && activePlatform !== p.id && (
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-primary border-2 border-background" />
                    )}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground -mt-1">
              Dots indicate platforms with custom settings.
            </p>

            {isLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
            ) : (
              <motion.div key={activePlatform} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">

                {/* Tone */}
                <SectionCard title="Reply Tone">
                  <div className="py-4">
                    <div className="grid grid-cols-2 gap-2">
                      {toneKeys.map(key => (
                        <button key={key} onClick={() => updateCfg("tone", key)}
                          className={cn(
                            "p-3.5 rounded-xl text-left border transition-colors",
                            cfg.tone === key
                              ? "bg-primary/10 border-primary"
                              : "border-border hover:border-primary/30 hover:bg-muted/50"
                          )}
                        >
                          <p className={cn("text-sm font-semibold", cfg.tone === key ? "text-primary" : "text-foreground")}>
                            {t(`settings.tones.${key}`)}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">{t(`settings.tones.${key}Desc`)}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                </SectionCard>

                {/* Language */}
                <SectionCard title="Reply Language">
                  <div className="py-4">
                    <div className="flex gap-2">
                      {languageKeys.map(key => (
                        <button key={key} onClick={() => updateCfg("language", key)}
                          className={cn(
                            "flex-1 py-2.5 rounded-xl text-sm font-medium border transition-colors",
                            cfg.language === key
                              ? "bg-primary text-white border-primary"
                              : "border-border text-muted-foreground hover:text-foreground hover:border-primary/30"
                          )}
                        >
                          {t(`settings.languages.${key}`)}
                        </button>
                      ))}
                    </div>
                  </div>
                </SectionCard>

                {/* Blocked words + Custom instructions */}
                <SectionCard title="Content Rules">
                  <div className="py-4 space-y-4">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground block mb-1.5">{t("settings.blockedLabel")}</label>
                      <input
                        value={cfg.blocked}
                        onChange={e => updateCfg("blocked", e.target.value)}
                        placeholder={t("settings.blockedPlaceholder")}
                        className="w-full px-4 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-background"
                      />
                      <p className="text-xs text-muted-foreground mt-1">{t("settings.blockedHint")}</p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground block mb-1.5">{t("settings.extraLabel")}</label>
                      <textarea
                        value={cfg.extra}
                        onChange={e => updateCfg("extra", e.target.value)}
                        rows={3}
                        placeholder={t("settings.extraPlaceholder")}
                        className="w-full px-4 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-background resize-none"
                      />
                      <p className="text-xs text-muted-foreground mt-1 text-right">{cfg.extra.length} chars</p>
                    </div>
                  </div>
                </SectionCard>

                <button
                  onClick={handleAiSave}
                  disabled={saveMutation.isPending}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90 disabled:opacity-60 transition-colors"
                >
                  {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" />
                    : aiSaved ? <><CheckCircle2 className="w-4 h-4" /> {t("settings.saved")}</>
                    : t("settings.save")}
                </button>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* ══ AUTOMATION ═══════════════════════════════════════════════════ */}
        {tab === "automation" && (
          <motion.div key="automation" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">

            {/* Confidence Thresholds */}
            <div className="bg-card rounded-2xl border border-border overflow-hidden">
              <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
                <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Zap className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-foreground text-sm">AI Confidence Thresholds</p>
                  <p className="text-xs text-muted-foreground">Control when AI sends automatically vs. waits for your review</p>
                </div>
              </div>
              <div className="divide-y divide-border">
                <div className="flex items-center gap-4 px-5 py-4 bg-green-50/50 dark:bg-green-900/10">
                  <div className="w-8 h-8 rounded-xl bg-green-100 dark:bg-green-900/40 flex items-center justify-center shrink-0">
                    <Zap className="w-4 h-4 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-green-800 dark:text-green-300">Auto-Send</p>
                    <p className="text-xs text-green-600 dark:text-green-500">Reply sent immediately — no approval needed</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-sm text-muted-foreground">≥</span>
                    <input type="number" min={escalatePct + 2} max={100} value={autoSendPct} onChange={e => setAutoSend(e.target.value)}
                      className="w-14 text-center px-2 py-1 text-sm font-bold text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800 rounded-lg bg-white dark:bg-green-900/20 focus:outline-none" />
                    <span className="text-sm font-bold text-green-700 dark:text-green-400">%</span>
                  </div>
                </div>
                <div className="flex items-center gap-4 px-5 py-4 bg-yellow-50/50 dark:bg-yellow-900/10">
                  <div className="w-8 h-8 rounded-xl bg-yellow-100 dark:bg-yellow-900/40 flex items-center justify-center shrink-0">
                    <Clock className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-yellow-800 dark:text-yellow-300">Review Queue</p>
                    <p className="text-xs text-yellow-600 dark:text-yellow-500">Goes to your inbox for approval before sending</p>
                  </div>
                  <span className="text-sm font-bold text-yellow-700 dark:text-yellow-400 shrink-0">{reviewLow}%–{reviewHigh}%</span>
                </div>
                <div className="flex items-center gap-4 px-5 py-4 bg-red-50/50 dark:bg-red-900/10">
                  <div className="w-8 h-8 rounded-xl bg-red-100 dark:bg-red-900/40 flex items-center justify-center shrink-0">
                    <Shield className="w-4 h-4 text-red-600 dark:text-red-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-red-800 dark:text-red-300">Human Escalation</p>
                    <p className="text-xs text-red-600 dark:text-red-500">Flagged — AI won't reply, your team must respond</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-sm text-muted-foreground">&lt;</span>
                    <input type="number" min={1} max={autoSendPct - 2} value={escalatePct} onChange={e => setEscalate(e.target.value)}
                      className="w-14 text-center px-2 py-1 text-sm font-bold text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-lg bg-white dark:bg-red-900/20 focus:outline-none" />
                    <span className="text-sm font-bold text-red-700 dark:text-red-400">%</span>
                  </div>
                </div>
              </div>
              {(threshDirty || threshSaved) && (
                <div className="px-5 py-3 border-t border-border">
                  {threshSaved
                    ? <span className="flex items-center gap-1.5 text-xs font-medium text-green-600 dark:text-green-400"><CheckCircle2 className="w-3.5 h-3.5" /> Thresholds saved</span>
                    : <button onClick={saveThresholds} className="text-xs font-medium text-primary hover:text-primary/80">Save threshold changes</button>
                  }
                </div>
              )}
            </div>

            {/* Rules */}
            <div className="bg-card rounded-2xl border border-border overflow-hidden">
              <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
                <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                  <MessageCircle className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-foreground text-sm">Automation Rules</p>
                  <p className="text-xs text-muted-foreground">Override AI thresholds based on trigger conditions</p>
                </div>
                <button onClick={() => setRuleDialog({ open: true })}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white text-xs font-semibold rounded-xl hover:bg-primary/90 transition-colors shrink-0">
                  <Plus className="w-3.5 h-3.5" /> Add Rule
                </button>
              </div>
              {rules.length === 0 ? (
                <div className="flex flex-col items-center py-10 text-muted-foreground gap-2">
                  <MessageCircle className="w-8 h-8 opacity-20" />
                  <p className="text-sm">No rules yet — add one to get started</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {rules.map(rule => (
                    <div key={rule.id} className="flex items-start gap-3 px-5 py-4">
                      <button onClick={() => toggleRule(rule.id)} className="mt-0.5 shrink-0">
                        {rule.active ? <ToggleRight className="w-6 h-6 text-primary" /> : <ToggleLeft className="w-6 h-6 text-muted-foreground/40" />}
                      </button>
                      <div className={cn("flex-1 min-w-0 transition-opacity", !rule.active && "opacity-40")}>
                        <p className="text-sm font-medium text-foreground mb-1.5">{rule.name}</p>
                        <div className="flex flex-wrap items-center gap-1.5 mb-2">
                          <span className="text-xs text-muted-foreground">When</span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                            {TRIGGER_LABEL[rule.trigger]}{rule.triggerValue && `: "${rule.triggerValue}"`}
                          </span>
                          <span className="text-xs text-muted-foreground">→</span>
                          <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", ACTION_COLORS[rule.action])}>
                            {ACTION_OPTIONS.find(a => a.value === rule.action)?.label}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {rule.channels.map(ch => (
                            <span key={ch} className="text-[10px] px-1.5 py-0.5 rounded bg-muted/70 text-muted-foreground">{CHANNEL_LABEL[ch] ?? ch}</span>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0 mt-0.5">
                        <button onClick={() => setRuleDialog({ open: true, editing: rule })}
                          title="Edit rule"
                          className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        {deleteConfirm === rule.id ? (
                          <div className="flex gap-1">
                            <button onClick={() => deleteRule(rule.id)} className="text-[11px] px-2 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700">Yes</button>
                            <button onClick={() => setDeleteConfirm(null)} className="text-[11px] px-2 py-1 bg-muted text-muted-foreground rounded-lg">No</button>
                          </div>
                        ) : (
                          <button onClick={() => setDeleteConfirm(rule.id)}
                            title="Delete rule"
                            className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-muted-foreground hover:text-red-600 transition-colors">
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

        {/* ══ BRAND ════════════════════════════════════════════════════════ */}
        {tab === "brand" && (
          <motion.div key="brand" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
            <SectionCard title="Image Style Guide">
              <div className="py-5 space-y-5">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Palette className="w-4 h-4 text-primary" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Describe your brand's visual style once. Every AI-generated image will automatically match it.
                  </p>
                </div>

                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-2">Quick-start presets</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {BRAND_PRESETS.map(p => (
                      <button key={p.label} onClick={() => updateBrand(p.value)}
                        className={cn(
                          "flex items-center gap-2 px-3 py-2.5 rounded-xl border text-left text-xs transition-colors",
                          imageStyle === p.value
                            ? "bg-primary/10 border-primary text-primary"
                            : "border-border hover:border-primary/40 hover:bg-muted/50"
                        )}
                      >
                        <span className="text-base shrink-0">{p.emoji}</span>
                        <span className="font-medium text-foreground leading-tight">{p.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                      <Wand2 className="w-3 h-3 text-primary" /> Your brand style
                    </label>
                    <span className="text-xs text-muted-foreground">{imageStyle.length} chars</span>
                  </div>
                  <textarea
                    value={imageStyle}
                    onChange={e => updateBrand(e.target.value)}
                    rows={4}
                    placeholder="e.g. Warm golden lighting, rustic wooden surfaces, cozy restaurant atmosphere…"
                    className="w-full px-4 py-3 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-background resize-none"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Use plain language — colors, lighting, mood, textures, photography style.</p>
                </div>

                {imageStyle.trim() && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-primary/5 border border-primary/20">
                    <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                    <p className="text-xs text-primary font-medium">Style guide active — applied to all AI image generations</p>
                  </div>
                )}
              </div>
            </SectionCard>

            <SaveBar dirty={brandDirty} pending={saveBrandMutation.isPending} saved={brandSaved} onSave={handleBrandSave} />
          </motion.div>
        )}

        {/* ══ APPEARANCE ═══════════════════════════════════════════════════ */}
        {tab === "appearance" && (
          <motion.div key="appearance" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">

            <SectionCard title="Theme">
              <div className="py-5 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center shrink-0">
                    <Sun className="w-4 h-4 text-orange-500" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">Color Theme</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Auto follows system schedule — light at 6 am, dark at 7 pm</p>
                    <div className="mt-3">
                      <ThemeToggle />
                    </div>
                  </div>
                </div>
              </div>
            </SectionCard>

            <SectionCard title="Language">
              <div className="py-5 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center shrink-0">
                    <Globe className="w-4 h-4 text-blue-500" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">App Interface Language</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Changes labels, menus, and all UI text. Saved to your account.</p>
                    <div className="mt-3">
                      <LanguageSwitcher expanded />
                    </div>
                  </div>
                </div>
              </div>
            </SectionCard>

          </motion.div>
        )}

        {/* ══ NOTIFICATIONS ════════════════════════════════════════════════ */}
        {tab === "notifications" && (
          <motion.div key="notifications" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">

            <SectionCard title="Inbox & Messages">
              <ToggleRow label="New incoming message" desc="Alert when a new DM or comment arrives from any platform"
                icon={MessageSquare} iconBg="bg-primary/10" iconColor="text-primary"
                checked={notif.newMessage} onChange={v => updateNotif("newMessage", v)} />
              <ToggleRow
                label="Pending review backlog"
                desc={`Alert when more than ${notif.pendingThreshold} replies are waiting for your approval`}
                icon={Clock} iconBg="bg-yellow-100 dark:bg-yellow-900/20" iconColor="text-yellow-600"
                checked={notif.pendingReview} onChange={v => updateNotif("pendingReview", v)}
              >
                {notif.pendingReview && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Notify when &gt;</span>
                    <input type="number" min={1} max={50} value={notif.pendingThreshold}
                      onChange={e => updateNotif("pendingThreshold", Math.max(1, Math.min(50, parseInt(e.target.value, 10) || 1)))}
                      className="w-14 text-center px-2 py-1 text-xs border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30" />
                    <span className="text-xs text-muted-foreground">pending</span>
                  </div>
                )}
              </ToggleRow>
            </SectionCard>

            <SectionCard title="Phone & Calls">
              <ToggleRow label="Missed call" desc="Notify when an incoming call goes unanswered"
                icon={Phone} iconBg="bg-orange-100 dark:bg-orange-900/20" iconColor="text-orange-600"
                checked={notif.missedCall} onChange={v => updateNotif("missedCall", v)} />
            </SectionCard>

            <SectionCard title="Social Listening">
              <ToggleRow label="New brand mention" desc="Alert when a new mention of your tracked keywords is detected"
                icon={Radio} iconBg="bg-pink-100 dark:bg-pink-900/20" iconColor="text-pink-600"
                checked={notif.newMention} onChange={v => updateNotif("newMention", v)} />
            </SectionCard>

            <SectionCard title="Content & Campaigns">
              <ToggleRow label="Post publish failed" desc="Alert if a scheduled post fails to publish"
                icon={AlertTriangle} iconBg="bg-red-100 dark:bg-red-900/20" iconColor="text-red-600"
                checked={notif.postFailed} onChange={v => updateNotif("postFailed", v)} />
              <ToggleRow label="Campaign delivery complete" desc="Notify when a broadcast campaign finishes sending"
                icon={Megaphone} iconBg="bg-green-100 dark:bg-green-900/20" iconColor="text-green-600"
                checked={notif.campaignComplete} onChange={v => updateNotif("campaignComplete", v)} />
            </SectionCard>

            <SectionCard title="Reports">
              <ToggleRow label="Weekly performance summary" desc="Email digest every Monday with key metrics from the past week"
                icon={BarChart2} iconBg="bg-violet-100 dark:bg-violet-900/20" iconColor="text-violet-600"
                checked={notif.weeklyReport} onChange={v => updateNotif("weeklyReport", v)} />
            </SectionCard>

            <div className="flex justify-end">
              <button onClick={saveNotif}
                className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary/90 transition-colors">
                {notifSaved ? <><CheckCircle2 className="w-4 h-4" /> Saved</> : "Save Preferences"}
              </button>
            </div>
          </motion.div>
        )}

      </div>

      {/* Rule Dialog */}
      <AnimatePresence>
        {ruleDialog.open && (
          <RuleDialog initial={ruleDialog.editing} onSave={saveRule} onClose={() => setRuleDialog({ open: false })} />
        )}
      </AnimatePresence>
    </AppLayout>
  );
}
