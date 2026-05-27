import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Campaign, CampaignStatus } from "@/types";

const now = new Date();
const past = (days: number) => new Date(now.getTime() - days * 86_400_000).toISOString();
const future = (days: number, hour = 10) => {
  const d = new Date(now);
  d.setDate(d.getDate() + days);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
};

const MOCK_CAMPAIGNS: Campaign[] = [
  {
    id: "c1",
    name: "Ramadan Special Announcement",
    message: "🌙 Ramadan Kareem! We're offering special iftar platters this holy month. Order now and get 15% off your first order. Available for delivery and dine-in!",
    platform: "whatsapp",
    audienceType: "all",
    status: "sent" as CampaignStatus,
    sentCount: 342,
    readCount: 289,
    replyCount: 47,
    createdAt: past(5),
  },
  {
    id: "c2",
    name: "Weekend Offer Blast",
    message: "🔥 This weekend only! Buy 2 main courses and get a free dessert. Valid Fri–Sun. Book your table now or order online!",
    platform: "whatsapp",
    audienceType: "tag",
    audienceValue: "vip",
    status: "scheduled" as CampaignStatus,
    sentCount: 0,
    readCount: 0,
    replyCount: 0,
    scheduledAt: future(1, 10),
    createdAt: past(1),
  },
  {
    id: "c3",
    name: "New Menu Launch",
    message: "✨ We're excited to announce our brand new summer menu! Fresh seasonal dishes, exciting new flavors. Come try it this week!",
    platform: "whatsapp",
    audienceType: "all",
    status: "draft" as CampaignStatus,
    sentCount: 0,
    readCount: 0,
    replyCount: 0,
    createdAt: new Date(now.getTime() - 2 * 3_600_000).toISOString(),
  },
  {
    id: "c4",
    name: "Eid Mubarak Greetings",
    message: "عيد مبارك! 🎊 Wishing all our valued customers a blessed Eid. Special Eid discount: 20% off all orders today only!",
    platform: "whatsapp",
    audienceType: "all",
    status: "sent" as CampaignStatus,
    sentCount: 512,
    readCount: 441,
    replyCount: 83,
    createdAt: past(10),
  },
];

export function useCampaigns() {
  return useQuery({
    queryKey: ["campaigns"],
    queryFn: async () => {
      try {
        const result = await api.get<Campaign[]>("/campaigns");
        return Array.isArray(result) ? result : MOCK_CAMPAIGNS;
      } catch {
        return MOCK_CAMPAIGNS;
      }
    },
    staleTime: 30_000,
  });
}

export function useCreateCampaign() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<Campaign, "id" | "createdAt" | "sentCount" | "readCount" | "replyCount">) =>
      api.post<Campaign>("/campaigns", data),
    onMutate: async (newCampaign) => {
      await queryClient.cancelQueries({ queryKey: ["campaigns"] });
      const prev = queryClient.getQueryData<Campaign[]>(["campaigns"]);
      const optimistic: Campaign = {
        ...newCampaign,
        id: "optimistic-" + Date.now(),
        sentCount: 0,
        readCount: 0,
        replyCount: 0,
        createdAt: new Date().toISOString(),
      };
      queryClient.setQueryData<Campaign[]>(["campaigns"], old => [optimistic, ...(old ?? [])]);
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(["campaigns"], ctx.prev);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["campaigns"] }),
  });
}

export function useUpdateCampaign() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<Campaign> & { id: string }) =>
      api.put<Campaign>(`/campaigns/${id}`, data),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["campaigns"] }),
  });
}

export function useDeleteCampaign() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/campaigns/${id}`),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["campaigns"] });
      const prev = queryClient.getQueryData<Campaign[]>(["campaigns"]);
      queryClient.setQueryData<Campaign[]>(["campaigns"], old => (old ?? []).filter(c => c.id !== id));
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(["campaigns"], ctx.prev);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["campaigns"] }),
  });
}

export function useSendCampaign() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<Campaign>(`/campaigns/${id}/send`, {}),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["campaigns"] }),
  });
}
