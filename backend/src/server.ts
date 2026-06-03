import "dotenv/config";
import * as Sentry from "@sentry/node";

// Initialize Sentry before anything else so it can instrument all imports.
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn:              process.env.SENTRY_DSN,
    environment:      process.env.NODE_ENV ?? "development",
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
  });
}

import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { startScheduler } from "./lib/scheduler.js";
import { cors } from "hono/cors";
import { logger as honoLogger } from "hono/logger";
import { logger } from "./lib/logger.js";
import { sql } from "drizzle-orm";
import { db, sqlClient } from "./db/index.js";
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
import outreachRoutes      from "./routes/outreach.js";

// ── Global unhandled rejection safety net ─────────────────────────────────────

process.on("unhandledRejection", (reason) => {
  logger.error({ err: reason }, "[server] Unhandled rejection");
  Sentry.captureException(reason);
});

const app = new Hono();

app.onError((err, c) => {
  logger.error({ err }, "[server] Unhandled error");
  Sentry.captureException(err);
  return c.json({ message: "Internal server error" }, 500);
});

const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? "http://localhost:5174,http://localhost:5173").split(",").map(s => s.trim());

app.use("*", cors({
  origin: (origin) => allowedOrigins.includes(origin) ? origin : allowedOrigins[0],
  allowHeaders:  ["Content-Type", "Authorization", "x-client-id"],
  allowMethods:  ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  credentials:   true,
}));

app.use("*", honoLogger());

// Health check with DB liveness
app.get("/health", async (c) => {
  try {
    await db.execute(sql`SELECT 1`);
    return c.json({ ok: true, db: "connected", ts: new Date().toISOString() });
  } catch {
    return c.json({ ok: false, db: "error", ts: new Date().toISOString() }, 503);
  }
});

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
api.route("/outreach",       outreachRoutes);

// Webhook routes are public — signature-verified, not JWT-authenticated
app.route("/webhook", webhookRoutes);

app.route("/api", api);

// ── Startup environment checks ────────────────────────────────────────────────

if (!process.env.ANTHROPIC_API_KEY) {
  logger.warn("⚠️  ANTHROPIC_API_KEY is not set — AI reply generation will use demo fallback responses.");
}
if (!process.env.JWT_SECRET) {
  logger.warn("⚠️  JWT_SECRET is not set — authentication will fail in production.");
}
if (!process.env.DATABASE_URL) {
  logger.warn("⚠️  DATABASE_URL is not set — database operations will fail.");
}
if (!process.env.ENCRYPTION_KEY) {
  logger.warn("⚠️  ENCRYPTION_KEY is not set — platform credentials will be stored unencrypted.");
}
if (!process.env.RESEND_API_KEY) {
  logger.warn("⚠️  RESEND_API_KEY is not set — team invite emails will be logged to console only.");
}

const port = Number(process.env.PORT ?? 3001);
logger.info({ port }, "SocialPilot backend running");

const server = serve({ fetch: app.fetch, port });

const stopScheduler = startScheduler();

// ── Graceful SIGTERM shutdown ──────────────────────────────────────────────────

process.on("SIGTERM", () => {
  logger.info("[server] SIGTERM received — graceful shutdown initiated");

  const forceExitTimer = setTimeout(() => {
    logger.error("[server] Shutdown timeout — forcing exit");
    process.exit(1);
  }, 10_000);

  server.close(() => {
    clearTimeout(forceExitTimer);
    stopScheduler();
    sqlClient.end()
      .then(() => { logger.info("[server] DB pool closed"); process.exit(0); })
      .catch(() => process.exit(0));
  });
});
