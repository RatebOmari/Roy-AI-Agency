import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
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
  useAudienceReach,
  type AudienceReach,
} from "@/hooks/useCampaigns";
import type { Campaign, CampaignAudienceType, CampaignStatus } from "@/types";
import { cn } from "@/lib/utils";
import { PLATFORM_CONFIG } from "@/constants/platforms";

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_STYLE: Record<CampaignStatus, string> = {
  draft:     "bg-muted text-muted-foreground",
  scheduled: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400",
  sending:   "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400",
  sent:      "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400",
  failed:    "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400",
};

type StatusFilter = CampaignStatus | "all";
const STATUS_TAB_KEYS: StatusFilter[] = ["all", "draft", "scheduled", "sent", "failed"];

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

// ── Platform chip styles ─────────────────────────────────────────────────────

const PLATFORM_CHIP: Record<string, { label: string; chipClass: string }> = {
  instagram: { label: "Instagram", chipClass: "bg-gradient-to-r from-purple-500 to-pink-500 text-white" },
  whatsapp:  { label: "WhatsApp",  chipClass: "bg-green-500 text-white" },
  facebook:  { label: "Facebook",  chipClass: "bg-blue-600 text-white" },
  tiktok:    { label: "TikTok",    chipClass: "bg-zinc-900 text-white dark:bg-zinc-700" },
  sms:       { label: "SMS",       chipClass: "bg-slate-500 text-white" },
};

// ── WhatsApp Bubble Preview ───────────────────────────────────────────────────

function WhatsAppBubble({ message }: { message: string }) {
  const { t } = useTranslation();
  return (
    <div className="w-full bg-[#0b141a] rounded-xl p-4 min-h-[80px]">
      <div className="flex justify-end">
        <div className="max-w-[85%] bg-[#005c4b] rounded-2xl rounded-tr-sm px-3 py-2 space-y-1 shadow">
          <p className="text-white text-xs leading-relaxed whitespace-pre-wrap break-words">
            {message || <span className="opacity-40 italic">{t("campaigns.dialog.messageBubblePlaceholder")}</span>}
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
  reach: AudienceReach;
}

function CampaignDialog({ initial, onSave, onClose, saving, reach }: CampaignDialogProps) {
  const { t } = useTranslation();
  const [name, setName]               = useState(initial?.name ?? "");
  const [message, setMessage]         = useState(initial?.message ?? "");
  const [scheduledAt, setScheduledAt] = useState(
    initial?.scheduledAt ? initial.scheduledAt.slice(0, 16) : ""
  );
  const [audienceType, setAudienceType]   = useState<CampaignAudienceType>(initial?.audienceType ?? "all");
  const [audienceValue, setAudienceValue] = useState(initial?.audienceValue ?? "");

  const MAX_CHARS = 1024;
  const remaining = MAX_CHARS - message.length;

  const allTags     = Object.keys(reach.tagCounts);
  const allPlatforms = Object.keys(reach.platformCounts);

  const estimatedReach =
    audienceType === "all"        ? reach.total
    : audienceType === "tag"      ? (audienceValue ? (reach.tagCounts[audienceValue] ?? 0) : 0)
    : audienceType === "platform" ? (audienceValue ? (reach.platformCounts[audienceValue] ?? 0) : 0)
    : 0;

  const handleSave = (saveStatus: "draft" | "scheduled") => {
    if (!name.trim() || !message.trim()) return;
    onSave({
      name: name.trim(),
      message: message.trim(),
      platform: "whatsapp",
      status: saveStatus,
      scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
      audienceType,
      audienceValue: audienceType !== "all" ? audienceValue : undefined,
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
            {initial?.id ? t("campaigns.editCampaign") : t("campaigns.newCampaign")}
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
            {t("campaigns.dialog.nameLabel")}
          </label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder={t("campaigns.dialog.namePlaceholder")}
            className="w-full px-3 py-2.5 text-sm rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        {/* Platform info */}
        <div className="flex items-center gap-2 px-3 py-2.5 bg-green-50 dark:bg-green-900/20 rounded-xl">
          <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
          <span className="text-xs font-medium text-green-700 dark:text-green-400">WhatsApp Business</span>
          <span className="text-xs text-muted-foreground ml-1">{t("campaigns.dialog.platformNote")}</span>
        </div>

        {/* Audience */}
        <div className="space-y-2.5">
          <label className="text-xs font-medium text-muted-foreground block">{t("campaigns.dialog.audienceLabel")}</label>

          {/* Type chips */}
          <div className="flex gap-2">
            {(["all", "tag", "platform"] as CampaignAudienceType[]).map(atype => (
              <button
                key={atype}
                onClick={() => { setAudienceType(atype); setAudienceValue(""); }}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors",
                  audienceType === atype
                    ? "bg-foreground text-background border-foreground"
                    : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
                )}
              >
                {atype === "all" ? t("campaigns.audienceAll") : atype === "tag" ? t("campaigns.dialog.byTag") : t("campaigns.dialog.byPlatform")}
              </button>
            ))}
          </div>

          {/* Tag picker */}
          {audienceType === "tag" && (
            <div className="flex gap-1.5 flex-wrap">
              {allTags.length === 0 ? (
                <p className="text-xs text-muted-foreground">No tagged contacts yet.</p>
              ) : allTags.map(tag => (
                <button
                  key={tag}
                  onClick={() => setAudienceValue(tag === audienceValue ? "" : tag)}
                  className={cn(
                    "px-2.5 py-1 rounded-full text-xs font-medium border transition-colors",
                    audienceValue === tag
                      ? "bg-primary text-white border-primary"
                      : "border-border text-muted-foreground hover:text-foreground"
                  )}
                >
                  #{tag} <span className="opacity-60 ml-1">{reach.tagCounts[tag]}</span>
                </button>
              ))}
            </div>
          )}

          {/* Platform picker */}
          {audienceType === "platform" && (
            <div className="flex gap-1.5 flex-wrap">
              {allPlatforms.length === 0 ? (
                <p className="text-xs text-muted-foreground">No platform contacts yet.</p>
              ) : allPlatforms.map(key => {
                const cfg = PLATFORM_CHIP[key] ?? { label: key, chipClass: "bg-muted text-foreground" };
                return (
                  <button
                    key={key}
                    onClick={() => setAudienceValue(key === audienceValue ? "" : key)}
                    className={cn(
                      "px-2.5 py-1 rounded-full text-xs font-semibold transition-all",
                      audienceValue === key
                        ? cfg.chipClass + " ring-2 ring-offset-1 ring-primary"
                        : "bg-muted text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {cfg.label} <span className="opacity-70 ml-1">{reach.platformCounts[key]}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Estimated reach */}
          <div className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-xl text-xs",
            estimatedReach > 0
              ? "bg-primary/5 border border-primary/20 text-primary"
              : "bg-muted border border-border text-muted-foreground"
          )}>
            <span className="font-bold text-sm">{estimatedReach}</span>
            <span>
              {audienceType === "all"
                ? t("campaigns.dialog.reachAll")
                : audienceType === "tag" && audienceValue
                  ? t("campaigns.dialog.reachTag", { tag: audienceValue })
                  : audienceType === "platform" && audienceValue
                    ? t("campaigns.dialog.reachPlatform", { platform: PLATFORM_CHIP[audienceValue]?.label ?? audienceValue })
                    : t("campaigns.dialog.reachSelect")}
            </span>
          </div>
        </div>

        {/* Message */}
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-2">
            {t("campaigns.dialog.messageLabel")}
          </label>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value.slice(0, MAX_CHARS))}
            rows={5}
            placeholder={t("campaigns.dialog.messagePlaceholder")}
            className="w-full px-3 py-2.5 text-sm rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
          />
          <p className={cn(
            "text-[11px] mt-1 text-right",
            remaining < 100 ? "text-amber-500" : "text-muted-foreground",
          )}>
            {t("campaigns.dialog.charCount", { count: message.length, max: MAX_CHARS })}
          </p>
        </div>

        {/* Schedule */}
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-2">
            {t("campaigns.dialog.scheduleLabel")}{" "}
            <span className="text-muted-foreground/60">{t("campaigns.dialog.scheduleHint")}</span>
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
            <p className="text-xs font-medium text-muted-foreground mb-2">{t("campaigns.dialog.preview")}</p>
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
            {t("campaigns.dialog.saveDraft")}
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
            {scheduledAt ? t("campaigns.dialog.schedule") : t("campaigns.dialog.queue")}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground rounded-xl hover:bg-muted transition-colors"
          >
            {t("common.cancel")}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function Campaigns() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { data: campaigns = [], isLoading } = useCampaigns();
  const { data: reach = { total: 0, tagCounts: {}, platformCounts: {} } } = useAudienceReach();
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
            <h1 className="text-2xl font-bold text-foreground">{t("campaigns.title")}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {t("campaigns.subtitle")}
            </p>
          </div>
          <button
            onClick={openNew}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-xl hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            {t("campaigns.newCampaign")}
          </button>
        </motion.div>

        {/* Info banner */}
        <div className="flex items-start gap-3 px-4 py-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl text-xs text-blue-700 dark:text-blue-300">
          <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <p>{t("campaigns.demoBanner")}</p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: t("campaigns.stats.total"),       value: campaigns.length.toString() },
            { label: t("campaigns.stats.totalSent"),   value: totalSent.toLocaleString() },
            { label: t("campaigns.stats.avgReadRate"), value: totalSent ? `${avgReadRate}%` : "—" },
            { label: t("campaigns.stats.avgReplyRate"),value: totalSent ? `${avgReplyRate}%` : "—" },
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
          {STATUS_TAB_KEYS.map(key => (
            <button
              key={key}
              onClick={() => setStatusFilter(key)}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                statusFilter === key
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {key === "all" ? t("common.all") : t(`campaigns.statuses.${key}`)}
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
            <p className="text-sm font-medium">{t("campaigns.empty.title")}</p>
            <p className="text-xs mt-1 opacity-70">
              {statusFilter === "all"
                ? t("campaigns.empty.hint")
                : t("campaigns.empty.filtered", { status: t(`campaigns.statuses.${statusFilter}`) })}
            </p>
            {statusFilter === "all" && (
              <button
                onClick={openNew}
                className="mt-4 flex items-center gap-1.5 px-4 py-2 bg-primary text-white text-sm font-medium rounded-xl mx-auto hover:bg-primary/90 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> {t("campaigns.createCampaign")}
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
                        PLATFORM_CONFIG[campaign.platform]?.dotColor ?? "bg-muted",
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
                      {t(`campaigns.statuses.${campaign.status}`)}
                    </span>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {/* Send button — draft only */}
                    {campaign.status === "draft" && (
                      sendConfirmId === campaign.id ? (
                        <div className="flex items-center gap-1">
                          <span className="text-[11px] text-muted-foreground mr-1">
                            {campaign.audienceType === "tag" && campaign.audienceValue
                              ? t("campaigns.confirm.sendTag", { tag: campaign.audienceValue })
                              : campaign.audienceType === "platform" && campaign.audienceValue
                                ? t("campaigns.confirm.sendPlatform", { platform: PLATFORM_REACH[campaign.audienceValue]?.label ?? campaign.audienceValue })
                                : t("campaigns.confirm.sendAll")}
                          </span>
                          <button
                            onClick={() => handleSend(campaign.id)}
                            disabled={sendCampaign.isPending}
                            className="text-[11px] px-2 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                          >
                            {sendCampaign.isPending
                              ? <Loader2 className="w-3 h-3 animate-spin" />
                              : t("campaigns.confirm.yesSend")
                            }
                          </button>
                          <button
                            onClick={() => setSendConfirmId(null)}
                            className="text-[11px] px-2 py-1 bg-muted text-muted-foreground rounded-lg hover:text-foreground transition-colors"
                          >
                            {t("common.cancel")}
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setSendConfirmId(campaign.id)}
                          title={t("campaigns.send")}
                          className="flex items-center gap-1 text-[11px] px-2.5 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                        >
                          <Rocket className="w-3 h-3" />
                          {t("campaigns.send")}
                        </button>
                      )
                    )}

                    {/* Edit — draft or scheduled only */}
                    {(campaign.status === "draft" || campaign.status === "scheduled") && (
                      <button
                        onClick={() => openEdit(campaign)}
                        className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                        title={t("campaigns.editCampaign")}
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
                          {t("campaigns.confirm.yes")}
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(null)}
                          className="text-[11px] px-2 py-1 bg-muted text-muted-foreground rounded-lg hover:text-foreground transition-colors"
                        >
                          {t("campaigns.confirm.no")}
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirmId(campaign.id)}
                        className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-muted-foreground hover:text-red-600 transition-colors"
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

                {/* Audience pill */}
                {campaign.audienceType && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-medium text-muted-foreground">{t("campaigns.audienceLabel")}:</span>
                    <span className={cn(
                      "text-[10px] font-semibold px-2 py-0.5 rounded-full",
                      campaign.audienceType === "all"
                        ? "bg-muted text-muted-foreground"
                        : "bg-primary/10 text-primary"
                    )}>
                      {campaign.audienceType === "all"
                        ? t("campaigns.audienceAll")
                        : campaign.audienceType === "tag"
                          ? `#${campaign.audienceValue}`
                          : campaign.audienceValue
                            ? PLATFORM_REACH[campaign.audienceValue]?.label ?? campaign.audienceValue
                            : "—"}
                    </span>
                  </div>
                )}

                {/* Stats row — sent campaigns only */}
                {campaign.status === "sent" && (
                  <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1 border-t border-border">
                    <span>
                      {t("campaigns.stats.sent")} <span className="text-foreground font-medium">{campaign.sentCount.toLocaleString()}</span>
                    </span>
                    <span>
                      {t("campaigns.stats.read")}{" "}
                      <span className="text-foreground font-medium">
                        {campaign.readCount.toLocaleString()}
                      </span>
                      <span className="text-muted-foreground ml-1">
                        ({pct(campaign.readCount, campaign.sentCount)}%)
                      </span>
                    </span>
                    <span>
                      {t("campaigns.stats.replies")} <span className="text-foreground font-medium">{campaign.replyCount.toLocaleString()}</span>
                    </span>
                  </div>
                )}

                {/* Scheduled date */}
                {campaign.status === "scheduled" && campaign.scheduledAt && (
                  <p className="text-xs text-blue-600 dark:text-blue-400">
                    {t("campaigns.scheduledFor")} {formatDate(campaign.scheduledAt)}
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
            reach={reach}
          />
        )}
      </AnimatePresence>
    </AppLayout>
  );
}
