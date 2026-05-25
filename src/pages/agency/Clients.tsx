import { useState } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { AppLayout } from "@/components/layout/AppLayout";
import { Users, TrendingUp, CheckCircle, Search, Plus, MoreHorizontal, Eye, Settings, Pause, Play, MessageSquare } from "lucide-react";
import type { Platform } from "@/components/social/PlatformCard";

type Status = "active" | "paused" | "setup";

interface Client {
  id: string;
  name: string;
  owner: string;
  email: string;
  platforms: Platform[];
  replies: number;
  status: Status;
}

const mock: Client[] = [
  { id: "1", name: "Al-Asala Restaurant", owner: "Mohammed Al-Qahtani", email: "asala@mail.com",  platforms: ["tiktok","instagram"],           replies: 342, status: "active" },
  { id: "2", name: "Fiona Salon",         owner: "Nour Al-Omari",       email: "fiona@mail.com",  platforms: ["tiktok","instagram","facebook"], replies: 218, status: "active" },
  { id: "3", name: "Smile Clinic",        owner: "Dr. Sami Al-Shammari", email: "smile@mail.com", platforms: ["facebook","whatsapp"],           replies: 87,  status: "active" },
  { id: "4", name: "Breeq Café",          owner: "Layla Al-Mansour",    email: "breeq@mail.com",  platforms: ["instagram"],                    replies: 0,   status: "setup" },
  { id: "5", name: "Tec Store",           owner: "Ali Al-Zahrani",      email: "tec@mail.com",    platforms: ["tiktok","whatsapp"],            replies: 156, status: "paused" },
];

const pColor: Record<Platform, string> = {
  tiktok: "bg-black text-white", instagram: "bg-pink-500 text-white",
  facebook: "bg-blue-600 text-white", whatsapp: "bg-green-500 text-white",
};
const pShort: Record<Platform, string> = { tiktok: "TT", instagram: "IG", facebook: "FB", whatsapp: "WA" };

const statusCls: Record<Status, string> = {
  active: "bg-green-100 text-green-700",
  paused: "bg-yellow-100 text-yellow-700",
  setup:  "bg-blue-100 text-blue-700",
};

export default function AgencyClients() {
  const { t } = useTranslation();
  const [clients, setClients] = useState(mock);
  const [search, setSearch] = useState("");
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const filtered = clients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.owner.toLowerCase().includes(search.toLowerCase()) ||
    c.email.includes(search.toLowerCase())
  );

  const toggle = (id: string) =>
    setClients(p => p.map(c => c.id === id
      ? { ...c, status: (c.status === "active" ? "paused" : "active") as Status }
      : c
    ));

  const stats = {
    total: clients.length,
    active: clients.filter(c => c.status === "active").length,
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
            { label: t("agency.totalClients"),  value: stats.total,                       icon: Users,       bg: "bg-blue-100",   color: "text-blue-700" },
            { label: t("agency.activeClients"),  value: stats.active,                      icon: CheckCircle, bg: "bg-green-100",  color: "text-green-700" },
            { label: t("agency.repliesMonth"),   value: stats.replies.toLocaleString(),    icon: TrendingUp,  bg: "bg-primary/10", color: "text-primary" },
          ].map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="bg-card rounded-2xl p-4 border border-border shadow-sm flex items-center gap-3"
            >
              <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center`}>
                <s.icon className={`w-5 h-5 ${s.color}`} />
              </div>
              <div>
                <p className="text-xl font-bold text-foreground">{s.value}</p>
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
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t("agency.client")}</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">{t("agency.platforms2")}</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t("agency.replies")}</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t("agency.status")}</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">{t("agency.noResults")}</td></tr>
                ) : filtered.map(c => (
                  <tr key={c.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground">{c.name}</p>
                      <p className="text-xs text-muted-foreground">{c.owner}</p>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <div className="flex gap-1 flex-wrap">
                        {c.platforms.map(p => (
                          <span key={p} className={`text-xs font-bold px-1.5 py-0.5 rounded ${pColor[p]}`}>{pShort[p]}</span>
                        ))}
                      </div>
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
                        <div className="absolute right-0 top-10 z-20 bg-card border border-border rounded-xl shadow-lg py-1 w-44">
                          <button className="flex items-center gap-2 w-full px-4 py-2 text-sm hover:bg-muted">
                            <Eye className="w-4 h-4" /> {t("agency.viewDetails")}
                          </button>
                          <button className="flex items-center gap-2 w-full px-4 py-2 text-sm hover:bg-muted">
                            <Settings className="w-4 h-4" /> {t("agency.accountSettings")}
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
        </motion.div>
      </div>
    </AppLayout>
  );
}
