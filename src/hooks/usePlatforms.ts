import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Platform, ExtendedPlatform, PlatformFeatureType } from "@/types";

export function useConnectPlatform() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (platform: Platform) =>
      api.post<{ oauthUrl?: string; connected?: boolean }>("/platforms/connect", { platform }),
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
      api.post<void>("/platforms/disconnect", { platform }),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useConnectPlatformFeature() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ platform, feature }: { platform: ExtendedPlatform; feature: PlatformFeatureType }) =>
      api.post<{ oauthUrl?: string; connected?: boolean }>("/platforms/connect", { platform, feature }),
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

export function useDisconnectPlatformFeature() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ platform, feature }: { platform: ExtendedPlatform; feature: PlatformFeatureType }) =>
      api.post<void>("/platforms/disconnect", { platform, feature }),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}
