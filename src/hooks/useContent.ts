import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { ScheduledPost, Platform, ToneType } from "@/types";

const now = new Date();
const future = (days: number, hour = 10) => {
  const d = new Date(now);
  d.setDate(d.getDate() + days);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
};

const MOCK_POSTS: ScheduledPost[] = [
  {
    id: "p1",
    platforms: ["instagram", "facebook"],
    content: "🎂 Custom birthday cakes available! Order yours today and make every celebration unforgettable. DM us for pricing and availability!",
    scheduledAt: future(1, 10),
    status: "scheduled",
    aiGenerated: true,
    createdAt: new Date(now.getTime() - 3600_000).toISOString(),
  },
  {
    id: "p2",
    platforms: ["tiktok"],
    content: "Behind the scenes: watch how we craft our signature dishes fresh every morning 🍳 #FoodTok #BehindTheScenes",
    scheduledAt: future(2, 14),
    status: "scheduled",
    aiGenerated: false,
    createdAt: new Date(now.getTime() - 7200_000).toISOString(),
  },
  {
    id: "p3",
    platforms: ["instagram"],
    content: "🌙 Ramadan Special Menu is here! Enjoy our exclusive iftar platters — available for dine-in and delivery. Book your table now!",
    scheduledAt: future(3, 18),
    status: "scheduled",
    aiGenerated: true,
    createdAt: new Date(now.getTime() - 86400_000).toISOString(),
  },
  {
    id: "p4",
    platforms: ["whatsapp", "facebook"],
    content: "New weekend hours: We're now open until 11 PM on Fridays and Saturdays! Come enjoy a late dinner with us 🌟",
    scheduledAt: future(5, 9),
    status: "draft",
    aiGenerated: false,
    createdAt: new Date(now.getTime() - 172800_000).toISOString(),
  },
  {
    id: "p5",
    platforms: ["instagram", "tiktok"],
    content: "✨ Our team just got certified in advanced pastry arts! Expect even more amazing desserts coming your way 🎉",
    scheduledAt: future(-1, 12),
    status: "published",
    aiGenerated: false,
    createdAt: new Date(now.getTime() - 259200_000).toISOString(),
  },
];

export function useScheduledPosts() {
  return useQuery({
    queryKey: ["content"],
    queryFn: async () => {
      try {
        const result = await api.get<ScheduledPost[]>("/content");
        return Array.isArray(result) ? result : MOCK_POSTS;
      } catch {
        return MOCK_POSTS;
      }
    },
    staleTime: 30_000,
  });
}

export function useCreatePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (post: Omit<ScheduledPost, "id" | "createdAt">) =>
      api.post<ScheduledPost>("/content", post),
    onMutate: async (newPost) => {
      await queryClient.cancelQueries({ queryKey: ["content"] });
      const prev = queryClient.getQueryData<ScheduledPost[]>(["content"]);
      const optimistic: ScheduledPost = {
        ...newPost,
        id: "optimistic-" + Date.now(),
        createdAt: new Date().toISOString(),
      };
      queryClient.setQueryData<ScheduledPost[]>(["content"], old => [optimistic, ...(old ?? [])]);
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(["content"], ctx.prev);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["content"] }),
  });
}

export function useUpdatePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<ScheduledPost> & { id: string }) =>
      api.put<ScheduledPost>(`/content/${id}`, data),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["content"] }),
  });
}

export function useDeletePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/content/${id}`),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["content"] });
      const prev = queryClient.getQueryData<ScheduledPost[]>(["content"]);
      queryClient.setQueryData<ScheduledPost[]>(["content"], old => (old ?? []).filter(p => p.id !== id));
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(["content"], ctx.prev);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["content"] }),
  });
}

export function useGeneratePost() {
  return useMutation({
    mutationFn: (params: { prompt: string; platform?: Platform; tone?: ToneType }) =>
      api.post<{ caption: string; hashtags: string[] }>("/content/generate", params),
  });
}

export function useGenerateImage() {
  return useMutation({
    mutationFn: (params: { prompt: string; caption?: string; platform?: Platform }) =>
      api.post<{ url: string }>("/content/generate-image", params),
  });
}
