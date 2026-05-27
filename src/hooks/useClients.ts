import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { AgencyClient, ClientStatus } from "@/types";

const MOCK_CLIENTS: AgencyClient[] = [
  { id: "1", name: "مطعم الأصيل",   owner: "فهد المطيري",  email: "fahad@alasel.com",     platforms: ["tiktok", "instagram", "whatsapp"], replies: 342, status: "active" },
  { id: "2", name: "صالون لمسة",    owner: "نورا السعيد",  email: "nora@lamsa.com",       platforms: ["instagram", "facebook"],           replies: 218, status: "active" },
  { id: "3", name: "عيادة الأمل",   owner: "د. خالد عمر",  email: "khalid@amal-clinic.com", platforms: ["instagram", "whatsapp"],          replies: 156, status: "paused" },
  { id: "4", name: "متجر سبيس",     owner: "سارة القحطاني", email: "sara@spacestore.com",  platforms: ["tiktok", "instagram"],             replies: 87,  status: "active" },
  { id: "5", name: "شركة تقنية",    owner: "عمر النجدي",   email: "omar@techco.com",       platforms: ["facebook", "whatsapp"],            replies: 0,   status: "setup"  },
];

export function useClients() {
  return useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      try {
        const result = await api.get<AgencyClient[]>("/clients");
        return Array.isArray(result) ? result : MOCK_CLIENTS;
      } catch {
        return MOCK_CLIENTS;
      }
    },
    staleTime: 60_000,
  });
}

export function useUpdateClientStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: ClientStatus }) =>
      api.post<void>("/clients/action", { action: "updateStatus", id, status }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["clients"] }),
  });
}

export function useUpdateClientPermissions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ clientId, permissions }: { clientId: string; permissions: Record<string, { comments: boolean; messages: boolean }> }) =>
      api.post<void>("/clients/action", { action: "updatePermissions", clientId, permissions }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["clients"] }),
  });
}
