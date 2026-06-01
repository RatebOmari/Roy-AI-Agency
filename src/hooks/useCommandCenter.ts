import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Platform } from "@/types";

export type UrgentType = "escalation" | "pending" | "failed_post";

export interface UrgentItem {
  id: string;
  type: UrgentType;
  clientId: string;
  clientName: string;
  platform: Platform;
  description: string;
  timestamp: string;
}

const NOW = new Date();
const ago = (minutes: number) => new Date(NOW.getTime() - minutes * 60_000).toISOString();

const MOCK_ITEMS: UrgentItem[] = [
  {
    id: "u1",
    type: "escalation",
    clientId: "1",
    clientName: "مطعم الأصيل",
    platform: "instagram",
    description: "Customer complaint about order quality — confidence 38%",
    timestamp: ago(12),
  },
  {
    id: "u2",
    type: "pending",
    clientId: "2",
    clientName: "صالون لمسة",
    platform: "facebook",
    description: "3 messages unanswered for over 2 hours",
    timestamp: ago(145),
  },
  {
    id: "u3",
    type: "escalation",
    clientId: "3",
    clientName: "عيادة الأمل",
    platform: "whatsapp",
    description: "Patient asking about prescription — requires human review",
    timestamp: ago(28),
  },
  {
    id: "u4",
    type: "failed_post",
    clientId: "1",
    clientName: "مطعم الأصيل",
    platform: "tiktok",
    description: "Scheduled post \"Ramadan Special\" failed to publish",
    timestamp: ago(55),
  },
  {
    id: "u5",
    type: "pending",
    clientId: "4",
    clientName: "متجر سبيس",
    platform: "instagram",
    description: "5 DMs pending review — oldest is 3 hours old",
    timestamp: ago(182),
  },
  {
    id: "u6",
    type: "escalation",
    clientId: "2",
    clientName: "صالون لمسة",
    platform: "instagram",
    description: "Negative review — customer threatening to post publicly",
    timestamp: ago(7),
  },
  {
    id: "u7",
    type: "failed_post",
    clientId: "4",
    clientName: "متجر سبيس",
    platform: "instagram",
    description: "Scheduled post \"Weekend Deal\" failed — token expired",
    timestamp: ago(90),
  },
  {
    id: "u8",
    type: "pending",
    clientId: "1",
    clientName: "مطعم الأصيل",
    platform: "whatsapp",
    description: "2 reservation requests pending for over 4 hours",
    timestamp: ago(245),
  },
];

export function useCommandCenter() {
  return useQuery({
    queryKey: ["commandCenter"],
    queryFn: async () => {
      try {
        const result = await api.get<UrgentItem[]>("/agency/command-center");
        return Array.isArray(result) ? result : MOCK_ITEMS;
      } catch {
        return MOCK_ITEMS;
      }
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}
