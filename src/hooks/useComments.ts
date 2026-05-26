import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Comment, Platform, ReplyStatus } from "@/types";

interface CommentsFilter {
  platform?: Platform | "all";
  status?: ReplyStatus | "all";
}

const MOCK_COMMENTS: Comment[] = [
  {
    id: "1",
    platform: "tiktok",
    username: "ahmed_sa",
    text: "منتجكم رائع! كيف يمكنني الطلب؟",
    aiReply: "شكراً جزيلاً أحمد! يمكنك الطلب عبر الرابط في البايو أو التواصل معنا مباشرة على الواتساب 😊",
    aiConfidence: 0.62,
    status: "pending",
    timestamp: new Date(Date.now() - 5 * 60000).toISOString(),
  },
  {
    id: "2",
    platform: "instagram",
    username: "sara.designs",
    text: "Love this product! Where can I find it?",
    aiReply: "Thank you Sara! You can find us at our website or DM us for more info 🛍️",
    aiConfidence: 0.91,
    status: "auto_sent",
    timestamp: new Date(Date.now() - 15 * 60000).toISOString(),
  },
  {
    id: "3",
    platform: "facebook",
    username: "محمد العلي",
    text: "هل يوجد توصيل للرياض؟",
    aiReply: "أهلاً محمد! نعم نوصل لجميع مناطق المملكة، التوصيل خلال ٢-٣ أيام عمل ✅",
    aiConfidence: 0.41,
    status: "pending",
    timestamp: new Date(Date.now() - 30 * 60000).toISOString(),
  },
  {
    id: "4",
    platform: "tiktok",
    username: "foodie_uae",
    text: "Amazing quality! Will definitely order again",
    aiReply: "We're so happy you loved it! Your next order gets a 10% discount 🎉",
    aiConfidence: 0.88,
    status: "auto_sent",
    timestamp: new Date(Date.now() - 60 * 60000).toISOString(),
  },
  {
    id: "5",
    platform: "whatsapp",
    username: "خالد م",
    text: "ما هي مواعيد العمل؟",
    aiReply: "أهلاً خالد! نعمل من الأحد إلى الخميس ٩ص - ٩م، والجمعة والسبت ١٢م - ٦م 🕐",
    aiConfidence: 0.55,
    status: "approved",
    timestamp: new Date(Date.now() - 2 * 60 * 60000).toISOString(),
  },
];

export function useComments(filter: CommentsFilter = {}) {
  return useQuery({
    queryKey: ["comments", filter],
    queryFn: async () => {
      try {
        const params = new URLSearchParams();
        if (filter.platform && filter.platform !== "all") params.set("platform", filter.platform);
        if (filter.status && filter.status !== "all") params.set("status", filter.status);
        const query = params.toString();
        return await api.get<Comment[]>(`/comments${query ? `?${query}` : ""}`);
      } catch {
        return MOCK_COMMENTS.filter(c => {
          if (filter.platform && filter.platform !== "all" && c.platform !== filter.platform) return false;
          if (filter.status   && filter.status   !== "all" && c.status   !== filter.status)   return false;
          return true;
        });
      }
    },
    staleTime: 30_000,
  });
}

export function useApproveComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.post<void>("/comments/action", { action: "approve", id }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["comments"] }),
  });
}

export function useRejectComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.post<void>("/comments/action", { action: "reject", id }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["comments"] }),
  });
}

export function useEditComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, aiReply }: { id: string; aiReply: string }) =>
      api.post<void>("/comments/action", { action: "edit", id, aiReply }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["comments"] }),
  });
}
