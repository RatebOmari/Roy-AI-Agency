import { pgTable, text, integer, boolean, timestamp, uuid, pgEnum, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const roleEnum       = pgEnum("role",        ["client", "agency"]);
export const clientStatusEnum = pgEnum("client_status", ["active", "paused", "setup"]);
export const replyStatusEnum  = pgEnum("reply_status",  ["pending", "approved", "rejected", "edited", "auto_sent", "escalated"]);
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
export const featureEnum = pgEnum("feature", ["comments", "messages", "publishing"]);

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
  id:                      uuid("id").primaryKey().defaultRandom(),
  agencyId:                uuid("agency_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  clientId:                uuid("client_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  status:                  clientStatusEnum("status").notNull().default("active"),
  contentApprovalEnabled:  boolean("content_approval_enabled").notNull().default(true),
  createdAt:               timestamp("created_at").notNull().defaultNow(),
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
  // Set by the scheduler when token refresh fails and the token has expired.
  // Non-null means the credential requires reconnection.
  disconnectedAt:  timestamp("disconnected_at"),
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
}, (t) => ({
  userIdIdx: index("conversations_user_id_idx").on(t.userId),
  statusIdx: index("conversations_status_idx").on(t.status),
}));

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
}, (t) => ({
  convIdIdx: index("messages_conv_id_idx").on(t.convId),
}));

// ── Content Scheduler ─────────────────────────────────────────────────────────

// `status` tracks the scheduling lifecycle: draft → scheduled → published | failed | skipped.
// `pending_approval` and `changes_requested` are intermediate scheduling states
// used when agency approval is required before the scheduler picks up the post.
// `skipped` is set when all targeted platforms are currently unsupported for auto-publishing
// (e.g. TikTok requires business API approval, WhatsApp requires Campaign API).
//
// `approvalStatus` tracks the agency-client approval workflow independently:
// not_required | pending → approved | changes_requested.
// The two columns overlap semantically — a post in `pending_approval` scheduling
// status will also have `approvalStatus = "pending"`. The scheduler only
// publishes posts whose `status = "scheduled"`, so approval must set both fields.
export const postStatusEnum = pgEnum("post_status", [
  "draft", "scheduled", "published", "failed", "skipped",
  "pending_approval", "changes_requested",
]);

export const approvalStatusEnum = pgEnum("approval_status", [
  "not_required", "pending", "approved", "changes_requested",
]);

export const scheduledPosts = pgTable("scheduled_posts", {
  id:          uuid("id").primaryKey().defaultRandom(),
  userId:      uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdBy:   uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  platforms:   text("platforms").array().notNull().default(sql`'{}'::text[]`),
  content:     text("content").notNull().default(""),
  mediaUrl:    text("media_url"),
  scheduledAt: timestamp("scheduled_at"),
  publishedAt: timestamp("published_at"),
  status:      postStatusEnum("status").notNull().default("draft"),
  aiGenerated: boolean("ai_generated").notNull().default(false),
  createdAt:   timestamp("created_at").notNull().defaultNow(),

  // ── Approval flow ─────────────────────────────────────────────────────────
  approvalRequired:        boolean("approval_required").notNull().default(true),
  approvalStatus:          approvalStatusEnum("approval_status").notNull().default("not_required"),
  submittedForApprovalAt:  timestamp("submitted_for_approval_at"),
  approvedAt:              timestamp("approved_at"),
  approvalFeedback:        text("approval_feedback"),
  overridePublished:       boolean("override_published").notNull().default(false),
  overridePublishedBy:     uuid("override_published_by").references(() => users.id, { onDelete: "set null" }),
}, (t) => ({
  userIdIdx: index("scheduled_posts_user_id_idx").on(t.userId),
  statusIdx: index("scheduled_posts_status_idx").on(t.status),
}));

// ── Resources / Knowledge Base ────────────────────────────────────────────────

export const resourceTypeEnum = pgEnum("resource_type", ["info", "hours", "menu_item", "offer", "document", "faq"]);

export const resources = pgTable("resources", {
  id:        uuid("id").primaryKey().defaultRandom(),
  userId:    uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type:      resourceTypeEnum("type").notNull(),
  title:     text("title").notNull().default(""),
  content:   text("content").notNull().default("{}"),
  fileUrl:   text("file_url"),
  active:    boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ── Reply Templates ───────────────────────────────────────────────────────────

export const replyTemplates = pgTable("reply_templates", {
  id:        uuid("id").primaryKey().defaultRandom(),
  userId:    uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title:     text("title").notNull(),
  content:   text("content").notNull(),
  platforms: text("platforms").array().notNull().default(sql`'{}'::text[]`),
  language:  text("language").notNull().default("en"),
  active:    boolean("active").notNull().default(true),
  category:  text("category").notNull().default(""),
  usedCount: integer("used_count").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ── Outreach (multi-channel broadcast messages) ───────────────────────────────

export const outreachChannelEnum = pgEnum("outreach_channel", ["whatsapp", "sms", "email"]);
export const outreachStatusEnum  = pgEnum("outreach_status",  ["draft", "scheduled", "sending", "sent", "failed"]);

export const outreachMessages = pgTable("outreach_messages", {
  id:              uuid("id").primaryKey().defaultRandom(),
  userId:          uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdBy:       uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  title:           text("title").notNull(),
  channel:         outreachChannelEnum("channel").notNull(),
  messageBody:     text("message_body").notNull(),
  subject:         text("subject"),                                        // email only
  imageUrl:        text("image_url"),                                       // optional
  quickReplies:    text("quick_replies").notNull().default("[]"),           // JSON: string[], WA only, max 3
  audienceFilter:  text("audience_filter").notNull().default("{}"),         // JSON: { type, tagValue, platformValue, activeDays }
  estimatedReach:  integer("estimated_reach").notNull().default(0),
  actualReach:     integer("actual_reach").notNull().default(0),
  sentCount:       integer("sent_count").notNull().default(0),
  deliveredCount:  integer("delivered_count").notNull().default(0),
  openedCount:     integer("opened_count").notNull().default(0),
  clickedCount:    integer("clicked_count").notNull().default(0),
  repliedCount:    integer("replied_count").notNull().default(0),
  failedCount:     integer("failed_count").notNull().default(0),
  status:          outreachStatusEnum("status").notNull().default("draft"),
  scheduledAt:     timestamp("scheduled_at"),
  sentAt:          timestamp("sent_at"),
  createdAt:       timestamp("created_at").notNull().defaultNow(),
}, (t) => ({
  userIdIdx: index("outreach_messages_user_id_idx").on(t.userId),
}));

export const outreachResults = pgTable("outreach_results", {
  id:             uuid("id").primaryKey().defaultRandom(),
  outreachId:     uuid("outreach_id").notNull().references(() => outreachMessages.id, { onDelete: "cascade" }),
  contactId:      uuid("contact_id").references(() => contacts.id, { onDelete: "set null" }),
  channel:        outreachChannelEnum("channel").notNull(),
  sentAt:         timestamp("sent_at"),
  deliveredAt:    timestamp("delivered_at"),
  openedAt:       timestamp("opened_at"),
  clickedAt:      timestamp("clicked_at"),
  replied:        boolean("replied").notNull().default(false),
  failed:         boolean("failed").notNull().default(false),
  failureReason:  text("failure_reason"),
  createdAt:      timestamp("created_at").notNull().defaultNow(),
});

// ── Chatbot Flows ─────────────────────────────────────────────────────────────

export const flowTriggerEnum = pgEnum("flow_trigger", ["greeting","keyword","order","inquiry","fallback"]);

export const chatbotFlows = pgTable("chatbot_flows", {
  id:           uuid("id").primaryKey().defaultRandom(),
  userId:       uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name:         text("name").notNull(),
  trigger:      flowTriggerEnum("trigger").notNull().default("greeting"),
  triggerValue: text("trigger_value"),
  platform:     text("platform").notNull().default("whatsapp"),
  steps:        text("steps").notNull().default("[]"),
  active:       boolean("active").notNull().default(false),
  triggerCount: integer("trigger_count").notNull().default(0),
  createdAt:    timestamp("created_at").notNull().defaultNow(),
});

// ── Team Members & Internal Notes ─────────────────────────────────────────────

export const teamRoleEnum         = pgEnum("team_role",          ["admin","agent","viewer"]);
export const teamMemberStatusEnum = pgEnum("team_member_status", ["active","invited","disabled"]);

export const teamMembers = pgTable("team_members", {
  id:              uuid("id").primaryKey().defaultRandom(),
  userId:          uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name:            text("name").notNull(),
  email:           text("email").notNull(),
  role:            teamRoleEnum("role").notNull().default("agent"),
  status:          teamMemberStatusEnum("status").notNull().default("invited"),
  inviteToken:     text("invite_token").unique(),
  inviteExpiresAt: timestamp("invite_expires_at"),
  createdAt:       timestamp("created_at").notNull().defaultNow(),
});

export const internalNotes = pgTable("internal_notes", {
  id:             uuid("id").primaryKey().defaultRandom(),
  conversationId: text("conversation_id").notNull(),
  userId:         uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  authorName:     text("author_name").notNull(),
  content:        text("content").notNull(),
  createdAt:      timestamp("created_at").notNull().defaultNow(),
});

// ── Social Listening ──────────────────────────────────────────────────────────

export const listeningKeywords = pgTable("listening_keywords", {
  id:           uuid("id").primaryKey().defaultRandom(),
  userId:       uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  keyword:      text("keyword").notNull(),
  platforms:    text("platforms").array().notNull().default(sql`'{}'::text[]`),
  active:       boolean("active").notNull().default(true),
  mentionCount: integer("mention_count").notNull().default(0),
  createdAt:    timestamp("created_at").notNull().defaultNow(),
});

// ── Listening Mentions ────────────────────────────────────────────────────────

export const listeningMentions = pgTable("listening_mentions", {
  id:         uuid("id").primaryKey().defaultRandom(),
  userId:     uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  keywordId:  uuid("keyword_id").references(() => listeningKeywords.id, { onDelete: "set null" }),
  keyword:    text("keyword").notNull(),
  platform:   text("platform").notNull(),
  username:   text("username").notNull(),
  content:    text("content").notNull(),
  url:        text("url"),
  sentiment:  text("sentiment").notNull().default("neutral"),
  handled:    boolean("handled").notNull().default(false),
  handledAt:  timestamp("handled_at"),
  timestamp:  timestamp("timestamp").notNull().defaultNow(),
}, (t) => ({
  userIdIdx: index("listening_mentions_user_id_idx").on(t.userId),
}));

// ── Brand Settings ────────────────────────────────────────────────────────────

export const brandSettings = pgTable("brand_settings", {
  id:         uuid("id").primaryKey().defaultRandom(),
  userId:     uuid("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  imageStyle: text("image_style").notNull().default(""),
  updatedAt:  timestamp("updated_at").notNull().defaultNow(),
});

// ── Post Metrics ──────────────────────────────────────────────────────────────

export const postMetrics = pgTable("post_metrics", {
  id:         uuid("id").primaryKey().defaultRandom(),
  postId:     uuid("post_id").notNull().references(() => scheduledPosts.id, { onDelete: "cascade" }),
  likes:      integer("likes").notNull().default(0),
  comments:   integer("comments").notNull().default(0),
  reach:      integer("reach").notNull().default(0),
  shares:     integer("shares").notNull().default(0),
  recordedAt: timestamp("recorded_at").notNull().defaultNow(),
});

// ── Calls ─────────────────────────────────────────────────────────────────────

export const callStatusEnum = pgEnum("call_status", [
  "initiated", "ringing", "in-progress", "completed", "failed", "busy", "no-answer", "canceled", "missed"
]);

export const calls = pgTable("calls", {
  id:           uuid("id").primaryKey().defaultRandom(),
  userId:       uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  convId:       uuid("conv_id").references(() => conversations.id, { onDelete: "set null" }),
  twilioSid:    text("twilio_sid"),
  direction:    directionEnum("direction").notNull().default("outbound"),
  toNumber:     text("to_number").notNull().default(""),
  fromNumber:   text("from_number").notNull().default(""),
  contactName:  text("contact_name").notNull().default(""),
  status:       callStatusEnum("status").notNull().default("initiated"),
  duration:     integer("duration"),
  recordingUrl: text("recording_url"),
  notes:        text("notes").notNull().default(""),
  startedAt:    timestamp("started_at").notNull().defaultNow(),
  endedAt:      timestamp("ended_at"),
  createdAt:    timestamp("created_at").notNull().defaultNow(),
});

// ── Contacts CRM ─────────────────────────────────────────────────────────────

export const contacts = pgTable("contacts", {
  id:                 uuid("id").primaryKey().defaultRandom(),
  userId:             uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name:               text("name").notNull(),
  phone:              text("phone"),
  email:              text("email"),
  handles:            text("handles").notNull().default("[]"),   // JSON: [{channel, username}]
  tags:               text("tags").notNull().default("[]"),      // JSON: string[]
  notes:              text("notes").notNull().default(""),
  totalConversations: integer("total_conversations").notNull().default(0),
  lastSeenAt:         timestamp("last_seen_at").notNull().defaultNow(),
  createdAt:          timestamp("created_at").notNull().defaultNow(),
}, (t) => ({
  userIdIdx: index("contacts_user_id_idx").on(t.userId),
}));

// ── Automation Rules ─────────────────────────────────────────────────────────

export const automationTriggerEnum = pgEnum("automation_trigger", [
  "contains_word", "is_question", "sentiment_positive", "sentiment_negative", "new_follower",
]);
export const automationActionEnum = pgEnum("automation_action", [
  "auto_send", "skip_review", "escalate", "assign_to",
]);

export const automationRules = pgTable("automation_rules", {
  id:           uuid("id").primaryKey().defaultRandom(),
  userId:       uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name:         text("name").notNull(),
  trigger:      automationTriggerEnum("trigger").notNull(),
  triggerValue: text("trigger_value"),
  action:       automationActionEnum("action").notNull(),
  actionValue:  text("action_value"),
  channels:     text("channels").notNull().default("[]"),  // JSON array of channel strings
  active:       boolean("active").notNull().default(true),
  createdAt:    timestamp("created_at").notNull().defaultNow(),
});

// ── Social Comments ───────────────────────────────────────────────────────────

// ── Flow Sessions (persisted multi-turn chatbot state) ────────────────────────

export const flowSessions = pgTable("flow_sessions", {
  id:              uuid("id").primaryKey().defaultRandom(),
  conversationId:  uuid("conversation_id").notNull().unique().references(() => conversations.id, { onDelete: "cascade" }),
  flowId:          uuid("flow_id").notNull().references(() => chatbotFlows.id, { onDelete: "cascade" }),
  userId:          uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  channel:         text("channel").notNull(),
  recipientHandle: text("recipient_handle").notNull().default(""),
  stepIndex:       integer("step_index").notNull().default(0),
  collectedValues: text("collected_values").notNull().default("{}"),
  updatedAt:       timestamp("updated_at").notNull().defaultNow(),
});

// ── Agency-wide Configuration ─────────────────────────────────────────────────

export const agencyConfig = pgTable("agency_config", {
  id:            uuid("id").primaryKey().defaultRandom(),
  agencyId:      uuid("agency_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  globalBlocked: text("global_blocked").notNull().default(""),
  updatedAt:     timestamp("updated_at").notNull().defaultNow(),
});

// ── Client Invites (one-time setup links issued by agency) ───────────────────

export const clientInvites = pgTable("client_invites", {
  id:        uuid("id").primaryKey().defaultRandom(),
  token:     text("token").notNull().unique(),
  clientId:  uuid("client_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  agencyId:  uuid("agency_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt:    timestamp("used_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => ({
  clientIdIdx: index("client_invites_client_id_idx").on(t.clientId),
}));

// ── Email Reminders (approval flow) ──────────────────────────────────────────

export const emailReminders = pgTable("email_reminders", {
  id:             uuid("id").primaryKey().defaultRandom(),
  postId:         uuid("post_id").notNull().references(() => scheduledPosts.id, { onDelete: "cascade" }),
  clientId:       uuid("client_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  reminderNumber: integer("reminder_number").notNull(), // 1 | 2 | 3
  sentAt:         timestamp("sent_at").notNull().defaultNow(),
  emailAddress:   text("email_address").notNull(),
});

export const comments = pgTable("comments", {
  id:                uuid("id").primaryKey().defaultRandom(),
  userId:            uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  platform:          platformEnum("platform").notNull(),
  username:          text("username").notNull().default(""),
  text:              text("text").notNull().default(""),
  aiReply:           text("ai_reply").notNull().default(""),
  aiConfidence:      integer("ai_confidence"),
  status:            replyStatusEnum("status").notNull().default("pending"),
  // ID of the comment on the social platform — required for API reply delivery
  platformCommentId: text("platform_comment_id"),
  // For TikTok: the video ID that contains this comment
  platformVideoId:   text("platform_video_id"),
  timestamp:         timestamp("timestamp").notNull().defaultNow(),
  createdAt:         timestamp("created_at").notNull().defaultNow(),
}, (t) => ({
  userIdIdx: index("comments_user_id_idx").on(t.userId),
}));
