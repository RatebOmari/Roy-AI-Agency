export type Platform = "tiktok" | "instagram" | "facebook" | "whatsapp";
export type Channel =
  | "tiktok_comment" | "tiktok_dm"
  | "instagram_comment" | "instagram_dm"
  | "facebook_comment" | "facebook_messenger"
  | "whatsapp_business" | "sms" | "phone_call";
export type ReplyStatus = "pending" | "approved" | "rejected" | "edited" | "auto_sent";
export type ClientStatus = "active" | "paused" | "setup";
export type ToneType = "friendly" | "professional" | "fun" | "informative";
export type LanguageType = "ar" | "en" | "ar_en";
export type ConversationStatus = "open" | "pending" | "resolved" | "closed";
export type Priority = "urgent" | "normal" | "low";

export interface User {
  id: string;
  email: string;
  role: "client" | "agency";
  name: string;
  businessName: string;
}

export interface Comment {
  id: string;
  platform: Platform;
  username: string;
  text: string;
  aiReply: string;
  status: ReplyStatus;
  timestamp: string;
  clientId?: string;
}

export interface PlatformSettings {
  tone: ToneType;
  language: LanguageType;
  blocked: string;
  extra: string;
}

export interface ToneSettingsMap {
  tiktok: PlatformSettings;
  instagram: PlatformSettings;
  facebook: PlatformSettings;
  whatsapp: PlatformSettings;
}

export interface PlatformConnection {
  platform: Platform;
  connected: boolean;
  replies: number;
  pending: number;
  connectedAt?: string;
}

export interface DashboardStats {
  totalReplies: number;
  pendingReview: number;
  avgResponseTime: string;
  engagementRate: number;
  platforms: PlatformConnection[];
}

export interface AgencyClient {
  id: string;
  name: string;
  owner: string;
  email: string;
  platforms: Platform[];
  replies: number;
  status: ClientStatus;
}

export interface ApiError {
  message: string;
  code?: string;
  status?: number;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface Message {
  id: string;
  conversationId: string;
  direction: "inbound" | "outbound";
  content: string;
  aiReply?: string;
  aiConfidence?: number;
  replyStatus?: ReplyStatus;
  sentBy?: "ai" | "human";
  timestamp: string;
  mediaUrl?: string;
}

export interface Conversation {
  id: string;
  contactId: string;
  contactName: string;
  contactHandle: string;
  channel: Channel;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
  status: ConversationStatus;
  priority: Priority;
  assignedTo?: string;
  tags: string[];
  messages: Message[];
}

export interface Contact {
  id: string;
  name: string;
  handles: {
    channel: Channel;
    username: string;
    profileUrl?: string;
  }[];
  phone?: string;
  email?: string;
  totalConversations: number;
  lastSeenAt: string;
  tags: string[];
  notes: string;
}

export interface AutomationRule {
  id: string;
  name: string;
  trigger: "contains_word" | "is_question" | "sentiment_positive" | "sentiment_negative" | "new_follower";
  triggerValue?: string;
  action: "auto_send" | "skip_review" | "escalate" | "assign_to";
  actionValue?: string;
  channels: Channel[];
  active: boolean;
}

export interface AnalyticsData {
  date: string;
  total: number;
  autoSent: number;
  manual: number;
  escalated: number;
}

export interface ChannelBreakdown {
  channel: Channel;
  count: number;
  percentage: number;
}
