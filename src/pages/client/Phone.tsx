import { useState, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import {
  Phone, PhoneOutgoing, PhoneIncoming, PhoneMissed,
  MessageSquare, Search, Plus, Loader2, X, Check,
  ArrowLeft, Send, Clock, Smartphone, Bot, User,
} from "lucide-react";
import {
  usePhoneData, useSendSms, buildTimeline,
  type PhoneContact, type TimelineItem,
} from "@/hooks/usePhoneData";
import { useInitiateOutboundCall, useUpdateCallNotes } from "@/hooks/useCalls";
import type { Call, CallStatus, CallDirection, Message } from "@/types";
import { cn } from "@/lib/utils";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDuration(s: number | null): string {
  if (s === null || s === undefined) return "—";
  const m = Math.floor(s / 60);
  return m === 0 ? `${s % 60}s` : `${m}m ${s % 60}s`;
}

function timeAgo(iso: string): string {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (d < 1) return "just now";
  if (d < 60) return `${d}m`;
  const h = Math.floor(d / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

function getInitials(name: string): string {
  const parts = (name || "?").trim().split(/\s+/);
  return parts.length === 1
    ? parts[0][0].toUpperCase()
    : (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// ── Call status helpers ───────────────────────────────────────────────────────

const STATUS_LABEL: Record<CallStatus, string> = {
  completed: "Completed", "in-progress": "In Progress", ringing: "Ringing",
  initiated: "Initiated", "no-answer": "No Answer", busy: "Busy",
  failed: "Failed", canceled: "Canceled", missed: "Missed",
};

function callDirectionIcon(direction: CallDirection, status: CallStatus) {
  if (direction === "inbound" && (status === "missed" || status === "no-answer"))
    return <PhoneMissed className="w-4 h-4 text-red-500" />;
  if (direction === "outbound") return <PhoneOutgoing className="w-4 h-4 text-blue-500" />;
  return <PhoneIncoming className="w-4 h-4 text-green-500" />;
}

// ── New Call Modal ────────────────────────────────────────────────────────────

function NewCallModal({ defaultNumber = "", defaultName = "", onClose }: {
  defaultNumber?: string;
  defaultName?: string;
  onClose: () => void;
}) {
  const [toNumber, setToNumber]     = useState(defaultNumber);
  const [contactName, setContactName] = useState(defaultName);
  const initiate = useInitiateOutboundCall();

  const handleCall = async () => {
    if (!toNumber.trim()) return;
    try {
      await initiate.mutateAsync({ toNumber: toNumber.trim(), contactName: contactName.trim() });
      onClose();
    } catch { /* handled by mutation */ }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        onClick={e => e.stopPropagation()}
        className="bg-card border border-border rounded-2xl w-full max-w-sm shadow-xl"
      >
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="text-base font-semibold text-foreground">New Outbound Call</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Phone Number <span className="text-red-500">*</span></label>
            <input type="tel" placeholder="+1 555 000 0000" value={toNumber} onChange={e => setToNumber(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Contact Name <span className="text-muted-foreground">(optional)</span></label>
            <input type="text" placeholder="John Smith" value={contactName} onChange={e => setContactName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
        </div>
        <div className="flex gap-3 p-5 pt-0">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:bg-muted transition-colors">Cancel</button>
          <button onClick={handleCall} disabled={!toNumber.trim() || initiate.isPending}
            className="flex-1 px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {initiate.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Calling…</> : <><Phone className="w-4 h-4" /> Call</>}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Timeline: Call event card ─────────────────────────────────────────────────

function CallEventCard({ call }: { call: Call }) {
  const [expanded, setExpanded] = useState(false);
  const [notes, setNotes]       = useState(call.notes ?? "");
  const [saved, setSaved]       = useState(false);
  const updateNotes = useUpdateCallNotes();
  const isMissed = call.status === "missed" || call.status === "no-answer";

  const handleSave = async () => {
    await updateNotes.mutateAsync({ id: call.id, notes });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="flex flex-col items-center gap-1 my-1">
      <button
        onClick={() => setExpanded(v => !v)}
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
          isMissed
            ? "border-orange-200 dark:border-orange-800/40 bg-orange-50 dark:bg-orange-900/10 text-orange-700 dark:text-orange-400"
            : "border-border bg-muted/50 text-muted-foreground hover:bg-muted"
        )}
      >
        {callDirectionIcon(call.direction, call.status)}
        <span className="capitalize">{call.direction}</span>
        <span>·</span>
        <span>{STATUS_LABEL[call.status]}</span>
        {call.duration !== null && (
          <><span>·</span><span className="flex items-center gap-0.5"><Clock className="w-2.5 h-2.5" />{formatDuration(call.duration)}</span></>
        )}
        <span className="text-muted-foreground">{formatTime(call.startedAt)}</span>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden w-full max-w-sm"
          >
            <div className="bg-card border border-border rounded-xl p-3 mt-1 space-y-2">
              <textarea
                rows={2}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Add call notes…"
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
              />
              <div className="flex justify-end">
                <button onClick={handleSave} disabled={updateNotes.isPending}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  {saved ? <><Check className="w-3 h-3" /> Saved</> : updateNotes.isPending ? <><Loader2 className="w-3 h-3 animate-spin" /> Saving…</> : "Save Notes"}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Timeline: SMS message bubble ──────────────────────────────────────────────

function SmsBubble({ msg }: { msg: Message }) {
  const isInbound = msg.direction === "inbound";
  return (
    <div className={cn("flex gap-2.5 max-w-[78%]", isInbound ? "self-start" : "self-end flex-row-reverse")}>
      <div className={cn("w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-1",
        isInbound ? "bg-muted" : "bg-primary/10")}>
        {isInbound ? <User className="w-3.5 h-3.5 text-muted-foreground" /> : <Bot className="w-3.5 h-3.5 text-primary" />}
      </div>
      <div className="flex flex-col gap-0.5">
        <div className={cn("px-3.5 py-2 rounded-2xl text-sm leading-relaxed",
          isInbound ? "bg-muted text-foreground rounded-tl-sm" : "bg-primary text-white rounded-tr-sm")}>
          {msg.content}
        </div>
        <span className={cn("text-[11px] text-muted-foreground px-1", !isInbound && "text-right")}>
          {formatTime(msg.timestamp)}
        </span>
      </div>
    </div>
  );
}

// ── Contact list panel ────────────────────────────────────────────────────────

type TabFilter = "all" | "sms" | "calls" | "missed";

const TABS: { id: TabFilter; label: string }[] = [
  { id: "all",    label: "All"    },
  { id: "sms",    label: "SMS"    },
  { id: "calls",  label: "Calls"  },
  { id: "missed", label: "Missed" },
];

function ContactList({
  contacts, selectedKey, onSelect, search, onSearchChange, tab, onTabChange,
}: {
  contacts: PhoneContact[];
  selectedKey: string | null;
  onSelect: (key: string) => void;
  search: string;
  onSearchChange: (v: string) => void;
  tab: TabFilter;
  onTabChange: (t: TabFilter) => void;
}) {
  const filtered = contacts.filter(c => {
    if (tab === "sms"    && c.conversations.length === 0) return false;
    if (tab === "calls"  && c.calls.length === 0)         return false;
    if (tab === "missed" && c.missedCalls === 0)           return false;
    if (search) {
      const q = search.toLowerCase();
      return c.name.toLowerCase().includes(q) || c.number.includes(q);
    }
    return true;
  });

  const totalUnread = contacts.reduce((s, c) => s + c.unreadSms, 0);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-foreground text-base flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-primary" />
            Phone
          </h2>
          {totalUnread > 0 && (
            <span className="bg-primary text-white text-xs font-bold px-2 py-0.5 rounded-full">{totalUnread}</span>
          )}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          <input value={search} onChange={e => onSearchChange(e.target.value)}
            placeholder="Search contacts…"
            className="w-full h-9 pl-9 pr-3 rounded-lg bg-muted border-0 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        {TABS.map(t => (
          <button key={t.id} onClick={() => onTabChange(t.id)}
            className={cn("flex-1 py-2.5 text-xs font-medium transition-colors relative",
              tab === t.id ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground")}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Contact list */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-muted-foreground text-sm gap-2">
            <Phone className="w-6 h-6 opacity-40" />
            No contacts
          </div>
        ) : filtered.map(contact => {
          const isSelected = contact.key === selectedKey;
          const hasMissed  = contact.missedCalls > 0;
          const hasUnread  = contact.unreadSms > 0;

          return (
            <button key={contact.key} onClick={() => onSelect(contact.key)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 border-b border-border/40 text-left transition-all hover:bg-muted/40",
                isSelected && "bg-primary/5 border-l-[3px] border-l-primary",
                !isSelected && hasMissed && "border-l-[3px] border-l-orange-400"
              )}
            >
              {/* Avatar */}
              <div className="relative flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-sm font-semibold text-foreground">
                  {getInitials(contact.name)}
                </div>
                {hasMissed && (
                  <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-orange-500 border-2 border-card" />
                )}
                {!hasMissed && hasUnread && (
                  <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-primary border-2 border-card" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1 mb-0.5">
                  <span className={cn("text-sm flex-1 truncate", hasUnread || hasMissed ? "font-semibold text-foreground" : "font-medium text-foreground")}>
                    {contact.name}
                  </span>
                  <span className="text-[11px] text-muted-foreground flex-shrink-0">{timeAgo(contact.lastActivityAt)}</span>
                </div>
                <p className="text-xs text-muted-foreground truncate">{contact.number}</p>
                <div className="flex items-center gap-2 mt-1">
                  {contact.conversations.length > 0 && (
                    <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                      <MessageSquare className="w-2.5 h-2.5" />
                      SMS
                    </span>
                  )}
                  {contact.calls.length > 0 && (
                    <span className={cn("flex items-center gap-0.5 text-[10px]", hasMissed ? "text-orange-500 font-medium" : "text-muted-foreground")}>
                      <Phone className="w-2.5 h-2.5" />
                      {hasMissed ? `${contact.missedCalls} missed` : `${contact.calls.length} call${contact.calls.length > 1 ? "s" : ""}`}
                    </span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Contact detail pane ───────────────────────────────────────────────────────

function ContactDetail({
  contact, onBack, onCallContact,
}: {
  contact: PhoneContact;
  onBack?: () => void;
  onCallContact: (contact: PhoneContact) => void;
}) {
  const [smsText, setSmsText] = useState("");
  const [localMessages, setLocalMessages] = useState<Message[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sendSms   = useSendSms();

  const hasSmsConv = contact.conversations.length > 0;
  const primaryConvId = contact.conversations[0]?.id;

  // Build the unified timeline
  const contactWithLocal = useMemo(() => {
    if (localMessages.length === 0) return contact;
    const conv = contact.conversations[0];
    if (!conv) return contact;
    return {
      ...contact,
      conversations: [{
        ...conv,
        messages: [...conv.messages, ...localMessages],
      }],
    };
  }, [contact, localMessages]);

  const timeline: TimelineItem[] = buildTimeline(contactWithLocal);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [timeline.length]);

  // Reset on contact change
  useEffect(() => {
    setSmsText("");
    setLocalMessages([]);
  }, [contact.key]);

  const handleSend = () => {
    const text = smsText.trim();
    if (!text || !primaryConvId) return;
    // Optimistic local message
    setLocalMessages(prev => [...prev, {
      id: "sms-local-" + Date.now(),
      conversationId: primaryConvId,
      direction: "outbound",
      content: text,
      replyStatus: "approved",
      sentBy: "human",
      timestamp: new Date().toISOString(),
    }]);
    setSmsText("");
    sendSms.mutate({ conversationId: primaryConvId, content: text });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card flex-shrink-0">
        {onBack && (
          <button onClick={onBack} className="lg:hidden p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground flex-shrink-0">
            <ArrowLeft className="w-4 h-4" />
          </button>
        )}
        <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-sm font-semibold text-foreground flex-shrink-0">
          {getInitials(contact.name)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-foreground">{contact.name}</p>
          <p className="text-xs text-muted-foreground">{contact.number}</p>
        </div>
        <button
          onClick={() => onCallContact(contact)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors flex-shrink-0"
        >
          <Phone className="w-3.5 h-3.5" />
          Call
        </button>
      </div>

      {/* Timeline */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 sm:px-5 py-4 flex flex-col gap-3">
        {timeline.length === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 text-muted-foreground gap-2 py-16">
            <Smartphone className="w-10 h-10 opacity-20" />
            <p className="text-sm font-medium">No activity yet</p>
            <p className="text-xs opacity-70">Call this contact or send an SMS to start</p>
          </div>
        ) : (
          timeline.map((item, i) =>
            item.kind === "call"
              ? <CallEventCard key={`call-${item.call.id}-${i}`} call={item.call} />
              : <SmsBubble key={`msg-${item.msg.id}-${i}`} msg={item.msg} />
          )
        )}
      </div>

      {/* Footer — SMS compose */}
      <div className="border-t border-border px-4 sm:px-5 py-3 bg-card flex-shrink-0">
        {hasSmsConv ? (
          <div className="space-y-2">
            <textarea
              value={smsText}
              onChange={e => setSmsText(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && smsText.trim()) handleSend(); }}
              rows={2}
              placeholder="Write an SMS… (Cmd+Enter to send)"
              className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <MessageSquare className="w-3 h-3" /> SMS
              </span>
              <button
                onClick={handleSend}
                disabled={!smsText.trim() || sendSms.isPending}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {sendSms.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                Send SMS
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <MessageSquare className="w-3.5 h-3.5" />
            No SMS thread — use the Call button to reach this contact
          </div>
        )}
      </div>
    </div>
  );
}

// ── Stats bar ─────────────────────────────────────────────────────────────────

function StatsBar({ contacts }: { contacts: PhoneContact[] }) {
  const totalCalls  = contacts.reduce((s, c) => s + c.calls.length, 0);
  const totalSms    = contacts.reduce((s, c) => s + c.conversations.reduce((ss, cv) => ss + cv.messages.length, 0), 0);
  const missedCalls = contacts.reduce((s, c) => s + c.missedCalls, 0);
  const unreadSms   = contacts.reduce((s, c) => s + c.unreadSms, 0);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 px-4 py-3 border-b border-border bg-card/50 flex-shrink-0">
      {[
        { icon: Phone,         label: "Total Calls", value: totalCalls,  color: "text-primary"    },
        { icon: PhoneMissed,   label: "Missed",      value: missedCalls, color: "text-orange-500" },
        { icon: MessageSquare, label: "SMS Sent",    value: totalSms,    color: "text-blue-500"   },
        { icon: MessageSquare, label: "Unread SMS",  value: unreadSms,   color: "text-green-500"  },
      ].map(({ icon: Icon, label, value, color }) => (
        <div key={label} className="flex items-center gap-2">
          <Icon className={cn("w-4 h-4 flex-shrink-0", color)} />
          <div>
            <p className="text-sm font-bold text-foreground">{value}</p>
            <p className="text-[10px] text-muted-foreground">{label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PhonePage() {
  const { user } = useAuth();
  const { contacts, isLoading } = usePhoneData();

  const [selectedKey, setSelectedKey]   = useState<string | null>(null);
  const [search, setSearch]             = useState("");
  const [tab, setTab]                   = useState<TabFilter>("all");
  const [showNewCall, setShowNewCall]   = useState(false);
  const [callContact, setCallContact]   = useState<PhoneContact | null>(null);

  const selectedContact = contacts.find(c => c.key === selectedKey) ?? null;

  // Auto-select first contact on desktop only.
  // Deps intentionally exclude selectedKey — we don't re-select when the user
  // taps back (clears selection) on mobile.
  useEffect(() => {
    if (window.innerWidth < 768) return;
    if (contacts.length > 0 && !selectedKey) {
      setSelectedKey(contacts[0].key);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contacts.length]);

  const showList = !selectedKey;
  const showPane = !!selectedKey;

  return (
    <AppLayout role="client" businessName={user?.businessName}>
      <div className="flex h-[calc(100vh-56px)] -m-4 lg:-m-8 overflow-hidden border-t border-border flex-col">
        {/* Stats bar — full width at top */}
        <StatsBar contacts={contacts} />

        <div className="flex flex-1 overflow-hidden">
          {/* Left panel */}
          <div className={cn(
            "flex-shrink-0 border-r border-border bg-card flex flex-col overflow-hidden w-full md:w-80",
            showList ? "flex" : "hidden md:flex"
          )}>
            {/* New Call button */}
            <div className="px-4 pt-3 pb-2 flex justify-end border-b border-border">
              <button onClick={() => setShowNewCall(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                New Call
              </button>
            </div>

            {isLoading ? (
              <div className="flex-1 flex items-center justify-center">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <ContactList
                contacts={contacts}
                selectedKey={selectedKey}
                onSelect={setSelectedKey}
                search={search}
                onSearchChange={setSearch}
                tab={tab}
                onTabChange={setTab}
              />
            )}
          </div>

          {/* Right panel */}
          <div className={cn(
            "flex-1 flex-col bg-background overflow-hidden",
            showPane ? "flex" : "hidden md:flex"
          )}>
            {selectedContact ? (
              <ContactDetail
                contact={selectedContact}
                onBack={() => setSelectedKey(null)}
                onCallContact={c => setCallContact(c)}
              />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground h-full gap-3">
                <Smartphone className="w-12 h-12 opacity-20" />
                <p className="text-sm font-medium">Select a contact</p>
                <p className="text-xs opacity-70">View SMS and call history in one place</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* New Call Modal — standalone (no pre-filled number) */}
      <AnimatePresence>
        {showNewCall && (
          <NewCallModal onClose={() => setShowNewCall(false)} />
        )}
        {callContact && (
          <NewCallModal
            defaultNumber={callContact.number}
            defaultName={callContact.name}
            onClose={() => setCallContact(null)}
          />
        )}
      </AnimatePresence>
    </AppLayout>
  );
}
