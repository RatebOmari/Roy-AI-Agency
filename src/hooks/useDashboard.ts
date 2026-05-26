import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { DashboardStats } from "@/types";

const MOCK_STATS: DashboardStats = {
  totalReplies: 73,
  pendingReview: 7,
  avgResponseTime: "< 3 min",
  engagementRate: 87,
  platforms: [
    { platform: "tiktok",    connected: true,  replies: 42, pending: 5 },
    { platform: "instagram", connected: true,  replies: 31, pending: 2 },
    { platform: "facebook",  connected: false, replies: 0,  pending: 0 },
    { platform: "whatsapp",  connected: false, replies: 0,  pending: 0 },
  ],
  platformsV2: [
    {
      platform: "tiktok",
      comments: { connected: true,  enabled: true,  replies: 38, pending: 5 },
      messages: { connected: false, enabled: false },
    },
    {
      platform: "instagram",
      comments: { connected: true,  enabled: true,  replies: 20, pending: 2 },
      messages: { connected: true,  enabled: true,  replies: 11, pending: 0 },
    },
    {
      platform: "facebook",
      comments: { connected: false, enabled: true  },
      messages: { connected: false, enabled: true  },
    },
    {
      platform: "whatsapp",
      comments: { connected: false, enabled: false },
      messages: { connected: false, enabled: true  },
    },
    {
      platform: "sms",
      comments: { connected: false, enabled: false },
      messages: { connected: false, enabled: true  },
    },
    {
      platform: "phone",
      comments: { connected: false, enabled: false },
      messages: { connected: false, enabled: false },
    },
  ],
};

export function useDashboard() {
  return useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      try {
        const result = await api.get<DashboardStats>("/dashboard");
        if (!result || typeof result !== "object" || Array.isArray(result)) throw new Error("unexpected response");
        return result as DashboardStats;
      } catch {
        return MOCK_STATS;
      }
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}
