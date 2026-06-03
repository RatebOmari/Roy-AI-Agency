import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Contact } from "@/types";

interface ContactFilters {
  search?:   string;
  tag?:      string;
  platform?: string;
  page?:     number;
}

export function useContacts(filters?: ContactFilters) {
  const page = filters?.page ?? 1;
  const params = new URLSearchParams();
  if (filters?.search)   params.set("search",   filters.search);
  if (filters?.tag)      params.set("tag",       filters.tag);
  if (filters?.platform) params.set("platform",  filters.platform);
  params.set("page",  String(page));
  params.set("limit", "50");

  return useQuery({
    queryKey: ["contacts", filters?.search ?? "", filters?.tag ?? "", filters?.platform ?? "", page],
    queryFn: async () => {
      const result = await api.get<{ data: Contact[]; pagination: { page: number; limit: number; total: number; hasMore: boolean } }>(
        `/contacts?${params.toString()}`
      );
      return result?.data ?? (result as unknown as Contact[]);
    },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}

export function useUpdateContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<Contact> & { id: string }) =>
      api.patch<Contact>(`/contacts/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["contacts"] }),
  });
}

export function useDeleteContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<{ ok: boolean }>(`/contacts/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["contacts"] }),
  });
}
