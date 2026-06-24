import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

interface AgencyConfigData {
  globalBlocked: string;
}

export function useAgencyConfig() {
  return useQuery({
    queryKey: ["agencyConfig"],
    queryFn: async () => {
      try {
        return await api.get<AgencyConfigData>("/agency/config");
      } catch {
        return { globalBlocked: "" } as AgencyConfigData;
      }
    },
    staleTime: 60_000,
  });
}

export function useUpdateAgencyConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: AgencyConfigData) =>
      api.post<void>("/agency/config", data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["agencyConfig"] }),
  });
}
