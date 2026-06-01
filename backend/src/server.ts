import "dotenv/config";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { startScheduler } from "./lib/scheduler.js";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import authRoutes          from "./routes/auth.js";
import settingsRoutes      from "./routes/settings.js";
import clientsRoutes       from "./routes/clients.js";
import dashboardRoutes     from "./routes/dashboard.js";
import conversationsRoutes from "./routes/conversations.js";
import commentsRoutes      from "./routes/comments.js";
import platformsRoutes     from "./routes/platforms.js";
import contentRoutes       from "./routes/content.js";
import resourcesRoutes     from "./routes/resources.js";
import templatesRoutes     from "./routes/templates.js";
import campaignsRoutes     from "./routes/campaigns.js";
import flowsRoutes         from "./routes/flows.js";
import automationRoutes    from "./routes/automation.js";
import contactsRoutes      from "./routes/contacts.js";
import analyticsRoutes     from "./routes/analytics.js";
import teamRoutes          from "./routes/team.js";
import listeningRoutes     from "./routes/listening.js";
import brandRoutes         from "./routes/brand.js";
import callsRoutes         from "./routes/calls.js";
import webhookRoutes       from "./routes/webhook.js";
import agencyRoutes        from "./routes/agency.js";

const app = new Hono();

const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? "http://localhost:5174,http://localhost:5173").split(",").map(s => s.trim());

app.use("*", cors({
  origin: (origin) => allowedOrigins.includes(origin) ? origin : allowedOrigins[0],
  allowHeaders:  ["Content-Type", "Authorization", "x-client-id"],
  allowMethods:  ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  credentials:   true,
}));

app.use("*", logger());

// Health check
app.get("/health", (c) => c.json({ ok: true, ts: new Date().toISOString() }));

// Serve uploaded files (documents from Knowledge Base)
app.use("/uploads/*", serveStatic({ root: "./" }));

const api = new Hono();

api.route("/auth",           authRoutes);
api.route("/settings",       settingsRoutes);
api.route("/clients",        clientsRoutes);
api.route("/dashboard",      dashboardRoutes);
api.route("/conversations",  conversationsRoutes);
api.route("/comments",       commentsRoutes);
api.route("/platforms",      platformsRoutes);
api.route("/content",        contentRoutes);
api.route("/resources",      resourcesRoutes);
api.route("/templates",      templatesRoutes);
api.route("/campaigns",      campaignsRoutes);
api.route("/flows",          flowsRoutes);
api.route("/automation",     automationRoutes);
api.route("/contacts",       contactsRoutes);
api.route("/analytics",      analyticsRoutes);
api.route("/team",           teamRoutes);
api.route("/listening",      listeningRoutes);
api.route("/brand",          brandRoutes);
api.route("/calls",          callsRoutes);
api.route("/agency",         agencyRoutes);

// Webhook routes are public — signature-verified, not JWT-authenticated
app.route("/webhook", webhookRoutes);

app.route("/api", api);

// ── Startup environment checks ────────────────────────────────────────────────

if (!process.env.ANTHROPIC_API_KEY) {
  console.warn("⚠️  ANTHROPIC_API_KEY is not set — AI reply generation will use demo fallback responses.");
}
if (!process.env.JWT_SECRET) {
  console.warn("⚠️  JWT_SECRET is not set — authentication will fail in production.");
}
if (!process.env.DATABASE_URL) {
  console.warn("⚠️  DATABASE_URL is not set — database operations will fail.");
}
if (!process.env.ENCRYPTION_KEY) {
  console.warn("⚠️  ENCRYPTION_KEY is not set — platform credentials will be stored unencrypted.");
}
if (!process.env.RESEND_API_KEY) {
  console.warn("⚠️  RESEND_API_KEY is not set — team invite emails will be logged to console only.");
}

const port = Number(process.env.PORT ?? 3001);
console.log(`🚀 SocialPilot backend running on port ${port}`);

serve({ fetch: app.fetch, port });

startScheduler();
