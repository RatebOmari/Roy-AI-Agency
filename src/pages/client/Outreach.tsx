import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  Plus, Trash2, Loader2, X, Send, Copy,
  MessageSquare, Mail, Phone as PhoneIcon, Megaphone,
  ChevronLeft, ChevronRight, Sparkles, AlertCircle,
  CheckCircle2, Clock, Users, BarChart3, XCircle,
  Upload, Calendar, RefreshCw,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  useOutreachMessages, useCreateOutreach, useUpdateOutreach, useDeleteOutreach,
  useSendOutreach, useCancelOutreach, useDuplicateOutreach, useGenerateOutreach,
  useOutreachReach,
} from "@/hooks/useOutreach";
import type { OutreachMessage, OutreachChannel, OutreachStatus, OutreachAudienceFilter } from "@/types";
import { cn } from "@/lib/utils";

// ── Constants ─────────────────────────────────────────────────────────────────

const CHANNEL_CONFIG: Record<OutreachChannel, {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  chip: string;
  description: string;
}> = {
  whatsapp: {
    label: "WhatsApp",
    icon: MessageSquare,
    color: "bg-green-500",
    chip: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400",
    description: "Rich messages with images & quick-reply buttons",
  },
  sms: {
    label: "SMS",
    icon: PhoneIcon,
    color: "bg-blue-500",
    chip: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400",
    description: "160-character text messages to any mobile number",
  },
  email: {
    label: "Email",
    icon: Mail,
    color: "bg-violet-500",
    chip: "bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400",
    description: "Subject + body with open & click tracking",
  },
};

const STATUS_STYLE: Record<OutreachStatus, string> = {
  draft:     "bg-muted text-muted-foreground",
  scheduled: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400",
  sending:   "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400",
  sent:      "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400",
  failed:    "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400",
};

const TONES = ["friendly", "professional", "fun", "informative"] as const;
type Tone = typeof TONES[number];

function pct(part: number, total: number) {
  return total > 0 ? Math.round((part / total) * 100) : 0;
}

function formatDate(iso?: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function parseAudienceFilter(raw?: string): OutreachAudienceFilter {
  try { return raw ? JSON.parse(raw) as OutreachAudienceFilter : { type: "all" }; }
  catch { return { type: "all" }; }
}

function parseQuickReplies(raw?: string): string[] {
  try { return raw ? JSON.parse(raw) as string[] : []; }
  catch { return []; }
}

// ── Step 1 — Channel Picker ───────────────────────────────────────────────────

function Step1Channel({ value, onChange }: {
  value: OutreachChannel | null;
  onChange: (ch: OutreachChannel) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold text-foreground">Choose a channel</h3>
        <p className="text-sm text-muted-foreground mt-1">Each channel has different delivery and tracking capabilities.</p>
      </div>
      <div className="grid gap-3">
        {(Object.entries(CHANNEL_CONFIG) as [OutreachChannel, typeof CHANNEL_CONFIG[OutreachChannel]][]).map(([ch, cfg]) => {
          const Icon = cfg.icon;
          const selected = value === ch;
          return (
            <button
              key={ch}
              onClick={() => onChange(ch)}
              className={cn(
                "flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left",
                selected
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/40 bg-card"
              )}
            >
              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-white flex-shrink-0", cfg.color)}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground">{cfg.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{cfg.description}</p>
              </div>
              {selected && <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Step 2 — Compose (channel-specific) ──────────────────────────────────────

interface ComposeState {
  title: string;
  messageBody: string;
  subject: string;
  imageUrl: string | null;
  quickReplies: string[];
}

function Step2Compose({ channel, state, onChange }: {
  channel: OutreachChannel;
  state: ComposeState;
  onChange: (patch: Partial<ComposeState>) => void;
}) {
  const generate = useGenerateOutreach();
  const [tone, setTone] = useState<Tone>("friendly");
  const [prompt, setPrompt] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const SMS_LIMIT = 160;
  const smsLen = state.messageBody.length;
  const smsOver = smsLen > 155;

  const handleGenerate = () => {
    if (!prompt.trim()) return;
    generate.mutate(
      { prompt: prompt.trim(), channel, tone },
      {
        onSuccess: (data) => {
          if (data.subject) onChange({ subject: data.subject, messageBody: data.body });
          else onChange({ messageBody: data.body });
        },
      }
    );
  };

  const handleImageUpload = async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`${import.meta.env.VITE_API_URL ?? ""}/api/resources/upload`, { method: "POST", body: formData });
      if (res.ok) {
        const data = await res.json() as { url: string };
        onChange({ imageUrl: data.url });
      } else {
        onChange({ imageUrl: URL.createObjectURL(file) });
      }
    } catch {
      onChange({ imageUrl: URL.createObjectURL(file) });
    } finally {
      setUploading(false);
    }
  };

  const addQuickReply = () => {
    if (state.quickReplies.length < 3) onChange({ quickReplies: [...state.quickReplies, ""] });
  };
  const updateQR = (i: number, val: string) => {
    const qr = [...state.quickReplies];
    qr[i] = val;
    onChange({ quickReplies: qr });
  };
  const removeQR = (i: number) => onChange({ quickReplies: state.quickReplies.filter((_, idx) => idx !== i) });

  return (
    <div className="space-y-4">
      {/* Title */}
      <div>
        <label className="text-xs font-medium text-muted-foreground">Outreach Title</label>
        <input
          value={state.title}
          onChange={e => onChange({ title: e.target.value })}
          placeholder="e.g. Ramadan Special Announcement"
          className="mt-1.5 w-full px-3 py-2 text-sm rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      {/* AI Generate */}
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 space-y-2">
        <p className="text-xs font-medium text-primary flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5" /> AI Generate</p>
        <div className="flex gap-1.5 flex-wrap">
          {TONES.map(t => (
            <button key={t} onClick={() => setTone(t)}
              className={cn("px-2.5 py-1 rounded-lg text-xs font-medium border capitalize transition-colors",
                tone === t ? "bg-primary text-white border-primary" : "border-border text-muted-foreground hover:border-primary/50"
              )}>
              {t}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            placeholder={channel === "sms" ? "Short description (160 chars)…" : "Describe your campaign…"}
            className="flex-1 px-3 py-2 text-sm rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
            onKeyDown={e => { if (e.key === "Enter" && !generate.isPending) handleGenerate(); }}
          />
          <button onClick={handleGenerate} disabled={!prompt.trim() || generate.isPending}
            className="flex items-center gap-1.5 px-3 py-2 bg-primary text-white text-xs font-medium rounded-xl hover:bg-primary/90 disabled:opacity-50 transition-colors flex-shrink-0">
            {generate.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            Generate
          </button>
        </div>
      </div>

      {/* Email: subject */}
      {channel === "email" && (
        <div>
          <label className="text-xs font-medium text-muted-foreground">Subject Line</label>
          <input
            value={state.subject}
            onChange={e => onChange({ subject: e.target.value })}
            placeholder="e.g. 🍽️ Our New Summer Menu Is Here!"
            className="mt-1.5 w-full px-3 py-2 text-sm rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
      )}

      {/* Email/WhatsApp: image upload */}
      {channel !== "sms" && (
        <div>
          <label className="text-xs font-medium text-muted-foreground">
            {channel === "email" ? "Header Image (optional)" : "Image (optional)"}
          </label>
          <div className="mt-1.5">
            {state.imageUrl ? (
              <div className="relative w-32 h-24 rounded-xl overflow-hidden border border-border">
                <img src={state.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                <button onClick={() => onChange({ imageUrl: null })}
                  className="absolute top-1 right-1 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center text-white hover:bg-black/80">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <button onClick={() => fileRef.current?.click()} disabled={uploading}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-border text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors text-xs disabled:opacity-50">
                {uploading ? <><Loader2 className="w-4 h-4 animate-spin" /> Uploading…</> : <><Upload className="w-4 h-4" /> Upload Image</>}
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/*" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); }} />
          </div>
        </div>
      )}

      {/* Message body */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-medium text-muted-foreground">Message</label>
          {channel === "sms" && (
            <span className={cn("text-xs tabular-nums", smsOver ? "text-red-500 font-semibold" : "text-muted-foreground")}>
              {smsLen}/{SMS_LIMIT}
            </span>
          )}
        </div>
        {smsOver && (
          <div className="flex items-center gap-1.5 text-xs text-red-500 mb-1.5 bg-red-50 dark:bg-red-900/20 px-3 py-1.5 rounded-lg">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            Message will be split into multiple SMS — recipients may be charged extra.
          </div>
        )}
        <textarea
          value={state.messageBody}
          onChange={e => onChange({ messageBody: e.target.value })}
          rows={channel === "email" ? 8 : 5}
          placeholder={
            channel === "whatsapp" ? "Write your WhatsApp message…" :
            channel === "sms"      ? "Keep it short and clear (160 chars max)…" :
            "Write your email body…"
          }
          className="w-full px-3 py-2.5 text-sm rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
        />
      </div>

      {/* WhatsApp: quick-reply buttons */}
      {channel === "whatsapp" && (
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-medium text-muted-foreground">Quick Reply Buttons (up to 3)</label>
            {state.quickReplies.length < 3 && (
              <button onClick={addQuickReply} className="text-xs text-primary hover:underline flex items-center gap-0.5">
                <Plus className="w-3 h-3" /> Add button
              </button>
            )}
          </div>
          <div className="space-y-2">
            {state.quickReplies.map((qr, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  value={qr}
                  onChange={e => updateQR(i, e.target.value)}
                  placeholder={`Button ${i + 1} label…`}
                  maxLength={25}
                  className="flex-1 px-3 py-2 text-sm rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <button onClick={() => removeQR(i)} className="p-2 text-muted-foreground hover:text-red-500 transition-colors flex-shrink-0">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Email preview hint */}
      {channel === "email" && state.subject && state.messageBody && (
        <div className="bg-muted/50 border border-border rounded-xl p-4 space-y-2">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Preview</p>
          <p className="text-xs font-semibold text-foreground">{state.subject}</p>
          <p className="text-xs text-muted-foreground whitespace-pre-wrap line-clamp-4">{state.messageBody}</p>
        </div>
      )}
    </div>
  );
}

// ── Step 3 — Audience Builder ─────────────────────────────────────────────────

interface AudienceState {
  type:           "all" | "tag" | "platform";
  tagValue:       string;
  platformValue:  string;
  activeDays:     number | null;
}

function Step3Audience({ channel, state, onChange }: {
  channel: OutreachChannel;
  state:   AudienceState;
  onChange: (patch: Partial<AudienceState>) => void;
}) {
  const filter: OutreachAudienceFilter = {
    type:          state.type,
    tagValue:      state.type === "tag"      ? state.tagValue      : null,
    platformValue: state.type === "platform" ? state.platformValue : null,
    activeDays:    state.activeDays,
  };
  const { data: reach, isLoading: reachLoading } = useOutreachReach(channel, filter);

  const channelFieldLabel = channel === "whatsapp" ? "WhatsApp handle"
    : channel === "sms"   ? "phone number"
    : "email address";

  const PLATFORMS = ["instagram", "tiktok", "facebook", "whatsapp", "sms"];
  const ACTIVE_DAY_OPTIONS = [7, 14, 30, 60, 90];

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold text-foreground">Audience</h3>
        <p className="text-sm text-muted-foreground mt-1">Choose who receives this outreach. Only contacts with a {channelFieldLabel} will be messaged.</p>
      </div>

      {/* Filter type */}
      <div>
        <label className="text-xs font-medium text-muted-foreground">Target</label>
        <div className="flex gap-2 mt-1.5 flex-wrap">
          {(["all", "tag", "platform"] as const).map(t => (
            <button key={t} onClick={() => onChange({ type: t })}
              className={cn("px-3 py-1.5 rounded-xl text-xs font-medium border capitalize transition-colors",
                state.type === t ? "bg-primary text-white border-primary" : "border-border text-muted-foreground hover:border-primary/50"
              )}>
              {t === "all" ? "All Contacts" : t === "tag" ? "By Tag" : "By Platform"}
            </button>
          ))}
        </div>
      </div>

      {/* Tag picker */}
      {state.type === "tag" && (
        <div>
          <label className="text-xs font-medium text-muted-foreground">Tag</label>
          <input
            value={state.tagValue}
            onChange={e => onChange({ tagValue: e.target.value })}
            placeholder="e.g. vip, complaint, new"
            className="mt-1.5 w-full px-3 py-2 text-sm rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
      )}

      {/* Platform picker */}
      {state.type === "platform" && (
        <div>
          <label className="text-xs font-medium text-muted-foreground">Source Platform</label>
          <div className="flex gap-2 mt-1.5 flex-wrap">
            {PLATFORMS.map(p => (
              <button key={p} onClick={() => onChange({ platformValue: p })}
                className={cn("px-3 py-1.5 rounded-xl text-xs font-medium border capitalize transition-colors",
                  state.platformValue === p ? "bg-primary text-white border-primary" : "border-border text-muted-foreground hover:border-primary/50"
                )}>
                {p}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Active days filter */}
      <div>
        <label className="text-xs font-medium text-muted-foreground">Last Active</label>
        <div className="flex gap-2 mt-1.5 flex-wrap">
          <button onClick={() => onChange({ activeDays: null })}
            className={cn("px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors",
              state.activeDays === null ? "bg-primary text-white border-primary" : "border-border text-muted-foreground hover:border-primary/50"
            )}>
            Any time
          </button>
          {ACTIVE_DAY_OPTIONS.map(d => (
            <button key={d} onClick={() => onChange({ activeDays: d })}
              className={cn("px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors",
                state.activeDays === d ? "bg-primary text-white border-primary" : "border-border text-muted-foreground hover:border-primary/50"
              )}>
              Last {d}d
            </button>
          ))}
        </div>
      </div>

      {/* Reach estimate */}
      <div className={cn("rounded-xl p-4 border flex items-center gap-4",
        reachLoading ? "bg-muted/40 border-border" : "bg-primary/5 border-primary/20"
      )}>
        {reachLoading ? (
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        ) : (
          <Users className="w-5 h-5 text-primary flex-shrink-0" />
        )}
        <div>
          {reachLoading ? (
            <p className="text-sm text-muted-foreground">Calculating reach…</p>
          ) : (
            <>
              <p className="text-xl font-bold text-foreground">{reach?.channelReach ?? 0}</p>
              <p className="text-xs text-muted-foreground">
                contacts have a {channelFieldLabel}
                {reach && reach.total > 0 && reach.channelReach !== reach.total &&
                  ` (${reach.total} match filter, ${reach.total - (reach.channelReach ?? 0)} missing ${channelFieldLabel})`
                }
              </p>
            </>
          )}
        </div>
      </div>

      {!reachLoading && reach && (reach.channelReach ?? 0) === 0 && (
        <div className="flex items-center gap-2 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-3 py-2.5 rounded-xl border border-amber-200 dark:border-amber-700">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          No contacts match this filter with a {channelFieldLabel}. Add contacts first or change the filter.
        </div>
      )}
    </div>
  );
}

// ── Step 4 — Schedule / Send ──────────────────────────────────────────────────

function Step4Schedule({ scheduledAt, onChange }: {
  scheduledAt: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold text-foreground">When to send?</h3>
        <p className="text-sm text-muted-foreground mt-1">Send immediately or schedule for a future date and time.</p>
      </div>
      <div className="space-y-3">
        <button onClick={() => onChange("")}
          className={cn("w-full flex items-center gap-3 p-4 rounded-2xl border-2 transition-all text-left",
            !scheduledAt ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/40"
          )}>
          <Send className="w-5 h-5 text-primary flex-shrink-0" />
          <div>
            <p className="font-semibold text-foreground text-sm">Send Now</p>
            <p className="text-xs text-muted-foreground">Start delivery immediately</p>
          </div>
          {!scheduledAt && <CheckCircle2 className="w-5 h-5 text-primary ml-auto flex-shrink-0" />}
        </button>
        <button onClick={() => onChange(new Date(Date.now() + 3_600_000).toISOString().slice(0, 16))}
          className={cn("w-full flex items-center gap-3 p-4 rounded-2xl border-2 transition-all text-left",
            scheduledAt ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/40"
          )}>
          <Calendar className="w-5 h-5 text-primary flex-shrink-0" />
          <div>
            <p className="font-semibold text-foreground text-sm">Schedule</p>
            <p className="text-xs text-muted-foreground">Pick a future date and time</p>
          </div>
          {scheduledAt && <CheckCircle2 className="w-5 h-5 text-primary ml-auto flex-shrink-0" />}
        </button>
      </div>
      {scheduledAt && (
        <div>
          <label className="text-xs font-medium text-muted-foreground">Date & Time</label>
          <input
            type="datetime-local"
            value={scheduledAt}
            onChange={e => onChange(e.target.value)}
            min={new Date().toISOString().slice(0, 16)}
            className="mt-1.5 w-full px-3 py-2 text-sm rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
      )}
    </div>
  );
}

// ── Wizard Dialog ─────────────────────────────────────────────────────────────

interface WizardState {
  channel:      OutreachChannel | null;
  compose:      ComposeState;
  audience:     AudienceState;
  scheduledAt:  string;
}

const DEFAULT_WIZARD: WizardState = {
  channel: null,
  compose: { title: "", messageBody: "", subject: "", imageUrl: null, quickReplies: [] },
  audience: { type: "all", tagValue: "", platformValue: "whatsapp", activeDays: null },
  scheduledAt: "",
};

function buildWizardFromOutreach(o: OutreachMessage): WizardState {
  const af = parseAudienceFilter(o.audienceFilter);
  return {
    channel: o.channel,
    compose: {
      title:        o.title,
      messageBody:  o.messageBody,
      subject:      o.subject ?? "",
      imageUrl:     o.imageUrl ?? null,
      quickReplies: parseQuickReplies(o.quickReplies),
    },
    audience: {
      type:          af.type,
      tagValue:      af.tagValue ?? "",
      platformValue: af.platformValue ?? "whatsapp",
      activeDays:    af.activeDays ?? null,
    },
    scheduledAt: o.scheduledAt ? new Date(o.scheduledAt).toISOString().slice(0, 16) : "",
  };
}

function WizardDialog({ editing, onClose }: {
  editing: OutreachMessage | null;
  onClose: () => void;
}) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(editing ? 2 : 1);
  const [state, setState] = useState<WizardState>(
    editing ? buildWizardFromOutreach(editing) : DEFAULT_WIZARD
  );

  const createOutreach = useCreateOutreach();
  const updateOutreach = useUpdateOutreach();
  const sendOutreach   = useSendOutreach();

  const saving = createOutreach.isPending || updateOutreach.isPending || sendOutreach.isPending;

  const patch = (p: Partial<WizardState>) => setState(s => ({ ...s, ...p }));

  const canNext = () => {
    if (step === 1) return state.channel !== null;
    if (step === 2) return state.compose.title.trim() !== "" && state.compose.messageBody.trim() !== ""
      && (state.channel !== "email" || state.compose.subject.trim() !== "");
    if (step === 3) return true;
    return true;
  };

  const handleSaveDraft = async () => {
    const payload = buildPayload(state, false);
    if (editing) {
      await updateOutreach.mutateAsync({ id: editing.id, ...payload });
    } else {
      await createOutreach.mutateAsync(payload);
    }
    onClose();
  };

  const handleSendOrSchedule = async () => {
    const payload = buildPayload(state, !!state.scheduledAt);
    let outreach: OutreachMessage;
    if (editing) {
      outreach = await updateOutreach.mutateAsync({ id: editing.id, ...payload });
    } else {
      outreach = await createOutreach.mutateAsync(payload);
    }
    if (!state.scheduledAt) {
      await sendOutreach.mutateAsync(outreach.id);
    }
    onClose();
  };

  const STEP_LABELS = ["Channel", "Compose", "Audience", "Schedule"];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-lg bg-card rounded-2xl border border-border shadow-xl flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-border flex-shrink-0">
          <div>
            <h2 className="font-semibold text-foreground">{editing ? "Edit Outreach" : "New Outreach"}</h2>
            <div className="flex items-center gap-1.5 mt-1.5">
              {STEP_LABELS.map((label, i) => {
                const num = (i + 1) as 1 | 2 | 3 | 4;
                const done = step > num;
                const active = step === num;
                return (
                  <div key={label} className="flex items-center gap-1">
                    <div className={cn("w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center",
                      done    ? "bg-primary text-white" :
                      active  ? "bg-primary/20 text-primary border border-primary" :
                                "bg-muted text-muted-foreground"
                    )}>
                      {done ? "✓" : num}
                    </div>
                    <span className={cn("text-[10px] font-medium hidden sm:inline",
                      active ? "text-primary" : "text-muted-foreground"
                    )}>{label}</span>
                    {i < 3 && <div className="w-3 h-px bg-border" />}
                  </div>
                );
              })}
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {step === 1 && (
            <Step1Channel value={state.channel} onChange={ch => { patch({ channel: ch }); }} />
          )}
          {step === 2 && state.channel && (
            <Step2Compose
              channel={state.channel}
              state={state.compose}
              onChange={p => patch({ compose: { ...state.compose, ...p } })}
            />
          )}
          {step === 3 && state.channel && (
            <Step3Audience
              channel={state.channel}
              state={state.audience}
              onChange={p => patch({ audience: { ...state.audience, ...p } })}
            />
          )}
          {step === 4 && (
            <Step4Schedule scheduledAt={state.scheduledAt} onChange={v => patch({ scheduledAt: v })} />
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-2 px-6 py-4 border-t border-border flex-shrink-0">
          {step > 1 && (
            <button onClick={() => setStep(s => (s - 1) as 1|2|3|4)}
              className="flex items-center gap-1 px-3 py-2 text-sm text-muted-foreground hover:text-foreground rounded-xl hover:bg-muted transition-colors">
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
          )}
          <div className="flex-1" />
          {step < 4 ? (
            <button onClick={() => setStep(s => (s + 1) as 1|2|3|4)} disabled={!canNext()}
              className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white text-sm font-medium rounded-xl hover:bg-primary/90 disabled:opacity-50 transition-colors">
              Next <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <>
              <button onClick={handleSaveDraft} disabled={saving}
                className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground rounded-xl hover:bg-muted transition-colors border border-border">
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin inline mr-1" /> : null}
                Save Draft
              </button>
              <button onClick={handleSendOrSchedule} disabled={saving}
                className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white text-sm font-medium rounded-xl hover:bg-primary/90 disabled:opacity-50 transition-colors">
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : state.scheduledAt ? <Calendar className="w-3.5 h-3.5" /> : <Send className="w-3.5 h-3.5" />}
                {state.scheduledAt ? "Schedule" : "Send Now"}
              </button>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}

function buildPayload(state: WizardState, scheduled: boolean) {
  const af: OutreachAudienceFilter = {
    type:          state.audience.type,
    tagValue:      state.audience.type === "tag"      ? state.audience.tagValue      : null,
    platformValue: state.audience.type === "platform" ? state.audience.platformValue : null,
    activeDays:    state.audience.activeDays,
  };
  return {
    title:          state.compose.title,
    channel:        state.channel!,
    messageBody:    state.compose.messageBody,
    subject:        state.compose.subject || null,
    imageUrl:       state.compose.imageUrl ?? null,
    quickReplies:   JSON.stringify(state.compose.quickReplies),
    audienceFilter: JSON.stringify(af),
    estimatedReach: 0,
    status:         (scheduled ? "scheduled" : "draft") as OutreachStatus,
    scheduledAt:    state.scheduledAt ? new Date(state.scheduledAt).toISOString() : null,
  };
}

// ── Outreach Card ─────────────────────────────────────────────────────────────

function OutreachCard({ msg, onEdit, onDelete, onSend, onCancel, onDuplicate }: {
  msg: OutreachMessage;
  onEdit:      (m: OutreachMessage) => void;
  onDelete:    (id: string) => void;
  onSend:      (id: string) => void;
  onCancel:    (id: string) => void;
  onDuplicate: (id: string) => void;
}) {
  const cfg = CHANNEL_CONFIG[msg.channel];
  const Icon = cfg.icon;
  const isDraft     = msg.status === "draft";
  const isScheduled = msg.status === "scheduled";
  const isSent      = msg.status === "sent";
  const isSending   = msg.status === "sending";
  const canEdit     = isDraft;
  const canDelete   = isDraft || isScheduled;
  const canSend     = isDraft;
  const canCancel   = isScheduled;

  const metricLabel = msg.channel === "email" ? "Opened" : msg.channel === "sms" ? "Delivered" : "Read";

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-2xl border border-border overflow-hidden"
    >
      <div className="p-4 space-y-3">
        {/* Top row */}
        <div className="flex items-start gap-3">
          <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center text-white flex-shrink-0", cfg.color)}>
            <Icon className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{msg.title}</p>
            {msg.channel === "email" && msg.subject && (
              <p className="text-xs text-muted-foreground truncate">{msg.subject}</p>
            )}
          </div>
          <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0", STATUS_STYLE[msg.status])}>
            {msg.status.charAt(0).toUpperCase() + msg.status.slice(1)}
          </span>
        </div>

        {/* Message preview */}
        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{msg.messageBody}</p>

        {/* Stats (only for sent/sending) */}
        {(isSent || isSending) && (
          <div className="flex items-center gap-4 pt-1">
            <div className="text-center">
              <p className="text-base font-bold text-foreground">{msg.sentCount.toLocaleString()}</p>
              <p className="text-[10px] text-muted-foreground">Sent</p>
            </div>
            {msg.channel !== "sms" && (
              <div className="text-center">
                <p className="text-base font-bold text-foreground">{msg.openedCount.toLocaleString()}</p>
                <p className="text-[10px] text-muted-foreground">{metricLabel}</p>
              </div>
            )}
            {msg.channel === "sms" && (
              <div className="text-center">
                <p className="text-base font-bold text-foreground">{msg.deliveredCount.toLocaleString()}</p>
                <p className="text-[10px] text-muted-foreground">Delivered</p>
              </div>
            )}
            <div className="text-center">
              <p className="text-base font-bold text-foreground">{msg.repliedCount.toLocaleString()}</p>
              <p className="text-[10px] text-muted-foreground">Replied</p>
            </div>
            {msg.channel !== "sms" && msg.sentCount > 0 && (
              <div className="text-center">
                <p className="text-base font-bold text-foreground">{pct(msg.openedCount, msg.sentCount)}%</p>
                <p className="text-[10px] text-muted-foreground">Rate</p>
              </div>
            )}
          </div>
        )}

        {/* Audience + schedule */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
          {msg.estimatedReach > 0 && (
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3" /> {msg.estimatedReach.toLocaleString()} contacts
            </span>
          )}
          {msg.scheduledAt && isScheduled && (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" /> {formatDate(msg.scheduledAt)}
            </span>
          )}
          {msg.sentAt && isSent && (
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-green-500" /> Sent {formatDate(msg.sentAt)}
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 pt-1 flex-wrap">
          {canSend && (
            <button onClick={() => onSend(msg.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white text-xs font-medium rounded-xl hover:bg-primary/90 transition-colors">
              <Send className="w-3 h-3" /> Send Now
            </button>
          )}
          {canEdit && (
            <button onClick={() => onEdit(msg)}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-border text-xs font-medium rounded-xl hover:bg-muted transition-colors text-foreground">
              Edit
            </button>
          )}
          {canCancel && (
            <button onClick={() => onCancel(msg.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-border text-xs font-medium rounded-xl hover:bg-muted transition-colors text-muted-foreground">
              <XCircle className="w-3 h-3" /> Cancel
            </button>
          )}
          <button onClick={() => onDuplicate(msg.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-border text-xs font-medium rounded-xl hover:bg-muted transition-colors text-muted-foreground">
            <Copy className="w-3 h-3" /> Duplicate
          </button>
          {canDelete && (
            <button onClick={() => onDelete(msg.id)}
              className="ml-auto p-1.5 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 text-muted-foreground hover:text-red-500 transition-colors">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

type StatusFilter = OutreachStatus | "all";
const STATUS_TABS: StatusFilter[] = ["all", "draft", "scheduled", "sent", "failed"];
type ChannelFilter = OutreachChannel | "all";

export default function Outreach() {
  const { user } = useAuth();
  const businessName = user?.businessName ?? "My Business";
  const { data: messages = [], isLoading } = useOutreachMessages();

  const sendOutreach      = useSendOutreach();
  const cancelOutreach    = useCancelOutreach();
  const duplicateOutreach = useDuplicateOutreach();
  const deleteOutreach    = useDeleteOutreach();

  const [wizardOpen, setWizardOpen]     = useState(false);
  const [editMsg, setEditMsg]           = useState<OutreachMessage | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>("all");

  const filtered = messages.filter(m => {
    if (statusFilter  !== "all" && m.status  !== statusFilter)  return false;
    if (channelFilter !== "all" && m.channel !== channelFilter) return false;
    return true;
  });

  const openNew  = () => { setEditMsg(null); setWizardOpen(true); };
  const openEdit = (m: OutreachMessage) => { setEditMsg(m); setWizardOpen(true); };
  const close    = () => { setWizardOpen(false); setEditMsg(null); };

  const pendingCount   = messages.filter(m => m.status === "scheduled").length;
  const totalSent      = messages.filter(m => m.status === "sent").reduce((s, m) => s + m.sentCount, 0);

  return (
    <AppLayout role="client" businessName={businessName}>
      <div className="space-y-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <Megaphone className="w-6 h-6 text-primary" />
                Outreach
              </h1>
              <p className="text-sm text-muted-foreground mt-1">Send multi-channel messages to your contacts</p>
            </div>
            <button onClick={openNew}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary/90 transition-colors">
              <Plus className="w-4 h-4" /> New Outreach
            </button>
          </div>
        </motion.div>

        {/* KPIs */}
        {messages.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Total Messages", value: messages.length, icon: Megaphone },
              { label: "Scheduled",      value: pendingCount,    icon: Clock },
              { label: "Total Sent",     value: totalSent.toLocaleString(), icon: Send },
              { label: "Channels Used",  value: [...new Set(messages.map(m => m.channel))].length, icon: BarChart3 },
            ].map(k => (
              <div key={k.label} className="bg-card rounded-2xl border border-border p-4 flex items-center gap-3">
                <k.icon className="w-5 h-5 text-primary flex-shrink-0" />
                <div>
                  <p className="text-xl font-bold text-foreground">{k.value}</p>
                  <p className="text-xs text-muted-foreground">{k.label}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center">
          {/* Status filter */}
          <div className="flex bg-muted p-1 rounded-xl gap-0.5">
            {STATUS_TABS.map(s => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={cn("px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors",
                  statusFilter === s ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}>
                {s === "all" ? `All (${messages.length})` : s}
              </button>
            ))}
          </div>
          {/* Channel filter */}
          <div className="flex gap-1.5 flex-wrap">
            {(["all", "whatsapp", "sms", "email"] as ChannelFilter[]).map(ch => {
              const cfg = ch !== "all" ? CHANNEL_CONFIG[ch] : null;
              return (
                <button key={ch} onClick={() => setChannelFilter(ch)}
                  className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
                    channelFilter === ch ? "bg-primary text-white border-primary" : "border-border text-muted-foreground hover:border-primary/50"
                  )}>
                  {cfg && <div className={cn("w-2 h-2 rounded-full", cfg.color)} />}
                  {ch === "all" ? "All Channels" : cfg!.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <Megaphone className="w-10 h-10 mx-auto mb-3 opacity-20" />
            <p className="text-sm font-medium">
              {statusFilter === "all" && channelFilter === "all"
                ? "No outreach messages yet"
                : "No messages match this filter"}
            </p>
            {statusFilter === "all" && channelFilter === "all" && (
              <p className="text-xs mt-1 opacity-70">Create your first outreach to connect with your contacts</p>
            )}
            {(statusFilter !== "all" || channelFilter !== "all") && (
              <button onClick={() => { setStatusFilter("all"); setChannelFilter("all"); }}
                className="mt-3 text-xs text-primary hover:underline flex items-center gap-1 mx-auto">
                <RefreshCw className="w-3 h-3" /> Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(msg => (
              <OutreachCard
                key={msg.id}
                msg={msg}
                onEdit={openEdit}
                onDelete={id => deleteOutreach.mutate(id)}
                onSend={id => sendOutreach.mutate(id)}
                onCancel={id => cancelOutreach.mutate(id)}
                onDuplicate={id => duplicateOutreach.mutate(id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Wizard */}
      <AnimatePresence>
        {wizardOpen && (
          <WizardDialog editing={editMsg} onClose={close} />
        )}
      </AnimatePresence>
    </AppLayout>
  );
}
