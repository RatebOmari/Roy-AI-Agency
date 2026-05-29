import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  Users, TrendingUp, CheckCircle, Search, Plus, MoreHorizontal,
  Eye, Settings, Pause, Play, MessageSquare, Loader2, X, MessageCircle, Inbox,
  Link2, Link2Off, CheckCircle2,
} from "lucide-react";
import type { AgencyClient, ClientStatus, ExtendedPlatform, PlatformFeatureType } from "@/types";
import {
  useClients, useUpdateClientStatus, useUpdateClientPermissions,
  useClientPlatforms, useSetClientPlatformCredential, useRevokeClientPlatformCredential,
} from "@/hooks/useClients";
import { cn } from "@/lib/utils";

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

// Platform-feature pairs the agency can configure credentials for
const CONNECTABLE: {
  platform: ExtendedPlatform;
  feature: PlatformFeatureType;
  label: string;
  dotClass: string;
  hint: string;
}[] = [
  { platform: "instagram", feature: "comments", label: "Instagram — Comments",    dotClass: "bg-pink-500",   hint: "Meta Graph API token with instagram_manage_comments scope" },
  { platform: "instagram", feature: "messages", label: "Instagram — Direct",      dotClass: "bg-pink-500",   hint: "Meta Graph API token with instagram_manage_messages scope" },
  { platform: "facebook",  feature: "comments", label: "Facebook — Comments",     dotClass: "bg-blue-600",   hint: "Meta Graph API token with pages_manage_posts scope" },
  { platform: "facebook",  feature: "messages", label: "Facebook — Messenger",    dotClass: "bg-blue-600",   hint: "Meta Graph API token with pages_messaging scope" },
  { platform: "tiktok",    feature: "comments", label: "TikTok — Comments",       dotClass: "bg-zinc-800",   hint: "TikTok Developer Platform access token" },
  { platform: "whatsapp",  feature: "messages", label: "WhatsApp Business",       dotClass: "bg-green-500",  hint: "WhatsApp Business API access token from Meta for Developers" },
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
  const [tab, setTab]   = useState<"connections" | "permissions">("connections");
  const [perms, setPerms] = useState<PlatformPerms>({ ...DEFAULT_PERMS });
  const [permSaved, setPermSaved] = useState(false);
  // token inputs: key = "platform:feature"
  const [tokens, setTokens] = useState<Record<string, string>>({});

  const permsMutation   = useUpdateClientPermissions();
  const credMutation    = useSetClientPlatformCredential();
  const revokeMutation  = useRevokeClientPlatformCredential();
  const { data: platformData = [], isLoading: platformsLoading } = useClientPlatforms(client.id);

  const isConnected = (platform: string, feature: string) =>
    platformData.some(p => p.platform === platform && p.feature === feature);

  const connectedAt = (platform: string, feature: string) =>
    platformData.find(p => p.platform === platform && p.feature === feature)?.connectedAt;

  const tokenKey = (platform: string, feature: string) => `${platform}:${feature}`;

  const handleSaveToken = (platform: ExtendedPlatform, feature: PlatformFeatureType) => {
    const token = tokens[tokenKey(platform, feature)]?.trim();
    if (!token) return;
    credMutation.mutate(
      { clientId: client.id, platform, feature, accessToken: token },
      { onSuccess: () => setTokens(p => ({ ...p, [tokenKey(platform, feature)]: "" })) }
    );
  };

  const handleRevoke = (platform: ExtendedPlatform, feature: PlatformFeatureType) => {
    revokeMutation.mutate({ clientId: client.id, platform, feature });
  };

  const togglePerm = (platform: ExtendedPlatform, feature: "comments" | "messages") => {
    setPerms(p => ({ ...p, [platform]: { ...p[platform], [feature]: !p[platform][feature] } }));
  };

  const handleSavePerms = () => {
    permsMutation.mutate(
      { clientId: client.id, permissions: perms },
      { onSuccess: () => { setPermSaved(true); setTimeout(() => setPermSaved(false), 2000); } }
    );
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
        className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div>
            <p className="font-semibold text-foreground">Client Setup</p>
            <p className="text-xs text-muted-foreground">{client.name}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-5 pt-3 shrink-0">
          {(["connections", "permissions"] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize",
                tab === t
                  ? "bg-primary text-white"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              {t === "connections" ? "Platform Connections" : "Feature Permissions"}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-3">

          {/* ── Connections tab ──────────────────────────────────────────── */}
          {tab === "connections" && (
            <>
              <p className="text-xs text-muted-foreground">
                Provide API access tokens for each platform. Tokens are stored securely and used by the AI to post replies on behalf of {client.name}.
              </p>

              {platformsLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                </div>
              ) : (
                <div className="space-y-2">
                  {CONNECTABLE.map(({ platform, feature, label, dotClass, hint }) => {
                    const connected = isConnected(platform, feature);
                    const connAt    = connectedAt(platform, feature);
                    const key       = tokenKey(platform, feature);
                    const isSaving  = credMutation.isPending;
                    const isRevoking = revokeMutation.isPending;

                    return (
                      <div key={key} className="rounded-xl border border-border p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className={cn("w-2 h-2 rounded-full shrink-0", dotClass)} />
                            <span className="text-sm font-medium text-foreground">{label}</span>
                          </div>
                          {connected ? (
                            <div className="flex items-center gap-2">
                              <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400 font-medium">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Connected
                              </span>
                              <button
                                onClick={() => handleRevoke(platform as ExtendedPlatform, feature as PlatformFeatureType)}
                                disabled={isRevoking}
                                className="flex items-center gap-1 px-2 py-1 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                              >
                                <Link2Off className="w-3 h-3" /> Revoke
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">Not configured</span>
                          )}
                        </div>

                        {connected && connAt && (
                          <p className="text-xs text-muted-foreground">
                            Connected {new Date(connAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          </p>
                        )}

                        {!connected && (
                          <div className="space-y-1.5">
                            <p className="text-xs text-muted-foreground">{hint}</p>
                            <div className="flex gap-2">
                              <input
                                type="password"
                                value={tokens[key] ?? ""}
                                onChange={e => setTokens(p => ({ ...p, [key]: e.target.value }))}
                                placeholder="Paste access token…"
                                className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 font-mono"
                              />
                              <button
                                onClick={() => handleSaveToken(platform as ExtendedPlatform, feature as PlatformFeatureType)}
                                disabled={!tokens[key]?.trim() || isSaving}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white text-xs font-medium rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                              >
                                {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Link2 className="w-3 h-3" />}
                                Connect
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* ── Permissions tab ──────────────────────────────────────────── */}
          {tab === "permissions" && (
            <>
              <p className="text-xs text-muted-foreground">
                Control which features the AI is allowed to use per platform for {client.name}.
              </p>

              <div className="space-y-1">
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
                      {(["comments", "messages"] as const).map(feat => (
                        <div key={feat} className="w-24 flex justify-center">
                          <button
                            disabled={isPhone}
                            onClick={() => togglePerm(id, feat)}
                            className={cn(
                              "w-10 h-6 rounded-full transition-colors relative",
                              perms[id][feat] && !isPhone ? "bg-primary" : "bg-muted-foreground/30",
                              isPhone && "opacity-40 cursor-not-allowed"
                            )}
                          >
                            <span className={cn(
                              "absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform",
                              perms[id][feat] && !isPhone ? "left-5" : "left-1"
                            )} />
                          </button>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>

              <button
                onClick={handleSavePerms}
                disabled={permsMutation.isPending}
                className="w-full py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {permsMutation.isPending
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : permSaved
                    ? <><CheckCircle2 className="w-4 h-4" /> Saved!</>
                    : "Save Permissions"
                }
              </button>
              {permsMutation.isError && (
                <p className="text-xs text-red-500 text-center">Failed to save. Please try again.</p>
              )}
            </>
          )}
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
