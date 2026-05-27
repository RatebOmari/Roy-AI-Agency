import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import type { Contact, Channel } from "@/types";
import {
  Users, Search, ArrowLeft, X, Plus,
  Smartphone, Phone,
  Megaphone, CheckCircle2, Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PLATFORM_CONFIG } from "@/constants/platforms";

// ── Channel config ─────────────────────────────────────────────────────────

const p = PLATFORM_CONFIG;
const CHANNEL_CFG: Record<string, {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  chipClass: string;
  dotClass: string;
}> = {
  instagram_dm:       { label: "Instagram DM", icon: p.instagram.icon, chipClass: p.instagram.color, dotClass: p.instagram.dotColor },
  instagram_comment:  { label: "Instagram",    icon: p.instagram.icon, chipClass: p.instagram.color, dotClass: p.instagram.dotColor },
  tiktok_comment:     { label: "TikTok",       icon: p.tiktok.icon,    chipClass: p.tiktok.color,    dotClass: p.tiktok.dotColor    },
  tiktok_dm:          { label: "TikTok DM",    icon: p.tiktok.icon,    chipClass: p.tiktok.color,    dotClass: p.tiktok.dotColor    },
  facebook_comment:   { label: "Facebook",     icon: p.facebook.icon,  chipClass: p.facebook.color,  dotClass: p.facebook.dotColor  },
  facebook_messenger: { label: "Messenger",    icon: p.facebook.icon,  chipClass: p.facebook.color,  dotClass: p.facebook.dotColor  },
  whatsapp_business:  { label: "WhatsApp",     icon: p.whatsapp.icon,  chipClass: p.whatsapp.color,  dotClass: p.whatsapp.dotColor  },
  sms:                { label: "SMS",  icon: Smartphone, chipClass: "bg-slate-500 text-white", dotClass: "bg-slate-500" },
  phone_call:         { label: "Call", icon: Phone,      chipClass: "bg-slate-600 text-white", dotClass: "bg-slate-600" },
};

function channelPlatform(ch: string) {
  if (ch.includes("instagram")) return "instagram";
  if (ch.includes("tiktok"))    return "tiktok";
  if (ch.includes("facebook") || ch === "facebook_messenger") return "facebook";
  if (ch === "whatsapp_business") return "whatsapp";
  if (ch === "sms")               return "sms";
  return "other";
}

function timeAgo(iso: string) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins < 1)  return "just now";
  if (mins < 60) return `${mins}m ago`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function initials(name: string) {
  return name.split(" ").map(w => w[0] ?? "").join("").toUpperCase().slice(0, 2) || "?";
}

// ── Mock data ──────────────────────────────────────────────────────────────

const MOCK_CONTACTS: Contact[] = [
  {
    id: "u1", name: "Jessica Martinez", email: "jessica@email.com",
    handles: [{ channel: "instagram_dm", username: "@jessica_nc" }],
    totalConversations: 4, lastSeenAt: new Date(Date.now() - 3 * 60_000).toISOString(),
    tags: ["vip", "order-inquiry"], notes: "Loves the custom cake menu",
  },
  {
    id: "u2", name: "Marcus Thompson", phone: "9197550234",
    handles: [{ channel: "sms", username: "9197550234" }, { channel: "facebook_comment", username: "marcus.thompson" }],
    totalConversations: 7, lastSeenAt: new Date(Date.now() - 12 * 60_000).toISOString(),
    tags: ["regular"], notes: "",
  },
  {
    id: "u3", name: "Priya Patel",
    handles: [{ channel: "tiktok_comment", username: "@priya.eats.raleigh" }, { channel: "instagram_comment", username: "@priya.nc" }],
    totalConversations: 2, lastSeenAt: new Date(Date.now() - 28 * 60_000).toISOString(),
    tags: ["dietary"], notes: "Halal only",
  },
  {
    id: "u4", name: "David Kim",
    handles: [{ channel: "facebook_comment", username: "david.kim.clt" }],
    totalConversations: 3, lastSeenAt: new Date(Date.now() - 45 * 60_000).toISOString(),
    tags: ["complaint"], notes: "Had a bad experience 5/20 — follow up",
  },
  {
    id: "u5", name: "Ashley Brooks",
    handles: [{ channel: "instagram_comment", username: "@ashleyb_beauty" }],
    totalConversations: 1, lastSeenAt: new Date(Date.now() - 62 * 60_000).toISOString(),
    tags: ["purchase-intent"], notes: "",
  },
  {
    id: "u6", name: "Robert Johnson", phone: "9196440087",
    handles: [{ channel: "sms", username: "9196440087" }],
    totalConversations: 5, lastSeenAt: new Date(Date.now() - 90 * 60_000).toISOString(),
    tags: ["appointment"], notes: "",
  },
  {
    id: "u7", name: "Sofia Ramirez",
    handles: [{ channel: "instagram_dm", username: "@sofia_charlotte" }, { channel: "whatsapp_business", username: "+1 919 555 0198" }],
    totalConversations: 2, lastSeenAt: new Date(Date.now() - 120 * 60_000).toISOString(),
    tags: ["vip", "spanish"], notes: "Prefers Spanish — respond in Spanish",
  },
];

const MOCK_RECENT: Record<string, { text: string; channel: Channel; time: string }[]> = {
  u1: [
    { text: "Hey! Do you guys do custom cake orders?",   channel: "instagram_dm",      time: "3m ago"  },
    { text: "Is the red velvet available this weekend?", channel: "instagram_dm",      time: "2d ago"  },
  ],
  u2: [
    { text: "What are your hours on Sunday?",            channel: "sms",               time: "12m ago" },
    { text: "Do you have a loyalty program?",            channel: "facebook_comment",  time: "4d ago"  },
  ],
  u3: [
    { text: "This place looks amazing!! Is it halal?",   channel: "tiktok_comment",    time: "28m ago" },
    { text: "Do you have vegan options too?",            channel: "instagram_comment", time: "5d ago"  },
  ],
  u4: [
    { text: "I had a terrible experience last week.",    channel: "facebook_comment",  time: "45m ago" },
  ],
  u5: [
    { text: "How much are the macarons?",                channel: "instagram_comment", time: "1h ago"  },
  ],
  u6: [
    { text: "Can I book a table for Saturday?",          channel: "sms",               time: "1.5h ago"},
  ],
  u7: [
    { text: "¿Tienen opciones sin gluten?",              channel: "instagram_dm",      time: "2h ago"  },
    { text: "Is there parking near the location?",       channel: "whatsapp_business", time: "3d ago"  },
  ],
};

// ── Contact Profile Panel ──────────────────────────────────────────────────

function ContactProfile({
  contact,
  onUpdate,
  onBack,
}: {
  contact: Contact;
  onUpdate: (c: Partial<Contact>) => void;
  onBack?: () => void;
}) {
  const navigate = useNavigate();
  const [notes,      setNotes]      = useState(contact.notes);
  const [notesDirty, setNotesDirty] = useState(false);
  const [saved,      setSaved]      = useState(false);
  const [newTag,     setNewTag]     = useState("");

  const saveNotes = () => {
    onUpdate({ notes });
    setNotesDirty(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const removeTag = (tag: string) =>
    onUpdate({ tags: contact.tags.filter(t => t !== tag) });

  const addTag = () => {
    const t = newTag.trim().toLowerCase();
    if (!t || contact.tags.includes(t)) return;
    onUpdate({ tags: [...contact.tags, t] });
    setNewTag("");
  };

  const recentActivity = MOCK_RECENT[contact.id] ?? [];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border bg-card">
        {onBack && (
          <button onClick={onBack} className="lg:hidden p-1.5 rounded-lg hover:bg-muted text-muted-foreground flex-shrink-0">
            <ArrowLeft className="w-4 h-4" />
          </button>
        )}
        <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center text-primary text-base font-bold flex-shrink-0">
          {initials(contact.name)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-foreground truncate">{contact.name}</p>
          <p className="text-xs text-muted-foreground">
            {contact.totalConversations} conversation{contact.totalConversations !== 1 ? "s" : ""} · {timeAgo(contact.lastSeenAt)}
          </p>
        </div>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-6">

        {/* Channels */}
        <section className="space-y-2">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Channels</p>
          <div className="flex flex-wrap gap-2">
            {contact.handles.map(h => {
              const cfg = CHANNEL_CFG[h.channel] ?? { label: h.channel, icon: MessageSquare, chipClass: "bg-muted text-foreground", dotClass: "" };
              const Icon = cfg.icon;
              return (
                <span key={h.channel + h.username} className={cn("inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium", cfg.chipClass)}>
                  <Icon className="w-3 h-3" />
                  {cfg.label} · {h.username}
                </span>
              );
            })}
          </div>
        </section>

        {/* Tags */}
        <section className="space-y-2">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Tags</p>
          <div className="flex flex-wrap gap-1.5 items-center">
            {contact.tags.map(tag => (
              <span key={tag} className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-muted text-foreground font-medium">
                {tag}
                <button onClick={() => removeTag(tag)} className="hover:text-destructive transition-colors ml-0.5">
                  <X className="w-2.5 h-2.5" />
                </button>
              </span>
            ))}
            <div className="flex items-center gap-1">
              <input
                value={newTag}
                onChange={e => setNewTag(e.target.value)}
                onKeyDown={e => e.key === "Enter" && addTag()}
                placeholder="+ tag"
                className="text-xs px-2.5 py-1 rounded-full border border-dashed border-border bg-transparent focus:outline-none focus:border-primary w-20 placeholder:text-muted-foreground"
              />
              {newTag.trim() && (
                <button onClick={addTag} className="p-1 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                  <Plus className="w-2.5 h-2.5" />
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Notes */}
        <section className="space-y-2">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Notes</p>
          <textarea
            value={notes}
            onChange={e => { setNotes(e.target.value); setNotesDirty(true); setSaved(false); }}
            rows={3}
            placeholder="Add notes about this contact…"
            className="w-full px-3 py-2.5 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
          />
          {saved ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 w-fit">
              <CheckCircle2 className="w-3 h-3" /> Saved
            </div>
          ) : (
            <button
              onClick={saveNotes}
              disabled={!notesDirty}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-primary text-white hover:bg-primary/90 disabled:opacity-40 transition-colors w-fit"
            >
              Save Notes
            </button>
          )}
        </section>

        {/* Recent activity */}
        {recentActivity.length > 0 && (
          <section className="space-y-2">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              Recent Activity
            </p>
            <div className="space-y-2">
              {recentActivity.map((item, i) => {
                const cfg = CHANNEL_CFG[item.channel] ?? { label: item.channel, icon: MessageSquare, chipClass: "", dotClass: "bg-muted" };
                return (
                  <div key={i} className="flex items-start gap-2.5 p-2.5 rounded-xl bg-muted/40 text-xs">
                    <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1", cfg.dotClass)} />
                    <span className="flex-1 text-foreground leading-snug line-clamp-2">{item.text}</span>
                    <span className="text-muted-foreground flex-shrink-0 flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" />
                      {item.time}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>

      {/* Footer — Campaign CTA */}
      <div className="border-t border-border px-4 py-3 bg-card space-y-2">
        {contact.tags.length > 0 && (
          <p className="text-[11px] text-muted-foreground text-center">
            Broadcast to all{" "}
            <span className="font-semibold text-foreground">#{contact.tags[0]}</span>
            {" "}contacts — or choose audience in Campaigns
          </p>
        )}
        <button
          onClick={() => navigate("/campaigns")}
          className="w-full flex items-center justify-center gap-2 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors"
        >
          <Megaphone className="w-4 h-4" />
          Send Campaign
        </button>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function Contacts() {
  const { user } = useAuth();
  const [search,          setSearch]          = useState("");
  const [platformFilter,  setPlatformFilter]  = useState("all");
  const [tagFilter,       setTagFilter]       = useState("all");
  const [selectedId,      setSelectedId]      = useState<string | null>(null);
  const [contacts,        setContacts]        = useState<Contact[]>(MOCK_CONTACTS);

  const selectedContact = contacts.find(c => c.id === selectedId) ?? null;

  const allTags = Array.from(new Set(contacts.flatMap(c => c.tags))).sort();

  // Canonical platform order — only show platforms that actually exist in contacts
  const PLATFORM_ORDER = ["instagram", "tiktok", "facebook", "whatsapp", "sms"];
  const contactPlatforms = new Set(contacts.flatMap(c => c.handles.map(h => channelPlatform(h.channel))));
  const allPlatforms = PLATFORM_ORDER.filter(p => contactPlatforms.has(p));

  const filtered = contacts.filter(c => {
    const matchSearch   = !search || c.name.toLowerCase().includes(search.toLowerCase())
      || c.handles.some(h => h.username.toLowerCase().includes(search.toLowerCase()));
    const matchPlatform = platformFilter === "all" || c.handles.some(h => channelPlatform(h.channel) === platformFilter);
    const matchTag      = tagFilter === "all" || c.tags.includes(tagFilter);
    return matchSearch && matchPlatform && matchTag;
  });

  const updateContact = (id: string, updates: Partial<Contact>) =>
    setContacts(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));

  const showList    = !selectedId;
  const showProfile = !!selectedId;

  const PLATFORM_LABELS: Record<string, string> = {
    instagram: "Instagram", tiktok: "TikTok", facebook: "Facebook",
    whatsapp: "WhatsApp", sms: "SMS",
  };
  const PLATFORM_ACTIVE: Record<string, string> = {
    instagram: "bg-gradient-to-r from-purple-500 to-pink-500 text-white",
    tiktok:    "bg-zinc-900 dark:bg-zinc-700 text-white",
    facebook:  "bg-blue-600 text-white",
    whatsapp:  "bg-green-500 text-white",
    sms:       "bg-slate-500 text-white",
  };

  return (
    <AppLayout role="client" businessName={user?.businessName}>
      <div className="flex h-[calc(100vh-56px)] -m-6 lg:-m-8 overflow-hidden border-t border-border">

        {/* ── Left: Contact list ── */}
        <div className={cn(
          "flex-shrink-0 border-r border-border bg-card flex flex-col overflow-hidden w-full lg:w-80",
          showList ? "flex" : "hidden lg:flex",
        )}>
          {/* Header */}
          <div className="px-4 pt-4 pb-3 border-b border-border space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-foreground text-base">Contacts</h2>
              <span className="text-xs text-muted-foreground">{contacts.length} total</span>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search contacts…"
                className="w-full h-9 pl-9 pr-3 rounded-lg bg-muted border-0 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            {/* Platform filter */}
            <div className="flex gap-1.5 flex-wrap">
              {["all", ...allPlatforms].map(p => (
                <button key={p} onClick={() => setPlatformFilter(p)}
                  className={cn(
                    "px-2.5 py-1 rounded-full text-xs font-medium transition-colors",
                    platformFilter === p
                      ? (PLATFORM_ACTIVE[p] ?? "bg-primary text-white")
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  )}
                >
                  {p === "all" ? "All" : PLATFORM_LABELS[p] ?? p}
                </button>
              ))}
            </div>

            {/* Tag filter */}
            {allTags.length > 0 && (
              <div className="flex gap-1.5 flex-wrap">
                {["all", ...allTags].map(tag => (
                  <button key={tag} onClick={() => setTagFilter(tag)}
                    className={cn(
                      "px-2.5 py-1 rounded-full text-xs font-medium transition-colors border",
                      tagFilter === tag
                        ? "bg-foreground text-background border-foreground"
                        : "border-border text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {tag === "all" ? "All tags" : tag}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-muted-foreground text-sm gap-2">
                <Users className="w-6 h-6 opacity-30" />
                No contacts found
              </div>
            ) : filtered.map(contact => {
              const isSelected = contact.id === selectedId;
              return (
                <button
                  key={contact.id}
                  onClick={() => setSelectedId(contact.id)}
                  className={cn(
                    "w-full flex items-start gap-3 px-4 py-3 border-b border-border/40 text-left transition-all hover:bg-muted/40",
                    isSelected && "bg-primary/5 border-l-[3px] border-l-primary",
                  )}
                >
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-bold flex-shrink-0">
                    {initials(contact.name)}
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* Row 1: name + time */}
                    <div className="flex items-center gap-1 mb-0.5">
                      <span className="text-sm font-medium text-foreground flex-1 truncate">{contact.name}</span>
                      <span className="text-[11px] text-muted-foreground flex-shrink-0">{timeAgo(contact.lastSeenAt)}</span>
                    </div>

                    {/* Row 2: platform dots */}
                    <div className="flex items-center gap-1 mb-1">
                      {contact.handles.map(h => {
                        const dot = CHANNEL_CFG[h.channel]?.dotClass ?? "bg-muted";
                        return <span key={h.channel + h.username} className={cn("w-1.5 h-1.5 rounded-full", dot)} />;
                      })}
                      <span className="text-[11px] text-muted-foreground ml-1">
                        {contact.handles[0]?.username}
                        {contact.handles.length > 1 && ` +${contact.handles.length - 1}`}
                      </span>
                    </div>

                    {/* Row 3: tags */}
                    {contact.tags.length > 0 && (
                      <div className="flex gap-1 flex-wrap">
                        {contact.tags.slice(0, 3).map(tag => (
                          <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Right: Profile panel ── */}
        <div className={cn("flex-1 flex-col bg-background overflow-hidden", showProfile ? "flex" : "hidden lg:flex")}>
          {selectedContact ? (
            <ContactProfile
              key={selectedContact.id}
              contact={selectedContact}
              onUpdate={updates => updateContact(selectedContact.id, updates)}
              onBack={() => setSelectedId(null)}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground h-full gap-2">
              <Users className="w-12 h-12 opacity-20" />
              <p className="text-sm font-medium">Select a contact</p>
              <p className="text-xs opacity-60">View profile, edit tags, add notes</p>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
