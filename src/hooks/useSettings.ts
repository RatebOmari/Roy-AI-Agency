import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { ToneSettingsMap } from "@/types";

const DEFAULT_SETTINGS: ToneSettingsMap = {
  tiktok:    { tone: "friendly",      language: "ar_en", blocked: "", extra: "" },
  instagram: { tone: "friendly",      language: "en",    blocked: "", extra: "" },
  facebook:  { tone: "professional",  language: "ar",    blocked: "", extra: "" },
  whatsapp:  { tone: "informative",   language: "ar",    blocked: "", extra: "" },
};

export function useSettings() {
  return useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      try {
        return await api.get<ToneSettingsMap>("/socialpilot/settings");
      } catch {
        return DEFAULT_SETTINGS;
      }
    },
    staleTime: 60_000,
  });
}

export function useSaveSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (settings: ToneSettingsMap) =>
      api.post<void>("/socialpilot/settings", settings),
    onSuccess: (_data, variables) => {
      queryClient.setQueryData(["settings"], variables);
    },
  });
}
