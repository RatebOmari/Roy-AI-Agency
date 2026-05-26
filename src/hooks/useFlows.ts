import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { ChatbotFlow, FlowStep, FlowTrigger, FlowStepType } from "@/types";

const now = new Date();
const past = (days: number) => new Date(now.getTime() - days * 86_400_000).toISOString();

const MOCK_FLOWS: ChatbotFlow[] = [
  {
    id: "f1",
    name: "Welcome Greeting",
    trigger: "greeting" as FlowTrigger,
    platform: "whatsapp",
    active: true,
    triggerCount: 234,
    steps: [
      {
        id: "s1",
        type: "message" as FlowStepType,
        content: "👋 Welcome to Raleigh Eats! How can we help you today?",
      },
      {
        id: "s2",
        type: "quick_replies" as FlowStepType,
        content: "Please choose an option:",
        options: ["📋 View Menu", "🕐 Opening Hours", "📦 Place Order", "💬 Talk to us"],
      },
    ] as FlowStep[],
    createdAt: past(10),
  },
  {
    id: "f2",
    name: "Order Flow",
    trigger: "order" as FlowTrigger,
    platform: "whatsapp",
    active: true,
    triggerCount: 89,
    steps: [
      {
        id: "s1",
        type: "message" as FlowStepType,
        content: "Great! I'd love to help you place an order 🛍️",
      },
      {
        id: "s2",
        type: "collect_input" as FlowStepType,
        content: "What's your name?",
        inputLabel: "Your name",
        inputKey: "customer_name",
      },
      {
        id: "s3",
        type: "collect_input" as FlowStepType,
        content: "What would you like to order?",
        inputLabel: "Your order",
        inputKey: "order_details",
      },
      {
        id: "s4",
        type: "message" as FlowStepType,
        content: "Perfect! Your order has been received. We'll confirm shortly and let you know the delivery time!",
      },
    ] as FlowStep[],
    createdAt: past(7),
  },
  {
    id: "f3",
    name: "FAQ Handler",
    trigger: "inquiry" as FlowTrigger,
    platform: "instagram",
    active: false,
    triggerCount: 12,
    steps: [
      {
        id: "s1",
        type: "message" as FlowStepType,
        content: "Thanks for reaching out! Let me help you with that.",
      },
      {
        id: "s2",
        type: "quick_replies" as FlowStepType,
        content: "What would you like to know?",
        options: ["💲 Prices", "🚗 Delivery", "⏰ Hours", "📍 Location"],
      },
      {
        id: "s3",
        type: "handoff" as FlowStepType,
        content: "Let me connect you with our team for more details!",
      },
    ] as FlowStep[],
    createdAt: past(3),
  },
];

export function useFlows() {
  return useQuery({
    queryKey: ["flows"],
    queryFn: async () => {
      try {
        const result = await api.get<ChatbotFlow[]>("/flows");
        return Array.isArray(result) ? result : MOCK_FLOWS;
      } catch {
        return MOCK_FLOWS;
      }
    },
    staleTime: 30_000,
  });
}

export function useCreateFlow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<ChatbotFlow, "id" | "createdAt" | "triggerCount">) =>
      api.post<ChatbotFlow>("/flows", data),
    onMutate: async (newFlow) => {
      await queryClient.cancelQueries({ queryKey: ["flows"] });
      const prev = queryClient.getQueryData<ChatbotFlow[]>(["flows"]);
      const optimistic: ChatbotFlow = {
        ...newFlow,
        id: "optimistic-" + Date.now(),
        triggerCount: 0,
        createdAt: new Date().toISOString(),
      };
      queryClient.setQueryData<ChatbotFlow[]>(["flows"], old => [optimistic, ...(old ?? [])]);
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(["flows"], ctx.prev);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["flows"] }),
  });
}

export function useUpdateFlow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<ChatbotFlow> & { id: string }) =>
      api.put<ChatbotFlow>(`/flows/${id}`, data),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["flows"] }),
  });
}

export function useDeleteFlow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/flows/${id}`),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["flows"] });
      const prev = queryClient.getQueryData<ChatbotFlow[]>(["flows"]);
      queryClient.setQueryData<ChatbotFlow[]>(["flows"], old => (old ?? []).filter(f => f.id !== id));
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(["flows"], ctx.prev);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["flows"] }),
  });
}
