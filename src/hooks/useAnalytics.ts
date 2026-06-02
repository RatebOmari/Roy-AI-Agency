import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export type AnalyticsRange = "7d" | "30d" | "90d";

export interface AnalyticsData {
  range: AnalyticsRange;
  summary: {
    totalMessages:        number;
    autoSentRate:         number;
    totalAutoSent:        number;
    totalManual:          number;
    totalEscalated:       number;
    pendingConversations: number;
    resolvedConversations: number;
  };
  msgChart: { date: string; autoSent: number; manual: number; escalated: number }[];
  channelBreakdown: { channel: string; count: number }[];
  campaigns: {
    sent:      number;
    read:      number;
    reply:     number;
    readRate:  number;
    replyRate: number;
  };
  outreach?: {
    sent:        number;
    opened:      number;
    replied:     number;
    openRate:    number;
    replyRate:   number;
    byChannel:   { channel: string; sent: number; opened: number }[];
  };
}

export function useAnalytics(range: AnalyticsRange) {
  return useQuery({
    queryKey: ["analytics", range],
    queryFn:  () => api.get<AnalyticsData>(`/analytics?range=${range}`),
    staleTime: 60_000,
  });
}
