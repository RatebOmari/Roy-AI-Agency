import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface AgencyConfigData {
  globalBlocked: string;
  website:       string;
  contactEmail:  string;
  phone:         string;
}

const EMPTY_CONFIG: AgencyConfigData = {
  globalBlocked: "", website: "", contactEmail: "", phone: "",
};

export function useAgencyConfig() {
  return useQuery({
    queryKey: ["agencyConfig"],
    queryFn: async () => {
      try {
        return await api.get<AgencyConfigData>("/agency/config");
      } catch {
        return EMPTY_CONFIG;
      }
    },
    staleTime: 60_000,
  });
}

/** Fields are optional so one section can be saved without clobbering another. */
export function useUpdateAgencyConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<AgencyConfigData>) =>
      api.post<void>("/agency/config", data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["agencyConfig"] }),
  });
}
