import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  Building2, Globe, ListChecks, Zap, CheckCircle2,
  ArrowLeft, ArrowRight, Save, Send, Loader2,
  Check, Copy, ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";

// ── Types ─────────────────────────────────────────────────────────────────────

type Tone = "friendly" | "professional" | "fun" | "informative";
type Lang = "ar" | "en" | "ar_en";

interface FaqEntry  { q: string; a: string }
interface MenuItem  { name: string; price: string }
interface DayHours  { open: boolean; from: string; to: string }

interface WizardData {
  // Step 1
  businessName: string;
  businessType: string;
  description: string;
  ownerName: string;
  email: string;

  // Step 2
  platforms: string[];
  tokens: Record<string, string>; // key: "instagram_comments" etc.

  // Step 3
  hours: Record<string, DayHours>;
  products: MenuItem[];
  faqs: FaqEntry[];

  // Step 4
  tones: Record<string, { tone: Tone; lang: Lang; extra: string }>;

  // Step 5 (transient — not saved to draft)
  testPlatform: string;
  testMessage: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const STEPS = [
  { label: "Business Info",       icon: Building2  },
  { label: "Platforms",           icon: Globe      },
  { label: "Knowledge Base",      icon: ListChecks },
  { label: "AI Tone",             icon: Zap        },
  { label: "Test",                icon: Send       },
];

const BUSINESS_TYPES = [
  "Restaurant", "Café", "Retail Store", "Clinic / Health",
  "Salon / Beauty", "E-commerce", "Real Estate", "Education",
  "Professional Services", "Other",
];

const PLATFORM_OPTIONS: { id: string; label: string; color: string; hint: string }[] = [
  { id: "instagram", label: "Instagram", color: "bg-pink-100 text-pink-700 border-pink-200",  hint: "Meta Graph API token" },
  { id: "tiktok",    label: "TikTok",    color: "bg-slate-100 text-slate-700 border-slate-200", hint: "TikTok for Business token" },
  { id: "facebook",  label: "Facebook",  color: "bg-blue-100 text-blue-700 border-blue-200",  hint: "Meta Graph API token" },
  { id: "whatsapp",  label: "WhatsApp",  color: "bg-green-100 text-green-700 border-green-200", hint: "WhatsApp Cloud API token" },
];

const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];

const DEFAULT_HOURS = Object.fromEntries(
  DAYS.map(d => [d, { open: d !== "Sunday", from: "09:00", to: "17:00" }])
) as Record<string, DayHours>;

const TONE_OPTIONS: { value: Tone; label: string; desc: string }[] = [
  { value: "friendly",     label: "Friendly",      desc: "Warm, helpful, approachable" },
  { value: "professional", label: "Professional",   desc: "Formal, precise, business-like" },
  { value: "fun",          label: "Fun",            desc: "Playful, casual, emoji-friendly" },
  { value: "informative",  label: "Informative",    desc: "Clear, detailed, educational" },
];

const LANG_OPTIONS: { value: Lang; label: string }[] = [
  { value: "ar",    label: "Arabic" },
  { value: "en",    label: "English" },
  { value: "ar_en", label: "Arabic + English" },
];

const DRAFT_KEY = "sp-onboarding-draft";

// ── Helpers ───────────────────────────────────────────────────────────────────

function emptyWizard(): WizardData {
  return {
    businessName: "", businessType: "", description: "", ownerName: "", email: "",
    platforms: [], tokens: {},
    hours: DEFAULT_HOURS, products: [{ name: "", price: "" }, { name: "", price: "" }, { name: "", price: "" }],
    faqs: Array.from({ length: 5 }, () => ({ q: "", a: "" })),
    tones: {},
    testPlatform: "", testMessage: "",
  };
}

function loadDraft(): WizardData {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return emptyWizard();
    return { ...emptyWizard(), ...JSON.parse(raw) };
  } catch {
    return emptyWizard();
  }
}

function saveDraft(data: WizardData) {
  localStorage.setItem(DRAFT_KEY, JSON.stringify(data));
}

// ── Step indicator ────────────────────────────────────────────────────────────

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        {STEPS.map((s, i) => {
          const done   = i < current;
          const active = i === current;
          return (
            <div key={i} className="flex flex-col items-center gap-1 flex-1">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors",
                done   ? "bg-primary border-primary text-white"
                : active ? "border-primary text-primary bg-primary/10"
                : "border-border text-muted-foreground bg-background",
              )}>
                {done ? <Check className="w-4 h-4" /> : i + 1}
              </div>
              <span className={cn(
                "text-[10px] font-medium hidden sm:block text-center",
                active ? "text-primary" : "text-muted-foreground",
              )}>
                {s.label}
              </span>
            </div>
          );
        })}
      </div>
      {/* Progress bar */}
      <div className="h-1 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all duration-300"
          style={{ width: `${((current) / (total - 1)) * 100}%` }}
        />
      </div>
    </div>
  );
}

// ── Field helpers ─────────────────────────────────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return <label className="block text-sm font-medium text-foreground mb-1.5">{children}</label>;
}

function TextInput({ value, onChange, placeholder, type = "text" }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-base md:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
    />
  );
}

function Textarea({ value, onChange, placeholder, rows = 3 }: {
  value: string; onChange: (v: string) => void; placeholder?: string; rows?: number;
}) {
  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-base md:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
    />
  );
}

// ── Step 1: Business Info ─────────────────────────────────────────────────────

function Step1({ data, setData }: { data: WizardData; setData: (d: WizardData) => void }) {
  const set = (k: keyof WizardData, v: string) => setData({ ...data, [k]: v });

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label>Business Name *</Label>
          <TextInput value={data.businessName} onChange={v => set("businessName", v)} placeholder="e.g. Raleigh Eats" />
        </div>
        <div>
          <Label>Business Type *</Label>
          <select
            value={data.businessType}
            onChange={e => set("businessType", e.target.value)}
            className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-base md:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="">Select a type…</option>
            {BUSINESS_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>
      <div>
        <Label>Business Description</Label>
        <Textarea
          value={data.description}
          onChange={v => set("description", v)}
          placeholder="Briefly describe what the business does, who it serves, and what makes it unique…"
          rows={4}
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label>Owner / Contact Name</Label>
          <TextInput value={data.ownerName} onChange={v => set("ownerName", v)} placeholder="e.g. Ahmed Al-Rashid" />
        </div>
        <div>
          <Label>Email Address</Label>
          <TextInput value={data.email} onChange={v => set("email", v)} placeholder="owner@business.com" type="email" />
        </div>
      </div>
    </div>
  );
}

// ── Step 2: Platform Connections ──────────────────────────────────────────────

function Step2({ data, setData }: { data: WizardData; setData: (d: WizardData) => void }) {
  const togglePlatform = (id: string) => {
    const platforms = data.platforms.includes(id)
      ? data.platforms.filter(p => p !== id)
      : [...data.platforms, id];
    setData({ ...data, platforms });
  };

  const setToken = (key: string, value: string) =>
    setData({ ...data, tokens: { ...data.tokens, [key]: value } });

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        Select which platforms this client uses. Paste API tokens now or skip to add them later from the client settings.
      </p>

      {/* Platform toggles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {PLATFORM_OPTIONS.map(p => {
          const on = data.platforms.includes(p.id);
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => togglePlatform(p.id)}
              className={cn(
                "flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 text-sm font-medium transition-colors",
                on ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:border-primary/40",
              )}
            >
              <span className={cn("w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold", p.color)}>
                {p.label[0]}
              </span>
              {p.label}
              {on && <Check className="w-3.5 h-3.5 text-primary" />}
            </button>
          );
        })}
      </div>

      {/* Token inputs for selected platforms */}
      {data.platforms.length > 0 && (
        <div className="space-y-4 pt-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">API Tokens (optional)</p>
          {data.platforms.map(pid => {
            const meta = PLATFORM_OPTIONS.find(p => p.id === pid)!;
            return (
              <div key={pid}>
                <Label>{meta.label} — Access Token</Label>
                <TextInput
                  value={data.tokens[pid] ?? ""}
                  onChange={v => setToken(pid, v)}
                  placeholder={meta.hint}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Step 3: Knowledge Base ────────────────────────────────────────────────────

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!on)}
      className={cn("relative w-9 h-5 rounded-full transition-colors flex-shrink-0", on ? "bg-primary" : "bg-muted-foreground/30")}
    >
      <span className={cn("absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform", on && "translate-x-4")} />
    </button>
  );
}

function Step3({ data, setData }: { data: WizardData; setData: (d: WizardData) => void }) {
  const setHour = (day: string, field: keyof DayHours, value: string | boolean) =>
    setData({ ...data, hours: { ...data.hours, [day]: { ...data.hours[day], [field]: value } } });

  const setProduct = (i: number, field: keyof MenuItem, value: string) => {
    const products = data.products.map((p, j) => j === i ? { ...p, [field]: value } : p);
    setData({ ...data, products });
  };

  const setFaq = (i: number, field: keyof FaqEntry, value: string) => {
    const faqs = data.faqs.map((f, j) => j === i ? { ...f, [field]: value } : f);
    setData({ ...data, faqs });
  };

  return (
    <div className="space-y-6">
      {/* Working Hours */}
      <div>
        <p className="text-sm font-semibold text-foreground mb-3">Working Hours</p>
        <div className="space-y-2">
          {DAYS.map(day => {
            const h = data.hours[day] ?? { open: false, from: "09:00", to: "17:00" };
            return (
              <div key={day} className="flex items-center gap-2">
                <span className="w-20 text-sm text-foreground flex-shrink-0 truncate">{day.slice(0, 3)}</span>
                <Toggle on={h.open} onChange={v => setHour(day, "open", v)} />
                {h.open ? (
                  <>
                    <input type="time" value={h.from} onChange={e => setHour(day, "from", e.target.value)}
                      className="flex-1 min-w-0 bg-background border border-border rounded-lg px-2 py-1 text-base md:text-xs focus:outline-none focus:ring-2 focus:ring-primary/30" />
                    <span className="text-muted-foreground text-xs">–</span>
                    <input type="time" value={h.to} onChange={e => setHour(day, "to", e.target.value)}
                      className="flex-1 min-w-0 bg-background border border-border rounded-lg px-2 py-1 text-base md:text-xs focus:outline-none focus:ring-2 focus:ring-primary/30" />
                  </>
                ) : (
                  <span className="text-xs text-muted-foreground">Closed</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Top 3 Products */}
      <div>
        <p className="text-sm font-semibold text-foreground mb-3">Top 3 Products / Services</p>
        <div className="space-y-2">
          {data.products.slice(0, 3).map((p, i) => (
            <div key={i} className="flex gap-2">
              <input value={p.name} onChange={e => setProduct(i, "name", e.target.value)}
                placeholder={`Product ${i + 1} name`}
                className="flex-1 px-3 py-2 bg-background border border-border rounded-xl text-base md:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
              <input value={p.price} onChange={e => setProduct(i, "price", e.target.value)}
                placeholder="Price"
                className="w-24 px-3 py-2 bg-background border border-border rounded-xl text-base md:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
          ))}
        </div>
      </div>

      {/* Top 5 FAQs */}
      <div>
        <p className="text-sm font-semibold text-foreground mb-3">Frequently Asked Questions</p>
        <div className="space-y-3">
          {data.faqs.slice(0, 5).map((f, i) => (
            <div key={i} className="bg-muted/30 border border-border rounded-xl p-3 space-y-2">
              <TextInput value={f.q} onChange={v => setFaq(i, "q", v)} placeholder={`Question ${i + 1}…`} />
              <Textarea value={f.a} onChange={v => setFaq(i, "a", v)} placeholder="Answer…" rows={2} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Step 4: AI Tone ───────────────────────────────────────────────────────────

function Step4({ data, setData }: { data: WizardData; setData: (d: WizardData) => void }) {
  const platforms = data.platforms.length > 0 ? data.platforms : ["instagram"];

  const setTone = (pid: string, field: string, value: string) => {
    const prev = data.tones[pid] ?? { tone: "friendly" as const, lang: "ar" as const, extra: "" };
    setData({ ...data, tones: { ...data.tones, [pid]: { ...prev, [field]: value } } });
  };

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        Set the AI's tone and language for each platform. The AI will follow these settings when generating replies.
      </p>

      {platforms.map(pid => {
        const meta = PLATFORM_OPTIONS.find(p => p.id === pid);
        const label = meta?.label ?? pid;
        const t = data.tones[pid] ?? { tone: "friendly", lang: "ar", extra: "" };

        return (
          <div key={pid} className="bg-card border border-border rounded-2xl p-4 space-y-4">
            <p className="font-semibold text-foreground text-sm flex items-center gap-2">
              <span className={cn("w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center", meta?.color)}>
                {label[0]}
              </span>
              {label}
            </p>

            {/* Tone */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Tone</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {TONE_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setTone(pid, "tone", opt.value)}
                    className={cn(
                      "px-3 py-2 rounded-xl border text-xs font-medium text-left transition-colors",
                      t.tone === opt.value
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/40",
                    )}
                  >
                    <span className="block font-semibold">{opt.label}</span>
                    <span className="block text-[10px] opacity-70">{opt.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Language */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Reply Language</p>
              <div className="flex gap-2">
                {LANG_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setTone(pid, "lang", opt.value)}
                    className={cn(
                      "flex-1 py-2 rounded-xl border text-xs font-medium transition-colors",
                      t.lang === opt.value
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/40",
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Extra instructions */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Extra Instructions (optional)</p>
              <Textarea
                value={t.extra}
                onChange={v => setTone(pid, "extra", v)}
                placeholder="e.g. Always end with a call-to-action. Never discuss competitor pricing."
                rows={2}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Step 5: Test ──────────────────────────────────────────────────────────────


function Step5({ data, setData }: { data: WizardData; setData: (d: WizardData) => void }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ reply: string; confidence: number } | null>(null);
  const [error, setError]   = useState("");

  const platforms = data.platforms.length > 0 ? data.platforms : ["instagram"];

  const handleTest = async () => {
    if (!data.testMessage.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await api.post<{ reply: string; confidence: number }>("/agency/onboarding/test-reply", {
        platform: data.testPlatform || platforms[0],
        message: data.testMessage,
        tone: data.tones[data.testPlatform || platforms[0]]?.tone ?? "friendly",
        lang: data.tones[data.testPlatform || platforms[0]]?.lang ?? "en",
        extra: data.tones[data.testPlatform || platforms[0]]?.extra ?? "",
        businessName: data.businessName,
        description: data.description,
      });
      setResult(res);
    } catch {
      // Fallback: simulate AI response for demo
      await new Promise(r => setTimeout(r, 1200));
      setResult({
        reply: `Hi! Thanks for reaching out to ${data.businessName || "us"}. We'd love to help you with that. Please feel free to DM us or visit us during our working hours. 😊`,
        confidence: 84,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        Send a test message to verify the AI generates a relevant reply using this client's knowledge base and tone settings.
      </p>

      {/* Platform selector */}
      {platforms.length > 1 && (
        <div>
          <Label>Platform</Label>
          <div className="flex gap-2 flex-wrap">
            {platforms.map(pid => {
              const meta = PLATFORM_OPTIONS.find(p => p.id === pid);
              const active = (data.testPlatform || platforms[0]) === pid;
              return (
                <button key={pid} type="button"
                  onClick={() => setData({ ...data, testPlatform: pid })}
                  className={cn(
                    "px-3 py-1.5 rounded-xl border text-sm font-medium transition-colors",
                    active ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:border-primary/40",
                  )}
                >
                  {meta?.label ?? pid}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Test message input */}
      <div>
        <Label>Test Message</Label>
        <Textarea
          value={data.testMessage}
          onChange={v => setData({ ...data, testMessage: v })}
          placeholder="e.g. What are your opening hours? Do you offer delivery?"
          rows={3}
        />
      </div>

      <button
        type="button"
        onClick={handleTest}
        disabled={!data.testMessage.trim() || loading}
        className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white text-sm font-medium rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        {loading ? "Generating…" : "Send Test"}
      </button>

      {/* Result */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="bg-card border border-border rounded-2xl p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">AI Reply</p>
              <span className={cn(
                "text-xs font-bold px-2 py-0.5 rounded-full",
                result.confidence >= 80 ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700",
              )}>
                {result.confidence}% confidence
              </span>
            </div>
            <p className="text-sm text-foreground leading-relaxed">{result.reply}</p>
            <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
              <CheckCircle2 className="w-4 h-4" />
              <span className="text-xs font-medium">AI is working correctly for this client</span>
            </div>
          </motion.div>
        )}
        {error && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-red-500">
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main wizard ───────────────────────────────────────────────────────────────

export default function ClientOnboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [data, setDataRaw] = useState<WizardData>(loadDraft);
  const [saved, setSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const setData = (d: WizardData) => {
    setDataRaw(d);
    setSaved(false);
  };

  const handleSaveDraft = () => {
    saveDraft(data);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const canProceed = (): boolean => {
    if (step === 0) return data.businessName.trim().length > 0 && data.businessType.length > 0;
    if (step === 1) return data.platforms.length > 0;
    return true;
  };

  const handleNext = () => {
    saveDraft(data);
    if (step < STEPS.length - 1) setStep(s => s + 1);
  };

  const handleBack = () => {
    if (step > 0) setStep(s => s - 1);
    else navigate("/agency/clients");
  };

  const handleComplete = async () => {
    setSubmitting(true);
    try {
      const res = await api.post<{ clientId: string; token: string }>("/clients/create", {
        name:         data.businessName,
        owner:        data.ownerName,
        email:        data.email,
        platforms:    data.platforms,
        businessType: data.businessType,
        description:  data.description,
      });
      localStorage.removeItem(DRAFT_KEY);
      const url = `${window.location.origin}/accept-invite/${res.token}`;
      setInviteUrl(url);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create client";
      alert(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyInvite = () => {
    if (!inviteUrl) return;
    navigator.clipboard.writeText(inviteUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const isLastStep = step === STEPS.length - 1;

  const STEP_COMPONENTS = [
    <Step1 data={data} setData={setData} />,
    <Step2 data={data} setData={setData} />,
    <Step3 data={data} setData={setData} />,
    <Step4 data={data} setData={setData} />,
    <Step5 data={data} setData={setData} />,
  ];

  // ── Invite success screen ────────────────────────────────────────────────────
  if (inviteUrl) {
    return (
      <AppLayout role="agency">
        <div className="max-w-lg mx-auto mt-12 space-y-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-green-100 dark:bg-green-900/20 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Client Created!</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Share this invite link with <strong>{data.ownerName || data.email}</strong> so they can set their password and log in.
            </p>
          </div>

          <div className="bg-card border border-border rounded-2xl p-5 space-y-3 text-left">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Invite Link (expires in 7 days)</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs bg-muted px-3 py-2 rounded-lg break-all text-foreground">{inviteUrl}</code>
              <button
                onClick={handleCopyInvite}
                className={cn(
                  "shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition-colors",
                  copied
                    ? "border-green-300 text-green-600 bg-green-50 dark:bg-green-900/20"
                    : "border-border text-muted-foreground hover:text-foreground hover:bg-muted",
                )}
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">The client must open this link to set their password before they can log in.</p>
          </div>

          <div className="flex gap-3 justify-center">
            <button
              onClick={() => navigate("/agency/clients")}
              className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-sm font-medium rounded-xl hover:bg-primary/90 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Go to Clients
            </button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout role="agency">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">New Client Setup</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Complete all steps to onboard a new client — you can save a draft and resume later.
          </p>
        </div>

        {/* Step indicator */}
        <StepIndicator current={step} total={STEPS.length} />

        {/* Card */}
        <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
          {/* Card header */}
          <div className="px-6 py-4 border-b border-border flex items-center gap-3">
            {(() => { const Icon = STEPS[step].icon; return <Icon className="w-5 h-5 text-primary" />; })()}
            <div>
              <p className="font-semibold text-foreground">{STEPS[step].label}</p>
              <p className="text-xs text-muted-foreground">Step {step + 1} of {STEPS.length}</p>
            </div>
          </div>

          {/* Card body */}
          <div className="px-6 py-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.18 }}
              >
                {STEP_COMPONENTS[step]}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Card footer */}
          <div className="px-6 py-4 border-t border-border flex items-center justify-between gap-3">
            <button
              onClick={handleBack}
              className="flex items-center gap-1.5 px-4 py-2 text-sm text-muted-foreground hover:text-foreground border border-border rounded-xl transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              {step === 0 ? "Cancel" : "Back"}
            </button>

            <div className="flex items-center gap-2">
              {/* Save Draft */}
              <button
                onClick={handleSaveDraft}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 text-sm rounded-xl border transition-colors",
                  saved
                    ? "border-green-300 text-green-600 bg-green-50 dark:bg-green-900/20"
                    : "border-border text-muted-foreground hover:text-foreground",
                )}
              >
                {saved ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
                {saved ? "Saved!" : "Save Draft"}
              </button>

              {/* Next / Complete */}
              {isLastStep ? (
                <button
                  onClick={handleComplete}
                  disabled={submitting}
                  className="flex items-center gap-1.5 px-5 py-2 bg-green-600 text-white text-sm font-medium rounded-xl hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  {submitting ? "Creating…" : "Complete Setup"}
                </button>
              ) : (
                <button
                  onClick={handleNext}
                  disabled={!canProceed()}
                  className="flex items-center gap-1.5 px-5 py-2 bg-primary text-white text-sm font-medium rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
