import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { TrendingUp, MessageCircle, Zap, Clock, Users } from "lucide-react";

const DAILY_DATA = [
  { date: "Mon", total: 42, autoSent: 31, manual: 8, escalated: 3 },
  { date: "Tue", total: 58, autoSent: 44, manual: 11, escalated: 3 },
  { date: "Wed", total: 35, autoSent: 28, manual: 5, escalated: 2 },
  { date: "Thu", total: 67, autoSent: 51, manual: 13, escalated: 3 },
  { date: "Fri", total: 89, autoSent: 70, manual: 15, escalated: 4 },
  { date: "Sat", total: 112, autoSent: 89, manual: 19, escalated: 4 },
  { date: "Sun", total: 76, autoSent: 60, manual: 12, escalated: 4 },
];

const CHANNEL_DATA = [
  { name: "Instagram", value: 38, color: "#a855f7" },
  { name: "TikTok", value: 27, color: "#1a1a1a" },
  { name: "Facebook", value: 18, color: "#3b82f6" },
  { name: "SMS", value: 12, color: "#64748b" },
  { name: "WhatsApp", value: 5, color: "#22c55e" },
];

const STATS = [
  { label: "Total Messages (7d)", value: "479", icon: MessageCircle, trend: "+12%" },
  { label: "Auto-Sent", value: "373", icon: Zap, trend: "+9%" },
  { label: "Avg Response Time", value: "1.4 min", icon: Clock, trend: "-0.3m" },
  { label: "Unique Contacts", value: "214", icon: Users, trend: "+18%" },
];

export default function Analytics() {
  const { user } = useAuth();

  return (
    <AppLayout role="client" businessName={user?.businessName}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
          <p className="text-muted-foreground text-sm mt-1">Performance overview for the last 7 days</p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {STATS.map(stat => (
            <div key={stat.label} className="bg-card rounded-2xl p-4 border border-border">
              <div className="flex items-center justify-between mb-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                  <stat.icon className="w-4 h-4 text-primary" />
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  stat.trend.startsWith("+") ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"
                }`}>
                  {stat.trend}
                </span>
              </div>
              <p className="text-2xl font-bold text-foreground">{stat.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Message Volume Chart */}
        <div className="bg-card rounded-2xl p-5 border border-border">
          <div className="flex items-center gap-2 mb-5">
            <TrendingUp className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-foreground">Message Volume</h3>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={DAILY_DATA} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", fontSize: 12 }} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="autoSent" name="Auto-Sent" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="manual" name="Manual" fill="#94a3b8" radius={[4, 4, 0, 0]} />
              <Bar dataKey="escalated" name="Escalated" fill="#f87171" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Response time trend */}
          <div className="bg-card rounded-2xl p-5 border border-border">
            <h3 className="font-semibold text-foreground mb-5">Response Time (min)</h3>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={DAILY_DATA.map((d, i) => ({ ...d, responseTime: +(1.8 - i * 0.06).toFixed(2) }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", fontSize: 12 }} />
                <Line type="monotone" dataKey="responseTime" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Channel breakdown */}
          <div className="bg-card rounded-2xl p-5 border border-border">
            <h3 className="font-semibold text-foreground mb-5">Channel Breakdown</h3>
            <div className="flex items-center gap-6">
              <ResponsiveContainer width={160} height={160}>
                <PieChart>
                  <Pie data={CHANNEL_DATA} cx="50%" cy="50%" innerRadius={50} outerRadius={75} dataKey="value" paddingAngle={2}>
                    {CHANNEL_DATA.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-col gap-2">
                {CHANNEL_DATA.map(d => (
                  <div key={d.name} className="flex items-center gap-2 text-sm">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: d.color }} />
                    <span className="text-muted-foreground">{d.name}</span>
                    <span className="font-semibold ml-auto">{d.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
