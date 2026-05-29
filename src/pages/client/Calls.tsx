import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import {
  Phone, PhoneOutgoing, PhoneIncoming, PhoneMissed, PhoneOff,
  Clock, Search, Plus, Loader2, X, Check,
  ChevronDown, ChevronUp, FileText,
} from "lucide-react";
import { useCalls, useInitiateOutboundCall, useUpdateCallNotes } from "@/hooks/useCalls";
import type { Call, CallStatus, CallDirection } from "@/types";
import { cn } from "@/lib/utils";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDuration(seconds: number | null): string {
  if (seconds === null || seconds === undefined) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  return `${m}m ${s}s`;
}

function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

function getInitials(name: string): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// ── Status badge ──────────────────────────────────────────────────────────────

const STATUS_STYLE: Record<CallStatus, string> = {
  completed:    "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400",
  "in-progress": "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400",
  ringing:      "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400",
  initiated:    "bg-muted text-muted-foreground",
  "no-answer":  "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400",
  busy:         "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400",
  failed:       "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400",
  canceled:     "bg-muted text-muted-foreground",
  missed:       "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400",
};

const STATUS_LABEL: Record<CallStatus, string> = {
  completed:    "Completed",
  "in-progress": "In Progress",
  ringing:      "Ringing",
  initiated:    "Initiated",
  "no-answer":  "No Answer",
  busy:         "Busy",
  failed:       "Failed",
  canceled:     "Canceled",
  missed:       "Missed",
};

function StatusBadge({ status }: { status: CallStatus }) {
  const isPulsing = status === "ringing" || status === "in-progress";
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium", STATUS_STYLE[status])}>
      {isPulsing && (
        <span className="relative flex h-1.5 w-1.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-blue-500" />
        </span>
      )}
      {STATUS_LABEL[status]}
    </span>
  );
}

// ── Direction icon ────────────────────────────────────────────────────────────

function DirectionIcon({ direction, status }: { direction: CallDirection; status: CallStatus }) {
  if (direction === "inbound" && status === "missed") {
    return <PhoneMissed className="w-4 h-4 text-red-500" />;
  }
  if (direction === "outbound") {
    return <PhoneOutgoing className="w-4 h-4 text-blue-500" />;
  }
  return <PhoneIncoming className="w-4 h-4 text-green-500" />;
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, icon: Icon, color }: {
  label: string; value: string | number; icon: React.ComponentType<{ className?: string }>; color: string;
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0", color)}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold text-foreground">{value}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
      </div>
    </div>
  );
}

// ── New Call Modal ────────────────────────────────────────────────────────────

function NewCallModal({ onClose }: { onClose: () => void }) {
  const [toNumber, setToNumber] = useState("");
  const [contactName, setContactName] = useState("");
  const [message, setMessage] = useState(
    "Hello! This is a call from our support team. Please hold while we connect you."
  );
  const initiate = useInitiateOutboundCall();

  const handleCall = async () => {
    if (!toNumber.trim()) return;
    try {
      await initiate.mutateAsync({ toNumber: toNumber.trim(), contactName: contactName.trim(), message });
      onClose();
    } catch {
      // error handled by mutation
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-card border border-border rounded-2xl w-full max-w-md shadow-xl"
      >
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="text-base font-semibold text-foreground">New Outbound Call</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Phone Number <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              placeholder="+1 555 000 0000"
              value={toNumber}
              onChange={e => setToNumber(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Contact Name <span className="text-muted-foreground text-xs">(optional)</span>
            </label>
            <input
              type="text"
              placeholder="John Smith"
              value={contactName}
              onChange={e => setContactName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Message</label>
            <textarea
              rows={3}
              value={message}
              onChange={e => setMessage(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
            />
          </div>
        </div>

        <div className="flex gap-3 p-5 pt-0">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCall}
            disabled={!toNumber.trim() || initiate.isPending}
            className="flex-1 px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {initiate.isPending ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Calling…</>
            ) : (
              <><Phone className="w-4 h-4" /> Call</>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Call Row ──────────────────────────────────────────────────────────────────

function CallRow({ call, expanded, onToggle }: {
  call: Call;
  expanded: boolean;
  onToggle: () => void;
}) {
  const [notes, setNotes] = useState(call.notes ?? "");
  const [saved, setSaved] = useState(false);
  const updateNotes = useUpdateCallNotes();

  const handleSave = async () => {
    await updateNotes.mutateAsync({ id: call.id, notes });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const displayName = call.contactName || (call.direction === "outbound" ? call.toNumber : call.fromNumber);
  const displayNumber = call.direction === "outbound" ? call.toNumber : call.fromNumber;

  return (
    <div className="border-b border-border last:border-0">
      {/* Main row */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-4 px-4 py-3.5 hover:bg-muted/50 transition-colors text-left"
      >
        {/* Avatar */}
        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-primary text-sm font-semibold">
          {getInitials(call.contactName || displayNumber)}
        </div>

        {/* Name + number */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{displayName}</p>
          <p className="text-xs text-muted-foreground truncate">{displayNumber}</p>
        </div>

        {/* Direction icon */}
        <div className="flex-shrink-0">
          <DirectionIcon direction={call.direction} status={call.status} />
        </div>

        {/* Status */}
        <div className="flex-shrink-0 hidden sm:block">
          <StatusBadge status={call.status} />
        </div>

        {/* Duration */}
        <div className="flex-shrink-0 hidden md:flex items-center gap-1.5 text-xs text-muted-foreground w-16 justify-end">
          <Clock className="w-3 h-3" />
          {formatDuration(call.duration)}
        </div>

        {/* Time */}
        <div className="flex-shrink-0 text-xs text-muted-foreground hidden sm:block w-16 text-right">
          {formatRelativeTime(call.startedAt)}
        </div>

        {/* Notes indicator */}
        {call.notes && (
          <div className="flex-shrink-0 text-muted-foreground" title="Has notes">
            <FileText className="w-3.5 h-3.5" />
          </div>
        )}

        {/* Expand toggle */}
        <div className="flex-shrink-0 text-muted-foreground">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {/* Expanded detail panel */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-1 bg-muted/30">
              {/* Call info grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                <div className="bg-card border border-border rounded-xl p-3">
                  <p className="text-xs text-muted-foreground mb-0.5">Direction</p>
                  <p className="text-sm font-medium text-foreground capitalize">{call.direction}</p>
                </div>
                <div className="bg-card border border-border rounded-xl p-3">
                  <p className="text-xs text-muted-foreground mb-0.5">Status</p>
                  <StatusBadge status={call.status} />
                </div>
                <div className="bg-card border border-border rounded-xl p-3">
                  <p className="text-xs text-muted-foreground mb-0.5">Duration</p>
                  <p className="text-sm font-medium text-foreground">{formatDuration(call.duration)}</p>
                </div>
                <div className="bg-card border border-border rounded-xl p-3">
                  <p className="text-xs text-muted-foreground mb-0.5">Started</p>
                  <p className="text-sm font-medium text-foreground">
                    {new Date(call.startedAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>

              {call.twilioSid && (
                <p className="text-xs text-muted-foreground mb-3 font-mono">SID: {call.twilioSid}</p>
              )}

              {/* Notes */}
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">Notes</label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Add call notes…"
                  className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
                />
                <div className="flex justify-end mt-2">
                  <button
                    onClick={handleSave}
                    disabled={updateNotes.isPending}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    {saved ? (
                      <><Check className="w-3.5 h-3.5" /> Saved</>
                    ) : updateNotes.isPending ? (
                      <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…</>
                    ) : (
                      "Save Notes"
                    )}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Filter tabs ───────────────────────────────────────────────────────────────

type FilterTab = "all" | "outbound" | "inbound" | "missed";

const FILTER_TABS: { id: FilterTab; label: string }[] = [
  { id: "all",      label: "All"      },
  { id: "outbound", label: "Outbound" },
  { id: "inbound",  label: "Inbound"  },
  { id: "missed",   label: "Missed"   },
];

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Calls() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showNewCall, setShowNewCall] = useState(false);

  // Build filter params for the hook
  const filterParams: { direction?: string; status?: string } = {};
  if (activeTab === "outbound") filterParams.direction = "outbound";
  if (activeTab === "inbound")  filterParams.direction = "inbound";
  if (activeTab === "missed")   filterParams.status    = "missed";

  const { data: calls = [], isLoading } = useCalls(filterParams);

  // Search filter
  const filtered = calls.filter(c => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.contactName.toLowerCase().includes(q) ||
      c.toNumber.includes(q) ||
      c.fromNumber.includes(q)
    );
  });

  // Stats (computed from all calls, not filtered view)
  const { data: allCalls = [] } = useCalls();
  const totalCalls   = allCalls.length;
  const answered     = allCalls.filter(c => c.status === "completed").length;
  const missedBusy   = allCalls.filter(c => ["missed", "no-answer", "busy"].includes(c.status)).length;
  const durCalls     = allCalls.filter(c => c.duration !== null && c.duration !== undefined);
  const avgDuration  = durCalls.length
    ? Math.round(durCalls.reduce((s, c) => s + (c.duration ?? 0), 0) / durCalls.length)
    : null;

  return (
    <AppLayout role="client" businessName={user?.businessName}>
      <div className="p-4 sm:p-6 space-y-5 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Calls</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Outbound & inbound call history</p>
          </div>
          <button
            onClick={() => setShowNewCall(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            New Call
          </button>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Total Calls"       value={totalCalls}                icon={Phone}      color="bg-primary" />
          <StatCard label="Answered"          value={answered}                  icon={PhoneIncoming} color="bg-green-500" />
          <StatCard label="Missed / No Answer" value={missedBusy}              icon={PhoneOff}   color="bg-red-500" />
          <StatCard label="Avg Duration"      value={formatDuration(avgDuration)} icon={Clock}   color="bg-blue-500" />
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Tab filters */}
          <div className="flex items-center gap-1 bg-muted rounded-xl p-1 flex-shrink-0">
            {FILTER_TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setExpandedId(null); }}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                  activeTab === tab.id
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by name or number…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          </div>
        </div>

        {/* Call list */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {/* Column headers */}
          <div className="flex items-center gap-4 px-4 py-2.5 border-b border-border text-xs font-medium text-muted-foreground bg-muted/40">
            <div className="w-9 flex-shrink-0" />
            <div className="flex-1">Contact</div>
            <div className="flex-shrink-0 w-4" />
            <div className="flex-shrink-0 hidden sm:block w-24">Status</div>
            <div className="flex-shrink-0 hidden md:block w-16 text-right">Duration</div>
            <div className="flex-shrink-0 hidden sm:block w-16 text-right">Time</div>
            <div className="flex-shrink-0 w-4" />
            <div className="flex-shrink-0 w-4" />
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin mr-2" />
              <span className="text-sm">Loading calls…</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Phone className="w-10 h-10 mb-3 opacity-30" />
              <p className="text-sm font-medium">No calls found</p>
              <p className="text-xs mt-1">
                {search ? "Try a different search term" : "Make your first call using the button above"}
              </p>
            </div>
          ) : (
            <div>
              {filtered.map(call => (
                <CallRow
                  key={call.id}
                  call={call}
                  expanded={expandedId === call.id}
                  onToggle={() => setExpandedId(expandedId === call.id ? null : call.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* New Call Modal */}
        <AnimatePresence>
          {showNewCall && <NewCallModal onClose={() => setShowNewCall(false)} />}
        </AnimatePresence>
      </div>
    </AppLayout>
  );
}
