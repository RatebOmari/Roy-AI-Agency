import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { ListeningKeyword, Mention, MentionSentiment, Platform } from "@/types";

const now = new Date();
const past = (days: number) => new Date(now.getTime() - days * 86_400_000).toISOString();
const pastHours = (hours: number) => new Date(now.getTime() - hours * 3_600_000).toISOString();

const MOCK_KEYWORDS: ListeningKeyword[] = [
  {
    id: "k1",
    keyword: "Raleigh Eats",
    platforms: ["instagram", "tiktok", "facebook"] as Platform[],
    active: true,
    mentionCount: 47,
    createdAt: past(14),
  },
  {
    id: "k2",
    keyword: "رالي إيتس",
    platforms: ["instagram", "facebook"] as Platform[],
    active: true,
    mentionCount: 23,
    createdAt: past(14),
  },
  {
    id: "k3",
    keyword: "best arabic food raleigh",
    platforms: ["tiktok", "instagram"] as Platform[],
    active: true,
    mentionCount: 12,
    createdAt: past(7),
  },
  {
    id: "k4",
    keyword: "raleigheats",
    platforms: ["instagram", "tiktok"] as Platform[],
    active: false,
    mentionCount: 8,
    createdAt: past(3),
  },
];

const MOCK_MENTIONS: Mention[] = [
  {
    id: "m1",
    keywordId: "k1",
    keyword: "Raleigh Eats",
    platform: "instagram",
    username: "@foodlover_nc",
    content: "Just tried Raleigh Eats for the first time — absolutely amazing lamb chops! 🔥 10/10 would recommend to everyone in the area.",
    sentiment: "positive" as MentionSentiment,
    timestamp: pastHours(3),
  },
  {
    id: "m2",
    keywordId: "k1",
    keyword: "Raleigh Eats",
    platform: "tiktok",
    username: "@raleigh_bites",
    content: "Raleigh Eats has THE best shawarma I've had outside the Middle East. This place is a hidden gem! 🫶",
    sentiment: "positive" as MentionSentiment,
    timestamp: pastHours(18),
  },
  {
    id: "m3",
    keywordId: "k3",
    keyword: "best arabic food raleigh",
    platform: "tiktok",
    username: "@arabicfoodie",
    content: "Looking for the best arabic food raleigh has to offer? Stop scrolling — Raleigh Eats is your answer. The hummus alone is worth the trip.",
    sentiment: "positive" as MentionSentiment,
    timestamp: past(1),
  },
  {
    id: "m4",
    keywordId: "k2",
    keyword: "رالي إيتس",
    platform: "facebook",
    username: "@layla.foodie",
    content: "رالي إيتس مكان رائع جداً، الأكل لذيذ والخدمة ممتازة. أنصح الجميع بزيارته! 🌟",
    sentiment: "positive" as MentionSentiment,
    timestamp: past(2),
  },
  {
    id: "m5",
    keywordId: "k4",
    keyword: "raleigheats",
    platform: "instagram",
    username: "@nc_eats_daily",
    content: "Checked out #raleigheats last night — great vibe, decent portions. Service was a bit slow but the food made up for it.",
    sentiment: "neutral" as MentionSentiment,
    timestamp: past(3),
  },
  {
    id: "m6",
    keywordId: "k1",
    keyword: "Raleigh Eats",
    platform: "facebook",
    username: "@david_raleigh",
    content: "Ordered from Raleigh Eats online — the delivery took over an hour and the food was cold when it arrived. Very disappointed.",
    sentiment: "negative" as MentionSentiment,
    timestamp: past(4),
  },
  {
    id: "m7",
    keywordId: "k3",
    keyword: "best arabic food raleigh",
    platform: "instagram",
    username: "@triangle_foodie",
    content: "Finally found the best arabic food raleigh has! The falafel platter here is insane — fresh, crispy, and packed with flavor. Already planning my next visit.",
    sentiment: "positive" as MentionSentiment,
    timestamp: past(5),
  },
  {
    id: "m8",
    keywordId: "k1",
    keyword: "Raleigh Eats",
    platform: "tiktok",
    username: "@eat_with_mona",
    content: "Raleigh Eats has a decent menu but nothing that really blew me away. Might give it another shot.",
    sentiment: "neutral" as MentionSentiment,
    timestamp: past(7),
  },
];

export function useListeningKeywords() {
  return useQuery({
    queryKey: ["listening"],
    queryFn: async () => {
      try {
        const result = await api.get<ListeningKeyword[]>("/listening");
        return Array.isArray(result) ? result : MOCK_KEYWORDS;
      } catch {
        return MOCK_KEYWORDS;
      }
    },
    staleTime: 30_000,
  });
}

export function useCreateKeyword() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<ListeningKeyword, "id" | "createdAt" | "mentionCount">) =>
      api.post<ListeningKeyword>("/listening", data),
    onMutate: async (newKeyword) => {
      await queryClient.cancelQueries({ queryKey: ["listening"] });
      const prev = queryClient.getQueryData<ListeningKeyword[]>(["listening"]);
      const optimistic: ListeningKeyword = {
        ...newKeyword,
        id: "optimistic-" + Date.now(),
        mentionCount: 0,
        createdAt: new Date().toISOString(),
      };
      queryClient.setQueryData<ListeningKeyword[]>(["listening"], old => [optimistic, ...(old ?? [])]);
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(["listening"], ctx.prev);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["listening"] }),
  });
}

export function useUpdateKeyword() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<ListeningKeyword> & { id: string }) =>
      api.put<ListeningKeyword>(`/listening/${id}`, data),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["listening"] }),
  });
}

export function useDeleteKeyword() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/listening/${id}`),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["listening"] });
      const prev = queryClient.getQueryData<ListeningKeyword[]>(["listening"]);
      queryClient.setQueryData<ListeningKeyword[]>(["listening"], old => (old ?? []).filter(k => k.id !== id));
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(["listening"], ctx.prev);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["listening"] }),
  });
}

export function useMentions() {
  return useQuery({
    queryKey: ["mentions"],
    queryFn: async () => MOCK_MENTIONS,
    staleTime: 30_000,
  });
}
