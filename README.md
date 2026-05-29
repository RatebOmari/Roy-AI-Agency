# SocialPilot — AI-Powered Social Media Management

<div dir="rtl">

منصة SaaS تردّ تلقائياً على تعليقات ورسائل وسائل التواصل الاجتماعي بالذكاء الاصطناعي، مع لوحة تحكم لمراجعة الردود وإدارة العملاء.

</div>

---

## ✨ Features

- **AI Auto-Reply** — Claude AI generates contextual replies for TikTok, Instagram, Facebook & WhatsApp
- **3-Tier Confidence System** — ≥85% auto-sends, 50–84% queues for approval, <50% escalates to human
- **Inbox & Comments** — Unified inbox for DMs + comment review with approve / edit workflows
- **Content Scheduler** — Draft, schedule, and publish posts across platforms with AI caption generation
- **Contacts CRM** — Warm contacts (people who messaged/commented) with tags, notes, and campaign targeting
- **Campaigns** — WhatsApp broadcast messages with audience targeting (all / by tag / by platform origin)
- **Knowledge Base** — Business info, menu items, offers, and documents that power AI replies
- **Reply Templates** — Reusable reply templates per platform and language
- **Chatbot Flows** — Visual keyword-triggered conversation flows
- **Social Listening** — Monitor brand mentions and keywords across platforms
- **Team Management** — Invite agents, assign conversations, internal notes
- **Automation Rules** — Trigger-based rules that override AI confidence thresholds
- **Multi-tenant Agency** — Manage multiple business clients from a single agency dashboard
- **Multilingual UI** — English, Arabic (RTL), and Spanish

---

## 🖥️ Demo

**Demo credentials:**

| Role | Email | Password |
|------|-------|----------|
| Business Owner | `client@demo.com` | `demo123` |
| Agency | `agency@demo.com` | `demo123` |

> **Demo mode:** Leave `VITE_API_URL` empty in `.env.local` — the app runs fully on mock data, no backend needed.

---

## 🏗️ Tech Stack

### Frontend

| Layer | Technology |
|-------|-----------|
| Framework | React 18 + TypeScript |
| Build | Vite 5 |
| Styling | Tailwind CSS |
| Data Fetching | TanStack React Query v5 |
| Routing | React Router v6 |
| Animations | Framer Motion |
| i18n | i18next (EN / AR / ES) |

### Backend

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 20 |
| Framework | Hono (lightweight, edge-ready) |
| Database | PostgreSQL |
| ORM | Drizzle ORM |
| Auth | JWT (jsonwebtoken) |
| AI | Claude AI (Anthropic SDK) |

---

## 📁 Project Structure

```
Roy-AI-Agency/
├── src/                          # React frontend
│   ├── contexts/
│   │   └── AuthContext.tsx       # Auth state (login / logout / role)
│   ├── hooks/                    # TanStack Query hooks per feature
│   │   ├── useComments.ts
│   │   ├── useConversations.ts
│   │   ├── useContent.ts
│   │   ├── useCampaigns.ts
│   │   ├── useResources.ts
│   │   ├── useTemplates.ts
│   │   ├── useFlows.ts
│   │   ├── useTeam.ts
│   │   ├── useListening.ts
│   │   ├── useSettings.ts
│   │   └── useClients.ts
│   ├── lib/
│   │   ├── api.ts                # Fetch wrapper (auth headers, 401 handler)
│   │   └── auth.ts               # Token storage (localStorage)
│   ├── pages/
│   │   ├── Login.tsx
│   │   ├── client/               # Business owner views
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Inbox.tsx
│   │   │   ├── Comments.tsx
│   │   │   ├── Content.tsx
│   │   │   ├── Contacts.tsx
│   │   │   ├── Campaigns.tsx
│   │   │   ├── Analytics.tsx
│   │   │   ├── Resources.tsx
│   │   │   ├── Templates.tsx
│   │   │   ├── Flows.tsx
│   │   │   ├── Team.tsx
│   │   │   ├── Listening.tsx
│   │   │   └── ToneSettings.tsx  # Settings (AI Reply / Automation / Brand / Appearance)
│   │   └── agency/               # Agency views
│   │       ├── Dashboard.tsx
│   │       ├── Clients.tsx
│   │       ├── Analytics.tsx
│   │       └── Settings.tsx
│   ├── types/
│   │   └── index.ts              # Shared TypeScript types
│   └── i18n/
│       └── locales/              # en.json · ar.json · es.json
│
└── backend/                      # Hono REST API
    └── src/
        ├── db/
        │   ├── index.ts          # Drizzle + postgres-js connection
        │   ├── schema.ts         # Database schema
        │   └── seed.ts           # Demo seed data
        ├── middleware/
        │   └── auth.ts           # JWT verification middleware
        ├── routes/               # One file per feature
        │   ├── auth.ts           # POST /api/auth/login
        │   ├── settings.ts       # GET/POST /api/settings
        │   ├── conversations.ts  # GET/POST /api/conversations
        │   ├── content.ts        # GET/POST/PUT/DELETE /api/content
        │   ├── resources.ts      # GET/POST/PUT/DELETE /api/resources
        │   ├── templates.ts      # GET/POST/PUT/DELETE /api/templates
        │   ├── campaigns.ts      # GET/POST/PUT/DELETE /api/campaigns
        │   ├── flows.ts          # GET/POST/PUT/DELETE /api/flows
        │   ├── team.ts           # GET/POST/PUT/DELETE /api/team
        │   ├── listening.ts      # GET/POST/PUT/DELETE /api/listening
        │   ├── clients.ts        # GET/POST /api/clients
        │   ├── platforms.ts      # POST /api/platforms/connect
        │   ├── dashboard.ts      # GET /api/dashboard
        │   └── brand.ts          # GET/POST /api/brand
        └── server.ts             # Entry point
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL database (local or [Supabase](https://supabase.com) / [Railway](https://railway.app))

### 1. Clone & Install

```bash
git clone https://github.com/RatebOmari/Roy-AI-Agency.git
cd Roy-AI-Agency

# Install frontend deps
npm install

# Install backend deps
cd backend && npm install && cd ..
```

### 2. Configure Frontend

```bash
cp .env.example .env.local
```

```env
# Point to your backend (or leave empty for demo mode)
VITE_API_URL=http://localhost:3001/api
```

### 3. Configure Backend

```bash
cd backend
cp .env.example .env
```

```env
DATABASE_URL=postgresql://user:password@localhost:5432/socialpilot
JWT_SECRET=your-secret-here
PORT=3001
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:5174
```

### 4. Set Up Database

```bash
cd backend

# Push schema to database
npx drizzle-kit push

# Seed demo data (optional)
npx tsx src/db/seed.ts
```

### 5. Run

```bash
# Terminal 1 — backend
cd backend && npm run dev

# Terminal 2 — frontend
npm run dev
# → http://localhost:5174
```

---

## 🗺️ Architecture

```
Browser (React SPA)
    │  HTTPS + Bearer JWT
    ▼
Hono REST API  (/api/*)
    ├── /api/auth              → Login, JWT issuance
    ├── /api/dashboard         → Stats aggregation
    ├── /api/conversations     → Inbox messages & AI replies
    ├── /api/content           → Scheduled posts + AI caption/image gen
    ├── /api/resources         → Knowledge base (business info, menus, docs)
    ├── /api/templates         → Reply templates
    ├── /api/campaigns         → WhatsApp broadcast campaigns
    ├── /api/flows             → Chatbot conversation flows
    ├── /api/team              → Team members & internal notes
    ├── /api/listening         → Brand monitoring keywords & mentions
    ├── /api/settings          → AI tone & language config per platform
    ├── /api/clients           → Agency → client relationships
    ├── /api/platforms         → Platform OAuth connection stubs
    └── /api/brand             → Brand image style guide
         │
         ├── PostgreSQL (via Drizzle ORM)
         └── Claude AI (Anthropic) — reply generation & content creation
```

---

## 🔒 Authentication

1. User submits email + password → `POST /api/auth/login`
2. Backend validates against `users` table and returns `{ token, user }`
3. Token stored in `localStorage` via `authStorage`
4. Every API request sends `Authorization: Bearer <token>`
5. On 401, the app auto-redirects to `/login` and clears storage

---

## 🌍 Internationalization

The UI supports 3 languages switchable at runtime:

| Language | Code | Direction |
|----------|------|-----------|
| English | `en` | LTR |
| Arabic | `ar` | RTL (full layout flip) |
| Spanish | `es` | LTR |

Add translations in `src/i18n/locales/`.

---

## 📋 Roadmap

- [ ] Real social platform OAuth (Meta, TikTok)
- [ ] Live webhook ingestion for incoming comments & DMs
- [ ] Claude AI reply generation wired to real incoming messages
- [ ] Analytics dashboard with Recharts charts
- [ ] Client onboarding flow
- [ ] Email/push notifications for pending reviews
- [ ] White-label agency branding

---

## 🤝 Built With

- [React](https://react.dev) + [TypeScript](https://www.typescriptlang.org)
- [Vite](https://vitejs.dev)
- [Tailwind CSS](https://tailwindcss.com)
- [Hono](https://hono.dev) — lightweight Node.js framework
- [Drizzle ORM](https://orm.drizzle.team)
- [Claude AI](https://anthropic.com) — AI reply and content generation
- [TanStack Query](https://tanstack.com/query)
- [Framer Motion](https://www.framer.com/motion)

---

<div align="center">
  <sub>Built by <a href="https://github.com/RatebOmari">Roy AI Agency</a> · Powered by Claude AI from Anthropic</sub>
</div>
