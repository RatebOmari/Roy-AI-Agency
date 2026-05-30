import { AppLayout } from "@/components/layout/AppLayout";
import { useClients, useAgencyStats } from "@/hooks/useClients";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { TrendingUp, Users, MessageSquare, Zap, Loader2 } from "lucide-react";

export default function AgencyAnalytics() {
  const { data: clients = [] } = useClients();
  const { data: stats, isLoading } = useAgencyStats();

  const kpis = [
    {
      label: "Active Clients",
      value: isLoading ? "–" : (stats?.activeClients ?? clients.filter(c => c.status === "active").length).toString(),
      icon: Users,
      color: "text-blue-600",
      bg: "bg-blue-100",
    },
    {
      label: "Total Replies",
      value: isLoading ? "–" : (stats?.totalReplies ?? 0).toLocaleString(),
      icon: MessageSquare,
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      label: "Auto-Sent Rate",
      value: isLoading ? "–" : `${stats?.autoSentRate ?? 0}%`,
      icon: Zap,
      color: "text-green-600",
      bg: "bg-green-100",
    },
    {
      label: "Avg / Client",
      value: isLoading ? "–" : (stats?.avgPerClient ?? 0).toLocaleString(),
      icon: TrendingUp,
      color: "text-purple-600",
      bg: "bg-purple-100",
    },
  ];

  return (
    <AppLayout role="agency">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Agency Analytics</h1>
          <p className="text-sm text-muted-foreground mt-1">Performance across all managed accounts</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map(s => (
            <div key={s.label} className="bg-card rounded-2xl p-4 border border-border shadow-sm flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center flex-shrink-0`}>
                <s.icon className={`w-5 h-5 ${s.color}`} />
              </div>
              <div>
                <p className="text-xl font-bold text-foreground">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-card rounded-2xl p-5 border border-border shadow-sm">
          <h3 className="font-semibold text-foreground mb-5">Weekly Reply Volume (All Clients)</h3>
          {isLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={stats?.weeklyData ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", fontSize: 12 }} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="replies" name="Replies" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Per-client table */}
        <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h3 className="font-semibold text-foreground">Per-Client Breakdown</h3>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Client</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Replies</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground hidden md:table-cell">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {clients.map(c => (
                <tr key={c.id} className="hover:bg-muted/30">
                  <td className="px-5 py-3 font-medium text-foreground">{c.name}</td>
                  <td className="px-5 py-3 text-foreground">{c.replies.toLocaleString()}</td>
                  <td className="px-5 py-3 hidden md:table-cell">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      c.status === "active"  ? "bg-green-100 text-green-700"
                      : c.status === "paused" ? "bg-yellow-100 text-yellow-700"
                      : "bg-blue-100 text-blue-700"
                    }`}>{c.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  );
}
