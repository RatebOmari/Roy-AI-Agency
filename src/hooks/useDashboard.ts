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
};

export function useDashboard() {
  return useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      try {
        return await api.get<DashboardStats>("/socialpilot/dashboard");
      } catch {
        return MOCK_STATS;
      }
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}
