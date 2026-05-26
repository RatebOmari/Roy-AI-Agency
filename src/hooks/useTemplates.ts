import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { ReplyTemplate, Platform, LanguageType } from "@/types";

const now = new Date();
const past = (days: number) => new Date(now.getTime() - days * 86_400_000).toISOString();

const MOCK_TEMPLATES: ReplyTemplate[] = [
  {
    id: "t1",
    title: "How to Order",
    content: "To place an order, simply DM us with your order details and we'll get back to you within minutes! 🛍️",
    platforms: ["instagram", "whatsapp"] as Platform[],
    language: "en" as LanguageType,
    active: true,
    createdAt: past(14),
  },
  {
    id: "t2",
    title: "Working Hours",
    content: "We're open Mon–Fri 9am–10pm, Sat–Sun 10am–11pm. Feel free to visit us anytime! ⏰",
    platforms: ["instagram", "facebook", "whatsapp"] as Platform[],
    language: "en" as LanguageType,
    active: true,
    createdAt: past(12),
  },
  {
    id: "t3",
    title: "كيفية الطلب",
    content: "لتقديم طلبك، أرسل لنا رسالة مباشرة مع تفاصيل طلبك وسنرد عليك في أقرب وقت! 🛍️",
    platforms: ["whatsapp"] as Platform[],
    language: "ar" as LanguageType,
    active: true,
    createdAt: past(10),
  },
  {
    id: "t4",
    title: "Delivery Info",
    content: "We deliver within 5km radius, free delivery on orders over $30. Estimated 30-45 minutes. 🚗",
    platforms: ["instagram", "facebook", "whatsapp"] as Platform[],
    language: "en" as LanguageType,
    active: true,
    createdAt: past(7),
  },
  {
    id: "t5",
    title: "Weekend Special",
    content: "Check out our weekend specials! Every Friday and Saturday we have exclusive deals and new items on the menu. Don't miss out! 🎉",
    platforms: ["instagram", "tiktok"] as Platform[],
    language: "en" as LanguageType,
    active: true,
    createdAt: past(3),
  },
];

export function useTemplates() {
  return useQuery({
    queryKey: ["templates"],
    queryFn: async () => {
      try {
        const result = await api.get<ReplyTemplate[]>("/templates");
        return Array.isArray(result) ? result : MOCK_TEMPLATES;
      } catch {
        return MOCK_TEMPLATES;
      }
    },
    staleTime: 30_000,
  });
}

export function useCreateTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<ReplyTemplate, "id" | "createdAt">) =>
      api.post<ReplyTemplate>("/templates", data),
    onMutate: async (newTemplate) => {
      await queryClient.cancelQueries({ queryKey: ["templates"] });
      const prev = queryClient.getQueryData<ReplyTemplate[]>(["templates"]);
      const optimistic: ReplyTemplate = {
        ...newTemplate,
        id: "optimistic-" + Date.now(),
        createdAt: new Date().toISOString(),
      };
      queryClient.setQueryData<ReplyTemplate[]>(["templates"], old => [optimistic, ...(old ?? [])]);
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(["templates"], ctx.prev);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["templates"] }),
  });
}

export function useUpdateTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<ReplyTemplate> & { id: string }) =>
      api.put<ReplyTemplate>(`/templates/${id}`, data),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["templates"] }),
  });
}

export function useDeleteTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/templates/${id}`),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["templates"] });
      const prev = queryClient.getQueryData<ReplyTemplate[]>(["templates"]);
      queryClient.setQueryData<ReplyTemplate[]>(["templates"], old => (old ?? []).filter(t => t.id !== id));
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(["templates"], ctx.prev);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["templates"] }),
  });
}
