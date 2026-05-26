import { useState } from "react";
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
  ChevronsUpDown,
  Info,
} from "lucide-react";

const TRIGGER_LABELS: Record<FlowTrigger, string> = {
  greeting: "First message / Greeting",
  keyword: "Contains keyword",
  order: "Customer wants to order",
  inquiry: "Customer has a question",
  fallback: "No other flow matched",
};

const TRIGGER_EMOJI: Record<FlowTrigger, string> = {
  greeting: "👋",
  keyword: "🔑",
  order: "🛒",
  inquiry: "❓",
  fallback: "🔄",
};

const STEP_ICONS: Record<FlowStepType, React.ElementType> = {
  message: MessageCircle,
  quick_replies: LayoutGrid,
  collect_input: Edit3,
  condition: GitBranch,
  handoff: UserCheck,
};

const STEP_LABELS: Record<FlowStepType, string> = {
  message: "Message",
  quick_replies: "Quick Replies",
  collect_input: "Collect Info",
  condition: "Condition",
  handoff: "Handoff",
};

const STEP_EMOJI: Record<FlowStepType, string> = {
  message: "💬",
  quick_replies: "🔘",
  collect_input: "📝",
  condition: "🔀",
  handoff: "🙋",
};

const PLATFORM_COLORS: Record<Platform, string> = {
  instagram: "bg-pink-500",
  tiktok: "bg-black",
  facebook: "bg-blue-600",
  whatsapp: "bg-green-500",
};

const PLATFORM_LABELS: Record<Platform, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  facebook: "Facebook",
  whatsapp: "WhatsApp",
};

function newStep(type: FlowStepType): FlowStep {
  return {
    id: "step-" + Date.now() + "-" + Math.random().toString(36).slice(2),
    type,
    content: "",
    ...(type === "quick_replies" ? { options: [] } : {}),
    ...(type === "collect_input" ? { inputLabel: "", inputKey: "" } : {}),
  };
}

interface FlowEditorProps {
  flow: ChatbotFlow | null;
  onClose: () => void;
  onSave: (data: Omit<ChatbotFlow, "id" | "createdAt" | "triggerCount">) => void;
}

function FlowEditor({ flow, onClose, onSave }: FlowEditorProps) {
  const [name, setName] = useState(flow?.name ?? "");
  const [trigger, setTrigger] = useState<FlowTrigger>(flow?.trigger ?? "greeting");
  const [triggerValue, setTriggerValue] = useState(flow?.triggerValue ?? "");
  const [platform, setPlatform] = useState<Platform>(flow?.platform ?? "whatsapp");
  const [active, setActive] = useState(flow?.active ?? true);
  const [steps, setSteps] = useState<FlowStep[]>(flow?.steps ?? []);
  const [showStepMenu, setShowStepMenu] = useState(false);
  const [optionInputs, setOptionInputs] = useState<Record<string, string>>({});

  const addStep = (type: FlowStepType) => {
    setSteps(prev => [...prev, newStep(type)]);
    setShowStepMenu(false);
  };

  const removeStep = (id: string) => {
    setSteps(prev => prev.filter(s => s.id !== id));
  };

  const updateStep = (id: string, patch: Partial<FlowStep>) => {
    setSteps(prev => prev.map(s => (s.id === id ? { ...s, ...patch } : s)));
  };

  const addOption = (stepId: string) => {
    const val = (optionInputs[stepId] ?? "").trim();
    if (!val) return;
    setSteps(prev =>
      prev.map(s =>
        s.id === stepId ? { ...s, options: [...(s.options ?? []), val] } : s
      )
    );
    setOptionInputs(prev => ({ ...prev, [stepId]: "" }));
  };

  const removeOption = (stepId: string, idx: number) => {
    setSteps(prev =>
      prev.map(s =>
        s.id === stepId ? { ...s, options: (s.options ?? []).filter((_, i) => i !== idx) } : s
      )
    );
  };

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({ name: name.trim(), trigger, triggerValue: trigger === "keyword" ? triggerValue : undefined, platform, steps, active });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">
            {flow ? "Edit Flow" : "New Flow"}
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Flow Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Welcome Greeting"
              className="w-full px-3 py-2 bg-background border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>

          {/* Trigger + Platform row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Trigger</label>
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
              <label className="block text-sm font-medium text-foreground mb-1.5">Platform</label>
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

          {/* Keyword value */}
          {trigger === "keyword" && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Keyword to match</label>
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
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-foreground">Steps</h3>
              <span className="text-xs text-muted-foreground">{steps.length} step{steps.length !== 1 ? "s" : ""}</span>
            </div>

            <div className="space-y-3">
              {steps.map((step, idx) => {
                const Icon = STEP_ICONS[step.type];
                return (
                  <div key={step.id} className="bg-muted/40 border border-border rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <ChevronsUpDown className="w-4 h-4 text-muted-foreground/50" />
                      <span className="text-xs font-medium text-muted-foreground">{idx + 1}</span>
                      <span className="flex items-center gap-1.5 px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full font-medium">
                        <Icon className="w-3 h-3" />
                        {STEP_LABELS[step.type]}
                      </span>
                      <button
                        onClick={() => removeStep(step.id)}
                        className="ml-auto text-muted-foreground hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {(step.type === "message" || step.type === "quick_replies" || step.type === "handoff") && (
                      <textarea
                        value={step.content ?? ""}
                        onChange={e => updateStep(step.id, { content: e.target.value })}
                        placeholder={
                          step.type === "handoff"
                            ? "Message before handing off to human..."
                            : "Enter message content..."
                        }
                        rows={2}
                        className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
                      />
                    )}

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
                            placeholder="Add option..."
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

                    {step.type === "collect_input" && (
                      <div className="space-y-2">
                        <textarea
                          value={step.content ?? ""}
                          onChange={e => updateStep(step.id, { content: e.target.value })}
                          placeholder="Question to ask the customer..."
                          rows={2}
                          className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            value={step.inputLabel ?? ""}
                            onChange={e => updateStep(step.id, { inputLabel: e.target.value })}
                            placeholder="Input label (e.g. Your name)"
                            className="px-3 py-1.5 bg-background border border-border rounded-lg text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                          />
                          <input
                            type="text"
                            value={step.inputKey ?? ""}
                            onChange={e => updateStep(step.id, { inputKey: e.target.value })}
                            placeholder="Variable key (e.g. customer_name)"
                            className="px-3 py-1.5 bg-background border border-border rounded-lg text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                          />
                        </div>
                      </div>
                    )}

                    {step.type === "condition" && (
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={step.conditionKey ?? ""}
                          onChange={e => updateStep(step.id, { conditionKey: e.target.value })}
                          placeholder="Check variable (e.g. customer_name)"
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
                );
              })}
            </div>

            {/* Add Step */}
            <div className="relative mt-3">
              <button
                onClick={() => setShowStepMenu(prev => !prev)}
                className="flex items-center gap-2 w-full px-4 py-2.5 border border-dashed border-border rounded-xl text-sm text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Step
                <ChevronDown className="w-4 h-4 ml-auto" />
              </button>
              {showStepMenu && (
                <div className="absolute top-full left-0 mt-1 w-full bg-card border border-border rounded-xl shadow-lg z-10 overflow-hidden">
                  {(Object.keys(STEP_LABELS) as FlowStepType[]).map(type => {
                    const Icon = STEP_ICONS[type];
                    return (
                      <button
                        key={type}
                        onClick={() => addStep(type)}
                        className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors text-left"
                      >
                        <Icon className="w-4 h-4 text-primary" />
                        {STEP_LABELS[type]}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border">
          <label className="flex items-center gap-2 cursor-pointer">
            <button onClick={() => setActive(prev => !prev)} className="text-muted-foreground hover:text-primary transition-colors">
              {active ? <ToggleRight className="w-7 h-7 text-primary" /> : <ToggleLeft className="w-7 h-7" />}
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

export default function Flows() {
  const { user } = useAuth();
  const { data: flows = [], isLoading } = useFlows();
  const createFlow = useCreateFlow();
  const updateFlow = useUpdateFlow();
  const deleteFlow = useDeleteFlow();

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingFlow, setEditingFlow] = useState<ChatbotFlow | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const totalTriggers = flows.reduce((sum, f) => sum + f.triggerCount, 0);
  const activeFlows = flows.filter(f => f.active).length;

  const openNew = () => {
    setEditingFlow(null);
    setEditorOpen(true);
  };

  const openEdit = (flow: ChatbotFlow) => {
    setEditingFlow(flow);
    setEditorOpen(true);
  };

  const handleSave = (data: Omit<ChatbotFlow, "id" | "createdAt" | "triggerCount">) => {
    if (editingFlow) {
      updateFlow.mutate({ id: editingFlow.id, ...data });
    } else {
      createFlow.mutate(data);
    }
    setEditorOpen(false);
  };

  const handleToggle = (flow: ChatbotFlow) => {
    updateFlow.mutate({ id: flow.id, active: !flow.active });
  };

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
            <GitBranch className="w-4 h-4" />
            New Flow
          </button>
        </div>

        {/* Info banner */}
        <div className="flex items-start gap-3 px-4 py-3 bg-primary/5 border border-primary/20 rounded-2xl">
          <Info className="w-4 h-4 text-primary mt-0.5 shrink-0" />
          <p className="text-sm text-primary/90">
            Flows run automatically when a customer message matches the trigger.
            Currently in demo mode — connect your WhatsApp account to activate.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Total Flows", value: flows.length },
            { label: "Active Flows", value: activeFlows },
            { label: "Total Triggers", value: totalTriggers.toLocaleString() },
          ].map(stat => (
            <div key={stat.label} className="bg-card border border-border rounded-2xl p-4 text-center">
              <p className="text-2xl font-bold text-foreground">{stat.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Flow list */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-card border border-border rounded-2xl p-5 animate-pulse h-32" />
            ))}
          </div>
        ) : flows.length === 0 ? (
          <div className="bg-card border border-border rounded-2xl p-12 text-center">
            <GitBranch className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
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
            {flows.map(flow => (
              <div key={flow.id} className="bg-card border border-border rounded-2xl p-5">
                <div className="flex items-start gap-4">
                  {/* Toggle */}
                  <button
                    onClick={() => handleToggle(flow)}
                    className="mt-0.5 text-muted-foreground hover:text-primary transition-colors shrink-0"
                  >
                    {flow.active
                      ? <ToggleRight className="w-7 h-7 text-primary" />
                      : <ToggleLeft className="w-7 h-7" />
                    }
                  </button>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <p className="font-semibold text-foreground">{flow.name}</p>
                      <span className="flex items-center gap-1.5 text-xs px-2 py-0.5 bg-muted rounded-full text-muted-foreground">
                        <span className={`w-2 h-2 rounded-full ${PLATFORM_COLORS[flow.platform]}`} />
                        {PLATFORM_LABELS[flow.platform]}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xs px-2 py-0.5 bg-muted rounded-full text-muted-foreground">
                        {TRIGGER_EMOJI[flow.trigger]} {TRIGGER_LABELS[flow.trigger]}
                        {flow.triggerValue && `: "${flow.triggerValue}"`}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Triggered {flow.triggerCount} times
                      </span>
                    </div>

                    {/* Steps preview */}
                    <div className="flex items-center flex-wrap gap-1.5">
                      {flow.steps.map((step, idx) => {
                        const Icon = STEP_ICONS[step.type];
                        return (
                          <span key={step.id} className="flex items-center gap-1">
                            {idx > 0 && <span className="text-muted-foreground/40 text-xs">→</span>}
                            <span className="flex items-center gap-1 text-xs px-2 py-0.5 bg-muted/70 rounded-full text-muted-foreground">
                              <Icon className="w-3 h-3" />
                              {STEP_LABELS[step.type]}
                            </span>
                          </span>
                        );
                      })}
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
                          className="px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
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
            ))}
          </div>
        )}
      </div>

      {/* Editor modal */}
      {editorOpen && (
        <FlowEditor
          flow={editingFlow}
          onClose={() => setEditorOpen(false)}
          onSave={handleSave}
        />
      )}
    </AppLayout>
  );
}
