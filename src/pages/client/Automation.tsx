import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import type { AutomationRule } from "@/types";
import { Zap, Plus, ToggleLeft, ToggleRight, Clock, Shield, MessageCircle } from "lucide-react";

const MOCK_RULES: AutomationRule[] = [
  {
    id: "r1",
    name: "Auto-send high-confidence replies",
    trigger: "sentiment_positive",
    action: "auto_send",
    channels: ["instagram_comment", "tiktok_comment", "facebook_comment"],
    active: true,
  },
  {
    id: "r2",
    name: "Escalate complaints",
    trigger: "sentiment_negative",
    action: "escalate",
    channels: ["instagram_dm", "facebook_messenger", "sms"],
    active: true,
  },
  {
    id: "r3",
    name: "Auto-reply to pricing questions",
    trigger: "contains_word",
    triggerValue: "price,cost,how much,pricing",
    action: "skip_review",
    channels: ["instagram_comment", "tiktok_comment"],
    active: false,
  },
];

const TRIGGER_LABELS: Record<AutomationRule["trigger"], string> = {
  contains_word: "Contains keyword",
  is_question: "Is a question",
  sentiment_positive: "Positive sentiment",
  sentiment_negative: "Negative sentiment",
  new_follower: "New follower",
};

const ACTION_LABELS: Record<AutomationRule["action"], string> = {
  auto_send: "Auto-send reply",
  skip_review: "Skip review queue",
  escalate: "Escalate to human",
  assign_to: "Assign to agent",
};

const ACTION_COLORS: Record<AutomationRule["action"], string> = {
  auto_send: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400",
  skip_review: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400",
  escalate: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400",
  assign_to: "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400",
};

export default function Automation() {
  const { user } = useAuth();
  const [rules, setRules] = useState<AutomationRule[]>(MOCK_RULES);

  const toggleRule = (id: string) => {
    setRules(prev => prev.map(r => r.id === id ? { ...r, active: !r.active } : r));
  };

  return (
    <AppLayout role="client" businessName={user?.businessName}>
      <div className="space-y-6 max-w-3xl">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Automation</h1>
            <p className="text-muted-foreground text-sm mt-1">Rules that control how the AI handles incoming messages</p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-xl hover:bg-primary/90 transition-colors">
            <Plus className="w-4 h-4" />
            Add Rule
          </button>
        </div>

        {/* AI Confidence Thresholds */}
        <div className="bg-card rounded-2xl p-5 border border-border">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-foreground">Hybrid AI Thresholds</h3>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-xl">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/40 flex items-center justify-center">
                  <Zap className="w-4 h-4 text-green-600 dark:text-green-400" />
                </span>
                <div>
                  <p className="text-sm font-medium text-green-800 dark:text-green-300">Auto-Send</p>
                  <p className="text-xs text-green-600 dark:text-green-500">AI confidence ≥ 85% — reply sent immediately</p>
                </div>
              </div>
              <span className="text-lg font-bold text-green-700 dark:text-green-400">≥ 85%</span>
            </div>

            <div className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-yellow-100 dark:bg-yellow-900/40 flex items-center justify-center">
                  <Clock className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                </span>
                <div>
                  <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300">Review Queue</p>
                  <p className="text-xs text-yellow-600 dark:text-yellow-500">AI confidence 50–84% — waits for approval</p>
                </div>
              </div>
              <span className="text-lg font-bold text-yellow-700 dark:text-yellow-400">50–84%</span>
            </div>

            <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-xl">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-900/40 flex items-center justify-center">
                  <Shield className="w-4 h-4 text-red-600 dark:text-red-400" />
                </span>
                <div>
                  <p className="text-sm font-medium text-red-800 dark:text-red-300">Human Escalation</p>
                  <p className="text-xs text-red-600 dark:text-red-500">AI confidence &lt; 50% — flagged for human response</p>
                </div>
              </div>
              <span className="text-lg font-bold text-red-700 dark:text-red-400">&lt; 50%</span>
            </div>
          </div>
        </div>

        {/* Rules */}
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
            <MessageCircle className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-foreground">Automation Rules</h3>
          </div>
          <div className="divide-y divide-border">
            {rules.map(rule => (
              <div key={rule.id} className="flex items-start gap-4 px-5 py-4">
                <button
                  onClick={() => toggleRule(rule.id)}
                  className="mt-0.5 text-muted-foreground hover:text-primary transition-colors"
                >
                  {rule.active
                    ? <ToggleRight className="w-7 h-7 text-primary" />
                    : <ToggleLeft className="w-7 h-7" />
                  }
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground mb-1">{rule.name}</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-muted-foreground">When:</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                      {TRIGGER_LABELS[rule.trigger]}
                      {rule.triggerValue && `: "${rule.triggerValue}"`}
                    </span>
                    <span className="text-xs text-muted-foreground">→</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ACTION_COLORS[rule.action]}`}>
                      {ACTION_LABELS[rule.action]}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {rule.channels.map(ch => (
                      <span key={ch} className="text-[10px] px-1.5 py-0.5 rounded bg-muted/70 text-muted-foreground">
                        {ch.replace("_", " ")}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Working Hours */}
        <div className="bg-card rounded-2xl p-5 border border-border">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-foreground">Working Hours</h3>
            <span className="text-xs text-muted-foreground ml-1">(Eastern Time)</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {["Monday–Friday", "Saturday", "Sunday"].map((day, i) => (
              <div key={day} className="flex items-center justify-between p-3 bg-muted/50 rounded-xl">
                <span className="text-sm text-foreground">{day}</span>
                <span className="text-sm text-muted-foreground">
                  {i === 0 ? "9:00 AM – 8:00 PM" : i === 1 ? "10:00 AM – 6:00 PM" : "11:00 AM – 5:00 PM"}
                </span>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Outside working hours, AI replies are queued for review when your team is back online.
          </p>
        </div>
      </div>
    </AppLayout>
  );
}
