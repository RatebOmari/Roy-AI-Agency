# SocialPilot — AI-Powered Social Media Auto-Reply

<div dir="rtl">

منصة SaaS تردّ تلقائياً على تعليقات وسائل التواصل الاجتماعي بالذكاء الاصطناعي (Claude AI)، مع لوحة تحكم لمراجعة الردود وإدارة العملاء.

</div>

---

## ✨ Features

- **AI Auto-Reply** — Claude AI generates contextual replies for TikTok, Instagram, Facebook & WhatsApp comments
- **Human-in-the-Loop** — Review, approve, reject, or edit every AI reply before it's sent
- **Per-Platform Tone** — Customize reply tone (friendly / professional / fun / informative) and language (AR / EN / AR+EN) per platform
- **Multi-tenant Agency** — Manage multiple business clients from a single agency dashboard
- **Multilingual UI** — Full support for English, Arabic (RTL), and Spanish
- **n8n Backend** — All API logic runs as n8n webhook workflows — no separate server needed

---

## 🖥️ Live Preview

| Page | URL |
|------|-----|
| Login | `/login` |
| Client Dashboard | `/dashboard` |
| Comment Review | `/comments` |
| Tone Settings | `/settings` |
| Agency Clients | `/agency/clients` |

**Demo credentials:**

| Role | Email | Password |
|------|-------|----------|
| Business Owner | `client@demo.com` | `demo123` |
| Agency | `agency@demo.com` | `demo123` |

---

## 🏗️ Tech Stack

### Frontend
| Layer | Technology |
|-------|-----------|
| Framework | React 18 + TypeScript |
| Build | Vite 5 |
| Styling | Tailwind CSS + shadcn/ui (Radix UI) |
| Data Fetching | TanStack React Query v5 |
| Routing | React Router v6 |
| Animations | Framer Motion |
| i18n | i18next (EN / AR / ES) |

### Backend (n8n Workflows)
| Workflow | Endpoint(s) |
|----------|------------|
| Auth API | `POST /webhook/socialpilot/auth/login` |
| Comments API | `GET /webhook/socialpilot/comments` · `POST /webhook/socialpilot/comments/action` |
| Dashboard API | `GET /webhook/socialpilot/dashboard` |
| Settings API | `GET/POST /webhook/socialpilot/settings` |
| Clients API | `GET /webhook/socialpilot/clients` · `POST /webhook/socialpilot/clients/action` |
| Platforms API | `POST /webhook/socialpilot/platforms/connect` · `POST /webhook/socialpilot/platforms/disconnect` |

### AI
- **Claude AI** (Anthropic) via n8n "Generate AI Reply" workflow

---

## 📁 Project Structure

```
src/
├── contexts/
│   └── AuthContext.tsx        # Auth state (login / logout / role)
├── hooks/
│   ├── useComments.ts         # Comments CRUD + optimistic updates
│   ├── useDashboard.ts        # Dashboard stats
│   ├── useSettings.ts         # Tone settings per platform
│   ├── useClients.ts          # Agency client list
│   └── usePlatforms.ts        # Platform connect / disconnect
├── lib/
│   ├── api.ts                 # Fetch wrapper (auth headers, 401 handler)
│   └── auth.ts                # Token storage in localStorage
├── pages/
│   ├── Login.tsx
│   ├── client/
│   │   ├── Dashboard.tsx
│   │   ├── Comments.tsx
│   │   └── ToneSettings.tsx
│   └── agency/
│       └── Clients.tsx
├── types/
│   └── index.ts               # Shared TypeScript types
└── i18n/
    └── locales/               # en.json · ar.json · es.json
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- An n8n instance (self-hosted or cloud)

### 1. Clone & Install

```bash
git clone https://github.com/RatebOmari/Roy-AI-Agency.git
cd Roy-AI-Agency
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
# Your n8n instance webhook base URL (no trailing slash)
VITE_N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook
```

> **Tip:** Leave `VITE_N8N_WEBHOOK_URL` empty to run in **demo mode** — all data uses mock fallback and login works with any credentials.

### 3. Run

```bash
npm run dev
# → http://localhost:5174
```

### 4. Build for Production

```bash
npm run build
# Output: dist/
```

---

## ⚙️ n8n Setup

### Active Workflows

The 6 API workflows are already created and activated:

| Workflow | n8n ID |
|----------|--------|
| SocialPilot: Auth API | `oGpUqkypxO46dUm6` |
| SocialPilot: Comments API | `oCtA5gtnXEqgGNUa` |
| SocialPilot: Dashboard API | `6LtxQKKq09CTlRjK` |
| SocialPilot: Settings API | `k2mDiOnrfomwZBOz` |
| SocialPilot: Clients API | `59IPOGSYjqEGvY3R` |
| SocialPilot: Platforms API | `mocUGXvKWySaznoc` |

### Replace Demo Users

In the **Auth API** workflow → **Validate Credentials** Code node, replace the hardcoded `USERS` array with a real database lookup (PostgreSQL, Supabase, etc.).

---

## 🔗 Connecting Social Platforms

### Facebook & Instagram (Meta)

1. Create a [Meta for Developers](https://developers.facebook.com) app
2. Add products: **Facebook Login** + **Instagram Graph API**
3. Set OAuth redirect URI to your n8n callback webhook
4. In **Platforms API** workflow, replace `YOUR_FB_APP_ID` with your real App ID
5. In **Social Auto-Reply: Facebook & Instagram** workflow, add your **Page Access Token** credential

### TikTok

1. Register at [TikTok for Developers](https://developers.tiktok.com)
2. Create an app and enable **Login Kit** + **Comment API**
3. In **Platforms API** workflow, replace `YOUR_TIKTOK_KEY` with your Client Key
4. In **Social Auto-Reply: TikTok** workflow, configure your access token

### WhatsApp (Meta Business)

1. Set up a [WhatsApp Business API](https://developers.facebook.com/docs/whatsapp) account
2. Get your Phone Number ID and Business Account ID
3. In **Social Auto-Reply: WhatsApp** workflow, add your WhatsApp credentials

---

## 🗺️ Architecture

```
Browser (React)
    │  HTTPS + Bearer Token
    ▼
n8n Webhook Workflows  ←──── Social Platforms (webhooks)
    │                              TikTok / Instagram
    ├── Auth API                   Facebook / WhatsApp
    ├── Comments API
    ├── Dashboard API      ──────► Claude AI (Anthropic)
    ├── Settings API               (Generate AI Reply)
    ├── Clients API
    └── Platforms API  ─────────► OAuth flows
```

---

## 🔒 Authentication Flow

1. User submits email + password → `POST /socialpilot/auth/login`
2. n8n validates credentials and returns `{ token, user }`
3. Token stored in `localStorage` via `authStorage`
4. Every API request sends `Authorization: Bearer <token>`
5. On 401, app auto-redirects to `/login` and clears storage

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

- [ ] Real database integration (Supabase / PostgreSQL)
- [ ] Persistent platform OAuth token storage
- [ ] Scheduled comment sync (n8n cron workflows)
- [ ] AI reply triggered by incoming platform webhooks
- [ ] Analytics dashboard with Recharts
- [ ] Client onboarding flow
- [ ] Email notifications for pending reviews
- [ ] White-label agency branding

---

## 🤝 Built With

- [React](https://react.dev) + [TypeScript](https://www.typescriptlang.org)
- [Vite](https://vitejs.dev)
- [Tailwind CSS](https://tailwindcss.com)
- [n8n](https://n8n.io) — workflow automation
- [Claude AI](https://anthropic.com) — AI reply generation
- [TanStack Query](https://tanstack.com/query)
- [Framer Motion](https://www.framer.com/motion)

---

<div align="center">
  <sub>Built by <a href="https://github.com/RatebOmari">Roy AI Agency</a> · Powered by Claude AI from Anthropic</sub>
</div>
