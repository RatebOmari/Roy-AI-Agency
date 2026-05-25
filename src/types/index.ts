export type Platform = "tiktok" | "instagram" | "facebook" | "whatsapp";
export type ReplyStatus = "pending" | "approved" | "rejected" | "edited";
export type ClientStatus = "active" | "paused" | "setup";
export type ToneType = "friendly" | "professional" | "fun" | "informative";
export type LanguageType = "ar" | "en" | "ar_en";

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
