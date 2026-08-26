# Roy AI Agency — Platform Spec & Rebuild Assessment

> Reverse-engineered from the current codebase (branch `claude/social-pilot-platform-0MDm3`).
> Purpose: give you a clean, written picture of everything the platform does today, an
> honest catalog of the mess that requirement-churn left behind, and a concrete
> recommendation on **rebuild-from-scratch vs. clean-in-place**.

---

## 0. The decision, up front

You asked: *"should I rebuild this from scratch, cleanly, maybe in a better way?"*

**My honest answer: no — don't rewrite from scratch. Do a clean re-architecture in place.**

Three reasons, grounded in what the survey found:

1. **The stack is already the "better way."** React + TypeScript + Vite + Tailwind +
   TanStack Query on the front; Hono + Postgres + Drizzle ORM on the back. That is a
   modern, clean, well-chosen stack in 2026. There is no mainstream language/framework
   you'd move to that would be a meaningful upgrade — you'd spend months to land back in
   roughly the same place.

2. **The "complexity" you feel is drift, not bad architecture.** The survey found the
   messiness is concentrated and *nameable*: two completed renames (Campaigns→Outreach,
   Calls→Phone) that left dead files and double-mounted routes behind, a handful of
   duplicated helpers, and some placeholder/mock data never swapped for real. That is
   ~2–4 days of deletion and consolidation — not a rewrite. See §7, the Drift Catalog.

3. **The hard-won value is the integration logic, and a rewrite throws it away.** The
   Meta Graph publishing flow, Twilio SMS/voice, the webhook ingestion pipeline, the
   AES-256-GCM token encryption + proactive Meta token refresh, the multi-turn flow
   engine with persisted sessions, and the AI confidence-routing — these are the parts
   that take weeks to get right and are *already working*. A from-scratch rebuild
   re-earns every one of those bugs.

**What "clean rebuild feeling" actually costs here:** a focused cleanup sprint (§8, Path R1)
gets you ~80% of the "it feels clean again" payoff for ~10% of the risk of a rewrite,
while keeping the app shippable the whole time. If after that you still want structural
changes (e.g. unify the two AI-reply pipelines), this spec is the blueprint — and you can
do those module-by-module without a big-bang rewrite.

If you still want a from-scratch rebuild after reading this, §8 Path R3 tells you how to
do it *safely* (keep the DB schema, port module-by-module, same stack). But R1 is my
recommendation.

---

## 1. What the product is

**Roy AI Agency** (internally still branded "SocialPilot" — see drift §7) is a
single-agency, multi-client social-media management platform. One agency operates many
client businesses' social presence with AI assistance.

**Two personas, one app:**

- **Client** — a business owner. Sees their own inbox, comments, content calendar,
  outreach campaigns, contacts, knowledge base, analytics, automations, chatbot flows,
  social listening, phone/SMS, team, and AI tone settings.
- **Agency** — the operator. Manages the client roster, per-client platform permissions
  and credentials, cross-client content approval, cross-client outreach monitoring, a
  command center for triage, and agency-wide config. Critically, an agency user can
  **"act as" any client** and drive the full client UI on their behalf (see §5.3).

**The AI core:** every inbound message/comment/mention can get an AI-drafted reply from
Claude, grounded in that client's knowledge base, with a confidence score that routes it
to auto-send / human-review / escalate.

---

## 2. Architecture & stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite, React Router v6, TanStack Query v5, Tailwind, recharts, lucide-react, react-i18next (EN/AR) |
| Backend | Hono (Node server), Drizzle ORM, Zod validation, pino logging |
| Database | PostgreSQL (27 tables, `drizzle-kit push` migrations) |
| AI | Anthropic Claude (`claude-haiku-4-5`) for text; OpenAI DALL·E-3 for post images |
| Integrations | Meta Graph API (IG/FB/WhatsApp), Twilio (SMS/voice), Resend (email), Sentry |
| Frontend host | Vercel (SPA + `/api/*` proxy rewrite to Railway) |
| Backend host | Railway (Nixpacks; runs `db:push` on every deploy, then `node dist/server.js`) |

**Request flow:** browser → Vercel → (`/api/*` rewrite) → Railway Hono server → Postgres.
Auth is a JWT in an httpOnly `sp_token` cookie. Same-origin is achieved via the Vercel
proxy so the cookie and CORS behave.

**Codebase size:** ~28,600 LOC across 134 TS/TSX files.

---

## 3. Domain model (database)

27 Postgres tables (all UUID PKs, `createdAt` timestamps). Grouped by domain:

- **Auth / identity:** `users` (single role-discriminated table — `client` | `agency`; the FK hub for nearly everything).
- **Agency ↔ client:** `agency_clients` (the mapping + `contentApprovalEnabled`), `platform_permissions` (per-client per-platform comments/messages toggles), `agency_config` (global blocked words), `client_invites` (one-time client setup tokens).
- **Platform connections:** `platform_credentials` (encrypted OAuth tokens per user/platform/feature; `disconnectedAt` flags reconnect-needed), `tone_settings` (per-platform AI voice), `brand_settings` (image style).
- **Inbox / conversations:** `conversations`, `messages` (carries AI reply + confidence + moderation status), `internal_notes`, `contacts` (CRM), `automation_rules`, `reply_templates`.
- **Comment moderation:** `comments` (standalone social-post comments with AI replies — a *parallel* pipeline to `messages`, see drift).
- **Content / publishing:** `scheduled_posts` (publishing lifecycle + approval workflow), `post_metrics` (engagement snapshots — currently simulated), `email_reminders` (approval nudge log).
- **Outreach / broadcast:** `outreach_messages` (campaign def + aggregate counters), `outreach_results` (per-recipient delivery record).
- **Chatbot automation:** `chatbot_flows` (step definitions as JSON), `flow_sessions` (persisted multi-turn state).
- **Listening:** `listening_keywords`, `listening_mentions`.
- **Voice:** `calls` (Twilio records).
- **Team:** `team_members` (invite-based sub-users).
- **Knowledge base:** `resources` (info/hours/menu/offer/document/faq).

**Key enums:** `reply_status` (pending/approved/rejected/edited/auto_sent/escalated),
`post_status` (draft/scheduled/published/failed/skipped/pending_approval/changes_requested),
`platform` (tiktok/instagram/facebook/whatsapp/sms/phone),
`channel` (9 values incl. tiktok_comment, instagram_dm, facebook_messenger, whatsapp_business, sms, phone_call).

Full table-by-table column detail lives in the survey notes; the drift items in the model
(double-modeled approval status, `messages` vs `comments` overlap, inconsistent
enum-vs-text typing of `platform`/`channel`) are cataloged in §7.

---

## 4. Feature inventory

### 4.1 Backend API (mounted under `/api/*`)

| Route | Purpose |
|---|---|
| `/api/auth` | login, team-login (invite token), accept-invite, logout |
| `/api/agency` | agency-global config (global blocked words) |
| `/api/clients` | agency's client-management console: list, stats, create+invite, status/permissions/credentials actions, push-template |
| `/api/conversations` | unified DM inbox: list, history, **generate-reply** (AI), approve/reject/edit action, outbound call, template draft |
| `/api/comments` | social-comment moderation queue: list, action, **generate-reply** (AI) |
| `/api/content` | scheduled posts + approval workflow + AI caption/image generation |
| `/api/outreach` | multi-channel broadcast (WhatsApp/SMS/Email): create, send engine, cancel, duplicate, AI copy, reach calc |
| `/api/campaigns` | **legacy alias — literally re-exports `/api/outreach` (drift, delete)** |
| `/api/resources` | knowledge base CRUD + document upload |
| `/api/dashboard` | home KPIs (some hardcoded placeholders) |
| `/api/analytics` | time-bucketed analytics (`?range=7d\|30d\|90d`) |
| `/api/platforms` | self-serve credential connect/disconnect (non-client roles only) |
| `/api/templates` | reply templates CRUD + AI generate + use-counter |
| `/api/team` | team members (admin-gated) + internal notes |
| `/api/contacts` | CRM: search/filter, update, delete |
| `/api/automation` | trigger→action rule CRUD |
| `/api/flows` | chatbot flow CRUD |
| `/api/listening` | keyword CRUD, mentions feed, AI reply |
| `/api/brand` | image-style setting |
| `/api/settings` | per-platform AI tone settings |
| `/api/calls` | Twilio voice: list, outbound, notes; public HMAC-verified status webhook |
| `/webhook` (public) | inbound platform ingestion (Meta/TikTok/Twilio), signature-verified |

### 4.2 Frontend pages

**Client** (`src/pages/client/`): Dashboard, Inbox, Comments, Content, Outreach, Contacts,
Resources, Analytics, Templates, Automation, Flows, Listening, Phone, Team,
ToneSettings (routed `/settings`).

**Agency** (`src/pages/agency/`): Dashboard, Clients, ClientOnboarding, CommandCenter,
Content (cross-client approval), Outreach (cross-client monitor), Analytics, Settings.

**Auth** (`src/pages/`): Login (+ DEV-only demo fallback), TeamLogin, AcceptInvite.

Each page has a matching TanStack Query hook in `src/hooks/` (`useConversations`,
`useContent`, `useOutreach`, etc.) that wraps the `api` singleton.

---

## 5. Key workflows (the crown jewels — protect these in any rebuild)

### 5.1 AI reply generation + confidence routing
Inbound message/comment → build system prompt from `tone_settings` (tone/language/blocked
words) + **knowledge-base context** (`buildKnowledgeContext` assembles a markdown block
from `resources` + up to 8 `reply_templates` as style examples) → call Claude
(`AI_FAST_MODEL`, strict JSON `{reply, confidence}`) → **3-tier routing**: confidence ≥85
→ `auto_sent` (delivered immediately), ≥50 → `pending` (human review), else `escalated`.
`automation_rules.evaluateRules()` can override the tier. Falls back to canned replies
when `ANTHROPIC_API_KEY` is unset.

### 5.2 Content publishing + approval
Agency creates a post → if client has `contentApprovalEnabled`, it becomes
`pending_approval` → client approves / requests changes → the **scheduler** (`scheduler.ts`,
60s loop) picks up `scheduled` posts whose time has passed → publishes to **Instagram /
Facebook only** (real Graph API two-step); TikTok/WhatsApp are `stubbed` → `skipped`.
Approval reminders fire at 24h/48h/72h via `emailReminder.ts`.

### 5.3 Agency "act-as-client" isolation
The core multi-tenant mechanism. When an agency user selects a client, the frontend
`AgencyClientContext` sets an **`x-client-id` header** on every request. The backend
`clientContextMiddleware` verifies the agency manages that client (via `agency_clients`,
403 otherwise) and rewrites `user.sub` to the client's id — so every downstream handler
transparently scopes to the client with no per-handler changes. Team tokens similarly
rewrite `sub` to `ownerId`.

### 5.4 Webhook ingestion pipeline
Public `POST /webhook/:platform/:userId` → verify signature (Twilio HMAC-SHA1;
Meta/TikTok HMAC-SHA256) → normalize payload to an `InboundEvent` → `upsertConversation`
→ insert inbound message → `syncContact` (CRM upsert) → `scanForMentions` (listening) →
flow engine (continue active flow or check triggers) → fast 200.

### 5.5 Outreach send engine
`POST /outreach/:id/send` → idempotency guard (draft/scheduled only) → mark `sending` →
iterate audience (filtered from `contacts` by `audienceFilter` + channel) → call
WhatsApp/SMS/Email sender per recipient → write `outreach_results` + update counters in a
transaction → `sent`/`failed`. Rate-limited 2/min.

### 5.6 Chatbot flow engine
`flowEngine.ts` matches triggers (keyword/greeting/order/inquiry/fallback, Arabic+English
regex) and runs step types (message, quick_replies, collect_input, condition, handoff).
Multi-turn state persists in `flow_sessions` (survives restarts, scales horizontally).
`collect_input` pauses; next inbound resumes; `handoff` opens the conversation to humans.

---

## 6. Integrations & configuration

- **Claude** (`@anthropic-ai/sdk`): model single-sourced in `lib/constants.ts`
  (`claude-haiku-4-5-20251001`) — clean one-line upgrade point. Used in conversations,
  comments, content, outreach, templates, listening.
- **Meta Graph API** (`platformDelivery.ts`, v19.0): IG/FB comment replies + DMs,
  IG/FB publishing, WhatsApp Cloud messages. Proactive token refresh (`fb_exchange_token`)
  when <7 days to expiry; marks `disconnectedAt` on failure. WhatsApp uses non-expiring
  system tokens (excluded from refresh).
- **Twilio:** SMS + voice (inline TwiML), E.164 normalization, graceful skip without creds.
- **Resend:** team invites + outreach email; console-log fallback without key.
- **OpenAI:** DALL·E-3 for post images only; Unsplash demo URLs without key.
- **Sentry:** backend `@sentry/node` + frontend `@sentry/react` + source-map upload.
- **Encryption:** AES-256-GCM (`crypto.ts`) for stored tokens; **plaintext no-op if
  `ENCRYPTION_KEY` unset** (should be mandatory in prod).

**Required env:** `DATABASE_URL`, `JWT_SECRET`. **Strongly recommended in prod:**
`ENCRYPTION_KEY`, `APP_URL` (drives cookie `secure` flag + invite links), `ANTHROPIC_API_KEY`.
Everything else (Meta, Twilio, Resend, OpenAI, Sentry) is optional and degrades gracefully.

---

## 7. Drift catalog — the actual "mess", itemized

This is the evidence behind §0. Every item is a specific, bounded fix — not a reason to
rewrite. Ordered roughly by cleanup priority.

### Dead code to delete
1. **`backend/src/routes/campaigns.ts`** — just `export { default } from "./outreach.js"`,
   and `server.ts` mounts it at `/api/campaigns` alongside `/api/outreach`. Every outreach
   endpoint is **double-exposed**. Delete the file + the mount; rename the `analytics.ts`
   `campaigns` alias/response key to `outreach`.
2. **`src/hooks/useCampaigns.ts`** — fully dead after the rename; no page imports it. Delete.
3. **`src/pages/client/Calls.tsx`** — orphaned page, never routed (`/calls` → `/phone`
   renders `Phone.tsx`). Delete (keep `useCalls.ts` — still used by `Phone.tsx`).
4. **`AI_DEFAULT_MODEL`** in `constants.ts` — exported, imported nowhere; also identical to
   `AI_FAST_MODEL`, so the "fast vs capable" distinction is fictional.
5. Stale string literals: `navigate("/campaigns")` in `Contacts.tsx`, "Content & Campaigns"
   section title in `ToneSettings.tsx` — point them at `/outreach`.

### Stubbed / mock data masquerading as real
6. **`metricsFetcher.ts`** — the "real platform API" branch is byte-identical to the
   simulation branch; **all post metrics are fabricated**. Also queries credentials with
   `feature: "messages"` while posts publish with `feature: "publishing"` (latent bug,
   moot while simulated).
7. **`listening.ts` `GET /mentions`** seeds 10 random mock mentions into the DB on first
   load — demo scaffolding writing to real tables. Gate or remove for production.
8. **Dashboard/clients placeholders:** `dashboard.ts` returns hardcoded
   `avgResponseTime`, `engagementRate: 87`, empty `platforms`; `clients.ts` list returns
   `replies: 0, platforms: []` per client. Never computed.
9. **`client/Analytics.tsx`** ships hardcoded chart constants (`MSG_7D`, …) marked
   "replace with API when available". `useHealthScore.ts` computes client health in the
   browser from a `DEMO_HEALTH` id→score map.

### Structural drift (unify during re-architecture, not urgent)
10. **`messages` vs `comments`** — two parallel AI-reply-moderation pipelines with divergent
    shapes. Candidate to unify behind one abstraction.
11. **Approval status modeled twice** — `post_status` (pending_approval/changes_requested)
    and `approval_status` (pending/approved/changes_requested) must be manually kept in sync.
12. **Enum-vs-text inconsistency** — `platform`/`channel` are proper enums in some tables,
    plain `text` in `chatbot_flows`, `flow_sessions`, `listening_mentions`, `automation_rules`.
13. **`internal_notes.conversationId` is `text`** (no FK) while `flow_sessions.conversationId`
    is a real UUID FK. Same concept, two representations.
14. **CRM under-integrated** — `conversations.contactId` is free text; only `outreach_results`
    actually FKs to `contacts`. The inbox doesn't link to CRM contacts.
15. **`team_members` has no FK to `users`** — an accepted team invite has no clean path to an
    auth identity.
16. **Scheduled outreach is unimplemented** — `status='scheduled'` is accepted by send/cancel
    but nothing ever *sets* it and the scheduler never publishes `outreach_messages`. Either
    build it or remove the dead paths.

### Duplicated helpers (extract to shared modules)
17. `parseJSON<T>` re-defined in 5 files; `agencyOnly`/`clientOnly` guards duplicated across
    `content.ts`/`outreach.ts` plus inline role checks elsewhere; confidence thresholds
    (85/50) and converters copy-pasted; Twilio HMAC verifier duplicated (`calls.ts` vs
    `webhook.ts`); Resend POST block duplicated (`email.ts` vs `emailReminder.ts`).

### Branding drift
18. "SocialPilot" (cookie `sp_token`, server logs, invite emails, `socialpilot.app` domain)
    vs "Roy AI Agency" (outreach/reminder emails). Pick one product name and purge the other.

---

## 8. Recommended paths

### Path R1 — Cleanup sprint (RECOMMENDED, ~3–5 focused days)
Keep the running app. Execute the Drift Catalog §7 top-down:
- **Day 1 — delete dead code** (items 1–5). Instant clarity win, zero behavior change.
- **Day 2 — de-mock** (items 6–9): either wire the real analytics/metrics contract or
  clearly label simulated data as "demo" behind a flag, so nothing lies about being real.
- **Day 3 — extract duplicated helpers** (item 17) into `lib/shared/`.
- **Day 4–5 — pick the structural unifications you care about** (items 10–16), one at a
  time, each with the app still shippable. Start with the cheapest (11: collapse approval
  status; 18: one brand name).

Outcome: the codebase *feels* rebuilt, you kept every working integration, and you never
had a non-shippable day.

### Path R2 — Re-architecture in place (2–3 weeks)
R1 plus deliberate structural work: unify `messages`+`comments` behind one "moderatable AI
reply" abstraction, introduce Drizzle migration history (stop `db:push`-on-deploy), tighten
the enum typing across all platform/channel columns, and fold thin tables (`brand_settings`)
into a settings table. Same repo, same stack, module-by-module. This is the "clean version"
without the rewrite risk.

### Path R3 — From-scratch rebuild (only if you're set on it; 6–10+ weeks, higher risk)
If you still want a fresh repo: **keep the Postgres schema** (it's good — port it as the
first migration), keep the same stack, and port **module-by-module** against this spec —
auth first, then inbox, then content, then the rest — verifying each against the live app
before moving on. Never big-bang. The integration modules (`platformDelivery`,
`flowEngine`, `webhook`, `crypto`, `scheduler`) should be copied nearly verbatim, not
rewritten — they're the expensive, correct parts. Realistically R3 lands you where R2 does,
later and with more re-introduced bugs. I'd only choose it if there's a business reason
(new owner, licensing, a genuinely different product direction).

---

## 9. Suggested immediate next step

Do **Path R1, Day 1** now — delete the dead code (§7 items 1–5). It's safe, reversible via
git, changes no behavior, and immediately makes the codebase feel less tangled. It's also
the cheapest way to test whether "cleanup" satisfies the itch before committing to anything
bigger. I can do it in one branch + PR whenever you say go.
