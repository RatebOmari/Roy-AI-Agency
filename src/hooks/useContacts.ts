import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Contact } from "@/types";

interface ContactFilters {
  search?:   string;
  tag?:      string;
  platform?: string;
}

export function useContacts(filters?: ContactFilters) {
  const params = new URLSearchParams();
  if (filters?.search)   params.set("search",   filters.search);
  if (filters?.tag)      params.set("tag",       filters.tag);
  if (filters?.platform) params.set("platform",  filters.platform);

  const qs = params.toString();
  return useQuery({
    queryKey: ["contacts", filters?.search ?? "", filters?.tag ?? "", filters?.platform ?? ""],
    queryFn:  () => api.get<Contact[]>(`/contacts${qs ? `?${qs}` : ""}`),
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
