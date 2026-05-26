import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Conversation, ConversationStatus } from "@/types";

const now = new Date();
const mins = (n: number) => new Date(now.getTime() - n * 60_000).toISOString();

const MOCK_CONVERSATIONS: Conversation[] = [
  {
    id: "c1",
    contactId: "u1",
    contactName: "Jessica Martinez",
    contactHandle: "@jessica_nc",
    channel: "instagram_dm",
    lastMessage: "Hey! Do you guys do custom cake orders for birthdays? 🎂",
    lastMessageAt: mins(3),
    unreadCount: 1,
    status: "pending",
    priority: "normal",
    tags: ["order-inquiry"],
    messages: [
      { id: "m1", conversationId: "c1", direction: "inbound", content: "Hey! Do you guys do custom cake orders for birthdays? 🎂", timestamp: mins(3) },
      { id: "m2", conversationId: "c1", direction: "outbound", content: "Absolutely! We love custom orders 😊 What date do you need it by?", aiReply: "Absolutely! We love custom orders 😊 What date do you need it by?", aiConfidence: 0.92, replyStatus: "pending", sentBy: "ai", timestamp: mins(3) },
    ],
  },
  {
    id: "c2",
    contactId: "u2",
    contactName: "Marcus Thompson",
    contactHandle: "9197550234",
    channel: "sms",
    lastMessage: "What are your hours on Sunday?",
    lastMessageAt: mins(12),
    unreadCount: 1,
    status: "pending",
    priority: "normal",
    tags: [],
    messages: [
      { id: "m3", conversationId: "c2", direction: "inbound", content: "What are your hours on Sunday?", timestamp: mins(12) },
      { id: "m4", conversationId: "c2", direction: "outbound", content: "We're open Sunday 11am–8pm! Stop by anytime 🙌", aiReply: "We're open Sunday 11am–8pm! Stop by anytime 🙌", aiConfidence: 0.97, replyStatus: "auto_sent", sentBy: "ai", timestamp: mins(11) },
    ],
  },
  {
    id: "c3",
    contactId: "u3",
    contactName: "Priya Patel",
    contactHandle: "@priya.eats.raleigh",
    channel: "tiktok_comment",
    lastMessage: "This place looks amazing!! Is it halal?",
    lastMessageAt: mins(28),
    unreadCount: 0,
    status: "open",
    priority: "normal",
    tags: ["dietary"],
    messages: [
      { id: "m5", conversationId: "c3", direction: "inbound", content: "This place looks amazing!! Is it halal?", timestamp: mins(28) },
      { id: "m6", conversationId: "c3", direction: "outbound", content: "Yes! All our meat is 100% halal certified 🌿 Come visit us!", aiReply: "Yes! All our meat is 100% halal certified 🌿 Come visit us!", aiConfidence: 0.88, replyStatus: "approved", sentBy: "ai", timestamp: mins(25) },
    ],
  },
  {
    id: "c4",
    contactId: "u4",
    contactName: "David Kim",
    contactHandle: "@davidk_clt",
    channel: "facebook_comment",
    lastMessage: "I had a terrible experience last week. The food was cold and the service was rude.",
    lastMessageAt: mins(45),
    unreadCount: 1,
    status: "pending",
    priority: "urgent",
    tags: ["complaint", "escalate"],
    messages: [
      { id: "m7", conversationId: "c4", direction: "inbound", content: "I had a terrible experience last week. The food was cold and the service was rude.", timestamp: mins(45) },
      { id: "m8", conversationId: "c4", direction: "outbound", content: "We're really sorry to hear this, David. This is not the experience we want for our guests. Could you DM us so we can make it right?", aiReply: "We're really sorry to hear this, David. This is not the experience we want for our guests. Could you DM us so we can make it right?", aiConfidence: 0.42, replyStatus: "pending", sentBy: "ai", timestamp: mins(44) },
    ],
  },
  {
    id: "c5",
    contactId: "u5",
    contactName: "Ashley Brooks",
    contactHandle: "@ashleyb_beauty",
    channel: "instagram_comment",
    lastMessage: "Love this!! Where can I buy it? 😍",
    lastMessageAt: mins(62),
    unreadCount: 0,
    status: "open",
    priority: "low",
    tags: ["purchase-intent"],
    messages: [
      { id: "m9", conversationId: "c5", direction: "inbound", content: "Love this!! Where can I buy it? 😍", timestamp: mins(62) },
      { id: "m10", conversationId: "c5", direction: "outbound", content: "Thank you! 💕 Shop at the link in our bio or visit us in-store in Raleigh!", aiReply: "Thank you! 💕 Shop at the link in our bio or visit us in-store in Raleigh!", aiConfidence: 0.95, replyStatus: "auto_sent", sentBy: "ai", timestamp: mins(61) },
    ],
  },
  {
    id: "c6",
    contactId: "u6",
    contactName: "Robert Johnson",
    contactHandle: "9196440087",
    channel: "sms",
    lastMessage: "I want to cancel my appointment tomorrow at 3pm",
    lastMessageAt: mins(90),
    unreadCount: 1,
    status: "pending",
    priority: "urgent",
    tags: ["appointment", "cancellation"],
    messages: [
      { id: "m11", conversationId: "c6", direction: "inbound", content: "I want to cancel my appointment tomorrow at 3pm", timestamp: mins(90) },
      { id: "m12", conversationId: "c6", direction: "outbound", content: "Hi Robert! Your 3pm appointment has been cancelled. Would you like to reschedule? We have openings Thursday and Friday.", aiReply: "Hi Robert! Your 3pm appointment has been cancelled. Would you like to reschedule? We have openings Thursday and Friday.", aiConfidence: 0.71, replyStatus: "pending", sentBy: "ai", timestamp: mins(89) },
    ],
  },
  {
    id: "c7",
    contactId: "u7",
    contactName: "Sofia Ramirez",
    contactHandle: "@sofia_charlotte",
    channel: "instagram_dm",
    lastMessage: "¿Tienen menú en español?",
    lastMessageAt: mins(120),
    unreadCount: 0,
    status: "resolved",
    priority: "normal",
    tags: ["spanish"],
    messages: [
      { id: "m13", conversationId: "c7", direction: "inbound", content: "¿Tienen menú en español?", timestamp: mins(120) },
      { id: "m14", conversationId: "c7", direction: "outbound", content: "¡Claro que sí! 🌮 Tenemos menú en español. ¡Bienvenida!", aiReply: "¡Claro que sí! 🌮 Tenemos menú en español. ¡Bienvenida!", aiConfidence: 0.89, replyStatus: "approved", sentBy: "ai", timestamp: mins(118) },
    ],
  },
];

export function useConversations(filter?: { status?: ConversationStatus | "all"; channel?: string }) {
  return useQuery({
    queryKey: ["conversations", filter],
    queryFn: async () => {
      try {
        const result = await api.get<Conversation[]>("/socialpilot/conversations");
        if (!Array.isArray(result)) throw new Error("unexpected response");
        return result;
      } catch {
        let data = MOCK_CONVERSATIONS;
        if (filter?.status && filter.status !== "all") {
          data = data.filter(c => c.status === filter.status);
        }
        if (filter?.channel && filter.channel !== "all") {
          data = data.filter(c => c.channel === filter.channel);
        }
        return data;
      }
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

export function useReplyToConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ conversationId, content, action }: { conversationId: string; content: string; action: "approve" | "reject" | "edit" }) =>
      api.post<void>("/socialpilot/conversations/action", { conversationId, content, action }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["conversations"] }),
  });
}

export function useUpdateConversationStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: ConversationStatus }) =>
      api.post<void>("/socialpilot/conversations/action", { action: "updateStatus", id, status }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["conversations"] }),
  });
}
