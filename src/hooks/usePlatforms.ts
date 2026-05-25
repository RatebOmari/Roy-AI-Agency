import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Platform } from "@/types";

export function useConnectPlatform() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (platform: Platform) =>
      api.post<{ oauthUrl?: string; connected?: boolean }>("/socialpilot/platforms/connect", { platform }),
    onSuccess: (data) => {
      if (data.oauthUrl) {
        window.location.href = data.oauthUrl;
      } else {
        queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      }
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useDisconnectPlatform() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (platform: Platform) =>
      api.post<void>("/socialpilot/platforms/disconnect", { platform }),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}
