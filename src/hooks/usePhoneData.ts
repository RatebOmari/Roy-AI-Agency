import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useConversations } from "./useConversations";
import { useCalls } from "./useCalls";
import { api } from "@/lib/api";
import type { Call, Conversation, Message } from "@/types";

export interface PhoneContact {
  /** Normalized digits-only phone number used as the unique key */
  key: string;
  /** Display phone number (original format) */
  number: string;
  name: string;
  lastActivityAt: string;
  unreadSms: number;
  missedCalls: number;
  conversations: Conversation[];
  calls: Call[];
}

export type TimelineItem =
  | { kind: "message"; msg: Message }
  | { kind: "call"; call: Call };

export function buildTimeline(contact: PhoneContact): TimelineItem[] {
  const items: TimelineItem[] = [];
  for (const conv of contact.conversations) {
    for (const msg of conv.messages) {
      items.push({ kind: "message", msg });
    }
  }
  for (const call of contact.calls) {
    items.push({ kind: "call", call });
  }
  return items.sort((a, b) => {
    const ta = a.kind === "message" ? a.msg.timestamp : a.call.startedAt;
    const tb = b.kind === "message" ? b.msg.timestamp : b.call.startedAt;
    return new Date(ta).getTime() - new Date(tb).getTime();
  });
}

function normalizeNumber(n: string): string {
  return n.replace(/\D/g, "");
}

export function usePhoneData() {
  const { data: allConversations = [], isLoading: convsLoading } = useConversations();
  const { data: calls = [], isLoading: callsLoading }             = useCalls();

  const smsConvs = useMemo(
    () => allConversations.filter(c => c.channel === "sms"),
    [allConversations]
  );

  const contacts = useMemo<PhoneContact[]>(() => {
    const map = new Map<string, PhoneContact>();

    for (const conv of smsConvs) {
      const key = normalizeNumber(conv.contactHandle) || conv.contactHandle;
      const existing = map.get(key);
      if (existing) {
        existing.conversations.push(conv);
        existing.unreadSms += conv.unreadCount;
        if (conv.lastMessageAt > existing.lastActivityAt) {
          existing.lastActivityAt = conv.lastMessageAt;
        }
      } else {
        map.set(key, {
          key,
          number: conv.contactHandle,
          name: conv.contactName,
          lastActivityAt: conv.lastMessageAt,
          unreadSms: conv.unreadCount,
          missedCalls: 0,
          conversations: [conv],
          calls: [],
        });
      }
    }

    for (const call of calls) {
      const customerNum = call.direction === "outbound" ? call.toNumber : call.fromNumber;
      const key = normalizeNumber(customerNum) || customerNum;
      const isMissed = call.status === "missed" || call.status === "no-answer";
      const existing = map.get(key);
      if (existing) {
        existing.calls.push(call);
        if (isMissed) existing.missedCalls++;
        if (call.startedAt > existing.lastActivityAt) {
          existing.lastActivityAt = call.startedAt;
        }
        if (!existing.name && call.contactName) existing.name = call.contactName;
      } else {
        map.set(key, {
          key,
          number: customerNum,
          name: call.contactName || customerNum,
          lastActivityAt: call.startedAt,
          unreadSms: 0,
          missedCalls: isMissed ? 1 : 0,
          conversations: [],
          calls: [call],
        });
      }
    }

    return Array.from(map.values()).sort(
      (a, b) => new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime()
    );
  }, [smsConvs, calls]);

  return { contacts, isLoading: convsLoading || callsLoading };
}

export function useSendSms() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ conversationId, content }: { conversationId: string; content: string }) =>
      api.post<{ messageId: string }>(`/conversations/${conversationId}/send`, { content }),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}

export function usePhoneCallStats() {
  return useQuery({
    queryKey: ["phone-stats"],
    queryFn: async () => {
      try {
        return await api.get<{ total: number; answered: number; missed: number; avgDuration: number | null }>("/calls/stats");
      } catch {
        return null;
      }
    },
    staleTime: 60_000,
  });
}
