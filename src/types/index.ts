export type Platform = "tiktok" | "instagram" | "facebook" | "whatsapp";
export type ExtendedPlatform = Platform | "sms" | "phone";
export type PlatformFeatureType = "comments" | "messages";
export type Channel =
  | "tiktok_comment" | "tiktok_dm"
  | "instagram_comment" | "instagram_dm"
  | "facebook_comment" | "facebook_messenger"
  | "whatsapp_business" | "sms" | "phone_call";
export type ReplyStatus = "pending" | "approved" | "rejected" | "edited" | "auto_sent" | "escalated";
export type ClientStatus = "active" | "paused" | "setup";
export type ToneType = "friendly" | "professional" | "fun" | "informative";
export type LanguageType = "ar" | "en" | "ar_en";
export type ConversationStatus = "open" | "pending" | "resolved" | "closed";
export type Priority = "urgent" | "normal" | "low";

export interface PlatformFeatureStatus {
  connected: boolean;
  enabled: boolean;
  replies?: number;
  pending?: number;
}

export interface PlatformConnectionV2 {
  platform: ExtendedPlatform;
  comments: PlatformFeatureStatus;
  messages: PlatformFeatureStatus;
}

export interface User {
  id: string;
  email: string;
  role: "client" | "agency";
  teamRole?: "admin" | "agent" | "viewer";
  name: string;
  businessName: string;
  platformPermissions?: Record<ExtendedPlatform, { comments: boolean; messages: boolean }>;
}

export interface Comment {
  id: string;
  platform: Platform;
  username: string;
  text: string;
  aiReply: string;
  aiConfidence?: number;
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
  platformsV2?: PlatformConnectionV2[];
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

// ── Content Scheduler ─────────────────────────────────────────────────────────

export type PostStatus = "draft" | "scheduled" | "published" | "failed";

export interface ScheduledPost {
  id: string;
  platforms: Platform[];
  content: string;
  mediaUrl?: string;
  scheduledAt?: string;
  status: PostStatus;
  aiGenerated: boolean;
  createdAt: string;
}

// ── Resources / Knowledge Base ────────────────────────────────────────────────

export type ResourceType = "info" | "hours" | "menu_item" | "offer" | "document" | "faq";

export interface Resource {
  id: string;
  type: ResourceType;
  title: string;
  content: string;
  fileUrl?: string;
  active: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface BusinessInfo {
  name: string;
  description: string;
  address: string;
  phone: string;
  email: string;
}

export interface WorkingHoursEntry {
  day: string;
  open: boolean;
  from: string;
  to: string;
}

export interface MenuItem {
  name: string;
  description: string;
  price: string;
}

export interface OfferItem {
  title: string;
  description: string;
  expiresAt?: string;
}

export interface FaqEntry {
  question: string;
  answer: string;
}

// ── Reply Templates ───────────────────────────────────────────────────────────

export interface ReplyTemplate {
  id: string;
  title: string;
  content: string;
  platforms: Platform[];
  language: LanguageType;
  category: string;
  usedCount: number;
  active: boolean;
  createdAt: string;
}

// ── Campaigns (WhatsApp Broadcasts) ──────────────────────────────────────────

export type CampaignStatus = "draft" | "scheduled" | "sending" | "sent" | "failed";

export type CampaignAudienceType = "all" | "tag" | "platform";

export interface Campaign {
  id: string;
  name: string;
  message: string;
  mediaUrl?: string;
  platform: Platform;
  audienceType: CampaignAudienceType;
  audienceValue?: string;
  scheduledAt?: string;
  status: CampaignStatus;
  sentCount: number;
  readCount: number;
  replyCount: number;
  createdAt: string;
}

// ── Chatbot Flows ─────────────────────────────────────────────────────────────

export type FlowTrigger = "greeting" | "keyword" | "order" | "inquiry" | "fallback";
export type FlowStepType = "message" | "quick_replies" | "collect_input" | "condition" | "handoff";

export interface FlowStep {
  id: string;
  type: FlowStepType;
  content?: string;
  options?: string[];
  inputLabel?: string;
  inputKey?: string;
  conditionKey?: string;
  conditionValue?: string;
}

export interface ChatbotFlow {
  id: string;
  name: string;
  trigger: FlowTrigger;
  triggerValue?: string;
  platform: Platform;
  steps: FlowStep[];
  active: boolean;
  triggerCount: number;
  createdAt: string;
}

// ── Team Members & Internal Notes ─────────────────────────────────────────────

export type TeamRole = "admin" | "agent" | "viewer";
export type TeamMemberStatus = "active" | "invited" | "disabled";

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: TeamRole;
  status: TeamMemberStatus;
  createdAt: string;
}

export interface InternalNote {
  id: string;
  conversationId: string;
  authorName: string;
  content: string;
  createdAt: string;
}

// ── Social Listening ──────────────────────────────────────────────────────────

export type MentionSentiment = "positive" | "negative" | "neutral";

export interface ListeningKeyword {
  id: string;
  keyword: string;
  platforms: Platform[];
  active: boolean;
  mentionCount: number;
  createdAt: string;
}

export interface Mention {
  id: string;
  keywordId: string | null;
  keyword: string;
  platform: Platform;
  username: string;
  content: string;
  url?: string | null;
  sentiment: MentionSentiment;
  handled: boolean;
  handledAt?: string | null;
  timestamp: string;
}

// ── Brand Settings ────────────────────────────────────────────────────────────

export interface BrandSettings {
  imageStyle: string;
}

// ── Calls ─────────────────────────────────────────────────────────────────────

export type CallStatus = "initiated" | "ringing" | "in-progress" | "completed" | "failed" | "busy" | "no-answer" | "canceled" | "missed";
export type CallDirection = "inbound" | "outbound";

export interface Call {
  id: string;
  userId: string;
  convId: string | null;
  twilioSid: string | null;
  direction: CallDirection;
  toNumber: string;
  fromNumber: string;
  contactName: string;
  status: CallStatus;
  duration: number | null;
  recordingUrl: string | null;
  notes: string;
  startedAt: string;
  endedAt: string | null;
  createdAt: string;
}

// ── Post Metrics ──────────────────────────────────────────────────────────────

export interface PostMetrics {
  postId: string;
  likes: number;
  comments: number;
  reach: number;
  shares: number;
  recordedAt: string;
}
