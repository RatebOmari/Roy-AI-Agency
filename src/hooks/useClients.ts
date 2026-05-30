import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { AgencyClient, ClientStatus, ExtendedPlatform, PlatformFeatureType } from "@/types";

export interface ClientPlatformCredential {
  platform:    string;
  feature:     string;
  connected:   boolean;
  connectedAt: string;
}

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

export function useClientPlatforms(clientId: string | null) {
  return useQuery({
    queryKey: ["clientPlatforms", clientId],
    queryFn: async () => {
      if (!clientId) return [] as ClientPlatformCredential[];
      try {
        return await api.get<ClientPlatformCredential[]>(`/clients/${clientId}/platforms`);
      } catch {
        return [] as ClientPlatformCredential[];
      }
    },
    enabled: !!clientId,
    staleTime: 30_000,
  });
}

export function useSetClientPlatformCredential() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      clientId, platform, feature, accessToken,
    }: { clientId: string; platform: ExtendedPlatform; feature: PlatformFeatureType; accessToken: string }) =>
      api.post<void>("/clients/action", { action: "setPlatformCredential", clientId, platform, feature, accessToken }),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["clientPlatforms", vars.clientId] });
    },
  });
}

export interface AgencyStats {
  totalReplies: number;
  autoSentRate: number;
  activeClients: number;
  avgPerClient: number;
  weeklyData: { day: string; replies: number }[];
}

export function useAgencyStats() {
  return useQuery({
    queryKey: ["agencyStats"],
    queryFn: async () => {
      try {
        return await api.get<AgencyStats>("/clients/stats");
      } catch {
        return { totalReplies: 0, autoSentRate: 0, activeClients: 0, avgPerClient: 0, weeklyData: [] } as AgencyStats;
      }
    },
    staleTime: 60_000,
  });
}

export function useRevokeClientPlatformCredential() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      clientId, platform, feature,
    }: { clientId: string; platform: ExtendedPlatform; feature: PlatformFeatureType }) =>
      api.post<void>("/clients/action", { action: "revokeCredential", clientId, platform, feature }),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["clientPlatforms", vars.clientId] });
    },
  });
}
