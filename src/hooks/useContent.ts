import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { ScheduledPost, Platform, ToneType, PostMetrics } from "@/types";

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
    mutationFn: (params: { prompt: string; caption?: string; platform?: Platform; brandStyle?: string }) =>
      api.post<{ url: string }>("/content/generate-image", params),
  });
}

interface PostMetricsWithContent extends PostMetrics {
  postContent: string;
  postPlatforms: string[];
}

const past = (d: number) => new Date(Date.now() - d * 86_400_000).toISOString();

const MOCK_METRICS: PostMetricsWithContent[] = [
  { postId: "p5", postContent: "✨ Our team just got certified in advanced pastry arts! Expect even more amazing desserts coming your way 🎉", postPlatforms: ["instagram", "tiktok"], likes: 342, comments: 28, reach: 5200, shares: 47, recordedAt: past(1) },
  { postId: "p3", postContent: "🌙 Ramadan Special Menu is here! Enjoy our exclusive iftar platters — available for dine-in and delivery.", postPlatforms: ["instagram"], likes: 218, comments: 41, reach: 3800, shares: 35, recordedAt: past(2) },
  { postId: "p1", postContent: "🎂 Custom birthday cakes available! Order yours today and make every celebration unforgettable.", postPlatforms: ["instagram", "facebook"], likes: 187, comments: 19, reach: 2900, shares: 22, recordedAt: past(3) },
  { postId: "p2", postContent: "Behind the scenes: watch how we craft our signature dishes fresh every morning 🍳", postPlatforms: ["tiktok"], likes: 503, comments: 64, reach: 9100, shares: 112, recordedAt: past(4) },
  { postId: "p4", postContent: "New weekend hours: We're now open until 11 PM on Fridays and Saturdays! Come enjoy a late dinner with us 🌟", postPlatforms: ["whatsapp", "facebook"], likes: 94, comments: 11, reach: 1400, shares: 18, recordedAt: past(5) },
];

export function usePostMetrics() {
  return useQuery({
    queryKey: ["postMetrics"],
    queryFn: async () => {
      try {
        const result = await api.get<PostMetricsWithContent[]>("/content/metrics");
        return Array.isArray(result) && result.length > 0 ? result : MOCK_METRICS;
      } catch {
        return MOCK_METRICS;
      }
    },
    staleTime: 60_000,
  });
}
