# SocialPilot — Complete Platform Documentation

> **Version:** Post Phase-3 Fixes · **Date:** May 2026  
> **Audience:** Business owners, agency managers, onboarding staff — no technical knowledge required.

---

## Table of Contents

1. [Platform Overview](#1-platform-overview)
2. [User Roles & Permissions](#2-user-roles--permissions)
3. [Complete Feature List](#3-complete-feature-list)
4. [The AI Engine](#4-the-ai-engine)
5. [End-to-End Workflows](#5-end-to-end-workflows)
6. [Data Architecture](#6-data-architecture-in-plain-language)
7. [Integrations Map](#7-integrations-map)
8. [Current Platform Status](#8-current-platform-status)
9. [Setup Checklist](#9-setup-checklist)
10. [Glossary](#10-glossary-english--arabic)

---

## 1. Platform Overview

### What Problem SocialPilot Solves

Every restaurant, shop, or service business today receives dozens — sometimes hundreds — of messages, comments, and mentions every day across TikTok, Instagram, Facebook, WhatsApp, and SMS. Answering all of them manually is slow, inconsistent, and exhausting. Leaving them unanswered costs sales and damages your reputation.

SocialPilot solves this by putting an AI assistant in the middle. When a customer sends a message or leaves a comment, the AI reads it, consults your business information (menu, hours, prices, offers), and writes a smart, on-brand reply in seconds. Staff review the reply and approve it with one click — or the system sends it automatically when the AI is confident enough. Nothing falls through the cracks.

### Who It Is For

SocialPilot is designed for two types of users:

- **Business Owners (Clients):** Restaurants, salons, clinics, gyms, retail shops, or any business that talks to customers on social media. They use SocialPilot to manage their own platforms.

- **Social Media Agencies:** Companies that manage social media for multiple business clients. An agency gets a single dashboard to oversee all their clients, assign team members, and see performance across every account at once.

### The Core Concept

Every time a customer contacts your business on any platform, SocialPilot catches the message, generates an AI reply using everything it knows about your business, grades its own confidence, and either sends the reply automatically (if it is very confident) or puts it in a review queue for your team. Your team sees the suggested reply, can edit it if needed, and clicks Approve. The system tracks every reply, every conversation, and every campaign so you can see exactly how well your social media is performing — all in one place.

### Technology Stack (in Plain Terms)

| What You See | What Powers It |
|---|---|
| The website/app you use | React — a modern web application framework |
| Buttons, animations, menus | Tailwind CSS + Framer Motion |
| Data loading and caching | TanStack Query (keeps pages fast and up to date) |
| The server that stores your data | Hono + Node.js (a fast web server) |
| The database | PostgreSQL (reliable, industry-standard database) |
| The AI that writes replies | Claude AI by Anthropic (claude-haiku-4-5-20251001) |
| Image generation for posts | DALL-E 3 by OpenAI (with Unsplash stock photo fallback) |
| WhatsApp messages | WhatsApp Business Cloud API (Meta) |
| SMS messages | Twilio Messaging API |
| Phone calls | Twilio Voice API (with inline TwiML) |
| Instagram & Facebook | Meta Graph API v19.0 |
| TikTok | TikTok Open API v2 |
| Team invite emails | Resend API (with console-log fallback) |
| Credential security | AES-256-GCM encryption at rest |

---

## 2. User Roles & Permissions

SocialPilot has four distinct roles. Each role controls what a person can see and do inside the platform.

---

### Role 1 — Agency Admin

**Who they are:** The owner or senior manager of a social media agency.

| Category | Details |
|---|---|
| **Can see** | All client accounts, agency-wide analytics, all client platforms and settings, billing overview |
| **Can do** | Create and manage client accounts, grant/revoke platform permissions, set platform credentials (API tokens) for clients, view and export all client analytics, pause or activate client accounts |
| **Cannot do** | Access individual client inboxes directly (must switch into a client account), bypass their own agency's subscription limits |

---

### Role 2 — Client Admin (Business Owner)

**Who they are:** The owner of a restaurant, shop, or service business using SocialPilot.

| Category | Details |
|---|---|
| **Can see** | Their own dashboard, inbox, comments, contacts, content calendar, campaigns, knowledge base, templates, flows, team, listening feed, analytics, settings |
| **Can do** | Everything on the platform for their own business — create content, manage team members, change AI settings, add/remove products and offers to the knowledge base, run campaigns, configure chatbot flows |
| **Cannot do** | See other clients' data, access agency management screens |

---

### Role 3 — Agent (Team Member)

**Who they are:** A staff member or social media assistant added by the business owner.

| Category | Details |
|---|---|
| **Can see** | Inbox, comments, contacts, analytics, flows, templates, listening feed |
| **Can do** | Generate AI replies, approve/reject/edit replies, mark conversations as resolved, add internal notes, handle brand mentions |
| **Cannot do** | Change AI settings, manage team members (add/remove/promote), manage platform credentials, change knowledge base content, send bulk campaigns |

---

### Role 4 — Viewer (Read-Only Team Member)

**Who they are:** A stakeholder, auditor, or trainee who needs to observe but not act.

| Category | Details |
|---|---|
| **Can see** | Inbox, comments, contacts, analytics, listening feed |
| **Can do** | Browse conversations, read messages, view reports |
| **Cannot do** | Generate replies, approve or send any message, edit anything, manage any data |

---

### Permissions Summary Table

| Action | Agency Admin | Client Admin | Agent | Viewer |
|---|---|---|---|---|
| View conversations | ✅ | ✅ | ✅ | ✅ |
| Generate AI replies | ✅ | ✅ | ✅ | ❌ |
| Approve / send replies | ✅ | ✅ | ✅ | ❌ |
| Manage team members | ✅ | ✅ | ❌ | ❌ |
| Change AI tone settings | ✅ | ✅ | ❌ | ❌ |
| Edit knowledge base | ✅ | ✅ | ❌ | ❌ |
| Run campaigns | ✅ | ✅ | ❌ | ❌ |
| Manage automation rules | ✅ | ✅ | ❌ | ❌ |
| View analytics | ✅ | ✅ | ✅ | ✅ |
| Manage client accounts | ✅ | ❌ | ❌ | ❌ |

---

## 3. Complete Feature List

---

### Page 1 — Dashboard
**URL:** `/dashboard`  
**Purpose:** Shows a real-time snapshot of your business's social media health at a glance.

**Features:**
- **Total Replies** counter — how many AI replies have been generated this period
- **Pending Review** counter — replies waiting for a human to approve
- **Average Response Time** — how fast your team processes messages
- **Engagement Rate** — percentage of conversations that received a reply
- **Platform Cards** — one card per connected platform (TikTok, Instagram, Facebook, WhatsApp) showing:
  - Connection status (connected / not connected)
  - Comments enabled or disabled
  - Messages enabled or disabled
  - Number of replies and pending items per platform
- Live data refreshes automatically when the page is open

**Reads from:** Conversations table, messages table, platformCredentials table  
**Writes to:** Nothing (read-only summary page)  
**Connects to:** Inbox (clicking pending takes you there), Settings (connecting a platform)

---

### Page 2 — Inbox
**URL:** `/inbox`  
**Purpose:** The main command center for managing all direct messages across every platform.

**Features:**
- **Conversation list** (left panel) — all DM threads sorted by most recent, with unread badges
- **Platform filter** — filter by TikTok DM, Instagram DM, Facebook Messenger, WhatsApp, SMS
- **Status filter** — Open, Pending (awaiting AI reply), Resolved, Closed
- **Search bar** — find conversations by contact name or message content
- **Priority tags** — conversations marked Urgent, Normal, or Low
- **Assigned-to labels** — shows which team member a conversation is assigned to
- **Conversation tags** — e.g., "complaint", "order-inquiry", "vip"
- **Message thread** (right panel) — full conversation history with timestamps, read receipts, media
- **Generate AI Reply button** — one click generates a Claude AI reply using your Knowledge Base
- **Reply confidence badge** — shows AI confidence score (0–100%)
- **Confidence tier label** — Auto-sent, Pending Review, or Escalated
- **Approve / Reject / Edit buttons** — review pending replies before they go out
- **Send Reply field** — type and send manual replies directly
- **Reply Templates** — browse and insert saved templates into the reply field
- **Mark Resolved / Reopen** — change conversation status
- **Assign Conversation** — assign to a specific team member
- **Internal Notes tab** — leave private team notes visible only to staff, not the customer
- **Phone Call button** — initiate a Twilio phone call from a conversation (phone channel only)
- **Contact Profile panel** — shows contact name, handles, tags, conversation history count

**Reads from:** Conversations, messages, contacts, teamMembers, internalNotes, replyTemplates, toneSettings, resources  
**Writes to:** Messages (new outbound), conversations (status, assignedTo), internalNotes  
**Connects to:** Contacts (contact profile), Templates (inserting templates), Phone (call button)

---

### Page 3 — Comments
**URL:** `/comments`  
**Purpose:** Manages public comments on TikTok videos, Instagram posts, and Facebook posts.

**Features:**
- **Comments feed** — all inbound public comments in chronological order
- **Platform filter** — TikTok, Instagram, Facebook
- **Status filter** — Pending, Approved, Rejected, Auto-sent, Escalated
- **Sentiment indicator** — positive / neutral / negative badge on each comment
- **AI Reply suggestion** — displayed inline below each comment
- **Confidence score badge** — numeric confidence for each AI reply
- **Approve / Reject / Edit** — one-click actions per comment
- **Generate Reply button** — re-generates a new AI reply for any comment
- **Bulk actions** — approve or reject multiple comments at once
- **Comment timestamp and platform logo** — easy visual identification

**Reads from:** Comments table, toneSettings, resources (for AI context)  
**Writes to:** Comments (aiReply, status), outbound delivery to the platform  
**Connects to:** Settings (tone affects reply style), Knowledge Base (powers AI replies)

---

### Page 4 — Phone
**URL:** `/phone`  
**Purpose:** View call history and initiate outbound phone calls to customers.

**Features:**
- **Call log list** — all incoming and outgoing calls with date, duration, status
- **Call status badges** — Completed, Missed, Failed, In-progress, Busy, No Answer
- **Direction icons** — inbound vs. outbound call indicator
- **Contact name** — displays the contact name associated with the call
- **Duration display** — call duration in minutes:seconds
- **Recording link** — click to play call recording (if recording is enabled in Twilio)
- **Call Notes field** — add or edit notes about a call after it ends
- **Make Call button** — enter a phone number to initiate a new outbound call
- **Link to Conversation** — each call can be linked to a Conversation in the Inbox
- **Twilio status sync** — call status updates automatically via the `/api/calls/webhook/status` callback as the call progresses

**Reads from:** Calls table, conversations  
**Writes to:** Calls (notes, status), conversations (system message when call is initiated)  
**Connects to:** Inbox (linked conversations), Contacts

---

### Page 5 — Content Scheduler
**URL:** `/content`  
**Purpose:** Plan, create, and schedule social media posts across all platforms.

**Features:**
- **Calendar view** — visual calendar showing all scheduled posts by date
- **Post card view** — list of all posts (draft, scheduled, published, failed) with thumbnails
- **Create Post button** — opens the post creation form
- **Multi-platform selection** — choose TikTok, Instagram, Facebook simultaneously for one post
- **Caption editor** — write your post caption with character counter per platform
- **Image/video upload** — attach media to the post
- **AI Generate Caption button** — Claude AI writes a caption based on your prompt using the Knowledge Base
- **AI Generate Image button** — DALL-E 3 creates a custom image (falls back to Unsplash stock photo if `OPENAI_API_KEY` is not set)
- **Hashtag suggestions** — AI generates 3–5 relevant hashtags automatically
- **Schedule Date/Time picker** — choose exact date and time for publishing
- **Platform-specific brand style** — uses your brand image style settings for AI image generation
- **Edit / Delete draft posts** — modify or remove any post before it publishes
- **Post Status tracking** — Draft → Scheduled → Published / Failed
- **Performance Metrics tab** — after publishing, shows likes, comments, reach, shares per post

**Publishing behavior by platform:**
- **Instagram** — real two-step Graph API publish (media container → media_publish). Requires a publishing credential with your Instagram Business Account ID.
- **Facebook** — real Graph API publish to your Page feed or photos endpoint. Requires a publishing credential; Page ID auto-discovered via `GET /me/accounts` if not stored.
- **TikTok** — currently skipped; TikTok's Content Posting API requires separate business app approval from TikTok. Posts are marked published in the database but not delivered to TikTok.
- **WhatsApp** — content posting is not applicable; use Campaigns for WhatsApp broadcasts.

**Reads from:** ScheduledPosts, postMetrics, resources (for AI caption context), brandSettings (for image style)  
**Writes to:** ScheduledPosts, postMetrics (automatically after publishing)  
**Connects to:** Knowledge Base (AI uses your business info), Brand (image style), Analytics (post performance)

---

### Page 6 — Campaigns
**URL:** `/campaigns`  
**Purpose:** Send WhatsApp broadcast messages to your customer list by audience segment.

**Features:**
- **Campaign list** — all past and future campaigns with status (Draft, Scheduled, Sending, Sent, Failed)
- **Create Campaign button** — opens the campaign creation dialog
- **Campaign name** — descriptive name for the campaign
- **Message editor** — write the broadcast message
- **Media attachment** — attach an image or video to the campaign message
- **Audience selector** — choose All Contacts, By Tag (e.g., "vip"), or By Platform
- **Live audience size preview** — shows estimated reach based on real contact counts in the database
- **Tag count display** — e.g., "VIP: 120 contacts"
- **Platform count display** — e.g., "WhatsApp: 456 contacts"
- **Schedule date/time** — set when the campaign goes out
- **Send Now** — immediately dispatch the campaign
- **Campaign results** — after sending: Sent count, Read count, Reply count
- **Read rate & reply rate** — percentage metrics for each campaign
- **Edit / Delete draft campaigns** — modify before sending

**Real WhatsApp delivery:** When the campaign platform is WhatsApp and contacts with WhatsApp handles exist, the system sends real messages via the WhatsApp Business API. It probes the first recipient to verify credentials; if credentials are missing, it falls back to plausible mock counts so the UI still shows results.

**Reads from:** Campaigns, contacts (for audience reach calculation)  
**Writes to:** Campaigns (creates, updates, records sent/read/reply counts)  
**Connects to:** Contacts (audience comes from here), Inbox (campaign replies land here), Analytics

---

### Page 7 — Contacts
**URL:** `/contacts`  
**Purpose:** Your customer CRM — a profile card for every person who has ever contacted you.

**Features:**
- **Contact list** — all contacts sorted by most recent activity, with names and platform handles
- **Search bar** — find contacts by name, phone number, email, or platform handle
- **Filter by Tag** — filter the list by tags like "vip", "complaint", "regular"
- **Filter by Platform** — show only contacts from Instagram, WhatsApp, etc.
- **Contact profile card** — clicking a contact shows their full profile:
  - Name, phone number, email address
  - All platform handles (e.g., @jessica_nc on Instagram, +1234 on WhatsApp)
  - Tags (editable)
  - Internal notes
  - Total number of conversations
  - Last seen date
- **Edit Contact** — update name, phone, email, tags, and notes
- **Delete Contact** — remove from CRM
- **Auto-created contacts** — the system automatically creates a contact record when a new customer messages you (no manual entry needed)
- **Campaign audience** — contacts are the source for campaign targeting

**Reads from:** Contacts table  
**Writes to:** Contacts (name, phone, email, tags, notes)  
**Connects to:** Campaigns (audience), Inbox (conversation links), Phone (call contacts)

---

### Page 8 — Knowledge Base (Resources)
**URL:** `/resources`  
**Purpose:** Store all your business information so the AI always has accurate, up-to-date answers.

**Features:**
- **Business Info card** — name, description, address, phone, email, website
- **Operating Hours card** — day-by-day schedule (open/closed, from–to time per day)
- **Menu Items** — add each product or dish with name, description, and price
- **Offers & Promotions** — add limited-time deals with title, description, and expiry
- **FAQs** — add common questions with their answers (the AI learns from these)
- **Documents** — upload PDFs or files (e.g., catering menu, allergen list). Files are saved to the server's `/uploads` folder and served at `/uploads/<filename>`. In production, consider moving to S3 or Cloudflare R2.
- **Active/Inactive toggle** — temporarily disable any resource without deleting it
- **Add / Edit / Delete** — full management of every resource type
- **AI uses all active resources** — every reply and content generation call reads from here automatically

**Reads from:** Resources table  
**Writes to:** Resources (creates, updates, deletes entries)  
**Connects to:** Every AI feature (Inbox reply generation, Comments, Content, Templates, Listening replies all use this data)

---

### Page 9 — Templates
**URL:** `/templates`  
**Purpose:** Save and reuse your best replies so team members don't have to write from scratch.

**Features:**
- **Template list** — all saved reply templates with title, category, and usage count
- **Platform filter** — show templates by platform (Instagram, TikTok, etc.)
- **Language filter** — Arabic, English, or mixed
- **Category labels** — e.g., "greeting", "complaint", "order-inquiry", "gratitude"
- **Usage counter** — how many times each template has been used
- **Create Template button** — write a template manually
- **AI Generate Template button** — describe what you need, AI writes the template for you
- **Variable support** — use `{{name}}` in the template to insert the customer's name automatically
- **Active / Inactive toggle** — hide templates without deleting
- **Edit / Delete** — full management
- **Use in Inbox** — templates appear in the Inbox reply picker for quick insertion

**Reads from:** ReplyTemplates table, resources (for AI generation)  
**Writes to:** ReplyTemplates (creates, updates, increments usedCount)  
**Connects to:** Inbox (templates used here), Comments (templates used here), Knowledge Base (AI generation uses resources)

---

### Page 10 — Flows (Chatbot)
**URL:** `/flows`  
**Purpose:** Create automated conversation scripts that activate when a customer sends a specific word or phrase.

**Features:**
- **Flow list** — all chatbot flows with trigger, platform, active/inactive status, and trigger count
- **Create Flow button** — opens the flow builder
- **Flow name** — descriptive label for the flow
- **Trigger type selector:**
  - **Greeting** — activates when a customer says hello/hi/hey (also matches Arabic: مرحبا, أهلا, سلام, صباح, مساء)
  - **Keyword** — activates when a specific word or phrase is detected
  - **Order** — activates on order-related messages (order, buy, book, reserve + Arabic equivalents)
  - **Inquiry** — activates on general questions (contains ? or common question words in English/Arabic)
  - **Fallback** — activates when no other flow matches
- **Trigger value** — the keyword(s) to listen for (comma-separated)
- **Platform** — which platform this flow runs on (WhatsApp, Instagram, etc.)
- **Steps editor** — define the sequence of messages the bot sends. Available step types: `message`, `quick_replies`, `collect_input`, `condition`, `handoff`
- **Active / Inactive toggle** — pause a flow without deleting it
- **Trigger count** — how many times this flow has been activated
- **Edit / Delete flows** — full management
- **Multi-turn support** — flows can ask questions (`collect_input` step) and wait for the customer's answer. Flow progress is persisted to the `flowSessions` database table — the flow continues correctly even if the server restarts.

**Reads from:** ChatbotFlows table, flowSessions table  
**Writes to:** ChatbotFlows (creates, updates), flowSessions (tracks active conversation step), messages (sends automated replies during flow execution)  
**Connects to:** Inbox (conversation appears in inbox when flow completes or hands off), Webhooks (flow triggered by incoming message)

---

### Page 11 — Listening
**URL:** `/listening`  
**Purpose:** Monitor every mention of your brand or keywords across all social platforms and respond quickly.

**Features:**
- **Keyword list** — all monitored brand keywords
- **Add Keyword form** — enter a keyword and select which platforms to monitor
- **Platform selector** per keyword — Instagram, TikTok, Facebook, Twitter
- **Active / Inactive toggle** — pause monitoring of a keyword
- **Mention count badge** — how many mentions recorded for each keyword
- **Edit / Delete keywords** — manage your monitoring list
- **Mentions feed** — list of all detected mentions, newest first:
  - Platform logo + username
  - Full mention text
  - Sentiment badge (Positive / Neutral / Negative)
  - Date and time
  - Link to original post (if available)
- **Filter by status** — All Mentions / Not Handled / Handled
- **Sentiment filter** — All / Positive / Negative / Neutral
- **AI Generate Reply button** — one click suggests a reply to the mention using Claude AI + your Knowledge Base
- **Mark as Handled button** — marks a mention as resolved (persisted to database)
- **Unmark Handled** — undo the handled mark
- **Handled count badge** — summary of how many mentions have been addressed

**How mentions are detected:**
- **Real-time (primary):** Every inbound message received via any platform webhook is automatically scanned against your active keywords. If the message text contains a keyword, a mention record is created immediately with basic sentiment detection (positive/negative/neutral via keyword regex).
- **Demo seed (fallback):** If no mentions exist yet, 10 realistic sample mentions are seeded to the database on first page load so the feed is never empty. These are replaced by real detections as traffic arrives.

**Reads from:** ListeningKeywords, listeningMentions  
**Writes to:** ListeningKeywords (create/edit), listeningMentions (real-time inserts from webhooks + handled status)  
**Connects to:** Knowledge Base (AI reply uses your business info), Analytics

---

### Page 12 — Analytics
**URL:** `/analytics`  
**Purpose:** See exactly how your social media performance is trending over time.

**Features:**
- **Date range switcher** — 7 Days / 30 Days / 90 Days (changes all data on the page)
- **Overview tab:**
  - Total Messages handled in the period
  - Auto-sent Rate (% of replies sent automatically by AI)
  - Total Auto-sent count
  - Total Manual replies count
  - Total Escalated count
  - Pending Conversations
  - Resolved Conversations
  - Bar chart — day-by-day (7d), week-by-week (30d), or month-by-month (90d) breakdown of Auto-sent / Manual / Escalated
- **Inbox tab:**
  - Reply volume chart by time period
  - Channel breakdown — which platforms are most active (WhatsApp, Instagram DM, Facebook Messenger, TikTok, SMS, etc.)
  - Escalation trend
- **Content tab:**
  - Published posts count
  - Engagement metrics (likes, comments, reach, shares) — simulated based on platform averages
  - Best-performing post
- **Listening tab:**
  - Mentions detected
  - Handled vs. unhandled rate
  - Sentiment distribution chart
- **Campaigns tab:**
  - Messages sent by all campaigns
  - Read rate and reply rate averages
  - Individual campaign performance comparison

**Reads from:** Messages, conversations, scheduledPosts, postMetrics, campaigns, listeningMentions  
**Writes to:** Nothing (read-only reporting page)  
**Connects to:** All operational pages (each feeds data into analytics)

---

### Page 13 — Team
**URL:** `/team`  
**Purpose:** Manage who has access to your SocialPilot account and what they can do.

**Features:**
- **Team members list** — name, email, role, status (Invited / Active / Disabled)
- **Invite Team Member form** — name, email, and role selection (Admin / Agent / Viewer)
- **Role selector** — Admin, Agent, or Viewer
- **Status badges** — "Invited" (sent but not logged in), "Active" (logged in), "Disabled"
- **Edit Member** — change name, email, or role
- **Delete Member** — remove access permanently
- **Invite email** — when a new member is added, SocialPilot automatically emails them via Resend with their member UUID and a login link. If `RESEND_API_KEY` is not set, invite details are printed to the server console so you can share them manually.
- **Team login** — members log in at `/login` using their unique member UUID (sent in the invite email)
- **Role enforcement** — the platform automatically restricts what each role can do on every backend route

**Reads from:** TeamMembers table  
**Writes to:** TeamMembers (creates, updates, deletes)  
**Connects to:** Inbox (assignedTo field uses team member names), Settings (admin-only), Automation Rules

---

### Page 14 — Settings
**URL:** `/settings`  
**Purpose:** Configure how the AI behaves for each platform.

Settings are organized into **5 tabs**, one per platform:

**Tabs:** TikTok · Instagram · Facebook · WhatsApp · SMS

**Each tab contains:**
- **Tone selector** — Friendly / Professional / Fun / Informative
- **Language selector** — Arabic only / English only / Arabic + English (mixed)
- **Blocked Words field** — comma-separated words the AI must never use in replies
- **Custom Instructions field** — free-text box for special AI instructions, e.g., "Always mention our delivery zone", "Never discuss competitor prices"
- **Save button** — saves settings for that platform only
- **Platform-specific defaults** — settings are independent per platform (you can be "Friendly in English" on Instagram and "Professional in Arabic" on WhatsApp)

**Admin-only:** Only Client Admins and Agency Admins can change settings. Agents and Viewers cannot.

**Reads from:** ToneSettings table  
**Writes to:** ToneSettings (one row per platform per user)  
**Connects to:** Every AI reply (settings are read before every Claude API call)

---

### Page 15 — Automation
**URL:** `/automation`  
**Purpose:** Create rules that automatically control what happens to a reply based on message content.

**Features:**
- **Rules list** — all active and inactive automation rules
- **Add Rule form:**
  - Rule name
  - Trigger type: Contains Word / Is a Question / Positive Sentiment / Negative Sentiment / New Follower
  - Trigger value (e.g., the specific words for "Contains Word" trigger)
  - Channel filter (which platforms/channels the rule applies to — leave empty for all)
  - Action: Auto-Send / Skip Review / Escalate / Assign To
  - Action value (e.g., team member name for "Assign To")
- **Active / Inactive toggle** — disable a rule without deleting it
- **Edit / Delete rules**

**How rules work:**
- Rules run **after** the AI generates a reply and override the confidence tier
- Rules are evaluated in creation order — the first matching rule wins
- Sentiment detection uses keyword matching (a built-in set of positive/negative words in English and Arabic)
- The `New Follower` trigger never matches text-based messages (it is reserved for future event-based webhooks)
- `Auto-Send` and `Skip Review` both result in the reply being sent immediately (treated identically)

**Reads from:** AutomationRules table  
**Writes to:** AutomationRules (creates, updates, deletes), messages (replyStatus is overridden)  
**Connects to:** Inbox (rules run every time a reply is generated), Settings (rules layer on top of tone settings)

---

### Agency Pages

---

### Page 16 — Agency Dashboard
**URL:** `/agency/dashboard`  
**Purpose:** Aggregate performance view for the entire agency across all managed clients.

**Features:**
- Total replies across all clients combined
- Auto-sent rate across all clients
- Active client count
- Average replies per client
- Weekly reply volume bar chart (agency-wide)
- Client cards — each client shows their name, status, platform count, and reply volume

**Reads from:** Clients, messages (aggregated by agencyId)  
**Writes to:** Nothing  
**Connects to:** Agency Clients page

---

### Page 17 — Agency Clients
**URL:** `/agency/clients`  
**Purpose:** Manage all client accounts from one place.

**Features:**
- **Client list** — all managed clients with name, status (Active / Paused / Setup), reply count
- **Add Client button** — create a new client account
- **Client status management** — Activate, Pause, or put in Setup mode
- **Platform permissions panel** — for each client, toggle which platforms and features are enabled (Comments, Messages per platform)
- **Platform credentials panel** — input or revoke API access tokens for each client's platforms. For Instagram and Facebook publishing, also provide the Account ID (Instagram Business Account ID or Facebook Page ID).
- **Switch to Client** — impersonate a client to manage their account directly (uses `x-client-id` header internally)
- **View per-client analytics**

**Reads from:** AgencyClients, users (client records), platformCredentials, platformPermissions  
**Writes to:** AgencyClients (status), platformPermissions (feature toggles), platformCredentials (tokens)  
**Connects to:** Agency Dashboard, Agency Analytics

---

### Page 18 — Agency Analytics
**URL:** `/agency/analytics`  
**Purpose:** View performance metrics across the agency's entire client portfolio.

**Features:**
- Same metrics as the client Analytics page but aggregated across all clients
- Filter by individual client
- Compare clients side by side

**Reads from:** Messages, campaigns, conversations (filtered by agencyId)  
**Writes to:** Nothing  
**Connects to:** Agency Dashboard, Agency Clients

---

### Page 19 — Agency Settings
**URL:** `/agency/settings`  
**Purpose:** Configure agency-level defaults and account information.

**Features:**
- Agency name and profile
- Default AI tone settings for new clients
- Billing overview (future feature)
- API configuration

**Reads from:** Users (agency record), toneSettings  
**Writes to:** Users, toneSettings  
**Connects to:** Agency Dashboard

---

## 4. The AI Engine

### How the AI Generates Replies

When a customer sends a message and a staff member clicks "Generate AI Reply," this is the exact sequence of events behind the scenes:

**Step 1 — Read the Conversation**  
The system retrieves the full conversation history (up to the last 6 messages) so the AI understands the context. It knows what was said before, not just the latest message.

**Step 2 — Load Business Knowledge**  
The AI reads every active entry in your Knowledge Base:
- Your business name, description, address, phone, email
- Your opening hours for every day of the week
- Every menu item or product with its name, description, and price
- All current offers and promotions
- All FAQs
- Up to 8 of your most-used reply templates for that platform (truncated to 200 characters each as examples)

**Step 3 — Read Your Settings**  
The AI reads your tone setting for that platform (Friendly / Professional / Fun / Informative), your preferred language (Arabic / English / Mixed), your blocked words list, and any custom instructions you've written.

**Step 4 — Build a Smart Prompt**  
The system builds a detailed instruction for Claude AI that includes:
- The platform (e.g., "You are replying on WhatsApp")
- The conversation type (public comment vs. private message — different tone for each)
- The priority level (urgent conversations get instructions to prioritize fast resolution)
- The conversation tags (a "complaint" tag tells the AI to be empathetic and apologetic; an "order" tag tells it to be helpful and informative)
- Everything from the Knowledge Base
- The blocked words
- Custom instructions

**Step 5 — Ask Claude AI**  
The complete conversation history and system instructions are sent to Claude AI (`claude-haiku-4-5-20251001`). The AI is instructed to return **only valid JSON** with two fields:

```json
{ "reply": "your reply text here", "confidence": 88 }
```

If the JSON cannot be parsed, the system falls back to treating the full response as the reply text with a default confidence of 55 (placing it in Pending Review).

**Step 6 — Apply the 3-Tier Routing System**  
The confidence score determines what happens next. Automation Rules are then checked and can override the tier.

---

### The 3-Tier Confidence System

| Tier | Score Range | Label | What Happens |
|---|---|---|---|
| **Tier 1 — High Confidence** | 85–100 | `auto_sent` | Reply is sent to the customer immediately. No human review needed. |
| **Tier 2 — Medium Confidence** | 50–84 | `pending` | Reply is placed in the review queue. A staff member sees it, can edit it, and clicks Approve. |
| **Tier 3 — Low Confidence** | 0–49 | `escalated` | Reply is flagged for urgent human attention. Staff must handle this manually. |

**Example — Tier 1 (Auto-Sent):**  
Customer: "What time do you close today?"  
AI knows your hours from the Knowledge Base. Confidence: 92%.  
Reply sent automatically: "We're open until 9 PM tonight! 😊"

**Example — Tier 2 (Pending Review):**  
Customer: "I placed an order 2 hours ago and still nothing."  
AI generates a reply but is uncertain about delivery policy specifics. Confidence: 67%.  
Reply placed in queue: "We're so sorry for the wait! Let me check on your order right away. Could you share your order number?"  
Staff reviews and approves (or edits if needed).

**Example — Tier 3 (Escalated):**  
Customer: "This is the third time you've messed up my order and I want a full refund and I'm going to leave a bad review."  
Complex complaint involving refund and reputation management. Confidence: 31%.  
Flagged for human escalation. Staff must respond personally.

---

### How Automation Rules Override Confidence

Sometimes you want different routing regardless of the AI's confidence. Automation Rules let you override the tier system with your own business logic.

**Example 1:** You want any message containing the word "refund" or "cancel" to always be escalated to a senior staff member, no matter what the AI says.  
→ Create a rule: Trigger = "Contains Word: refund, cancel" / Action = "Escalate"

**Example 2:** You want all question-type messages on WhatsApp to be auto-sent because your knowledge base is complete.  
→ Create a rule: Trigger = "Is a Question" / Channel = "WhatsApp" / Action = "Auto-Send"

**Example 3:** Any message with negative sentiment should be assigned to your complaints handler.  
→ Create a rule: Trigger = "Negative Sentiment" / Action = "Assign To: Sarah"

Rules are checked **after** the AI generates a reply and override the confidence tier. The AI still writes the reply — the rule only changes what happens to it. Rules run in creation order; the first match wins.

---

### How Flows Bypass the AI Entirely

Chatbot Flows are a completely different path from AI replies. When a customer's message matches a Flow trigger, the system runs the scripted Flow instead of calling Claude AI.

**Example:** A customer sends "hi" on WhatsApp. You have a Greeting Flow that:
1. Sends: "Welcome to Raleigh Eats! 👋 How can we help you today? Reply with: 1 for Menu · 2 for Hours · 3 for Delivery"
2. Waits for the customer's reply (tracked in the database via `flowSessions`)
3. Based on their answer, continues the next step of the flow

The customer's current position in the flow is saved to the `flowSessions` database table. This means even if the server restarts, the flow resumes correctly from where it left off.

This is useful for standard, predictable interactions where you want speed and consistency over intelligence.

---

### What Makes AI Replies Accurate vs. Generic

The difference between a useful AI reply and a generic one comes down to what is in your Knowledge Base.

| Knowledge Base Status | AI Reply Quality |
|---|---|
| Empty knowledge base | Generic: "Thank you for your message! We'll get back to you shortly." |
| Business info only | Basic: "Thanks for reaching out! We're located at 123 Main St." |
| Full knowledge base (hours + menu + offers + FAQs) | Specific: "Our Deluxe Burger is $14.99 — a customer favorite! 🍔 We're open until 9 PM today. Dine-in or delivery available at raleighats.com" |

**The more you put in the Knowledge Base, the smarter the AI becomes.** The AI can only tell customers what you've told it. It will never guess, make up prices, or invent hours.

---

## 5. End-to-End Workflows

---

### Workflow 1 — Inbound Direct Message (Full Journey)

1. **Customer sends DM** — A customer sends "Do you deliver to downtown?" on WhatsApp.
2. **Webhook receives it** — WhatsApp Business API sends the message to SocialPilot's webhook endpoint (`/webhook/whatsapp/:userId`).
3. **Signature verified** — HMAC-SHA256 signature checked against `META_APP_SECRET`. Invalid signatures are rejected with 401.
4. **Contact sync** — The system checks if this phone number already exists in Contacts. If not, it creates a new contact record automatically. If yes, it increments their conversation count.
5. **Keyword scan** — The message text is compared against all active listening keywords (fire-and-forget). Any matches are inserted into `listeningMentions` immediately.
6. **Conversation check** — The system finds or creates the conversation thread for this customer.
7. **Flow check** — The system checks `flowSessions` (active mid-flow) and all active flow triggers. If the message triggers a flow, the flow runs and the AI is skipped.
8. **Message stored** — The inbound message is saved to the messages table with direction = "inbound".
9. **AI reply generated** — (Triggered manually by staff) The system calls Claude AI with the full conversation history, knowledge base, tone settings, and custom instructions.
10. **Confidence scored** — Claude returns `{ reply, confidence }` as JSON (e.g., 88%).
11. **Automation rules checked** — All active rules evaluated in order; first match overrides the tier.
12. **Tier routing applied** — 88% confidence = Tier 1 = `auto_sent` (or overridden by rule).
13. **Reply delivered** — The system calls the WhatsApp Business API and sends the reply.
14. **Conversation updated** — `lastMessage`, `lastMessageAt` updated. Unread count resets.
15. **Analytics updated** — Message counted as "auto_sent" in today's bucket.
16. **Staff sees it** — Inbox shows the conversation with a green "Auto-sent" badge.

---

### Workflow 2 — Public Comment

1. **Customer comments on TikTok video** — "What's the price of the combo meal?"
2. **Webhook receives it** — TikTok Open API sends the comment to SocialPilot's webhook.
3. **Comment stored** — Saved to the comments table with platform = "tiktok".
4. **AI reply generated** — System loads your TikTok tone settings (e.g., "Fun" tone), reads your menu from the Knowledge Base, and asks Claude AI.
5. **Confidence scored** — Claude returns: "The Combo Meal is just $12.99 and includes fries + a drink! 🔥" with 91% confidence.
6. **Auto-sent** — 91% = Tier 1 = reply posted immediately as a comment on the TikTok video.
7. **Staff notified** — The comment appears in the Comments page with status = "Auto-sent".
8. **Analytics updated** — Counted in today's auto-sent total.

---

### Workflow 3 — Chatbot Flow Activation

1. **Customer sends "Hello" on WhatsApp.**
2. **Webhook receives it** — message arrives at SocialPilot.
3. **Flow check** — No active `flowSessions` for this conversation. System checks all active flows. A "Greeting" flow is active for WhatsApp (trigger type: `greeting`, matches: hi/hello/hey + Arabic equivalents).
4. **Flow matched** — The Greeting flow activates. `triggerCount` incremented in DB.
5. **Step 1 executes** — Bot sends: "Welcome to Raleigh Eats! 👋 How can we help you today? Reply with: 1 for Menu · 2 for Hours · 3 for Delivery"
6. **Flow state saved to DB** — A `flowSessions` record is created storing: conversation ID, flow ID, step index 1, empty collected values. Server can restart without losing this state.
7. **Customer replies "2"** — Message arrives back at the webhook.
8. **Active flow detected** — Webhook queries `flowSessions` — finds this conversation at step 1 of the Greeting flow.
9. **Step 2 executes** — Bot sends: "We're open Monday–Saturday 10 AM to 9 PM and Sunday 12 PM to 7 PM. 🕙"
10. **Flow completes** — The `flowSessions` record is deleted. Conversation status set to "open".
11. **Conversation appears in Inbox** — Staff can see the full exchange and follow up if needed.

---

### Workflow 4 — Content Publishing

1. **Staff opens Content Scheduler** — Clicks "Create Post."
2. **Selects platforms** — Checks Instagram and Facebook.
3. **Enters prompt** — "Summer promotion for our new seasonal dishes — fresh and exciting."
4. **Clicks Generate Caption** — Claude AI reads the Knowledge Base and generates a caption + hashtags.
5. **Staff clicks Generate Image** — DALL-E 3 generates an image based on the brand style guide (Unsplash fallback if no OpenAI key).
6. **Staff schedules it** — Sets date and time for next Tuesday at 11 AM.
7. **Post saved** — Status = "Scheduled."
8. **Scheduler checks every 60 seconds** — At 11 AM Tuesday, finds the post due.
9. **Instagram published** — Two-step: `POST /{ig-user-id}/media` (create container) → `POST /{ig-user-id}/media_publish`. Instagram Business Account ID looked up from stored credential or via `GET /me?fields=instagram_business_account`.
10. **Facebook published** — `GET /me/accounts` discovers Page token and Page ID → `POST /{page-id}/feed` (text) or `POST /{page-id}/photos` (image).
11. **TikTok skipped** — Logged: "tiktok_content_api_requires_business_approval". Post marked published in DB.
12. **`publishedAt` recorded** — Post status updated to "published".
13. **Initial metrics captured** — Simulated engagement metrics recorded for each platform.
14. **Metrics refreshed every 6 hours** — For all posts published in the last 7 days.

---

### Workflow 5 — WhatsApp Campaign

1. **Staff opens Campaigns** — Clicks "Create Campaign."
2. **Writes the message** — "🌙 Ramadan Kareem! We're offering 20% off all orders this week. Use code RAMADAN20. Valid until Friday."
3. **Selects audience** — Chooses "By Tag" → selects "vip" tag.
4. **Live reach preview** — Shows "Estimated reach: 120 contacts" from actual contact database.
5. **Staff clicks Save** — Campaign saved as "Scheduled."
6. **Campaign dispatches** — System looks up all contacts tagged "vip" with WhatsApp handles. Probes first recipient to verify `WHATSAPP_PHONE_NUMBER_ID` + credentials exist. Sends to each via WhatsApp Business API.
7. **sentCount recorded** — Campaign shows "120 Sent."
8. **Replies arrive** — Customer replies create new webhook events → new conversation threads in the Inbox.
9. **Results visible** — Campaign card shows Sent: 120 · Read: 76 · Replies: 14 · Read Rate: 63%.
10. **Analytics updated** — Campaign data feeds into the Campaigns analytics tab.

---

### Workflow 6 — Brand Mention (Listening)

1. **Keyword is set up** — Staff added "Raleigh Eats" as a monitored keyword.
2. **Customer DM arrives via webhook** — Contains "Just tried Raleigh Eats — absolutely insane food, 10/10!"
3. **Automatic scan** — Webhook handler calls `scanForMentions()`. Text matches "Raleigh Eats". Sentiment regex detects "insane food" near positive patterns → `positive`.
4. **Mention inserted** — A `listeningMentions` row is created with the real username, platform, content, and sentiment.
5. **Staff opens Listening page** — Sees the mention with a green "Positive" badge and the real customer username.
6. **Staff clicks Generate Reply** — Claude AI reads the mention + Knowledge Base and suggests: "Thank you so much! 😍 We're thrilled you loved it — can't wait to see you again soon! ❤️"
7. **Staff approves and sends reply.**
8. **Staff marks as handled** — Clicks "Mark Handled." Handled count increments.

---

### Workflow 7 — Agency Onboarding a New Client

1. **Agency signs in** at `/agency/dashboard`.
2. **Creates client account** — Agency Clients → Add Client.
3. **Assigns platform permissions** — Enables Instagram: Comments ✅ Messages ✅, WhatsApp: Messages ✅.
4. **Enters platform credentials** — For Instagram: access token (feature = "comments"), publishing token + Instagram Business Account ID (feature = "publishing"). For WhatsApp: access token (feature = "messages"). All tokens encrypted with AES-256-GCM before storage.
5. **Client logs in** — Uses their own credentials.
6. **Client fills Knowledge Base** — Business info, hours, menu items, FAQs.
7. **Client configures tone** — Friendly/Arabic for WhatsApp, Fun/English for Instagram.
8. **Client creates Flows** — Greeting flow on WhatsApp.
9. **Client creates Automation Rules** — "Contains Word: refund" → "Escalate."
10. **Agency switches to client view** — Verifies everything via `x-client-id` header.
11. **Client goes live** — All incoming messages handled by AI.

---

### Workflow 8 — New Contact Created Automatically

1. **New customer sends first-ever WhatsApp message** — "Is your terrace open tonight?"
2. **Webhook receives** — `contactId` = "+19195551234", `contactName` = "Leila Hassan".
3. **`syncContact()` runs** — Searches for matching WhatsApp handle. None found.
4. **New contact created:**
   - Name: "Leila Hassan"
   - Handles: `[{ channel: "whatsapp_business", username: "+19195551234" }]`
   - TotalConversations: 1
   - LastSeenAt: now
5. **Conversation created** — Thread found or created.
6. **AI replies** — Answers the terrace question.
7. **Contact in CRM** — Staff can find Leila Hassan in Contacts, add tags (e.g., "regular"), add email, include in future campaigns.
8. **Next message** — System finds existing contact, increments `totalConversations`, updates `lastSeenAt`.

---

## 6. Data Architecture (in Plain Language)

Each piece of information SocialPilot stores lives in a "table" inside the database. Think of each table as a spreadsheet with columns. There are **21 tables** in total.

---

### `users` — Account Holders
**What it stores:** Everyone who has a SocialPilot account — business owners and agency managers.  
**Key columns:** Email, hashed password, role (client or agency), name, business name.  
**Connected to:** Almost every other table (most tables have a `userId` column that links back here).  
**Features that depend on it:** Login, dashboard, all data ownership.

---

### `agencyClients` — Agency-Client Relationships
**What it stores:** Which agency manages which business client.  
**Key columns:** Agency's user ID, client's user ID, status (active/paused/setup).  
**Connected to:** Users (both agency and client sides).  
**Features that depend on it:** Agency dashboard, client list, permission management.

---

### `platformCredentials` — API Access Tokens
**What it stores:** The secret access tokens that allow SocialPilot to post on behalf of each business on each platform.  
**Key columns:** User ID, platform (instagram/tiktok/facebook/whatsapp/sms/phone), **feature** (comments / messages / publishing), token (AES-256-GCM encrypted), scope (JSON — stores accountId for publishing credentials), expiry.  
**Feature values explained:**
- `comments` — for replying to public comments
- `messages` — for sending DMs and WhatsApp messages
- `publishing` — for posting new content to Instagram or Facebook (also stores the Page ID or Instagram Business Account ID in the `scope` JSON field)

**Connected to:** Users.  
**Features that depend on it:** All platform delivery. If a token is missing or expired, replies/posts cannot be delivered — they are skipped gracefully.

---

### `toneSettings` — AI Personality Per Platform
**What it stores:** How the AI should behave on each platform for each user.  
**Key columns:** User ID, platform, tone (friendly/professional/fun/informative), language (ar/en/ar_en), blocked words, custom instructions (extra).  
**Connected to:** Users.  
**Features that depend on it:** Every AI reply generation call reads this before building the Claude prompt.

---

### `conversations` — DM & Comment Threads
**What it stores:** Each unique conversation thread between a business and a customer.  
**Key columns:** User ID, contact ID (platform user ID), contact name, contact handle, channel, last message, last message date, status (open/pending/resolved/closed), priority (urgent/normal/low), assigned team member, tags.  
**Connected to:** Users, messages (one conversation has many messages).  
**Features that depend on it:** Inbox, analytics, contact sync.

---

### `messages` — Individual Messages
**What it stores:** Every single message sent or received in every conversation.  
**Key columns:** Conversation ID, direction (inbound/outbound), content, AI reply, AI confidence score (0–100 integer), reply status (pending/approved/rejected/edited/auto_sent/escalated), sent by (ai/human), timestamp.  
**Connected to:** Conversations.  
**Features that depend on it:** Inbox message display, AI reply generation, analytics.

---

### `comments` — Public Social Comments
**What it stores:** Public comments on TikTok/Instagram/Facebook posts.  
**Key columns:** User ID, platform, username, comment text, AI reply, confidence, status, platform comment ID, video ID (TikTok only), timestamp.  
**Connected to:** Users.  
**Features that depend on it:** Comments page, AI reply for comments, platform delivery.

---

### `resources` — Knowledge Base Entries
**What it stores:** All the business information the AI uses to generate accurate replies.  
**Key columns:** User ID, type (info/hours/menu_item/offer/faq/document), title, content (JSON), file URL, active flag.  
**Connected to:** Users.  
**Features that depend on it:** Every AI reply generation call, content generation, template generation, listening reply generation.

---

### `replyTemplates` — Saved Reply Templates
**What it stores:** Pre-written reply templates that staff can reuse.  
**Key columns:** User ID, title, content (with `{{name}}` variables), platforms, language, category, usage count, active flag.  
**Connected to:** Users.  
**Features that depend on it:** Templates page, Inbox (quick insert), AI template generation, knowledge context (up to 8 templates feed into AI prompts, previewed at 200 characters each).

---

### `scheduledPosts` — Content Calendar
**What it stores:** Every social media post — drafts, scheduled, and published.  
**Key columns:** User ID, platforms array, content, media URL, scheduled date, published date, status (draft/scheduled/published/failed), AI-generated flag.  
**Connected to:** Users, postMetrics.  
**Features that depend on it:** Content Scheduler, Analytics Content tab.

---

### `postMetrics` — Post Performance Data
**What it stores:** Engagement statistics for each published post.  
**Key columns:** Post ID, likes, comments, reach, shares, recorded date.  
**Note:** Currently simulated using realistic platform-specific formulas (Instagram: 500–2000 reach, TikTok: 1000–8000 reach, Facebook: 300–1200 reach, WhatsApp: 50–300 reach). Growth simulated for first 24 hours then plateaus.  
**Connected to:** ScheduledPosts.  
**Features that depend on it:** Content Scheduler metrics tab, Analytics.

---

### `campaigns` — Broadcast Messages
**What it stores:** WhatsApp bulk campaigns.  
**Key columns:** User ID, name, message, media URL, platform, audience type (all/tag/platform), audience value, scheduled date, status, sent count, read count, reply count.  
**Connected to:** Users.  
**Features that depend on it:** Campaigns page, Analytics campaigns tab.

---

### `chatbotFlows` — Automated Conversation Scripts
**What it stores:** Keyword-triggered conversation flows.  
**Key columns:** User ID, name, trigger type (greeting/keyword/order/inquiry/fallback), trigger value (keywords), platform, steps (JSON array of step objects), active flag, trigger count.  
**Connected to:** Users, flowSessions.  
**Features that depend on it:** Flows page, webhook trigger matching.

---

### `flowSessions` — Active Chatbot Flow State
**What it stores:** The current position of a customer mid-way through a multi-turn chatbot flow.  
**Key columns:** Conversation ID (unique — one active flow per conversation at a time), flow ID, user ID, channel, recipient handle, current step index, collected values (JSON), updated timestamp.  
**Connected to:** Conversations, chatbotFlows, users.  
**Why it exists:** Replaces the previous in-memory Map that was lost on server restart. Every `collect_input` step saves progress here; flow completion or handoff deletes the record.  
**Features that depend on it:** Multi-turn chatbot execution in the webhook handler.

---

### `automationRules` — Reply Routing Rules
**What it stores:** Rules that override AI confidence routing.  
**Key columns:** User ID, name, trigger type (contains_word/is_question/sentiment_positive/sentiment_negative/new_follower), trigger value, action (auto_send/skip_review/escalate/assign_to), action value, channels (JSON array — empty = all channels), active flag.  
**Connected to:** Users.  
**Features that depend on it:** Every AI reply generation (rules evaluated after confidence scoring).

---

### `contacts` — Customer CRM
**What it stores:** Every customer who has ever contacted the business.  
**Key columns:** User ID, name, phone, email, handles (JSON: array of `{ channel, username }` pairs), tags (JSON array), notes, total conversations count, last seen date.  
**Connected to:** Users.  
**Features that depend on it:** Contacts CRM page, Campaigns (audience targeting), analytics.

---

### `teamMembers` — Staff Accounts
**What it stores:** Team members invited to the account.  
**Key columns:** Owner user ID, name, email, role (admin/agent/viewer), status (invited/active/disabled).  
**Note:** The member's UUID is their login token. Status changes from "invited" to "active" on first login.  
**Connected to:** Users (owner), internalNotes.  
**Features that depend on it:** Team page, team login (`POST /api/auth/team-login`), role-based access control on all routes.

---

### `internalNotes` — Team Collaboration Notes
**What it stores:** Private notes staff write about a conversation (customers never see these).  
**Key columns:** Conversation ID, user ID (owner), author name, note content, created date.  
**Connected to:** TeamMembers, conversations.  
**Features that depend on it:** Inbox internal notes tab.

---

### `listeningKeywords` — Brand Monitoring Keywords
**What it stores:** Keywords to monitor for brand mentions.  
**Key columns:** User ID, keyword text, platforms (array), active flag, mention count.  
**Connected to:** Users, listeningMentions.  
**Features that depend on it:** Listening page management; webhook inbound message scanning (every inbound message is checked against active keywords).

---

### `listeningMentions` — Detected Brand Mentions
**What it stores:** Every brand mention detected for a keyword.  
**Key columns:** User ID, keyword ID, keyword text, platform, username, mention content, URL (nullable), sentiment (positive/negative/neutral), handled flag, handled date, timestamp.  
**Connected to:** Users, listeningKeywords.  
**Features that depend on it:** Listening feed, handled/unhandled tracking, AI reply for mentions.

---

### `calls` — Phone Call History
**What it stores:** Every inbound and outbound phone call.  
**Key columns:** User ID, conversation ID (optional), Twilio call SID, direction, to/from numbers, contact name, status (initiated/ringing/in-progress/completed/failed/busy/no-answer/canceled/missed), duration, recording URL, notes, start/end times.  
**Connected to:** Users, conversations.  
**Features that depend on it:** Phone page, Inbox (calls linked to conversations).

---

### `brandSettings` — Visual Brand Style
**What it stores:** Your brand's visual style description for AI image generation.  
**Key columns:** User ID (unique — one record per user), image style description.  
**Connected to:** Users.  
**Features that depend on it:** Content Scheduler image generation (DALL-E uses this style guide in the generation prompt).

---

### `platformPermissions` — Agency-Granted Feature Access
**What it stores:** Which platforms and features each client is allowed to use (set by the agency).  
**Key columns:** Client user ID, granted by (agency user ID), platform, comments enabled flag, messages enabled flag.  
**Connected to:** Users (both client and agency).  
**Features that depend on it:** Dashboard platform cards, settings visibility.

---

## 7. Integrations Map

---

### Anthropic Claude AI

| Field | Details |
|---|---|
| **What it does** | Generates AI reply suggestions for conversations, comments, templates, captions, and listening mentions |
| **Model used** | `claude-haiku-4-5-20251001` — centralized in `backend/src/lib/constants.ts` as `AI_FAST_MODEL`. Change one file to update the model across the entire platform. |
| **Where used** | Inbox reply generation, Comments reply generation, Content caption generation, Templates generation, Listening reply generation |
| **Response format** | Instructed to return `{ "reply": "...", "confidence": 0-100 }` as JSON. Parsed via regex; falls back to plain text + confidence 55 if JSON is malformed. |
| **Configuration** | `ANTHROPIC_API_KEY` environment variable |
| **If key is missing** | Server logs a warning at startup. AI calls fail. Content generation uses a demo fallback response. Manual reply features (typing + sending) continue to work. |

---

### OpenAI DALL-E 3

| Field | Details |
|---|---|
| **What it does** | Generates custom images for social media posts from a text prompt + your brand style guide |
| **Where used** | Content Scheduler → Generate Image button |
| **Configuration** | `OPENAI_API_KEY` environment variable |
| **If key is missing** | Returns a random Unsplash stock photo — image generation always produces a result, just not AI-generated |

---

### WhatsApp Business Cloud API (Meta)

| Field | Details |
|---|---|
| **What it does** | Sends and receives WhatsApp messages; broadcast campaigns |
| **Where used** | Inbox (WhatsApp DMs), Campaigns (broadcast sends), webhook (receives incoming messages) |
| **Configuration** | `WHATSAPP_PHONE_NUMBER_ID` env var + Meta access token per client (stored encrypted with feature = "messages") |
| **Webhook URL** | `https://your-server.com/webhook/whatsapp/:userId` |
| **Webhook verification** | Responds to `hub.challenge` using `WEBHOOK_VERIFY_TOKEN` |
| **Signature verification** | HMAC-SHA256 using `META_APP_SECRET` |
| **API version** | v19.0 |
| **If it goes down** | Incoming messages are lost. Outbound replies logged as skipped — no crash. |

---

### Instagram Graph API (Meta)

| Field | Details |
|---|---|
| **What it does** | Replies to comments, sends DMs, publishes content posts, receives webhooks |
| **Where used** | Comments page (replies), Inbox (DMs), Content Scheduler (publishing) |
| **Configuration** | Access token per client. Publishing also requires Instagram Business Account ID (stored in credential scope JSON or auto-discovered via `GET /me?fields=instagram_business_account`). |
| **Publishing flow** | Step 1: `POST /{ig-user-id}/media` → Step 2: `POST /{ig-user-id}/media_publish` |
| **API version** | v19.0 |
| **If it goes down** | Replies and posts fail. Post status marked "Failed" in database. |

---

### Facebook Graph API (Meta)

| Field | Details |
|---|---|
| **What it does** | Replies to comments, sends Messenger messages, publishes Page posts, receives webhooks |
| **Where used** | Comments page (replies), Inbox (Messenger DMs), Content Scheduler (publishing) |
| **Configuration** | Access token per client. Publishing uses Page ID from credential scope or auto-discovered via `GET /me/accounts`. |
| **Publishing flow** | Text: `POST /{page-id}/feed` · Image: `POST /{page-id}/photos` |
| **API version** | v19.0 |
| **If it goes down** | Replies and posts fail. |

---

### TikTok Open API

| Field | Details |
|---|---|
| **What it does** | Replies to TikTok comments; receives comment webhooks |
| **Where used** | Comments page (TikTok replies) |
| **Configuration** | TikTok API access token per client (feature = "comments") |
| **Comment reply requirement** | Both Video ID and Comment ID must be present — captured when webhook receives the comment |
| **Content publishing** | Currently skipped — requires TikTok Content Posting API business app approval. Posts are marked published in DB but not delivered to TikTok. |
| **API version** | v2 |
| **Webhook signature** | HMAC-SHA256 using `TIKTOK_CLIENT_SECRET` |

---

### Twilio Voice (Phone Calls)

| Field | Details |
|---|---|
| **What it does** | Makes outbound calls with text-to-speech message; tracks status and duration |
| **Where used** | Phone page, Inbox call button |
| **Configuration** | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`, `APP_URL` |
| **TwiML** | Inline — no external TwiML bin needed. Uses `<Say voice="alice" language="en-US">` with HTML-escaped message. |
| **Status callback URL** | `https://your-server.com/api/calls/webhook/status` *(note: under `/api`, not `/webhook`)* |
| **Callback receives** | `CallSid`, `CallStatus`, `CallDuration`, `RecordingUrl` as URL-encoded form data |

---

### Twilio SMS

| Field | Details |
|---|---|
| **What it does** | Sends outbound SMS; receives inbound SMS messages |
| **Where used** | Inbox (SMS channel conversations), platform delivery (`sendSmsMessage()`) |
| **Configuration** | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` (shared with Voice) |
| **Inbound webhook** | `POST /webhook/sms/:userId` — Twilio sends URL-encoded form data (`From`, `Body`, `MessageSid`) |
| **Phone normalization** | Numbers are normalized to E.164 format (`+1` prefix for US numbers without country code) |
| **If credentials missing** | Delivery returns `{ ok: false, skipped: true }` — no crash |

---

### Resend (Team Invite Emails)

| Field | Details |
|---|---|
| **What it does** | Sends HTML email invitations to new team members with their login link |
| **Where used** | Team page → Add Team Member |
| **Configuration** | `RESEND_API_KEY` · `EMAIL_FROM_DOMAIN` (sender domain, must be verified with Resend; default: `socialpilot.app`) · `APP_URL` (for login link in email) |
| **If key is missing** | Console fallback — member ID and login link printed to server log. Member can still be onboarded manually. |
| **Email format** | Both HTML (styled) and plain-text versions sent |

---

### AES-256-GCM Encryption

| Field | Details |
|---|---|
| **What it does** | Encrypts all platform access tokens before they are written to the database |
| **Where used** | Every write to `platformCredentials.accessTokenEnc` |
| **Configuration** | `ENCRYPTION_KEY` — 64-character hex string (32 bytes). Generate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| **Algorithm** | AES-256-GCM, 12-byte random IV per token. Stored as `iv:authTag:ciphertext` (hex) |
| **If key is missing** | Tokens stored as plaintext (graceful degradation for dev). Existing plaintext rows read correctly. **Set before storing real tokens in production.** |

---

### PostgreSQL Database

| Field | Details |
|---|---|
| **What it does** | Stores all platform data permanently |
| **Configuration** | `DATABASE_URL` environment variable |
| **ORM** | Drizzle ORM — schema in `backend/src/db/schema.ts` |
| **Migrations** | `cd backend && npx drizzle-kit push` |
| **If it goes down** | Entire platform stops — all API calls return errors |

---

## 8. Current Platform Status

### What Is 100% Working End-to-End

| Feature | Status |
|---|---|
| User login / logout | ✅ Fully working |
| Team member login via invite UUID | ✅ Fully working |
| Dashboard KPI cards | ✅ Fully working |
| Inbox — view conversations and messages | ✅ Fully working |
| Inbox — generate AI reply (requires API key) | ✅ Fully working |
| Inbox — approve / reject / edit replies | ✅ Fully working |
| Inbox — mark conversation resolved | ✅ Fully working |
| Inbox — internal notes | ✅ Fully working |
| Inbox — assign to team member | ✅ Fully working |
| Inbox — send SMS replies | ✅ Fully working (requires Twilio) |
| Comments — view and manage | ✅ Fully working |
| Knowledge Base — all resource types CRUD | ✅ Fully working |
| Knowledge Base — file document upload (local `/uploads`) | ✅ Fully working |
| Reply Templates — CRUD + AI generation | ✅ Fully working |
| Content Scheduler — create/edit/delete posts | ✅ Fully working |
| Content — AI caption + hashtag generation | ✅ Fully working |
| Content — publish to Instagram (with publishing credential) | ✅ Fully working |
| Content — publish to Facebook (with publishing credential) | ✅ Fully working |
| Content — post metrics tracking (simulated) | ✅ Fully working |
| Campaigns — CRUD | ✅ Fully working |
| Campaigns — real WhatsApp delivery (with credentials) | ✅ Working (mock fallback if no credentials) |
| Campaigns — real audience reach from contacts | ✅ Fully working |
| Contacts CRM — CRUD | ✅ Fully working |
| Contacts — auto-created from inbound messages | ✅ Fully working |
| Chatbot Flows — CRUD | ✅ Fully working |
| Chatbot Flows — multi-turn execution (DB-persisted state) | ✅ Fully working |
| Listening — keywords CRUD | ✅ Fully working |
| Listening — real-time mention detection from inbound webhooks | ✅ Fully working |
| Listening — demo seed data for empty feed | ✅ Fully working |
| Listening — mark handled / unhandled (persisted) | ✅ Fully working |
| Listening — AI reply generation for mentions | ✅ Fully working |
| Automation Rules — CRUD | ✅ Fully working |
| Automation Rules — override AI confidence | ✅ Fully working |
| Team members — CRUD + role enforcement | ✅ Fully working |
| Team member invite email (requires Resend key) | ✅ Working (console fallback if no key) |
| Settings — tone/language/blocked words per platform | ✅ Fully working |
| Brand settings — image style | ✅ Fully working |
| Analytics — date range (7d/30d/90d) | ✅ Fully working |
| Analytics — real message data (not mocked) | ✅ Fully working |
| Agency — client list and stats | ✅ Fully working |
| Agency — platform permissions management | ✅ Fully working |
| Agency — switch to client context | ✅ Fully working |
| Phone — call history | ✅ Fully working |
| Phone — outbound call initiation | ✅ Working (requires Twilio credentials) |
| Token encryption at rest (AES-256-GCM) | ✅ Working (requires `ENCRYPTION_KEY`) |
| AI model name centralized in constants.ts | ✅ Fully working |
| Startup environment warnings for missing keys | ✅ Fully working |

---

### What Is Working but Requires Real Platform Credentials

| Feature | What's Needed |
|---|---|
| Sending replies to Instagram comments | Instagram Graph API token (feature = "comments") |
| Sending Instagram DMs | Instagram Graph API token (feature = "messages") |
| Publishing posts to Instagram | Instagram Graph API token (feature = "publishing") + Instagram Business Account ID |
| Sending replies to Facebook comments | Facebook Page access token (feature = "comments") |
| Sending Facebook Messenger messages | Facebook Page access token (feature = "messages") |
| Publishing posts to Facebook | Facebook Page access token (feature = "publishing") |
| Sending replies to TikTok comments | TikTok API token (feature = "comments") |
| Publishing posts to TikTok | Requires TikTok Content Posting API business approval — not yet available |
| Sending WhatsApp messages | `WHATSAPP_PHONE_NUMBER_ID` env var + Meta access token |
| Sending / receiving SMS | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` |
| Receiving inbound messages from any platform | Public HTTPS webhook URL + platform webhook registration |
| Phone calls | Twilio credentials + `APP_URL` for status callback |
| AI image generation | `OPENAI_API_KEY` (Unsplash fallback active without it) |
| Team invite emails | `RESEND_API_KEY` + verified `EMAIL_FROM_DOMAIN` (console fallback without it) |
| Token encryption | `ENCRYPTION_KEY` (plaintext fallback without it — set before going live) |

Without these credentials, the platform shows all features correctly in the UI and stores data in the database — outbound delivery is gracefully skipped with `{ ok: false, skipped: true }` and does not crash.

---

### What Requires Production Environment to Fully Verify

| Feature | Reason |
|---|---|
| Inbound webhook from WhatsApp | Requires a public HTTPS URL that Meta can reach |
| Instagram comment / DM webhooks | Same — Meta requires HTTPS + verification challenge |
| TikTok webhooks | Requires platform webhook registration |
| Twilio call status callbacks | Requires public HTTPS URL |
| SMS inbound messages | Requires Twilio webhook registration with public URL |
| Scheduler (post publishing at exact time) | Background process requires persistent always-on server |
| Metrics refresh every 6 hours | Same — requires always-on server |

---

### Known Limitations

1. **TikTok content publishing requires separate approval:** TikTok's Content Posting API is only available to apps reviewed and approved by TikTok for Business. Posts scheduled to TikTok are marked published in the database but not delivered. Apply via the TikTok for Business developer portal.

2. **Post metrics are simulated:** Engagement metrics are generated using realistic simulation formulas (growth over first 24 hours, platform-specific reach ranges). Real platform Insights API integration is a future upgrade.

3. **File uploads are local:** Document uploads save to `/uploads` on the server and are served via `serveStatic`. For horizontally-scaled or ephemeral servers, use S3 or Cloudflare R2.

4. **Listening detects inbound messages only:** The keyword scanner catches mentions that arrive through your registered webhooks (DMs and comments to your connected accounts). Proactive scraping of public posts mentioning your brand requires platform Search APIs not yet integrated.

5. **TikTok DMs:** TikTok DM delivery is internally routed through the comment reply API. TikTok does not offer a public DM send endpoint. DMs show in the Inbox but outbound replies use the comment channel.

---

## 9. Setup Checklist

### From Zero to First Live AI Reply

Follow these steps in order to set up SocialPilot for a new client.

---

**Phase 1 — Environment Setup**

- [ ] 1. Clone the repository to your server (Railway, VPS, etc.)
- [ ] 2. Create a PostgreSQL database (Railway provides one automatically)
- [ ] 3. Set `DATABASE_URL` pointing to your database
- [ ] 4. Generate a JWT secret and set `JWT_SECRET`:
  ```
  node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
  ```
- [ ] 5. Generate a 32-byte encryption key and set `ENCRYPTION_KEY` (protects all stored platform tokens):
  ```
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```
- [ ] 6. Set `PORT=3001`
- [ ] 7. Set `ALLOWED_ORIGINS=https://your-frontend-domain.com`
- [ ] 8. Set `APP_URL=https://your-backend-domain.com` (used for Twilio callbacks and invite email links)
- [ ] 9. Set `ANTHROPIC_API_KEY=sk-ant-...` (from console.anthropic.com)
- [ ] 10. (Optional) Set `OPENAI_API_KEY=sk-...` for AI image generation
- [ ] 11. (Optional) Set `RESEND_API_KEY=re_...` for team invite emails
- [ ] 12. (Optional) Set `EMAIL_FROM_DOMAIN=yourdomain.com` for invite email sender (must be verified with Resend; default: `socialpilot.app`)
- [ ] 13. Run database migrations to create all tables:
  ```
  cd backend && npx drizzle-kit push
  ```
- [ ] 14. (Optional) Seed demo data:
  ```
  npx tsx src/db/seed.ts
  ```
- [ ] 15. Build and start the backend: `npm run build && npm start`
- [ ] 16. Deploy the frontend with `VITE_API_URL=https://your-backend-domain.com/api`

> **Upgrading an existing deployment:** Run `npx drizzle-kit push` after deploying to apply any new tables or enum changes (e.g., the `flow_sessions` table and the `publishing` feature type added in Phase 3).

---

**Phase 2 — Agency Account Setup**

- [ ] 17. Open the platform and go to `/login`
- [ ] 18. Log in with your agency admin credentials (demo: `agency@demo.com` / `demo123`)
- [ ] 19. Navigate to Agency → Clients
- [ ] 20. Click "Add Client" — enter business name, owner name, email
- [ ] 21. In the permissions panel, enable the platforms the client will use
- [ ] 22. Enter platform credentials for each enabled feature:
  - **Instagram comments:** token with feature = "comments"
  - **Instagram DMs:** token with feature = "messages"
  - **Instagram publishing:** token with feature = "publishing" + Instagram Business Account ID
  - **Facebook comments:** token with feature = "comments"
  - **Facebook Messenger:** token with feature = "messages"
  - **Facebook publishing:** token with feature = "publishing" (Page ID optional — auto-discovered if omitted)
  - **WhatsApp:** token with feature = "messages" (also set `WHATSAPP_PHONE_NUMBER_ID` in server env)
  - **TikTok:** token with feature = "comments"

---

**Phase 3 — Client Knowledge Base Setup**

- [ ] 23. Log into the client account (directly or via Switch to Client)
- [ ] 24. Go to Resources → add Business Info
- [ ] 25. Add Operating Hours for each day
- [ ] 26. Add at least 5 Menu Items / Products with names, descriptions, and prices
- [ ] 27. Add any current Offers or Promotions
- [ ] 28. Add 5–10 FAQs covering the most common questions
- [ ] 29. Confirm all resources show "Active" status

---

**Phase 4 — AI Settings Configuration**

- [ ] 30. Go to Settings
- [ ] 31. For each connected platform (TikTok, Instagram, Facebook, WhatsApp, SMS):
  - Select Tone (Friendly recommended for most businesses)
  - Select Language (Arabic, English, or Mixed)
  - Add Blocked Words
  - Add Custom Instructions
- [ ] 32. Click Save for each platform

---

**Phase 5 — Automation Rules**

- [ ] 33. Go to Automation
- [ ] 34. Create a complaint escalation rule: "Contains Word: refund, cancel, complaint" → "Escalate"
- [ ] 35. (Optional) Create an auto-send rule for simple questions: "Is a Question" → "Auto-Send"
- [ ] 36. (Optional) Create additional business-specific rules

---

**Phase 6 — Chatbot Flows**

- [ ] 37. Go to Flows
- [ ] 38. Create a Greeting flow for WhatsApp (trigger: Greeting, Step 1: welcome message)
- [ ] 39. Set the flow to Active
- [ ] 40. Test after webhook registration (Phase 9)

---

**Phase 7 — Brand Listening**

- [ ] 41. Go to Listening
- [ ] 42. Add your business name as a monitored keyword
- [ ] 43. Add any common misspellings or short-form names
- [ ] 44. Once webhooks are live, any inbound message matching a keyword appears in the feed automatically

---

**Phase 8 — Team Setup**

- [ ] 45. Go to Team
- [ ] 46. Add each team member with name, email, and role
- [ ] 47. Each member receives an invite email (or check server console if `RESEND_API_KEY` not set) with their UUID login link
- [ ] 48. Confirm each member can log in and sees the correct pages for their role

---

**Phase 9 — Webhook Registration (requires public HTTPS URL)**

- [ ] 49. Set `WEBHOOK_VERIFY_TOKEN` — any random string you choose
- [ ] 50. Set `META_APP_SECRET` — from Meta Developer App settings
- [ ] 51. Set `TIKTOK_CLIENT_SECRET` — from TikTok Developer App settings
- [ ] 52. Set `WHATSAPP_PHONE_NUMBER_ID` — from Meta WhatsApp Business settings
- [ ] 53. Set `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`
- [ ] 54. Register webhook URLs with each platform:
  - **WhatsApp:** `https://your-server.com/webhook/whatsapp/:userId`
  - **Instagram:** `https://your-server.com/webhook/instagram/:userId`
  - **Facebook:** `https://your-server.com/webhook/facebook/:userId`
  - **TikTok:** `https://your-server.com/webhook/tiktok/:userId`
  - **SMS (Twilio):** `https://your-server.com/webhook/sms/:userId`
  - **Call status (Twilio):** `https://your-server.com/api/calls/webhook/status`
    *(This path is under `/api/calls`, not `/webhook` — do not register it under `/webhook`)*
- [ ] 55. Verify each webhook via the platform's challenge process (SocialPilot responds automatically to `hub.challenge` requests using `WEBHOOK_VERIFY_TOKEN`)

---

**Phase 10 — First Live Test**

- [ ] 56. Send a test WhatsApp message to the connected phone number
- [ ] 57. Confirm it appears in the Inbox within seconds
- [ ] 58. Click "Generate AI Reply" — verify it uses your Knowledge Base
- [ ] 59. Approve the reply and verify it is delivered to WhatsApp
- [ ] 60. Post a test comment on the connected Instagram post
- [ ] 61. Confirm it appears in Comments and receives an AI reply
- [ ] 62. Create a test scheduled post for Instagram, set 2 minutes from now, verify it publishes
- [ ] 63. Check Analytics to verify message counts are updating
- [ ] 64. 🎉 System is live!

---

## 10. Glossary (English & Arabic)

---

| Term (English) | المصطلح (عربي) | Definition |
|---|---|---|
| **Inbox** | صندوق الوارد | The main screen where all private messages (DMs) from customers arrive. Every platform's messages appear here in one unified list. |
| **Conversation** | محادثة | A thread of messages between your business and one specific customer. Like a WhatsApp chat, but it can come from any platform. |
| **Inbound Message** | رسالة واردة | A message that a customer sent TO you. The arrow points inward. |
| **Outbound Message** | رسالة صادرة | A reply that you (or the AI) sent TO the customer. The arrow points outward. |
| **Confidence Score** | درجة الثقة | A number from 0 to 100 that the AI gives itself. It means: "How sure am I that this reply is correct?" 95 = very sure. 30 = guessing. |
| **Auto-sent** | أُرسلت تلقائياً | A reply that the AI sent automatically without any human reviewing it, because the confidence score was 85 or higher. |
| **Pending Review** | في انتظار المراجعة | A reply the AI wrote but is NOT yet sent. It is waiting for a team member to read it, approve it, or edit it. Confidence was between 50 and 84. |
| **Escalated** | تم تصعيده | A message the AI could not handle confidently (score below 50) and marked as needing urgent human attention. |
| **Knowledge Base** | قاعدة المعرفة | All the information you give SocialPilot about your business — your hours, menu, prices, offers, FAQs. The AI reads this before every reply. |
| **Resource** | مورد | A single entry in the Knowledge Base. For example, one menu item or one FAQ is one Resource. |
| **Tone** | نبرة الحديث | The personality style of the AI's replies. Options: Friendly (ودود), Professional (احترافي), Fun (مرح), Informative (معلوماتي). |
| **Blocked Words** | كلمات محجوبة | Words you've told the AI to never say. If "competitor name" is blocked, the AI will never mention it. |
| **Template** | قالب | A pre-written reply that your team can reuse. Like a saved message on WhatsApp. |
| **Campaign** | حملة | A single bulk broadcast message sent to many customers at once via WhatsApp. Like a mass SMS. |
| **Audience** | الجمهور المستهدف | The group of contacts a campaign is sent to. Can be "all contacts", "contacts tagged VIP", or "contacts from Instagram". |
| **Reach** | مدى الوصول | The number of people a campaign can potentially reach based on your contact list. |
| **Flow** | مسار المحادثة | A scripted chatbot conversation. When a customer sends a specific word, the bot follows a pre-written script automatically. |
| **Flow Session** | جلسة المسار | A database record that tracks where a customer is in a multi-step chatbot flow. Saves progress so the flow continues correctly even if the server restarts. |
| **Trigger** | المشغّل | The keyword or phrase that activates a Flow. For example, the word "hello" could be the trigger for a Greeting Flow. |
| **Step** | خطوة | One message in a Flow. A Flow can have multiple steps, each sending a different message. |
| **Webhook** | خطاف الويب | A technical connection between an external platform (like WhatsApp or TikTok) and SocialPilot. When a customer sends a message, the platform immediately calls SocialPilot's webhook to deliver it. Invisible to users — it just makes messages appear in real time. |
| **API Token / Access Token** | رمز الوصول | A secret password that allows SocialPilot to act on behalf of your business account on a platform. Without it, replies cannot be sent. |
| **Platform Credential** | بيانات اعتماد المنصة | The combination of API tokens that connect SocialPilot to an external platform. Stored encrypted with AES-256-GCM. |
| **Publishing Credential** | بيانات اعتماد النشر | A special credential with feature = "publishing" that allows SocialPilot to post new content (not just reply) on Instagram or Facebook. Also stores the Page ID or Business Account ID. |
| **Encryption Key** | مفتاح التشفير | A 64-character secret (32 bytes hex) in the server environment. Used to encrypt all platform tokens before database storage. Must be set before going live. |
| **Automation Rule** | قاعدة الأتمتة | A condition + action pair. Example: "IF message contains 'refund' THEN always escalate it." Rules override the AI's confidence routing. Evaluated in creation order; first match wins. |
| **Sentiment** | المشاعر / النبرة العاطفية | The emotional tone of a message or mention. Positive (إيجابي) = happy customer. Negative (سلبي) = unhappy or complaining. Neutral (محايد) = no strong emotion. |
| **Mention** | إشارة | A message containing your monitored keyword. Detected automatically from every inbound webhook message. |
| **Listening** | الرصد الاجتماعي | The feature that scans every inbound message for your brand keywords and logs matching ones as mentions. |
| **Handled** | تم التعامل معه | A mention that a team member has responded to and marked as resolved. |
| **Contact** | جهة اتصال | A profile record for one customer — name, phone, email, platform handles, conversation history. Created automatically on first contact. |
| **Tag** | وسم | A label applied to a contact or conversation. Examples: "vip", "complaint", "order-inquiry". |
| **Handle** | المعرّف على المنصة | A customer's username on a platform. For example, `@jessica_nc` on Instagram, or `+19195551234` on WhatsApp. |
| **Channel** | القناة | A specific communication type on a specific platform. "WhatsApp Business messages", "Instagram DMs", and "TikTok comments" are three different channels. |
| **Draft** | مسودة | A post or reply created but not yet scheduled or sent. |
| **Scheduled** | مجدوَل | A post assigned a date and time to be published automatically. |
| **Published** | منشور | A post successfully posted to the platform. |
| **Failed** | فشل | A post or reply that could not be delivered — usually because a platform credential is missing or expired. |
| **Agency** | الوكالة | A social media management company using SocialPilot to manage multiple business clients. |
| **Client** | العميل | A business account managed by an agency inside SocialPilot. |
| **Admin** | المشرف | The highest permission role. Can change settings, manage team members, and do everything. |
| **Agent** | الوكيل / المشغّل | A team member who can respond to conversations and handle daily tasks, but cannot change settings or manage the team. |
| **Viewer** | المراقب | A read-only team member. Can see everything but cannot send or change anything. |
| **3-Tier Routing** | نظام التوجيه الثلاثي | The system that decides whether an AI reply is sent automatically (≥85%), put in review (50–84%), or escalated to a human (0–49%). |
| **Post Metrics** | مقاييس المنشور | Performance numbers for a published post: Likes, Comments, Reach, Shares. Currently simulated using realistic platform averages. |
| **Internal Note** | ملاحظة داخلية | A private comment team members write about a conversation. The customer NEVER sees these. |
| **Scheduler** | المجدوِل | The background process that checks every 60 seconds for posts due to publish, and refreshes post metrics every 6 hours for posts from the last 7 days. |
| **Demo Mode** | الوضع التجريبي | A mode that works without real platform connections. Uses fallback responses so you can explore features without real API credentials. |

---

*Documentation last updated: May 2026 — reflects all Phase 1, 2, and 3 fixes: AES-256-GCM token encryption, DB-persisted flow state (flowSessions table), real Instagram/Facebook content publishing (two-step Graph API), real-time brand mention detection from inbound webhooks, real WhatsApp campaign delivery, team invite emails via Resend, SMS delivery via Twilio, publishing credential feature type, and corrected Twilio status callback path (`/api/calls/webhook/status`).*
