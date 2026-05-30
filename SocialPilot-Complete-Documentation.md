# SocialPilot — Complete Platform Documentation

> **Version:** Post Phase-2 Fixes · **Date:** May 2026  
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
| The AI that writes replies | Claude AI by Anthropic |
| Image generation for posts | DALL-E 3 by OpenAI (with photo fallback) |
| WhatsApp messages | WhatsApp Business Cloud API (Meta) |
| Phone calls | Twilio |
| Instagram & Facebook | Meta Graph API |
| TikTok | TikTok Open API |

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
- **Twilio status sync** — call status updates automatically as the call progresses

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
- **AI Generate Image button** — DALL-E 3 creates a custom image for the post (or uses stock photos in demo)
- **Hashtag suggestions** — AI generates 3–5 relevant hashtags automatically
- **Schedule Date/Time picker** — choose exact date and time for publishing
- **Platform-specific brand style** — uses your brand image style settings for AI image generation
- **Edit / Delete draft posts** — modify or remove any post before it publishes
- **Post Status tracking** — Draft → Scheduled → Published / Failed
- **Performance Metrics tab** — after publishing, shows likes, comments, reach, shares per post

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

**Reads from:** Campaigns, contacts (for audience reach calculation)  
**Writes to:** Campaigns (creates, updates, records sent/read/reply counts)  
**Connects to:** Contacts (audience comes from here), Inbox (campaign replies land here), Analytics

---

### Page 7 — Contacts
**URL:** `/contacts`  
**Purpose:** Your customer CRM — a profile card for every person who has ever contacted you.

**Features:**
- **Contact list** — all contacts sorted by most recent activity, with names and platform handles
- **Search bar** — find contacts by name, phone number, or email
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
- **Documents** — upload PDFs or files (e.g., catering menu, allergen list)
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
  - **Greeting** — activates when a customer says hello/hi/hey
  - **Keyword** — activates when a specific word or phrase is detected
  - **Order** — activates on order-related messages
  - **Inquiry** — activates on general questions
  - **Fallback** — activates when no other flow matches
- **Trigger value** — the keyword(s) to listen for (comma-separated)
- **Platform** — which platform this flow runs on (WhatsApp, Instagram, etc.)
- **Steps editor** — define the sequence of messages the bot sends
- **Active / Inactive toggle** — pause a flow without deleting it
- **Trigger count** — how many times this flow has been activated
- **Edit / Delete flows** — full management
- **Multi-turn support** — flows can ask questions and wait for the customer's answer before continuing

**Reads from:** ChatbotFlows table  
**Writes to:** ChatbotFlows (creates, updates), messages (sends automated replies during flow execution)  
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
- **Mentions feed** — live list of all detected mentions, newest first:
  - Platform logo + username
  - Full mention text
  - Sentiment badge (Positive / Neutral / Negative)
  - Date and time
  - Link to original post
- **Filter by status** — All Mentions / Not Handled / Handled
- **Sentiment filter** — All / Positive / Negative / Neutral
- **AI Generate Reply button** — one click suggests a reply to the mention
- **Mark as Handled button** — marks a mention as resolved (persisted to database)
- **Unmark Handled** — undo the handled mark
- **Handled count badge** — summary of how many mentions have been addressed

**Reads from:** ListeningKeywords, listeningMentions  
**Writes to:** ListeningKeywords (create/edit), listeningMentions (handled status)  
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
  - Bar chart — day-by-day breakdown of Auto-sent / Manual / Escalated
- **Inbox tab:**
  - Reply volume chart by day
  - Channel breakdown — which platforms are most active
  - Escalation trend
- **Content tab:**
  - Published posts count
  - Engagement metrics (likes, comments, reach, shares)
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
- **Team login system** — members log in using their unique member ID (invite link)
- **Role enforcement** — the platform automatically restricts what each role can do

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

**How rules override AI confidence:**
- A "Contains Word: refund" + "Action: Escalate" rule ensures any message with "refund" is always escalated to a human, regardless of AI confidence
- A "Is a Question" + "Action: Auto-Send" rule sends all question replies automatically if the AI generates any reply at all

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
- **Platform credentials panel** — input or revoke API access tokens for each client's platforms
- **Switch to Client** — impersonate a client to manage their account directly (uses x-client-id internally)
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
- Your most-used reply templates for that platform

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
The complete conversation history and system instructions are sent to Claude AI (claude-haiku-4-5-20251001). Claude AI returns a JSON response with two things:
1. `reply` — the suggested reply text
2. `confidence` — a number from 0 to 100 representing how confident the AI is in the reply

**Step 6 — Apply the 3-Tier Routing System**  
The confidence score determines what happens next.

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

Rules are checked after the AI generates a reply and override the confidence tier. The AI still writes the reply — the rule only changes what happens to it.

---

### How Flows Bypass the AI Entirely

Chatbot Flows are a completely different path from AI replies. When a customer's message matches a Flow trigger, the system runs the scripted Flow instead of calling Claude AI.

**Example:** A customer sends "hi" on WhatsApp. You have a Greeting Flow that:
1. Sends: "Welcome to Raleigh Eats! 👋 How can I help you today?"
2. Sends: "Reply with: 1 for Menu · 2 for Hours · 3 for Order Status"
3. Waits for the customer's reply
4. Based on their answer, continues the next step of the flow

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
2. **Webhook receives it** — WhatsApp Business API sends the message to SocialPilot's webhook endpoint (`/webhook/whatsapp`).
3. **Contact sync** — The system checks if this phone number already exists in Contacts. If not, it creates a new contact record automatically. If yes, it updates their "last seen" date.
4. **Conversation check** — The system finds or creates the conversation thread for this customer.
5. **Flow check** — The system scans all active Flows to see if the message triggers any keyword. If "deliver" is a Flow keyword, the Flow runs and skips steps 6–11.
6. **Message stored** — The inbound message is saved to the messages table with direction = "inbound".
7. **AI reply generated** — The system calls Claude AI with the full conversation history, knowledge base, tone settings, and any custom instructions.
8. **Confidence scored** — Claude returns a reply and a confidence score (e.g., 88%).
9. **Automation rules checked** — The system evaluates all active automation rules for matches.
10. **Tier routing applied** — 88% confidence = Tier 1 = `auto_sent` (or overridden by a rule if one matches).
11. **Reply delivered** — The system calls the WhatsApp Business API and sends the reply to the customer.
12. **Conversation updated** — The conversation's `lastMessage` and `lastMessageAt` are updated. Unread count resets.
13. **Analytics updated** — The message is recorded as "auto_sent" and included in today's analytics bucket.
14. **Staff sees it** — In the Inbox, the conversation shows the auto-sent reply with a green "Auto-sent" badge.

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
3. **Flow check** — The system checks all active Flows. A "Greeting" flow is active for WhatsApp with trigger value "hello|hi|hey".
4. **Flow matched** — The Greeting flow activates.
5. **Step 1 executes** — Bot sends: "Welcome to Raleigh Eats! 👋 How can we help you today? Reply with: 1 for Menu · 2 for Hours · 3 for Delivery"
6. **Customer replies "2"** — Message arrives back at the webhook.
7. **Active flow detected** — The system recognizes this conversation has an active flow in progress.
8. **Step 2 executes** — Bot sends: "We're open Monday–Saturday 10 AM to 9 PM and Sunday 12 PM to 7 PM. 🕙"
9. **Flow completes** — The active flow state is cleared.
10. **Conversation appears in Inbox** — Staff can see the full exchange and follow up if needed.
11. **Trigger count incremented** — The flow's trigger count goes up by 1.

---

### Workflow 4 — Content Publishing

1. **Staff opens Content Scheduler** — Clicks "Create Post."
2. **Selects platforms** — Checks Instagram and TikTok.
3. **Enters prompt** — "Summer promotion for our new seasonal dishes — fresh and exciting."
4. **Clicks Generate Caption** — Claude AI reads the Knowledge Base (business info, current offers) and generates: "✨ Summer just got tastier! Introducing our new seasonal menu — crafted fresh every day. Come taste the difference! 🌿" with hashtags: seasonal, summervibes, freshfood.
5. **Staff clicks Generate Image** — DALL-E 3 generates a vibrant food photography image based on the brand style guide.
6. **Staff schedules it** — Sets date and time for next Tuesday at 11 AM.
7. **Post saved** — Status = "Scheduled."
8. **Scheduler runs** — At 11 AM Tuesday, the background scheduler wakes up, finds the post, and calls the Instagram and TikTok APIs to publish it.
9. **publishedAt recorded** — The post's `publishedAt` timestamp is saved.
10. **Initial metrics captured** — The system records initial engagement metrics (simulated based on platform averages in demo; real metrics from API in production).
11. **Post visible in Analytics** — Content tab shows the post's performance.
12. **Metrics refreshed** — Every 6 hours, the system refreshes metrics for all posts published in the last 7 days.

---

### Workflow 5 — WhatsApp Campaign

1. **Staff opens Campaigns** — Clicks "Create Campaign."
2. **Writes the message** — "🌙 Ramadan Kareem! We're offering 20% off all orders this week. Use code RAMADAN20. Valid until Friday."
3. **Selects audience** — Chooses "By Tag" → selects "vip" tag.
4. **Live reach preview** — The platform shows "Estimated reach: 120 contacts" based on the actual contact database.
5. **Schedules it** — Sets date for Monday 9 AM.
6. **Staff clicks Save** — Campaign saved as "Scheduled."
7. **Campaign dispatches Monday 9 AM** — System looks up all contacts tagged "vip" with WhatsApp handles, sends the message to each via the WhatsApp Business API.
8. **sentCount recorded** — Campaign shows "120 Sent."
9. **Replies arrive** — Customers who reply to the campaign message trigger new webhook events, creating new conversation threads in the Inbox.
10. **Results visible** — Campaign card shows Sent: 120 · Read: 76 · Replies: 14 · Read Rate: 63%.
11. **Analytics updated** — Campaign data feeds into the Campaigns analytics tab.

---

### Workflow 6 — Brand Mention (Listening)

1. **Keyword is set up** — Staff added "Raleigh Eats" as a monitored keyword on Instagram and TikTok.
2. **Mention detected** — A user posts on Instagram: "Just tried Raleigh Eats for the first time — absolutely insane food, 10/10!"
3. **Mention stored in database** — Added to `listeningMentions` with sentiment = "positive."
4. **Staff opens Listening page** — Sees the mention appear in the feed with a green "Positive" badge.
5. **Staff clicks Generate Reply** — Claude AI reads the mention and the Knowledge Base and suggests: "Thank you so much! 😍 We're thrilled you loved it — can't wait to see you again soon! ❤️"
6. **Staff reviews and approves** — Clicks Approve.
7. **Reply sent** — Posted as a comment reply on Instagram.
8. **Staff marks as handled** — Clicks "Mark Handled." The mention now shows a grey checkmark.
9. **Handled count updates** — The handled counter on the Listening page increments.

---

### Workflow 7 — Agency Onboarding a New Client

1. **Agency signs in** — Agency Admin logs into their SocialPilot account at `/agency/dashboard`.
2. **Creates client account** — Goes to Agency Clients → Add Client → enters client name, owner name, and email.
3. **Assigns platform permissions** — Enables "Instagram: Comments ✅ Messages ✅" and "WhatsApp: Messages ✅" for this client.
4. **Enters platform credentials** — Pastes the client's Instagram Graph API token and WhatsApp Business token into the credentials panel.
5. **Client logs into their own account** — The business owner uses their own credentials to log in to SocialPilot.
6. **Client fills Knowledge Base** — Goes to Resources and adds their business info, opening hours, menu items, and FAQs.
7. **Client configures tone** — Goes to Settings and sets tone to "Friendly" in Arabic for WhatsApp, and "Fun" in English for Instagram.
8. **Client creates Flows** — Sets up a Greeting flow on WhatsApp.
9. **Client creates Automation Rules** — Sets "Contains Word: refund" → "Escalate."
10. **Agency switches into client view** — Uses the "Switch to Client" feature with `x-client-id` header to verify everything looks correct from the client's perspective.
11. **Client goes live** — From this point, all incoming messages and comments are handled automatically by the AI with human review for medium and low confidence replies.

---

### Workflow 8 — New Contact Created Automatically

1. **New customer sends first-ever WhatsApp message** — "Is your terrace open tonight?"
2. **Webhook receives the message** — `contactId` = "+19195551234", `contactName` = "Leila Hassan".
3. **Contact sync runs** — The system calls `syncContact()` with the customer's WhatsApp number and name.
4. **No existing match found** — The system searches for a contact with a matching WhatsApp handle. None found.
5. **New contact created** — A new contact is created in the database:
   - Name: "Leila Hassan"
   - Handles: `[{ channel: "whatsapp_business", username: "+19195551234" }]`
   - TotalConversations: 1
   - LastSeenAt: now
6. **Conversation created** — The system creates or finds the conversation thread.
7. **Reply generated and sent** — AI answers the question about the terrace.
8. **Contact available in CRM** — Staff can open the Contacts page, find Leila Hassan, add her tags (e.g., "regular"), add her email, and include her in future campaigns.
9. **Next message she sends** — System finds her existing contact, increments `totalConversations`, and updates `lastSeenAt`. Her full history is visible in her contact profile.

---

## 6. Data Architecture (in Plain Language)

Each piece of information SocialPilot stores lives in a "table" inside the database. Think of each table as a spreadsheet with columns.

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
**Key columns:** User ID, platform (instagram/tiktok/etc.), feature (comments/messages), token (encrypted), expiry.  
**Connected to:** Users.  
**Features that depend on it:** All platform delivery (sending replies, posting content). If a token is missing or expired, replies cannot be delivered.

---

### `toneSettings` — AI Personality Per Platform
**What it stores:** How the AI should behave on each platform for each user.  
**Key columns:** User ID, platform, tone (friendly/professional/fun/informative), language (ar/en/ar_en), blocked words, custom instructions.  
**Connected to:** Users.  
**Features that depend on it:** Every AI reply generation call reads this before building the Claude prompt.

---

### `conversations` — DM & Comment Threads
**What it stores:** Each unique conversation thread between a business and a customer.  
**Key columns:** User ID, contact ID (platform user ID), contact name, contact handle, channel, last message, last message date, status, priority, assigned team member, tags.  
**Connected to:** Users, messages (one conversation has many messages).  
**Features that depend on it:** Inbox, analytics, contact sync.

---

### `messages` — Individual Messages
**What it stores:** Every single message sent or received in every conversation.  
**Key columns:** Conversation ID, direction (inbound/outbound), content, AI reply, AI confidence score, reply status, sent by (ai/human), timestamp.  
**Connected to:** Conversations.  
**Features that depend on it:** Inbox message display, AI reply generation, analytics (counts auto_sent/manual/escalated).

---

### `comments` — Public Social Comments
**What it stores:** Public comments on TikTok/Instagram/Facebook posts.  
**Key columns:** User ID, platform, username, comment text, AI reply, confidence, status, platform comment ID, video ID (for TikTok), timestamp.  
**Connected to:** Users.  
**Features that depend on it:** Comments page, AI reply for comments, platform delivery.

---

### `resources` — Knowledge Base Entries
**What it stores:** All the business information the AI uses to generate accurate replies.  
**Key columns:** User ID, type (info/hours/menu_item/offer/faq/document), title, content (JSON), file URL, active flag.  
**Connected to:** Users.  
**Features that depend on it:** EVERY AI reply generation call, content generation, template generation, listening reply generation.

---

### `replyTemplates` — Saved Reply Templates
**What it stores:** Pre-written reply templates that staff can reuse.  
**Key columns:** User ID, title, content (with `{{name}}` variables), platforms, language, category, usage count, active flag.  
**Connected to:** Users.  
**Features that depend on it:** Templates page, Inbox (quick insert), AI template generation, knowledge context (templates feed into AI prompts).

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
**Connected to:** ScheduledPosts.  
**Features that depend on it:** Content Scheduler metrics tab, Analytics.

---

### `campaigns` — Broadcast Messages
**What it stores:** WhatsApp bulk campaigns.  
**Key columns:** User ID, name, message, media URL, platform, audience type, audience value, scheduled date, status, sent count, read count, reply count.  
**Connected to:** Users.  
**Features that depend on it:** Campaigns page, Analytics campaigns tab.

---

### `chatbotFlows` — Automated Conversation Scripts
**What it stores:** Keyword-triggered conversation flows.  
**Key columns:** User ID, name, trigger type, trigger value (keywords), platform, steps (JSON array), active flag, trigger count.  
**Connected to:** Users.  
**Features that depend on it:** Flows page, webhook (checks for flow triggers on every inbound message).

---

### `automationRules` — Reply Routing Rules
**What it stores:** Rules that override AI confidence routing.  
**Key columns:** User ID, name, trigger type, trigger value, action, action value, channels (JSON array), active flag.  
**Connected to:** Users.  
**Features that depend on it:** Every AI reply generation (rules evaluated after confidence scoring).

---

### `contacts` — Customer CRM
**What it stores:** Every customer who has ever contacted the business.  
**Key columns:** User ID, name, phone, email, handles (JSON: channel + username pairs), tags (JSON array), notes, total conversations count, last seen date.  
**Connected to:** Users.  
**Features that depend on it:** Contacts CRM page, Campaigns (audience targeting), analytics.

---

### `teamMembers` — Staff Accounts
**What it stores:** Team members invited to the account.  
**Key columns:** Owner user ID, name, email, role (admin/agent/viewer), status (invited/active/disabled).  
**Connected to:** Users (owner), internalNotes.  
**Features that depend on it:** Team page, team login, role-based access control on all routes.

---

### `internalNotes` — Team Collaboration Notes
**What it stores:** Private notes staff write about a conversation (customers never see these).  
**Key columns:** Conversation ID, user ID (owner), author name, note content, created date.  
**Connected to:** TeamMembers, conversations.  
**Features that depend on it:** Inbox internal notes tab.

---

### `listeningKeywords` — Brand Monitoring Keywords
**What it stores:** Keywords to monitor for brand mentions.  
**Key columns:** User ID, keyword text, platforms (JSON array), active flag, mention count.  
**Connected to:** Users, listeningMentions.  
**Features that depend on it:** Listening page keyword management.

---

### `listeningMentions` — Detected Brand Mentions
**What it stores:** Every brand mention detected for a keyword.  
**Key columns:** User ID, keyword ID, keyword text, platform, username, mention content, URL, sentiment, handled flag, handled date, timestamp.  
**Connected to:** Users, listeningKeywords.  
**Features that depend on it:** Listening feed, handled/unhandled tracking, AI reply for mentions.

---

### `calls` — Phone Call History
**What it stores:** Every inbound and outbound phone call.  
**Key columns:** User ID, conversation ID (optional), Twilio call SID, direction, to/from numbers, contact name, status, duration, recording URL, notes, start/end times.  
**Connected to:** Users, conversations.  
**Features that depend on it:** Phone page, Inbox (calls linked to conversations).

---

### `brandSettings` — Visual Brand Style
**What it stores:** Your brand's visual style description for AI image generation.  
**Key columns:** User ID (unique — one record per user), image style description.  
**Connected to:** Users.  
**Features that depend on it:** Content Scheduler image generation (DALL-E uses this style guide).

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
| **Model used** | claude-haiku-4-5-20251001 (fast, cost-efficient) |
| **Where used** | Inbox reply generation, Comments reply generation, Content caption generation, Templates generation, Listening reply generation |
| **Configuration** | Requires `ANTHROPIC_API_KEY` environment variable |
| **If it goes down** | AI reply buttons will fail with an error. All manual reply features (typing and sending) continue to work. Pending reviews already in the queue are not affected. |
| **Demo fallback** | If `ANTHROPIC_API_KEY` is not set, a console warning is shown and AI calls will fail gracefully |

---

### OpenAI DALL-E 3

| Field | Details |
|---|---|
| **What it does** | Generates custom images for social media posts based on a text prompt and your brand style guide |
| **Where used** | Content Scheduler → Generate Image button |
| **Configuration** | Requires `OPENAI_API_KEY` environment variable |
| **If it goes down** | Falls back to Unsplash stock photos (a random food/lifestyle photo is returned instead) |
| **Demo fallback** | Stock photo fallback is always active when `OPENAI_API_KEY` is not set |

---

### WhatsApp Business Cloud API (Meta)

| Field | Details |
|---|---|
| **What it does** | Sends and receives WhatsApp messages between customers and the business |
| **Where used** | Inbox (WhatsApp DMs), Campaigns (broadcast sends), webhook (receives incoming messages) |
| **Configuration** | Requires `WHATSAPP_PHONE_NUMBER_ID` + Meta access token per client (set in Agency Clients or Platform settings) |
| **Webhook** | Meta sends incoming messages to `/webhook/whatsapp` — SocialPilot processes them and creates conversation records |
| **If it goes down** | Incoming messages are lost (Meta does not retry indefinitely). Outbound replies queue but cannot be sent. |

---

### Instagram Graph API (Meta)

| Field | Details |
|---|---|
| **What it does** | Posts comment replies on Instagram, sends Instagram DMs, receives webhooks for new comments and DMs |
| **Where used** | Comments page (Instagram comments), Inbox (Instagram DMs), Content Scheduler (publishing to Instagram) |
| **Configuration** | Instagram Graph API access token per client |
| **If it goes down** | Replies cannot be sent to Instagram. Content publishing will fail and the post status will be marked "Failed." |

---

### Facebook Graph API (Meta)

| Field | Details |
|---|---|
| **What it does** | Posts comment replies on Facebook, sends Facebook Messenger messages, receives webhooks |
| **Where used** | Comments page (Facebook comments), Inbox (Facebook Messenger DMs) |
| **Configuration** | Facebook Page access token per client |
| **If it goes down** | Same as Instagram — replies and posts to Facebook will fail. |

---

### TikTok Open API

| Field | Details |
|---|---|
| **What it does** | Posts comment replies on TikTok videos, receives webhooks for new comments |
| **Where used** | Comments page (TikTok comments), Content Scheduler (publishing videos/posts to TikTok) |
| **Configuration** | TikTok API access token per client |
| **Note** | TikTok replies require both the Video ID and Comment ID — both are captured when the webhook receives the comment |
| **If it goes down** | TikTok comment replies fail. Posts are not delivered. |

---

### Twilio (Phone Calls)

| Field | Details |
|---|---|
| **What it does** | Makes and receives phone calls, records calls, and sends call status updates back to SocialPilot |
| **Where used** | Phone page (call log), Inbox (call button on phone channel conversations) |
| **Configuration** | Requires `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`, and `APP_URL` environment variables |
| **Webhook** | Twilio posts call status updates to `/webhook/calls/status` (no authentication — uses Twilio signature verification) |
| **If it goes down** | Phone calls cannot be initiated or received. Existing call records are unaffected. |

---

### PostgreSQL Database

| Field | Details |
|---|---|
| **What it does** | Stores all data permanently — conversations, messages, contacts, campaigns, posts, settings, credentials |
| **Where used** | Every single feature of the platform |
| **Configuration** | `DATABASE_URL` environment variable (automatically provided by Railway if using their PostgreSQL plugin) |
| **If it goes down** | The entire platform stops working — no data can be read or written. All API calls return 500 errors. |

---

## 8. Current Platform Status

### What Is 100% Working End-to-End

| Feature | Status |
|---|---|
| User login / logout (demo accounts) | ✅ Fully working |
| Dashboard KPI cards | ✅ Fully working |
| Inbox — view conversations and messages | ✅ Fully working |
| Inbox — generate AI reply (requires API key) | ✅ Fully working |
| Inbox — approve / reject / edit replies | ✅ Fully working |
| Inbox — mark conversation resolved | ✅ Fully working |
| Inbox — internal notes | ✅ Fully working |
| Inbox — assign to team member | ✅ Fully working |
| Comments — view and manage | ✅ Fully working |
| Knowledge Base — all resource types CRUD | ✅ Fully working |
| Reply Templates — CRUD + AI generation | ✅ Fully working |
| Content Scheduler — create/edit/delete posts | ✅ Fully working |
| Content — AI caption generation | ✅ Fully working |
| Content — schedule and publish (with credentials) | ✅ Fully working |
| Content — post metrics tracking | ✅ Fully working |
| Campaigns — CRUD | ✅ Fully working |
| Campaigns — real audience reach from contacts | ✅ Fully working |
| Contacts CRM — CRUD | ✅ Fully working |
| Contacts — auto-created from inbound messages | ✅ Fully working |
| Chatbot Flows — CRUD | ✅ Fully working |
| Chatbot Flows — multi-turn execution on webhook | ✅ Fully working |
| Listening — keywords CRUD | ✅ Fully working |
| Listening — mentions with stable IDs | ✅ Fully working |
| Listening — mark handled / unhandled (persisted) | ✅ Fully working |
| Automation Rules — CRUD | ✅ Fully working |
| Automation Rules — override AI confidence | ✅ Fully working |
| Team members — CRUD + role enforcement | ✅ Fully working |
| Team member login (team-login endpoint) | ✅ Fully working |
| Settings — tone/language/blocked words per platform | ✅ Fully working |
| Brand settings — image style | ✅ Fully working |
| Analytics — date range (7d/30d/90d) | ✅ Fully working |
| Analytics — real message data (not mocked) | ✅ Fully working |
| Agency — client list and stats | ✅ Fully working |
| Agency — platform permissions management | ✅ Fully working |
| Agency — switch to client context | ✅ Fully working |
| Phone — call history | ✅ Fully working |
| Phone — outbound call initiation | ✅ Working (requires Twilio credentials) |
| Startup env warnings (missing keys) | ✅ Fully working |
| AI model name centralized in constants.ts | ✅ Fully working |

---

### What Is Working but Requires Real Platform Credentials

| Feature | What's Needed |
|---|---|
| Sending replies to Instagram | Instagram Graph API token |
| Sending replies to Facebook | Facebook Page access token |
| Sending replies to TikTok | TikTok Open API token |
| Sending WhatsApp messages | WhatsApp Business API phone number ID + token |
| Receiving inbound messages from platforms | Public webhook URL + platform webhook registration |
| Publishing posts to Instagram/TikTok/Facebook | Platform-specific publish permissions in API token |
| Generating AI images with DALL-E | `OPENAI_API_KEY` |
| Phone calls | Twilio account credentials |

Without these credentials, the platform shows all features correctly in the UI and stores data in the database — but outbound platform delivery is gracefully skipped (the system logs `{ ok: false, skipped: true }` and does not crash).

---

### What Requires Production Environment to Fully Verify

| Feature | Reason |
|---|---|
| Inbound webhook from WhatsApp | Requires a public HTTPS URL that Meta can reach — not available on localhost |
| Instagram comment webhooks | Same — Meta requires HTTPS + webhook verification challenge |
| TikTok webhooks | Same — requires platform webhook registration |
| Twilio call status callbacks | Requires public HTTPS URL for Twilio to send status updates |
| Scheduler (post publishing at exact time) | Background scheduler runs fine locally, but exact-time reliability requires persistent server (Railway recommended) |
| Metrics refresh (every 6 hours) | Same — requires always-on server |
| API token encryption at rest | Current: plaintext storage. Production: AES-256 encryption recommended before going live |

---

### Known Limitations

1. **Flow state is in-memory:** Chatbot flow states (tracking which step a customer is on) are stored in the server's memory. If the server restarts, active flow conversations lose their state. For production, this should be migrated to Redis or a database table.

2. **No email invitations:** Team members are "invited" by giving them their member UUID to log in with. A proper invite-by-email system is not yet implemented.

3. **Social listening is simulated:** Real keyword monitoring requires API access to each platform's search APIs. The current listening feed seeds realistic mock data on first load — real integration requires platform API upgrades.

4. **Campaign delivery is simulated:** The current campaign send creates plausible sent/read/reply counts in the database. Real bulk WhatsApp delivery requires WhatsApp Business API broadcast permissions.

5. **File upload stores locally:** Document uploads in the Knowledge Base save files to a local `/uploads` folder. In production, this should use S3 or Cloudflare R2.

6. **Token encryption pending:** Platform credentials are currently stored as plaintext in the database. Encrypt them before storing real customer tokens in production.

---

## 9. Setup Checklist

### From Zero to First Live AI Reply

Follow these steps in order to set up SocialPilot for a new client.

---

**Phase 1 — Environment Setup**

- [ ] 1. Clone the repository to your server (Railway, VPS, etc.)
- [ ] 2. Create a PostgreSQL database (Railway provides one automatically)
- [ ] 3. Set the `DATABASE_URL` environment variable pointing to your database
- [ ] 4. Generate a JWT secret: run `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` and set `JWT_SECRET`
- [ ] 5. Set `PORT=3001` and `ALLOWED_ORIGINS=https://your-frontend-domain.com`
- [ ] 6. Set `ANTHROPIC_API_KEY=sk-ant-...` (from console.anthropic.com)
- [ ] 7. (Optional) Set `OPENAI_API_KEY=sk-...` for AI image generation
- [ ] 8. Run database migrations: `cd backend && npx drizzle-kit push`
- [ ] 9. (Optional) Seed demo data: `npx tsx src/db/seed.ts`
- [ ] 10. Start the backend: `npm run build && npm start`
- [ ] 11. Deploy the frontend to Vercel or similar with `VITE_API_URL=https://your-backend.railway.app/api`

---

**Phase 2 — Agency Account Setup**

- [ ] 12. Open the platform in your browser and go to `/login`
- [ ] 13. Log in with your agency admin credentials (or use demo: `agency@demo.com` / `demo123`)
- [ ] 14. Navigate to Agency → Clients
- [ ] 15. Click "Add Client" and enter the new client's business name, owner name, and email
- [ ] 16. In the client's permissions panel, enable the platforms they will use (e.g., Instagram: Comments ✅ Messages ✅, WhatsApp: Messages ✅)
- [ ] 17. Enter the client's platform access tokens in the credentials panel for each enabled platform

---

**Phase 3 — Client Knowledge Base Setup**

- [ ] 18. Log into the client's account (either directly or via Switch to Client)
- [ ] 19. Go to Resources → add Business Info (name, description, address, phone, email)
- [ ] 20. Add Operating Hours for each day of the week
- [ ] 21. Add at least 5 Menu Items or Products with names, descriptions, and prices
- [ ] 22. Add any current Offers or Promotions
- [ ] 23. Add 5–10 FAQs covering the most common customer questions
- [ ] 24. Confirm all resources show "Active" status

---

**Phase 4 — AI Settings Configuration**

- [ ] 25. Go to Settings
- [ ] 26. For each connected platform (TikTok, Instagram, Facebook, WhatsApp):
  - [ ] Select the appropriate Tone (Friendly recommended for most businesses)
  - [ ] Select the Language (Arabic, English, or Mixed)
  - [ ] Add any Blocked Words (competitor names, inappropriate terms, etc.)
  - [ ] Add Custom Instructions (e.g., "Always mention our loyalty program", "Never promise same-day delivery")
- [ ] 27. Click Save for each platform

---

**Phase 5 — Automation Rules**

- [ ] 28. Go to Automation
- [ ] 29. Create a rule for complaint handling: Trigger = "Contains Word: refund, cancel, complaint, angry" → Action = "Escalate"
- [ ] 30. Create a rule for simple questions: Trigger = "Is a Question" → Action = "Auto-Send" (only if you trust the knowledge base is complete)
- [ ] 31. (Optional) Create rules for specific keywords relevant to your business

---

**Phase 6 — Chatbot Flows**

- [ ] 32. Go to Flows
- [ ] 33. Create a Greeting flow for WhatsApp:
  - Trigger: Greeting
  - Step 1: Welcome message with menu options
- [ ] 34. Set the flow to Active
- [ ] 35. Test by sending a "hello" to the WhatsApp number

---

**Phase 7 — Team Setup**

- [ ] 36. Go to Team
- [ ] 37. Add each team member with their name, email, and role (Admin/Agent/Viewer)
- [ ] 38. Share each member's unique member ID with them to use for their first login at `/login`
- [ ] 39. Confirm each member can log in and sees the correct pages based on their role

---

**Phase 8 — Webhook Registration (requires public URL)**

- [ ] 40. Get your server's public HTTPS URL (e.g., `https://socialpilot.railway.app`)
- [ ] 41. Register the webhook URL with each platform:
  - **WhatsApp**: Meta Developer Console → WhatsApp → Configuration → Webhook URL: `https://your-server.com/webhook/whatsapp`
  - **Instagram**: Meta Developer Console → Instagram → Webhooks → `https://your-server.com/webhook/instagram`
  - **Facebook**: Meta Developer Console → Facebook → Webhooks → `https://your-server.com/webhook/facebook`
  - **TikTok**: TikTok Developer Portal → App → Events → `https://your-server.com/webhook/tiktok`
  - **Twilio**: Twilio Console → Phone Numbers → your number → Voice → Status Callback: `https://your-server.com/webhook/calls/status`
- [ ] 42. Verify each webhook with the platform's challenge verification

---

**Phase 9 — First Live Test**

- [ ] 43. Send a test WhatsApp message to the connected phone number
- [ ] 44. Confirm it appears in the Inbox within a few seconds
- [ ] 45. Click "Generate AI Reply" and verify it uses your Knowledge Base correctly
- [ ] 46. Approve the reply and verify it is delivered back to WhatsApp
- [ ] 47. Post a test comment on the connected Instagram post
- [ ] 48. Confirm it appears in the Comments page and receives an AI reply
- [ ] 49. Check Analytics to verify the message counts are updating
- [ ] 50. 🎉 System is live!

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
| **Trigger** | المشغّل | The keyword or phrase that activates a Flow. For example, the word "hello" could be the trigger for a Greeting Flow. |
| **Step** | خطوة | One message in a Flow. A Flow can have multiple steps, each sending a different message. |
| **Webhook** | خطاف الويب | A technical connection between an external platform (like WhatsApp or TikTok) and SocialPilot. When a customer sends a message on WhatsApp, WhatsApp immediately calls SocialPilot's webhook to deliver it. Invisible to users — it just makes messages appear in real time. |
| **API Token / Access Token** | رمز الوصول | A secret password that allows SocialPilot to act on behalf of your business account on a platform (like Instagram or WhatsApp). Without it, replies cannot be sent. |
| **Platform Credential** | بيانات اعتماد المنصة | The combination of API tokens that connect SocialPilot to an external platform. Entered by the Agency Admin or Client Admin. |
| **Automation Rule** | قاعدة الأتمتة | A condition + action pair. Example: "IF the message contains the word 'refund' THEN always escalate it." Rules override the AI's confidence routing. |
| **Sentiment** | المشاعر / النبرة العاطفية | The emotional tone of a message or mention. Positive (إيجابي) = happy customer. Negative (سلبي) = unhappy or complaining. Neutral (محايد) = no strong emotion. |
| **Mention** | إشارة | A post by a customer on social media that includes your keyword (like your business name). Found and tracked by the Listening feature. |
| **Listening** | الرصد الاجتماعي | The feature that monitors social media for mentions of your chosen keywords. Like setting up a Google Alert, but for TikTok, Instagram, and Facebook. |
| **Handled** | تم التعامل معه | A mention that a team member has responded to and marked as resolved. Stays in the database permanently. |
| **Contact** | جهة اتصال | A profile record for one customer — including their name, phone number, email, platform handles, and conversation history. Created automatically when a new customer messages you. |
| **Tag** | وسم | A label you apply to a contact or conversation to categorize it. Examples: "vip", "complaint", "order-inquiry", "new-customer". |
| **Handle** | المعرّف على المنصة | A customer's username on a platform. For example, `@jessica_nc` on Instagram, or `+19195551234` on WhatsApp. |
| **Channel** | القناة | A specific communication type on a specific platform. For example, "WhatsApp Business messages" is one channel. "Instagram DMs" is another. "TikTok comments" is another. |
| **Draft** | مسودة | A post or reply that has been created but not yet scheduled or sent. |
| **Scheduled** | مجدوَل | A post that has been assigned a date and time to be published automatically. |
| **Published** | منشور | A post that has been successfully posted to the platform. |
| **Failed** | فشل | A post or reply that could not be delivered — usually because the platform credential is missing or expired. |
| **Agency** | الوكالة | A social media management company that uses SocialPilot to manage multiple business clients at once. |
| **Client** | العميل | A business account managed by an agency inside SocialPilot. |
| **Admin** | المشرف | The highest permission role. Can change settings, manage team members, and do everything. |
| **Agent** | الوكيل / المشغّل | A team member who can respond to conversations and handle daily tasks, but cannot change settings or manage the team. |
| **Viewer** | المراقب | A read-only team member. Can see everything but cannot send or change anything. |
| **3-Tier Routing** | نظام التوجيه الثلاثي | The system that decides whether an AI reply is sent automatically (high confidence), put in review (medium confidence), or escalated to a human (low confidence). |
| **Post Metrics** | مقاييس المنشور | The performance numbers for a published post: Likes (إعجابات), Comments (تعليقات), Reach (مدى الوصول), Shares (مشاركات). |
| **Internal Note** | ملاحظة داخلية | A private comment that team members write about a conversation. The customer NEVER sees these. Only team members see them. |
| **Scheduler** | المجدوِل | The background process that checks every minute for posts that are due to be published and automatically sends them to the platforms. |
| **Demo Mode** | الوضع التجريبي | A mode that works without real platform connections. Uses sample data so you can explore all features without real customers or real API credentials. |

---

*End of Documentation — SocialPilot Platform, Post Phase-2 Build*
