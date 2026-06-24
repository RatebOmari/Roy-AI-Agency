import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { OutreachMessage, OutreachChannel, OutreachAudienceFilter } from "@/types";

const now = new Date();
const past = (days: number) => new Date(now.getTime() - days * 86_400_000).toISOString();
const future = (days: number, hour = 10) => {
  const d = new Date(now);
  d.setDate(d.getDate() + days);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
};

const MOCK_OUTREACH: OutreachMessage[] = [
  {
    id: "o1",
    title: "Ramadan Special Announcement",
    channel: "whatsapp",
    messageBody: "🌙 Ramadan Kareem! We're offering special iftar platters this holy month. Order now and get 15% off your first order. Available for delivery and dine-in!",
    audienceFilter: JSON.stringify({ type: "all" }),
    estimatedReach: 342,
    actualReach: 342,
    sentCount: 342,
    deliveredCount: 312,
    openedCount: 289,
    clickedCount: 0,
    repliedCount: 47,
    failedCount: 30,
    status: "sent",
    sentAt: past(5),
    createdAt: past(6),
  },
  {
    id: "o2",
    title: "Weekend Offer — VIP List",
    channel: "whatsapp",
    messageBody: "🔥 This weekend only! Buy 2 main courses and get a free dessert. Valid Fri–Sun. Book your table now or order online!",
    audienceFilter: JSON.stringify({ type: "tag", tagValue: "vip" }),
    estimatedReach: 87,
    actualReach: 0,
    sentCount: 0,
    deliveredCount: 0,
    openedCount: 0,
    clickedCount: 0,
    repliedCount: 0,
    failedCount: 0,
    status: "scheduled",
    scheduledAt: future(1, 10),
    createdAt: past(1),
  },
  {
    id: "o3",
    title: "New Menu Launch — Email",
    channel: "email",
    messageBody: "We're excited to announce our brand new summer menu! Fresh seasonal dishes, exciting new flavors. Come try it this week and enjoy 10% off your first order with code SUMMER10.",
    subject: "🍽️ Our New Summer Menu Is Here!",
    audienceFilter: JSON.stringify({ type: "all" }),
    estimatedReach: 156,
    actualReach: 0,
    sentCount: 0,
    deliveredCount: 0,
    openedCount: 0,
    clickedCount: 0,
    repliedCount: 0,
    failedCount: 0,
    status: "draft",
    createdAt: new Date(now.getTime() - 2 * 3_600_000).toISOString(),
  },
  {
    id: "o4",
    title: "Eid Mubarak SMS Blast",
    channel: "sms",
    messageBody: "Eid Mubarak! 20% off all orders today. Code: EID20. Reply STOP to opt out.",
    audienceFilter: JSON.stringify({ type: "all" }),
    estimatedReach: 512,
    actualReach: 512,
    sentCount: 512,
    deliveredCount: 498,
    openedCount: 0,
    clickedCount: 0,
    repliedCount: 83,
    failedCount: 14,
    status: "sent",
    sentAt: past(10),
    createdAt: past(11),
  },
];

export function useOutreachMessages() {
  return useQuery({
    queryKey: ["outreach"],
    queryFn: async () => {
      try {
        const result = await api.get<{ data: OutreachMessage[]; pagination: { page: number; limit: number; total: number; hasMore: boolean } }>(
          "/outreach?limit=50"
        );
        return result?.data ?? (result as unknown as OutreachMessage[]);
      } catch {
        return MOCK_OUTREACH;
      }
    },
    staleTime: 30_000,
  });
}

export function useAgencyOutreach() {
  return useQuery({
    queryKey: ["outreachAllClients"],
    queryFn: async () => {
      try {
        const result = await api.get<OutreachMessage[]>("/outreach/all-clients");
        return Array.isArray(result) ? result : MOCK_OUTREACH;
      } catch {
        return MOCK_OUTREACH;
      }
    },
    staleTime: 30_000,
  });
}

export interface OutreachReach {
  total:        number;
  channelReach: number;
  tagCounts:    Record<string, number>;
}

export function useOutreachReach(channel: OutreachChannel, filter: OutreachAudienceFilter) {
  const params = new URLSearchParams({
    channel,
    type:          filter.type,
    ...(filter.tagValue      ? { tagValue:      filter.tagValue } : {}),
    ...(filter.platformValue ? { platformValue: filter.platformValue } : {}),
    ...(filter.activeDays    ? { activeDays:    String(filter.activeDays) } : {}),
  });
  return useQuery({
    queryKey: ["outreachReach", channel, filter],
    queryFn: async () => {
      try {
        return await api.get<OutreachReach>(`/outreach/reach?${params}`);
      } catch {
        return { total: 0, channelReach: 0, tagCounts: {} };
      }
    },
    staleTime: 30_000,
  });
}

type CreateOutreachPayload = Omit<OutreachMessage, "id" | "createdAt" | "actualReach" | "sentCount" | "deliveredCount" | "openedCount" | "clickedCount" | "repliedCount" | "failedCount" | "sentAt" | "audienceFilter" | "quickReplies"> & {
  audienceFilter?: OutreachAudienceFilter;
  quickReplies?:   string[];
};

export function useCreateOutreach() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateOutreachPayload) => api.post<OutreachMessage>("/outreach", data),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["outreach"] }),
  });
}

export function useUpdateOutreach() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<CreateOutreachPayload> & { id: string }) =>
      api.put<OutreachMessage>(`/outreach/${id}`, data),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["outreach"] }),
  });
}

export function useDeleteOutreach() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/outreach/${id}`),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["outreach"] });
      const prev = queryClient.getQueryData<OutreachMessage[]>(["outreach"]);
      queryClient.setQueryData<OutreachMessage[]>(["outreach"], old => (old ?? []).filter(m => m.id !== id));
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(["outreach"], ctx.prev);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["outreach"] }),
  });
}

export function useSendOutreach() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<OutreachMessage>(`/outreach/${id}/send`, {}),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["outreach"] }),
  });
}

export function useCancelOutreach() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<OutreachMessage>(`/outreach/${id}/cancel`, {}),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["outreach"] }),
  });
}

export function useDuplicateOutreach() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<OutreachMessage>(`/outreach/${id}/duplicate`, {}),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["outreach"] }),
  });
}

export function useGenerateOutreach() {
  return useMutation({
    mutationFn: (params: { prompt: string; channel: OutreachChannel; tone?: string }) =>
      api.post<{ subject?: string; body: string }>("/outreach/generate", params),
  });
}
