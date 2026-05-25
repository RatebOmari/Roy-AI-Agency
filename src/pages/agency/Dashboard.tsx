import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { AppLayout } from "@/components/layout/AppLayout";
import { useClients } from "@/hooks/useClients";
import { Users, TrendingUp, CheckCircle, MessageSquare, ArrowRight } from "lucide-react";

export default function AgencyDashboard() {
  const { data: clients = [], isLoading } = useClients();

  const stats = {
    total:   clients.length,
    active:  clients.filter(c => c.status === "active").length,
    paused:  clients.filter(c => c.status === "paused").length,
    replies: clients.reduce((s, c) => s + c.replies, 0),
  };

  const recentClients = clients.slice(0, 4);

  return (
    <AppLayout role="agency">
      <div className="space-y-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-bold text-foreground">Agency Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Overview of all your managed accounts</p>
        </motion.div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total Clients",    value: stats.total,                    icon: Users,        bg: "bg-blue-100",    color: "text-blue-700" },
            { label: "Active",           value: stats.active,                   icon: CheckCircle,  bg: "bg-green-100",   color: "text-green-700" },
            { label: "Paused",           value: stats.paused,                   icon: MessageSquare,bg: "bg-yellow-100",  color: "text-yellow-700" },
            { label: "Replies This Month", value: stats.replies.toLocaleString(), icon: TrendingUp, bg: "bg-primary/10",  color: "text-primary" },
          ].map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="bg-card rounded-2xl p-4 border border-border shadow-sm flex items-center gap-3"
            >
              <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center flex-shrink-0`}>
                <s.icon className={`w-5 h-5 ${s.color}`} />
              </div>
              <div>
                <p className="text-xl font-bold text-foreground">{isLoading ? "–" : s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Recent clients */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="bg-card rounded-2xl border border-border shadow-sm"
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h2 className="font-semibold text-foreground">Recent Clients</h2>
            <Link to="/agency/clients" className="flex items-center gap-1 text-xs text-primary hover:underline">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-border">
            {recentClients.map(c => (
              <div key={c.id} className="flex items-center justify-between px-5 py-3.5">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                    {c.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{c.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">{c.replies.toLocaleString()} replies</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    c.status === "active" ? "bg-green-100 text-green-700"
                    : c.status === "paused" ? "bg-yellow-100 text-yellow-700"
                    : "bg-blue-100 text-blue-700"
                  }`}>
                    {c.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </AppLayout>
  );
}
