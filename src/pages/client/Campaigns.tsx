import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import {
  Plus, Pencil, Trash2, Loader2, X, CheckCircle2,
  Info, Megaphone, Rocket, CheckCheck, Send,
} from "lucide-react";
import {
  useCampaigns,
  useCreateCampaign,
  useUpdateCampaign,
  useDeleteCampaign,
  useSendCampaign,
} from "@/hooks/useCampaigns";
import type { Campaign, CampaignStatus, Platform } from "@/types";
import { cn } from "@/lib/utils";

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_STYLE: Record<CampaignStatus, string> = {
  draft:     "bg-muted text-muted-foreground",
  scheduled: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400",
  sending:   "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400",
  sent:      "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400",
  failed:    "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400",
};

const STATUS_LABELS: Record<CampaignStatus, string> = {
  draft:     "Draft",
  scheduled: "Scheduled",
  sending:   "Sending",
  sent:      "Sent",
  failed:    "Failed",
};

const PLATFORM_COLOR: Record<Platform, string> = {
  instagram: "bg-gradient-to-br from-purple-500 to-pink-500",
  tiktok:    "bg-black",
  facebook:  "bg-blue-600",
  whatsapp:  "bg-green-500",
};

type StatusFilter = CampaignStatus | "all";

const STATUS_TABS: { key: StatusFilter; label: string }[] = [
  { key: "all",       label: "All" },
  { key: "draft",     label: "Draft" },
  { key: "scheduled", label: "Scheduled" },
  { key: "sent",      label: "Sent" },
  { key: "failed",    label: "Failed" },
];

function formatDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function pct(part: number, total: number) {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}

// ── WhatsApp Bubble Preview ───────────────────────────────────────────────────

function WhatsAppBubble({ message }: { message: string }) {
  return (
    <div className="w-full bg-[#0b141a] rounded-xl p-4 min-h-[80px]">
      <div className="flex justify-end">
        <div className="max-w-[85%] bg-[#005c4b] rounded-2xl rounded-tr-sm px-3 py-2 space-y-1 shadow">
          <p className="text-white text-xs leading-relaxed whitespace-pre-wrap break-words">
            {message || <span className="opacity-40 italic">Your message will appear here…</span>}
          </p>
          <div className="flex items-center justify-end gap-1">
            <span className="text-[10px] text-white/60">
              {new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })}
            </span>
            <CheckCheck className="w-3 h-3 text-blue-400" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Campaign Dialog ───────────────────────────────────────────────────────────

interface CampaignDialogProps {
  initial?: Partial<Campaign>;
  onSave: (data: Omit<Campaign, "id" | "createdAt" | "sentCount" | "readCount" | "replyCount">) => void;
  onClose: () => void;
  saving: boolean;
}

function CampaignDialog({ initial, onSave, onClose, saving }: CampaignDialogProps) {
  const [name, setName]           = useState(initial?.name ?? "");
  const [message, setMessage]     = useState(initial?.message ?? "");
  const [scheduledAt, setScheduledAt] = useState(
    initial?.scheduledAt ? initial.scheduledAt.slice(0, 16) : ""
  );

  const MAX_CHARS = 1024;
  const remaining = MAX_CHARS - message.length;

  const handleSave = (saveStatus: "draft" | "scheduled") => {
    if (!name.trim() || !message.trim()) return;
    onSave({
      name: name.trim(),
      message: message.trim(),
      platform: "whatsapp",
      status: saveStatus,
      scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-xl bg-card rounded-2xl border border-border shadow-xl p-6 space-y-4 max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-foreground">
            {initial?.id ? "Edit Campaign" : "New Campaign"}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Campaign name */}
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-2">
            Campaign Name
          </label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Ramadan Special Offer"
            className="w-full px-3 py-2.5 text-sm rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        {/* Platform info */}
        <div className="flex items-center gap-2 px-3 py-2.5 bg-green-50 dark:bg-green-900/20 rounded-xl">
          <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
          <span className="text-xs font-medium text-green-700 dark:text-green-400">WhatsApp Business</span>
          <span className="text-xs text-muted-foreground ml-1">— only platform currently supported</span>
        </div>

        {/* Message */}
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-2">
            Message
          </label>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value.slice(0, MAX_CHARS))}
            rows={5}
            placeholder="Write your broadcast message…"
            className="w-full px-3 py-2.5 text-sm rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
          />
          <p className={cn(
            "text-[11px] mt-1 text-right",
            remaining < 100 ? "text-amber-500" : "text-muted-foreground",
          )}>
            {message.length} / {MAX_CHARS} chars
          </p>
        </div>

        {/* Schedule */}
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-2">
            Schedule Date & Time <span className="text-muted-foreground/60">(optional — leave blank to send immediately)</span>
          </label>
          <input
            type="datetime-local"
            value={scheduledAt}
            onChange={e => setScheduledAt(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        {/* WhatsApp preview */}
        {message && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Preview</p>
            <WhatsAppBubble message={message} />
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-1 flex-wrap">
          <button
            onClick={() => handleSave("draft")}
            disabled={saving || !name.trim() || !message.trim()}
            className="flex items-center gap-1.5 px-4 py-2 bg-muted text-foreground text-sm font-medium rounded-xl hover:bg-muted/80 border border-border disabled:opacity-50 transition-colors"
          >
            {saving
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <CheckCircle2 className="w-3.5 h-3.5" />
            }
            Save as Draft
          </button>
          <button
            onClick={() => handleSave("scheduled")}
            disabled={saving || !name.trim() || !message.trim()}
            className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white text-sm font-medium rounded-xl hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {saving
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <Send className="w-3.5 h-3.5" />
            }
            {scheduledAt ? "Schedule" : "Queue"}
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

export default function Campaigns() {
  const { user } = useAuth();
  const { data: campaigns = [], isLoading } = useCampaigns();
  const createCampaign = useCreateCampaign();
  const updateCampaign = useUpdateCampaign();
  const deleteCampaign = useDeleteCampaign();
  const sendCampaign   = useSendCampaign();

  const [statusFilter, setStatusFilter]   = useState<StatusFilter>("all");
  const [dialogOpen, setDialogOpen]       = useState(false);
  const [editCampaign, setEditCampaign]   = useState<Campaign | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [sendConfirmId, setSendConfirmId] = useState<string | null>(null);

  // ── Derived ────────────────────────────────────────────────────────────────

  const filtered = campaigns.filter(c =>
    statusFilter === "all" ? true : c.status === statusFilter
  );

  const totalSent    = campaigns.reduce((sum, c) => sum + c.sentCount, 0);
  const totalRead    = campaigns.reduce((sum, c) => sum + c.readCount, 0);
  const totalReplies = campaigns.reduce((sum, c) => sum + c.replyCount, 0);
  const avgReadRate  = pct(totalRead, totalSent);
  const avgReplyRate = pct(totalReplies, totalSent);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const openNew = () => {
    setEditCampaign(null);
    setDialogOpen(true);
  };

  const openEdit = (c: Campaign) => {
    setEditCampaign(c);
    setDialogOpen(true);
  };

  const handleSave = (
    data: Omit<Campaign, "id" | "createdAt" | "sentCount" | "readCount" | "replyCount">,
  ) => {
    if (editCampaign) {
      updateCampaign.mutate(
        { id: editCampaign.id, ...data },
        { onSuccess: () => setDialogOpen(false) },
      );
    } else {
      createCampaign.mutate(data, { onSuccess: () => setDialogOpen(false) });
    }
  };

  const handleSend = (id: string) => {
    sendCampaign.mutate(id);
    setSendConfirmId(null);
  };

  const handleDelete = (id: string) => {
    deleteCampaign.mutate(id);
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
            <h1 className="text-2xl font-bold text-foreground">Campaigns</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Send broadcast messages to your WhatsApp contacts
            </p>
          </div>
          <button
            onClick={openNew}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-xl hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Campaign
          </button>
        </motion.div>

        {/* Info banner */}
        <div className="flex items-start gap-3 px-4 py-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl text-xs text-blue-700 dark:text-blue-300">
          <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <p>
            Connect your WhatsApp Business account to start sending real campaigns.
            Currently showing demo data.
          </p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total Campaigns", value: campaigns.length.toString() },
            { label: "Total Sent",      value: totalSent.toLocaleString() },
            { label: "Avg Read Rate",   value: totalSent ? `${avgReadRate}%` : "—" },
            { label: "Avg Reply Rate",  value: totalSent ? `${avgReplyRate}%` : "—" },
          ].map(stat => (
            <div
              key={stat.label}
              className="bg-card rounded-2xl border border-border p-4 space-y-1"
            >
              <p className="text-2xl font-bold text-foreground">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Status filter tabs */}
        <div className="flex bg-muted p-1 rounded-xl w-fit gap-1 flex-wrap">
          {STATUS_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                statusFilter === tab.key
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {tab.label}
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
            <Megaphone className="w-10 h-10 mx-auto mb-3 opacity-20" />
            <p className="text-sm font-medium">No campaigns yet</p>
            <p className="text-xs mt-1 opacity-70">
              {statusFilter === "all"
                ? "Create your first campaign to broadcast to your contacts"
                : `No ${statusFilter} campaigns`}
            </p>
            {statusFilter === "all" && (
              <button
                onClick={openNew}
                className="mt-4 flex items-center gap-1.5 px-4 py-2 bg-primary text-white text-sm font-medium rounded-xl mx-auto hover:bg-primary/90 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Create Campaign
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((campaign, i) => (
              <motion.div
                key={campaign.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="bg-card rounded-2xl border border-border p-4 space-y-3"
              >
                {/* Top row: name + platform + status + actions */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    {/* WhatsApp dot */}
                    <div
                      className={cn(
                        "w-2.5 h-2.5 rounded-full flex-shrink-0",
                        PLATFORM_COLOR[campaign.platform],
                      )}
                      title="WhatsApp"
                    />
                    <p className="text-sm font-semibold text-foreground truncate">
                      {campaign.name}
                    </p>
                    <span
                      className={cn(
                        "text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0",
                        STATUS_STYLE[campaign.status],
                      )}
                    >
                      {STATUS_LABELS[campaign.status]}
                    </span>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {/* Send button — draft only */}
                    {campaign.status === "draft" && (
                      sendConfirmId === campaign.id ? (
                        <div className="flex items-center gap-1">
                          <span className="text-[11px] text-muted-foreground mr-1">
                            Send to all contacts?
                          </span>
                          <button
                            onClick={() => handleSend(campaign.id)}
                            disabled={sendCampaign.isPending}
                            className="text-[11px] px-2 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                          >
                            {sendCampaign.isPending
                              ? <Loader2 className="w-3 h-3 animate-spin" />
                              : "Yes, Send"
                            }
                          </button>
                          <button
                            onClick={() => setSendConfirmId(null)}
                            className="text-[11px] px-2 py-1 bg-muted text-muted-foreground rounded-lg hover:text-foreground transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setSendConfirmId(campaign.id)}
                          title="Send campaign"
                          className="flex items-center gap-1 text-[11px] px-2.5 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                        >
                          <Rocket className="w-3 h-3" />
                          Send
                        </button>
                      )
                    )}

                    {/* Edit — draft or scheduled only */}
                    {(campaign.status === "draft" || campaign.status === "scheduled") && (
                      <button
                        onClick={() => openEdit(campaign)}
                        className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                        title="Edit campaign"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {/* Delete */}
                    {deleteConfirmId === campaign.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleDelete(campaign.id)}
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
                        onClick={() => setDeleteConfirmId(campaign.id)}
                        className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-muted-foreground hover:text-red-600 transition-colors"
                        title="Delete campaign"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Message preview */}
                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                  {campaign.message}
                </p>

                {/* Stats row — sent campaigns only */}
                {campaign.status === "sent" && (
                  <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1 border-t border-border">
                    <span>
                      Sent: <span className="text-foreground font-medium">{campaign.sentCount.toLocaleString()}</span>
                    </span>
                    <span>
                      Read:{" "}
                      <span className="text-foreground font-medium">
                        {campaign.readCount.toLocaleString()}
                      </span>
                      <span className="text-muted-foreground ml-1">
                        ({pct(campaign.readCount, campaign.sentCount)}%)
                      </span>
                    </span>
                    <span>
                      Replies: <span className="text-foreground font-medium">{campaign.replyCount.toLocaleString()}</span>
                    </span>
                  </div>
                )}

                {/* Scheduled date */}
                {campaign.status === "scheduled" && campaign.scheduledAt && (
                  <p className="text-xs text-blue-600 dark:text-blue-400">
                    Scheduled for {formatDate(campaign.scheduledAt)}
                  </p>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* New / Edit Campaign Dialog */}
      <AnimatePresence>
        {dialogOpen && (
          <CampaignDialog
            initial={editCampaign ?? {}}
            onSave={handleSave}
            onClose={() => setDialogOpen(false)}
            saving={createCampaign.isPending || updateCampaign.isPending}
          />
        )}
      </AnimatePresence>
    </AppLayout>
  );
}
