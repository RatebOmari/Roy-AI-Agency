import { useState, useRef, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useFlows, useCreateFlow, useUpdateFlow, useDeleteFlow } from "@/hooks/useFlows";
import type { ChatbotFlow, FlowStep, FlowTrigger, FlowStepType, Platform } from "@/types";
import {
  GitBranch,
  Plus,
  ToggleLeft,
  ToggleRight,
  MessageCircle,
  LayoutGrid,
  Edit3,
  UserCheck,
  Trash2,
  X,
  ChevronDown,
  Info,
  Bot,
  Zap,
} from "lucide-react";

const TRIGGER_LABELS: Record<FlowTrigger, string> = {
  greeting:  "First message / Greeting",
  keyword:   "Contains keyword",
  order:     "Customer wants to order",
  inquiry:   "Customer has a question",
  fallback:  "No other flow matched",
};

const TRIGGER_EMOJI: Record<FlowTrigger, string> = {
  greeting: "👋",
  keyword:  "🔑",
  order:    "🛒",
  inquiry:  "❓",
  fallback: "🔄",
};

const TRIGGER_CUSTOMER_MSG: Record<FlowTrigger, string> = {
  greeting: "Hi there!",
  keyword:  "",
  order:    "I'd like to place an order",
  inquiry:  "I have a question",
  fallback: "...",
};

const STEP_ICONS: Record<FlowStepType, React.ElementType> = {
  message:       MessageCircle,
  quick_replies: LayoutGrid,
  collect_input: Edit3,
  condition:     GitBranch,
  handoff:       UserCheck,
};

const STEP_LABELS: Record<FlowStepType, string> = {
  message:       "Message",
  quick_replies: "Quick Replies",
  collect_input: "Collect Info",
  condition:     "Condition",
  handoff:       "Handoff to Human",
};

const STEP_COLORS: Record<FlowStepType, string> = {
  message:       "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  quick_replies: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
  collect_input: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  condition:     "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
  handoff:       "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20",
};

const PLATFORM_COLORS: Record<Platform, string> = {
  instagram: "bg-pink-500",
  tiktok:    "bg-black",
  facebook:  "bg-blue-600",
  whatsapp:  "bg-green-500",
};

const PLATFORM_LABELS: Record<Platform, string> = {
  instagram: "Instagram",
  tiktok:    "TikTok",
  facebook:  "Facebook",
  whatsapp:  "WhatsApp",
};

function newStep(type: FlowStepType): FlowStep {
  return {
    id:      "step-" + Date.now() + "-" + Math.random().toString(36).slice(2),
    type,
    content: "",
    ...(type === "quick_replies" ? { options: [] } : {}),
    ...(type === "collect_input" ? { inputLabel: "", inputKey: "" } : {}),
  };
}

// ── Chat Preview ──────────────────────────────────────────────────────────────

interface PreviewProps {
  trigger:      FlowTrigger;
  triggerValue: string;
  steps:        FlowStep[];
  platform:     Platform;
}

function ChatPreview({ trigger, triggerValue, steps, platform }: PreviewProps) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [steps]);

  const customerMsg =
    trigger === "keyword" && triggerValue.trim()
      ? triggerValue.trim()
      : TRIGGER_CUSTOMER_MSG[trigger];

  return (
    <div className="flex flex-col h-full bg-muted/20 rounded-xl border border-border overflow-hidden">
      {/* Mock chat header */}
      <div className="px-3 py-2.5 bg-card border-b border-border flex items-center gap-2 shrink-0">
        <div className={`w-2 h-2 rounded-full ${PLATFORM_COLORS[platform]}`} />
        <span className="text-xs font-medium text-foreground">{PLATFORM_LABELS[platform]}</span>
        <span className="text-xs text-muted-foreground ml-auto">Preview</span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {/* Customer trigger message */}
        <div className="flex justify-end">
          <div className="max-w-[80%] px-3 py-2 bg-primary text-white text-xs rounded-2xl rounded-tr-sm">
            {customerMsg}
          </div>
        </div>

        {/* Steps rendered as chat */}
        {steps.map(step => {
          if (step.type === "message") {
            return (
              <div key={step.id} className="flex items-end gap-1.5">
                <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center shrink-0 mb-0.5">
                  <Bot className="w-3 h-3 text-muted-foreground" />
                </div>
                <div className="max-w-[80%] px-3 py-2 bg-card border border-border text-xs rounded-2xl rounded-tl-sm text-foreground">
                  {step.content || <span className="italic text-muted-foreground">Empty message…</span>}
                </div>
              </div>
            );
          }

          if (step.type === "quick_replies") {
            const opts = step.options ?? [];
            return (
              <div key={step.id} className="space-y-1.5">
                <div className="flex items-end gap-1.5">
                  <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center shrink-0 mb-0.5">
                    <Bot className="w-3 h-3 text-muted-foreground" />
                  </div>
                  <div className="max-w-[80%] px-3 py-2 bg-card border border-border text-xs rounded-2xl rounded-tl-sm text-foreground">
                    {step.content || <span className="italic text-muted-foreground">Empty message…</span>}
                  </div>
                </div>
                {opts.length > 0 && (
                  <div className="flex flex-wrap gap-1 pl-7">
                    {opts.map((opt, i) => (
                      <span key={i} className="px-2.5 py-1 border border-primary/60 text-primary text-xs rounded-full">
                        {opt}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          }

          if (step.type === "collect_input") {
            return (
              <div key={step.id} className="space-y-1.5">
                <div className="flex items-end gap-1.5">
                  <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center shrink-0 mb-0.5">
                    <Bot className="w-3 h-3 text-muted-foreground" />
                  </div>
                  <div className="max-w-[80%] px-3 py-2 bg-card border border-border text-xs rounded-2xl rounded-tl-sm text-foreground">
                    {step.content || <span className="italic text-muted-foreground">Question not set…</span>}
                  </div>
                </div>
                <div className="flex justify-end opacity-60">
                  <div className="max-w-[80%] px-3 py-2 bg-muted text-muted-foreground text-xs rounded-2xl rounded-tr-sm italic">
                    Customer types {step.inputLabel || "their response"}…
                  </div>
                </div>
              </div>
            );
          }

          if (step.type === "condition") {
            return (
              <div key={step.id} className="flex justify-center">
                <span className="px-2.5 py-1 bg-orange-500/10 border border-orange-500/20 rounded-full text-xs text-orange-600 dark:text-orange-400 flex items-center gap-1">
                  <GitBranch className="w-3 h-3" />
                  If {step.conditionKey || "variable"} = &ldquo;{step.conditionValue || "value"}&rdquo;
                </span>
              </div>
            );
          }

          if (step.type === "handoff") {
            return (
              <div key={step.id} className="space-y-1.5">
                {step.content && (
                  <div className="flex items-end gap-1.5">
                    <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center shrink-0 mb-0.5">
                      <Bot className="w-3 h-3 text-muted-foreground" />
                    </div>
                    <div className="max-w-[80%] px-3 py-2 bg-card border border-border text-xs rounded-2xl rounded-tl-sm text-foreground">
                      {step.content}
                    </div>
                  </div>
                )}
                <div className="flex justify-center">
                  <span className="px-2.5 py-1 bg-green-500/10 border border-green-500/20 rounded-full text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                    <UserCheck className="w-3 h-3" />
                    Transferred to human agent
                  </span>
                </div>
              </div>
            );
          }

          return null;
        })}

        {steps.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <MessageCircle className="w-7 h-7 text-muted-foreground/20 mb-2" />
            <p className="text-xs text-muted-foreground">Add steps to see the preview</p>
          </div>
        )}

        <div ref={endRef} />
      </div>
    </div>
  );
}

// ── Flow Editor ───────────────────────────────────────────────────────────────

interface FlowEditorProps {
  flow:    ChatbotFlow | null;
  onClose: () => void;
  onSave:  (data: Omit<ChatbotFlow, "id" | "createdAt" | "triggerCount">) => void;
}

function FlowEditor({ flow, onClose, onSave }: FlowEditorProps) {
  const [name,         setName]         = useState(flow?.name         ?? "");
  const [trigger,      setTrigger]      = useState<FlowTrigger>(flow?.trigger ?? "greeting");
  const [triggerValue, setTriggerValue] = useState(flow?.triggerValue ?? "");
  const [platform,     setPlatform]     = useState<Platform>(flow?.platform ?? "whatsapp");
  const [active,       setActive]       = useState(flow?.active       ?? true);
  const [steps,        setSteps]        = useState<FlowStep[]>(flow?.steps ?? []);
  const [showStepMenu, setShowStepMenu] = useState(false);
  const [optionInputs, setOptionInputs] = useState<Record<string, string>>({});

  const stepMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showStepMenu) return;
    const handler = (e: MouseEvent) => {
      if (stepMenuRef.current && !stepMenuRef.current.contains(e.target as Node)) {
        setShowStepMenu(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showStepMenu]);

  const addStep = (type: FlowStepType) => {
    setSteps(prev => [...prev, newStep(type)]);
    setShowStepMenu(false);
  };

  const removeStep = (id: string) => setSteps(prev => prev.filter(s => s.id !== id));

  const updateStep = (id: string, patch: Partial<FlowStep>) =>
    setSteps(prev => prev.map(s => (s.id === id ? { ...s, ...patch } : s)));

  const addOption = (stepId: string) => {
    const val = (optionInputs[stepId] ?? "").trim();
    if (!val) return;
    setSteps(prev =>
      prev.map(s => s.id === stepId ? { ...s, options: [...(s.options ?? []), val] } : s)
    );
    setOptionInputs(prev => ({ ...prev, [stepId]: "" }));
  };

  const removeOption = (stepId: string, idx: number) =>
    setSteps(prev =>
      prev.map(s => s.id === stepId ? { ...s, options: (s.options ?? []).filter((_, i) => i !== idx) } : s)
    );

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({
      name:         name.trim(),
      trigger,
      triggerValue: trigger === "keyword" ? triggerValue : undefined,
      platform,
      steps,
      active,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-5xl h-[90vh] flex flex-col shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
              <GitBranch className="w-4 h-4 text-primary" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">
              {flow ? "Edit Flow" : "New Flow"}
            </h2>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body — split pane */}
        <div className="flex flex-1 overflow-hidden">

          {/* Left: Editor */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 border-r border-border">

            {/* Name */}
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                Flow Name
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Welcome Greeting"
                className="w-full px-3 py-2 bg-background border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>

            {/* Trigger + Platform */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                  Trigger
                </label>
                <div className="relative">
                  <select
                    value={trigger}
                    onChange={e => setTrigger(e.target.value as FlowTrigger)}
                    className="w-full appearance-none px-3 py-2 bg-background border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 pr-8"
                  >
                    {(Object.keys(TRIGGER_LABELS) as FlowTrigger[]).map(t => (
                      <option key={t} value={t}>{TRIGGER_LABELS[t]}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                  Platform
                </label>
                <div className="relative">
                  <select
                    value={platform}
                    onChange={e => setPlatform(e.target.value as Platform)}
                    className="w-full appearance-none px-3 py-2 bg-background border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 pr-8"
                  >
                    {(["whatsapp", "instagram", "facebook", "tiktok"] as Platform[]).map(p => (
                      <option key={p} value={p}>{PLATFORM_LABELS[p]}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Keyword */}
            {trigger === "keyword" && (
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                  Keyword to match
                </label>
                <input
                  type="text"
                  value={triggerValue}
                  onChange={e => setTriggerValue(e.target.value)}
                  placeholder="e.g. price, cost, how much"
                  className="w-full px-3 py-2 bg-background border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
            )}

            {/* Steps */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Steps
                </label>
                <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                  {steps.length} step{steps.length !== 1 ? "s" : ""}
                </span>
              </div>

              <div>
                {steps.map((step, idx) => {
                  const Icon = STEP_ICONS[step.type];
                  const colorClass = STEP_COLORS[step.type];
                  return (
                    <div key={step.id}>
                      {idx > 0 && (
                        <div className="flex justify-center h-5">
                          <div className="w-px bg-border" />
                        </div>
                      )}
                      <div className="bg-muted/30 border border-border rounded-xl p-4">
                        {/* Step header */}
                        <div className="flex items-center gap-2 mb-3">
                          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold border ${colorClass}`}>
                            {idx + 1}
                          </span>
                          <span className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${colorClass}`}>
                            <Icon className="w-3 h-3" />
                            {STEP_LABELS[step.type]}
                          </span>
                          <button
                            onClick={() => removeStep(step.id)}
                            className="ml-auto text-muted-foreground hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Message / quick_replies / handoff content */}
                        {(step.type === "message" || step.type === "quick_replies" || step.type === "handoff") && (
                          <textarea
                            value={step.content ?? ""}
                            onChange={e => updateStep(step.id, { content: e.target.value })}
                            placeholder={
                              step.type === "handoff"
                                ? "Message before handing off to human…"
                                : "Enter message content…"
                            }
                            rows={2}
                            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
                          />
                        )}

                        {/* Quick reply options */}
                        {step.type === "quick_replies" && (
                          <div className="mt-3">
                            <p className="text-xs text-muted-foreground mb-2">Reply options:</p>
                            <div className="flex flex-wrap gap-1.5 mb-2">
                              {(step.options ?? []).map((opt, i) => (
                                <span key={i} className="flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full">
                                  {opt}
                                  <button onClick={() => removeOption(step.id, i)} className="hover:text-red-500 transition-colors">
                                    <X className="w-3 h-3" />
                                  </button>
                                </span>
                              ))}
                            </div>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={optionInputs[step.id] ?? ""}
                                onChange={e => setOptionInputs(prev => ({ ...prev, [step.id]: e.target.value }))}
                                onKeyDown={e => e.key === "Enter" && addOption(step.id)}
                                placeholder="Add option…"
                                className="flex-1 px-3 py-1.5 bg-background border border-border rounded-lg text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                              />
                              <button
                                onClick={() => addOption(step.id)}
                                className="px-3 py-1.5 bg-primary text-white text-xs rounded-lg hover:bg-primary/90 transition-colors"
                              >
                                Add
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Collect input */}
                        {step.type === "collect_input" && (
                          <div className="space-y-2">
                            <textarea
                              value={step.content ?? ""}
                              onChange={e => updateStep(step.id, { content: e.target.value })}
                              placeholder="Question to ask the customer…"
                              rows={2}
                              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
                            />
                            <div className="grid grid-cols-2 gap-2">
                              <input
                                type="text"
                                value={step.inputLabel ?? ""}
                                onChange={e => updateStep(step.id, { inputLabel: e.target.value })}
                                placeholder="Label (e.g. Your name)"
                                className="px-3 py-1.5 bg-background border border-border rounded-lg text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                              />
                              <input
                                type="text"
                                value={step.inputKey ?? ""}
                                onChange={e => updateStep(step.id, { inputKey: e.target.value })}
                                placeholder="Key (e.g. customer_name)"
                                className="px-3 py-1.5 bg-background border border-border rounded-lg text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                              />
                            </div>
                          </div>
                        )}

                        {/* Condition */}
                        {step.type === "condition" && (
                          <div className="grid grid-cols-2 gap-2">
                            <input
                              type="text"
                              value={step.conditionKey ?? ""}
                              onChange={e => updateStep(step.id, { conditionKey: e.target.value })}
                              placeholder="Variable (e.g. customer_name)"
                              className="px-3 py-1.5 bg-background border border-border rounded-lg text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                            />
                            <input
                              type="text"
                              value={step.conditionValue ?? ""}
                              onChange={e => updateStep(step.id, { conditionValue: e.target.value })}
                              placeholder="Equals value"
                              className="px-3 py-1.5 bg-background border border-border rounded-lg text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Add Step */}
              <div ref={stepMenuRef} className="relative mt-4">
                <button
                  onClick={() => setShowStepMenu(prev => !prev)}
                  className="flex items-center gap-2 w-full px-4 py-2.5 border border-dashed border-border rounded-xl text-sm text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Step
                  <ChevronDown className={`w-4 h-4 ml-auto transition-transform ${showStepMenu ? "rotate-180" : ""}`} />
                </button>
                {showStepMenu && (
                  <div className="absolute top-full left-0 mt-1 w-full bg-card border border-border rounded-xl shadow-lg z-10 overflow-hidden">
                    {(Object.keys(STEP_LABELS) as FlowStepType[]).map(type => {
                      const Icon = STEP_ICONS[type];
                      const colorClass = STEP_COLORS[type];
                      return (
                        <button
                          key={type}
                          onClick={() => addStep(type)}
                          className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors text-left"
                        >
                          <span className={`flex items-center justify-center w-6 h-6 rounded-lg border ${colorClass}`}>
                            <Icon className="w-3.5 h-3.5" />
                          </span>
                          {STEP_LABELS[type]}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right: Live preview — hidden on mobile to keep form usable */}
          <div className="hidden md:flex w-72 shrink-0 flex-col p-4 gap-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Live Preview
            </p>
            <ChatPreview
              trigger={trigger}
              triggerValue={triggerValue}
              steps={steps}
              platform={platform}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border shrink-0">
          <label className="flex items-center gap-2 cursor-pointer">
            <button onClick={() => setActive(prev => !prev)} className="text-muted-foreground hover:text-primary transition-colors">
              {active
                ? <ToggleRight className="w-7 h-7 text-primary" />
                : <ToggleLeft  className="w-7 h-7" />
              }
            </button>
            <span className="text-sm text-foreground">{active ? "Active" : "Inactive"}</span>
          </label>
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!name.trim()}
              className="px-5 py-2 bg-primary text-white text-sm font-medium rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Save Flow
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function Flows() {
  const { user } = useAuth();
  const { data: flows = [], isLoading } = useFlows();
  const createFlow = useCreateFlow();
  const updateFlow = useUpdateFlow();
  const deleteFlow = useDeleteFlow();

  const [editorOpen,    setEditorOpen]    = useState(false);
  const [editingFlow,   setEditingFlow]   = useState<ChatbotFlow | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const totalTriggers = flows.reduce((sum, f) => sum + f.triggerCount, 0);
  const activeFlows   = flows.filter(f => f.active).length;

  const openNew = () => { setEditingFlow(null); setEditorOpen(true); };
  const openEdit = (flow: ChatbotFlow) => { setEditingFlow(flow); setEditorOpen(true); };

  const handleSave = (data: Omit<ChatbotFlow, "id" | "createdAt" | "triggerCount">) => {
    if (editingFlow) {
      updateFlow.mutate({ id: editingFlow.id, ...data });
    } else {
      createFlow.mutate(data);
    }
    setEditorOpen(false);
  };

  const handleToggle = (flow: ChatbotFlow) =>
    updateFlow.mutate({ id: flow.id, active: !flow.active });

  const handleDelete = (id: string) => {
    deleteFlow.mutate(id);
    setConfirmDelete(null);
  };

  return (
    <AppLayout role="client" businessName={user?.businessName}>
      <div className="space-y-6 max-w-3xl">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Chatbot Flows</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Automate conversations with step-by-step response flows
            </p>
          </div>
          <button
            onClick={openNew}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-xl hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Flow
          </button>
        </div>

        {/* Info banner */}
        <div className="flex items-start gap-3 px-4 py-3 bg-blue-500/5 border border-blue-500/20 rounded-2xl">
          <Info className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
          <p className="text-sm text-blue-600 dark:text-blue-400">
            Flows run automatically when a customer message matches the trigger condition.
            Connect your messaging accounts to activate them.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Total Flows",    value: flows.length,               icon: GitBranch },
            { label: "Active",         value: activeFlows,                icon: Zap },
            { label: "Total Triggers", value: totalTriggers.toLocaleString(), icon: MessageCircle },
          ].map(stat => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="bg-card border border-border rounded-2xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  <Icon className="w-4 h-4 text-muted-foreground/40" />
                </div>
                <p className="text-2xl font-bold text-foreground">{stat.value}</p>
              </div>
            );
          })}
        </div>

        {/* Flow list */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-card border border-border rounded-2xl p-5 animate-pulse h-32" />
            ))}
          </div>
        ) : flows.length === 0 ? (
          <div className="bg-card border border-border rounded-2xl p-14 text-center">
            <GitBranch className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-foreground font-medium">No flows yet</p>
            <p className="text-sm text-muted-foreground mt-1">Create your first chatbot flow to get started.</p>
            <button
              onClick={openNew}
              className="mt-4 px-4 py-2 bg-primary text-white text-sm font-medium rounded-xl hover:bg-primary/90 transition-colors"
            >
              Create Flow
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {flows.map(flow => {
              const firstMsg = flow.steps.find(
                s => s.type === "message" || s.type === "quick_replies" || s.type === "collect_input"
              );
              const preview = firstMsg?.content?.trim().slice(0, 90);

              return (
                <div
                  key={flow.id}
                  className={`bg-card border rounded-2xl p-5 transition-colors ${
                    flow.active ? "border-border" : "border-border opacity-60"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    {/* Toggle */}
                    <button
                      onClick={() => handleToggle(flow)}
                      className="mt-0.5 text-muted-foreground hover:text-primary transition-colors shrink-0"
                    >
                      {flow.active
                        ? <ToggleRight className="w-7 h-7 text-primary" />
                        : <ToggleLeft  className="w-7 h-7" />
                      }
                    </button>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1.5">
                        <p className="font-semibold text-foreground">{flow.name}</p>
                        <span className="flex items-center gap-1.5 text-xs px-2 py-0.5 bg-muted rounded-full text-muted-foreground">
                          <span className={`w-1.5 h-1.5 rounded-full ${PLATFORM_COLORS[flow.platform]}`} />
                          {PLATFORM_LABELS[flow.platform]}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 mb-2.5">
                        <span className="text-xs px-2 py-0.5 bg-muted rounded-full text-muted-foreground">
                          {TRIGGER_EMOJI[flow.trigger]} {TRIGGER_LABELS[flow.trigger]}
                          {flow.triggerValue && `: "${flow.triggerValue}"`}
                        </span>
                        {flow.triggerCount > 0 && (
                          <span className="text-xs text-muted-foreground">
                            · {flow.triggerCount} triggers
                          </span>
                        )}
                      </div>

                      {preview && (
                        <p className="text-xs text-muted-foreground italic mb-2.5 truncate">
                          &ldquo;{preview}{(firstMsg?.content?.length ?? 0) > 90 ? "…" : ""}&rdquo;
                        </p>
                      )}

                      {/* Steps chain */}
                      <div className="flex items-center flex-wrap gap-1">
                        {flow.steps.map((step, idx) => {
                          const Icon = STEP_ICONS[step.type];
                          const colorClass = STEP_COLORS[step.type];
                          return (
                            <span key={step.id} className="flex items-center gap-1">
                              {idx > 0 && <span className="text-muted-foreground/30 text-xs">→</span>}
                              <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${colorClass}`}>
                                <Icon className="w-2.5 h-2.5" />
                                {STEP_LABELS[step.type]}
                              </span>
                            </span>
                          );
                        })}
                        {flow.steps.length === 0 && (
                          <span className="text-xs text-muted-foreground/50 italic">No steps</span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => openEdit(flow)}
                        className="px-3 py-1.5 text-xs border border-border rounded-lg text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors"
                      >
                        Edit
                      </button>
                      {confirmDelete === flow.id ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleDelete(flow.id)}
                            className="px-3 py-1.5 text-xs bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => setConfirmDelete(null)}
                            className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDelete(flow.id)}
                          className="p-1.5 text-muted-foreground hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Editor modal — key forces remount when switching edit ↔ new */}
      {editorOpen && (
        <FlowEditor
          key={editingFlow?.id ?? "new"}
          flow={editingFlow}
          onClose={() => setEditorOpen(false)}
          onSave={handleSave}
        />
      )}
    </AppLayout>
  );
}
