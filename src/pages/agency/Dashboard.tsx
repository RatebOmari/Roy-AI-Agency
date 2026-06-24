import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { AppLayout } from "@/components/layout/AppLayout";
import { useClients } from "@/hooks/useClients";
import { useCommandCenter } from "@/hooks/useCommandCenter";
import { useAgencyClient } from "@/contexts/AgencyClientContext";
import { computeHealthScore } from "@/hooks/useHealthScore";
import {
  Users, TrendingUp, CheckCircle, AlertTriangle,
  ArrowRight, Siren, Clock, XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { UrgentType } from "@/hooks/useCommandCenter";

// ── Helpers ───────────────────────────────────────────────────────────────────

const TYPE_META: Record<UrgentType, { icon: React.ElementType; badge: string; border: string }> = {
  escalation:  { icon: AlertTriangle, badge: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",    border: "border-l-red-500" },
  pending:     { icon: Clock,         badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400", border: "border-l-amber-500" },
  failed_post: { icon: XCircle,       badge: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300", border: "border-l-slate-400" },
};

const JUMP_ROUTE: Record<UrgentType, string> = {
  escalation: "/inbox", pending: "/inbox", failed_post: "/content",
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1)  return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function healthRing(score: number) {
  if (score >= 80) return "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400";
  if (score >= 50) return "bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400";
  return "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400";
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export default function AgencyDashboard() {
  const navigate = useNavigate();
  const { data: clients = [], isLoading }     = useClients();
  const { data: urgentItems = [] }            = useCommandCenter();
  const { selectClient }                      = useAgencyClient();

  const stats = {
    total:     clients.length,
    active:    clients.filter(c => c.status === "active").length,
    attention: clients.filter(c => computeHealthScore(c) < 60).length,
    replies:   clients.reduce((s, c) => s + c.replies, 0),
  };

  const topUrgent = urgentItems
    .slice()
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    .slice(0, 3);

  const handleJumpIn = (clientId: string, route: string) => {
    const client = clients.find(c => c.id === clientId);
    if (client) selectClient(client);
    navigate(route);
  };

  return (
    <AppLayout role="agency">
      <div className="space-y-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Overview of all managed accounts</p>
        </motion.div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total Clients",      value: stats.total,                     icon: Users,         bg: "bg-blue-100 dark:bg-blue-900/20",    color: "text-blue-700 dark:text-blue-400" },
            { label: "Active",             value: stats.active,                    icon: CheckCircle,   bg: "bg-green-100 dark:bg-green-900/20",  color: "text-green-700 dark:text-green-400" },
            { label: "Needs Attention",    value: stats.attention,                 icon: AlertTriangle, bg: "bg-red-100 dark:bg-red-900/20",      color: "text-red-700 dark:text-red-400" },
            { label: "Replies This Month", value: stats.replies.toLocaleString(),  icon: TrendingUp,    bg: "bg-primary/10",                      color: "text-primary" },
          ].map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="bg-card rounded-2xl p-4 border border-border shadow-sm flex items-center gap-3"
            >
              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0", s.bg)}>
                <s.icon className={cn("w-5 h-5", s.color)} />
              </div>
              <div>
                <p className="text-xl font-bold text-foreground">{isLoading ? "–" : s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Main content: clients + urgent items */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

          {/* All clients with health scores */}
          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="xl:col-span-2 bg-card rounded-2xl border border-border shadow-sm"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="font-semibold text-foreground">All Clients</h2>
              <Link to="/agency/clients" className="flex items-center gap-1 text-xs text-primary hover:underline">
                Manage <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {isLoading ? (
              <div className="py-12 text-center text-sm text-muted-foreground">Loading…</div>
            ) : clients.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-sm text-muted-foreground">No clients yet.</p>
                <Link to="/agency/clients/new" className="mt-2 inline-block text-xs text-primary hover:underline">
                  Add your first client →
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {clients.map(c => {
                  const score = computeHealthScore(c);
                  return (
                    <div key={c.id} className="flex items-center justify-between px-5 py-3.5 gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={cn("w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0", healthRing(score))}>
                          {c.name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{c.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{c.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className="hidden sm:block text-xs text-muted-foreground">{c.replies.toLocaleString()} replies</span>
                        <span className={cn(
                          "text-xs px-2 py-0.5 rounded-full font-medium",
                          c.status === "active" ? "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                          : c.status === "paused" ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400"
                          : "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400",
                        )}>
                          {c.status}
                        </span>
                        <span className={cn(
                          "text-xs font-bold px-2 py-0.5 rounded-lg border",
                          score >= 80 ? "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800"
                          : score >= 50 ? "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800"
                          : "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800",
                        )}>
                          {score}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>

          {/* Urgent items preview */}
          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="bg-card rounded-2xl border border-border shadow-sm"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <Siren className="w-4 h-4 text-red-500" />
                <h2 className="font-semibold text-foreground">Urgent</h2>
                {urgentItems.length > 0 && (
                  <span className="px-1.5 py-0.5 text-[10px] font-bold bg-red-500 text-white rounded-full">
                    {urgentItems.length}
                  </span>
                )}
              </div>
              <Link to="/agency/command" className="flex items-center gap-1 text-xs text-primary hover:underline">
                View all <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {topUrgent.length === 0 ? (
              <div className="py-12 flex flex-col items-center text-muted-foreground">
                <CheckCircle className="w-8 h-8 mb-2 text-green-500" />
                <p className="text-sm font-medium text-foreground">All clear</p>
                <p className="text-xs mt-0.5">No urgent items right now</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {topUrgent.map(item => {
                  const meta = TYPE_META[item.type];
                  const Icon = meta.icon;
                  return (
                    <div
                      key={item.id}
                      className={cn("px-5 py-3.5 border-l-4", meta.border)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <Icon className="w-3.5 h-3.5 shrink-0 text-current opacity-60" />
                            <p className="text-xs font-semibold text-foreground truncate">{item.clientName}</p>
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>
                          <p className="text-[10px] text-muted-foreground/60 mt-1">{timeAgo(item.timestamp)}</p>
                        </div>
                        <button
                          onClick={() => handleJumpIn(item.clientId, JUMP_ROUTE[item.type])}
                          className="shrink-0 text-xs text-primary hover:underline font-medium mt-0.5"
                        >
                          Jump in
                        </button>
                      </div>
                    </div>
                  );
                })}

                {urgentItems.length > 3 && (
                  <div className="px-5 py-3 text-center">
                    <Link to="/agency/command" className="text-xs text-muted-foreground hover:text-foreground">
                      +{urgentItems.length - 3} more in Command Center
                    </Link>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </AppLayout>
  );
}
