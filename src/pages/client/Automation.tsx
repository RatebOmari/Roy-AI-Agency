import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import type { AutomationRule } from "@/types";
import { Zap, Plus, ToggleLeft, ToggleRight, Clock, Shield, MessageCircle, Trash2, Loader2 } from "lucide-react";
import {
  useAutomationRules,
  useCreateAutomationRule,
  useUpdateAutomationRule,
  useDeleteAutomationRule,
} from "@/hooks/useAutomation";
import { useState } from "react";

const TRIGGER_LABELS: Record<AutomationRule["trigger"], string> = {
  contains_word:      "Contains keyword",
  is_question:        "Is a question",
  sentiment_positive: "Positive sentiment",
  sentiment_negative: "Negative sentiment",
  new_follower:       "New follower",
};

const ACTION_LABELS: Record<AutomationRule["action"], string> = {
  auto_send:   "Auto-send reply",
  skip_review: "Skip review queue",
  escalate:    "Escalate to human",
  assign_to:   "Assign to agent",
};

const ACTION_COLORS: Record<AutomationRule["action"], string> = {
  auto_send:   "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400",
  skip_review: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400",
  escalate:    "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400",
  assign_to:   "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400",
};

export default function Automation() {
  const { user } = useAuth();
  const { data: rules = [], isLoading } = useAutomationRules();
  const updateRule   = useUpdateAutomationRule();
  const deleteRule   = useDeleteAutomationRule();
  const createRule   = useCreateAutomationRule();

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<Omit<AutomationRule, "id">>({
    name:    "",
    trigger: "contains_word",
    action:  "auto_send",
    channels: [],
    active:  true,
  });

  const toggleRule = (rule: AutomationRule) => {
    updateRule.mutate({ ...rule, active: !rule.active });
  };

  const handleCreate = () => {
    if (!form.name.trim()) return;
    createRule.mutate(form, {
      onSuccess: () => {
        setShowCreate(false);
        setForm({ name: "", trigger: "contains_word", action: "auto_send", channels: [], active: true });
      },
    });
  };

  return (
    <AppLayout role="client" businessName={user?.businessName}>
      <div className="space-y-6 max-w-3xl">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Automation</h1>
            <p className="text-muted-foreground text-sm mt-1">Rules that control how the AI handles incoming messages</p>
          </div>
          <button
            onClick={() => setShowCreate(v => !v)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-xl hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Rule
          </button>
        </div>

        {/* Create rule form */}
        {showCreate && (
          <div className="bg-card rounded-2xl p-5 border border-border space-y-3">
            <h4 className="font-semibold text-foreground text-sm">New Rule</h4>
            <input
              type="text"
              placeholder="Rule name"
              value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-border rounded-xl bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <div className="flex gap-3">
              <select
                value={form.trigger}
                onChange={e => setForm(p => ({ ...p, trigger: e.target.value as AutomationRule["trigger"] }))}
                className="flex-1 px-3 py-2 text-sm border border-border rounded-xl bg-background text-foreground"
              >
                {(Object.keys(TRIGGER_LABELS) as AutomationRule["trigger"][]).map(t => (
                  <option key={t} value={t}>{TRIGGER_LABELS[t]}</option>
                ))}
              </select>
              <select
                value={form.action}
                onChange={e => setForm(p => ({ ...p, action: e.target.value as AutomationRule["action"] }))}
                className="flex-1 px-3 py-2 text-sm border border-border rounded-xl bg-background text-foreground"
              >
                {(Object.keys(ACTION_LABELS) as AutomationRule["action"][]).map(a => (
                  <option key={a} value={a}>{ACTION_LABELS[a]}</option>
                ))}
              </select>
            </div>
            {form.trigger === "contains_word" && (
              <input
                type="text"
                placeholder="Keywords, comma-separated"
                value={form.triggerValue ?? ""}
                onChange={e => setForm(p => ({ ...p, triggerValue: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-border rounded-xl bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            )}
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowCreate(false)}
                className="px-4 py-2 text-sm rounded-xl border border-border text-muted-foreground hover:bg-muted"
              >Cancel</button>
              <button
                onClick={handleCreate}
                disabled={createRule.isPending || !form.name.trim()}
                className="px-4 py-2 text-sm rounded-xl bg-primary text-white hover:bg-primary/90 disabled:opacity-50"
              >
                {createRule.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
              </button>
            </div>
          </div>
        )}

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

        {/* Rules list */}
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
            <MessageCircle className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-foreground">Automation Rules</h3>
          </div>
          {isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
            </div>
          ) : rules.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">No rules yet. Click "Add Rule" to create one.</p>
          ) : (
            <div className="divide-y divide-border">
              {rules.map(rule => (
                <div key={rule.id} className="flex items-start gap-4 px-5 py-4">
                  <button
                    onClick={() => toggleRule(rule)}
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
                    {rule.channels.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {rule.channels.map(ch => (
                          <span key={ch} className="text-[10px] px-1.5 py-0.5 rounded bg-muted/70 text-muted-foreground">
                            {ch.replace(/_/g, " ")}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => deleteRule.mutate(rule.id)}
                    className="text-muted-foreground hover:text-destructive transition-colors mt-0.5"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Working Hours */}
        <div className="bg-card rounded-2xl p-5 border border-border">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-foreground">Working Hours</h3>
            <span className="text-xs text-muted-foreground ml-1">(Eastern Time)</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {(["Monday–Friday", "Saturday", "Sunday"] as const).map((day, i) => (
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
