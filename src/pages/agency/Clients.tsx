import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  Users, TrendingUp, CheckCircle, Search, Plus, MoreHorizontal,
  Eye, Settings, Pause, Play, MessageSquare, Loader2, X, MessageCircle, Inbox,
} from "lucide-react";
import type { AgencyClient, ClientStatus, ExtendedPlatform } from "@/types";
import { useClients, useUpdateClientStatus } from "@/hooks/useClients";
import { api } from "@/lib/api";

type PlatformPerms = Record<ExtendedPlatform, { comments: boolean; messages: boolean }>;

const DEFAULT_PERMS: PlatformPerms = {
  tiktok:    { comments: true,  messages: false },
  instagram: { comments: true,  messages: true  },
  facebook:  { comments: true,  messages: true  },
  whatsapp:  { comments: false, messages: true  },
  sms:       { comments: false, messages: true  },
  phone:     { comments: false, messages: false },
};

const PLATFORMS: { id: ExtendedPlatform; label: string }[] = [
  { id: "tiktok",    label: "TikTok" },
  { id: "instagram", label: "Instagram" },
  { id: "facebook",  label: "Facebook" },
  { id: "whatsapp",  label: "WhatsApp" },
  { id: "sms",       label: "SMS" },
  { id: "phone",     label: "Phone" },
];

const statusCls: Record<ClientStatus, string> = {
  active: "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400",
  paused: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400",
  setup:  "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400",
};

interface PermissionsPanelProps {
  client: AgencyClient;
  onClose: () => void;
}

function PermissionsPanel({ client, onClose }: PermissionsPanelProps) {
  const [perms, setPerms] = useState<PlatformPerms>({ ...DEFAULT_PERMS });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const toggle = (platform: ExtendedPlatform, feature: "comments" | "messages") => {
    setPerms(p => ({
      ...p,
      [platform]: { ...p[platform], [feature]: !p[platform][feature] },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.post("/clients/action", {
        action: "updatePermissions",
        clientId: client.id,
        permissions: perms,
      });
    } catch {
      // demo mode: ignore error
    } finally {
      setSaving(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 8 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 8 }}
        className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-md"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <p className="font-semibold text-foreground">Manage Permissions</p>
            <p className="text-xs text-muted-foreground">{client.name}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <div className="p-5 space-y-1">
          {/* Column header */}
          <div className="flex items-center gap-3 pb-2">
            <span className="flex-1 text-xs font-medium text-muted-foreground uppercase tracking-wide">Platform</span>
            <div className="flex items-center gap-1 w-24 justify-center text-xs font-medium text-muted-foreground">
              <MessageCircle className="w-3 h-3" /> Comments
            </div>
            <div className="flex items-center gap-1 w-24 justify-center text-xs font-medium text-muted-foreground">
              <Inbox className="w-3 h-3" /> Messages
            </div>
          </div>

          {PLATFORMS.map(({ id, label }) => {
            const isPhone = id === "phone";
            return (
              <div key={id} className="flex items-center gap-3 py-2.5 border-b border-border/50 last:border-0">
                <span className="flex-1 text-sm font-medium text-foreground">{label}</span>
                {/* Comments toggle */}
                <div className="w-24 flex justify-center">
                  <button
                    disabled={isPhone}
                    onClick={() => toggle(id, "comments")}
                    className={`w-10 h-6 rounded-full transition-colors relative ${
                      perms[id].comments && !isPhone ? "bg-primary" : "bg-muted-foreground/30"
                    } ${isPhone ? "opacity-40 cursor-not-allowed" : ""}`}
                  >
                    <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                      perms[id].comments && !isPhone ? "left-5" : "left-1"
                    }`} />
                  </button>
                </div>
                {/* Messages toggle */}
                <div className="w-24 flex justify-center">
                  <button
                    disabled={isPhone}
                    onClick={() => toggle(id, "messages")}
                    className={`w-10 h-6 rounded-full transition-colors relative ${
                      perms[id].messages && !isPhone ? "bg-primary" : "bg-muted-foreground/30"
                    } ${isPhone ? "opacity-40 cursor-not-allowed" : ""}`}
                  >
                    <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                      perms[id].messages && !isPhone ? "left-5" : "left-1"
                    }`} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="px-5 pb-5">
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? "Saved!" : "Save Permissions"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function AgencyClients() {
  const { t } = useTranslation();
  const { data, isLoading } = useClients();
  const statusMutation = useUpdateClientStatus();

  const [clients, setClients] = useState<AgencyClient[]>([]);
  const [search, setSearch] = useState("");
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [permClient, setPermClient] = useState<AgencyClient | null>(null);

  useEffect(() => {
    if (data) setClients(data);
  }, [data]);

  const filtered = clients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.owner.toLowerCase().includes(search.toLowerCase()) ||
    c.email.includes(search.toLowerCase())
  );

  const toggle = (id: string) => {
    const client = clients.find(c => c.id === id);
    if (!client) return;
    const newStatus: ClientStatus = client.status === "active" ? "paused" : "active";
    setClients(p => p.map(c => c.id === id ? { ...c, status: newStatus } : c));
    statusMutation.mutate({ id, status: newStatus });
  };

  const stats = {
    total:   clients.length,
    active:  clients.filter(c => c.status === "active").length,
    replies: clients.reduce((s, c) => s + c.replies, 0),
  };

  return (
    <AppLayout role="agency">
      <div className="space-y-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div>
            <h1 className="text-2xl font-bold text-foreground">{t("agency.title")}</h1>
            <p className="text-sm text-muted-foreground">{t("agency.subtitle")}</p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors">
            <Plus className="w-4 h-4" /> {t("agency.addClient")}
          </button>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: t("agency.totalClients"),  value: stats.total,                       icon: Users,       bg: "bg-blue-100 dark:bg-blue-900/20",   color: "text-blue-700 dark:text-blue-400" },
            { label: t("agency.activeClients"),  value: stats.active,                      icon: CheckCircle, bg: "bg-green-100 dark:bg-green-900/20",  color: "text-green-700 dark:text-green-400" },
            { label: t("agency.repliesMonth"),   value: stats.replies.toLocaleString(),    icon: TrendingUp,  bg: "bg-primary/10",                      color: "text-primary" },
          ].map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="bg-card rounded-2xl p-4 border border-border shadow-sm flex items-center gap-3"
            >
              <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center`}>
                <s.icon className={`w-5 h-5 ${s.color}`} />
              </div>
              <div>
                <p className="text-xl font-bold text-foreground">{isLoading ? "–" : s.value}</p>
                <p className="text-sm text-muted-foreground">{s.label}</p>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t("agency.searchPlaceholder")}
            className="w-full pl-10 pr-4 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-card shadow-sm"
          />
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden"
        >
          {isLoading && clients.length === 0 ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t("agency.client")}</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t("agency.replies")}</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t("agency.status")}</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr><td colSpan={4} className="text-center py-8 text-muted-foreground">{t("agency.noResults")}</td></tr>
                  ) : filtered.map(c => (
                    <tr key={c.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground">{c.name}</p>
                        <p className="text-xs text-muted-foreground">{c.owner}</p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <MessageSquare className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium">{c.replies.toLocaleString()}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusCls[c.status]}`}>
                          {t(`agency.statuses.${c.status}`)}
                        </span>
                      </td>
                      <td className="px-4 py-3 relative">
                        <button
                          onClick={() => setOpenMenu(openMenu === c.id ? null : c.id)}
                          className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                        >
                          <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                        </button>
                        {openMenu === c.id && (
                          <div className="absolute right-0 top-10 z-20 bg-card border border-border rounded-xl shadow-lg py-1 w-48">
                            <button className="flex items-center gap-2 w-full px-4 py-2 text-sm hover:bg-muted">
                              <Eye className="w-4 h-4" /> {t("agency.viewDetails")}
                            </button>
                            <button className="flex items-center gap-2 w-full px-4 py-2 text-sm hover:bg-muted">
                              <Settings className="w-4 h-4" /> {t("agency.accountSettings")}
                            </button>
                            <button
                              onClick={() => { setPermClient(c); setOpenMenu(null); }}
                              className="flex items-center gap-2 w-full px-4 py-2 text-sm hover:bg-muted text-primary"
                            >
                              <Users className="w-4 h-4" /> Manage Permissions
                            </button>
                            <button
                              onClick={() => { toggle(c.id); setOpenMenu(null); }}
                              className="flex items-center gap-2 w-full px-4 py-2 text-sm hover:bg-muted"
                            >
                              {c.status === "active"
                                ? <><Pause className="w-4 h-4" /> {t("agency.pause")}</>
                                : <><Play className="w-4 h-4" /> {t("agency.activate")}</>
                              }
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
      </div>

      {/* Permissions modal */}
      <AnimatePresence>
        {permClient && (
          <PermissionsPanel client={permClient} onClose={() => setPermClient(null)} />
        )}
      </AnimatePresence>
    </AppLayout>
  );
}
