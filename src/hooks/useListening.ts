import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { ListeningKeyword, Mention, Platform } from "@/types";

const now = new Date();
const past = (days: number) => new Date(now.getTime() - days * 86_400_000).toISOString();

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
    queryFn: () => api.get<Mention[]>("/listening/mentions"),
    staleTime: 30_000,
  });
}

export function useGenerateMentionReply() {
  return useMutation({
    mutationFn: (data: { content: string; platform: string; username: string; keyword: string }) =>
      api.post<{ reply: string }>("/listening/generate-reply", data),
  });
}

export function useMarkMentionHandled() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, handled }: { id: string; handled: boolean }) =>
      api.patch<Mention>(`/listening/mentions/${id}/${handled ? "handle" : "unhandle"}`, {}),
    onSuccess: (updated) => {
      // Optimistically update the cached mention
      queryClient.setQueryData<Mention[]>(["mentions"], (old) =>
        (old ?? []).map(m => m.id === updated.id ? updated : m)
      );
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["mentions"] }),
  });
}
