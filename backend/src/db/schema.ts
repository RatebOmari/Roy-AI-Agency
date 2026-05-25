import { pgTable, text, integer, boolean, timestamp, uuid, pgEnum } from "drizzle-orm/pg-core";

export const roleEnum       = pgEnum("role",        ["client", "agency"]);
export const clientStatusEnum = pgEnum("client_status", ["active", "paused", "setup"]);
export const replyStatusEnum  = pgEnum("reply_status",  ["pending", "approved", "rejected", "edited", "auto_sent"]);
export const convStatusEnum   = pgEnum("conv_status",   ["open", "pending", "resolved", "closed"]);
export const priorityEnum     = pgEnum("priority",      ["urgent", "normal", "low"]);
export const directionEnum    = pgEnum("direction",     ["inbound", "outbound"]);
export const sentByEnum       = pgEnum("sent_by",       ["ai", "human"]);

export const platformEnum = pgEnum("platform", [
  "tiktok", "instagram", "facebook", "whatsapp", "sms", "phone",
]);
export const channelEnum = pgEnum("channel", [
  "tiktok_comment", "tiktok_dm",
  "instagram_comment", "instagram_dm",
  "facebook_comment", "facebook_messenger",
  "whatsapp_business", "sms", "phone_call",
]);
export const toneEnum = pgEnum("tone", ["friendly", "professional", "fun", "informative"]);
export const langEnum = pgEnum("lang",  ["ar", "en", "ar_en"]);
export const featureEnum = pgEnum("feature", ["comments", "messages"]);

export const users = pgTable("users", {
  id:           uuid("id").primaryKey().defaultRandom(),
  email:        text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role:         roleEnum("role").notNull().default("client"),
  name:         text("name").notNull(),
  businessName: text("business_name").notNull().default(""),
  createdAt:    timestamp("created_at").notNull().defaultNow(),
});

export const agencyClients = pgTable("agency_clients", {
  id:        uuid("id").primaryKey().defaultRandom(),
  agencyId:  uuid("agency_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  clientId:  uuid("client_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  status:    clientStatusEnum("status").notNull().default("active"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const platformPermissions = pgTable("platform_permissions", {
  id:              uuid("id").primaryKey().defaultRandom(),
  clientId:        uuid("client_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  grantedBy:       uuid("granted_by").notNull().references(() => users.id),
  platform:        platformEnum("platform").notNull(),
  commentsEnabled: boolean("comments_enabled").notNull().default(false),
  messagesEnabled: boolean("messages_enabled").notNull().default(false),
  updatedAt:       timestamp("updated_at").notNull().defaultNow(),
});

export const platformCredentials = pgTable("platform_credentials", {
  id:              uuid("id").primaryKey().defaultRandom(),
  userId:          uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  platform:        platformEnum("platform").notNull(),
  feature:         featureEnum("feature").notNull(),
  accessTokenEnc:  text("access_token_enc"),
  refreshTokenEnc: text("refresh_token_enc"),
  expiresAt:       timestamp("expires_at"),
  scope:           text("scope"),
  connectedAt:     timestamp("connected_at").notNull().defaultNow(),
});

export const toneSettings = pgTable("tone_settings", {
  id:           uuid("id").primaryKey().defaultRandom(),
  userId:       uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  platform:     platformEnum("platform").notNull(),
  tone:         toneEnum("tone").notNull().default("friendly"),
  language:     langEnum("language").notNull().default("ar"),
  blockedWords: text("blocked_words").notNull().default(""),
  extra:        text("extra").notNull().default(""),
  updatedAt:    timestamp("updated_at").notNull().defaultNow(),
});

export const conversations = pgTable("conversations", {
  id:            uuid("id").primaryKey().defaultRandom(),
  userId:        uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  contactId:     text("contact_id").notNull(),
  contactName:   text("contact_name").notNull(),
  contactHandle: text("contact_handle").notNull().default(""),
  channel:       channelEnum("channel").notNull(),
  lastMessage:   text("last_message").notNull().default(""),
  lastMessageAt: timestamp("last_message_at").notNull().defaultNow(),
  unreadCount:   integer("unread_count").notNull().default(0),
  status:        convStatusEnum("status").notNull().default("pending"),
  priority:      priorityEnum("priority").notNull().default("normal"),
  assignedTo:    text("assigned_to"),
  tags:          text("tags").array().notNull().default([]),
  createdAt:     timestamp("created_at").notNull().defaultNow(),
});

export const messages = pgTable("messages", {
  id:           uuid("id").primaryKey().defaultRandom(),
  convId:       uuid("conv_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  direction:    directionEnum("direction").notNull(),
  content:      text("content").notNull(),
  aiReply:      text("ai_reply"),
  aiConfidence: integer("ai_confidence"),
  replyStatus:  replyStatusEnum("reply_status"),
  sentBy:       sentByEnum("sent_by"),
  mediaUrl:     text("media_url"),
  timestamp:    timestamp("timestamp").notNull().defaultNow(),
});
