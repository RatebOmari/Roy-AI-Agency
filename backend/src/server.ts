import "dotenv/config";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import authRoutes          from "./routes/auth.js";
import settingsRoutes      from "./routes/settings.js";
import clientsRoutes       from "./routes/clients.js";
import dashboardRoutes     from "./routes/dashboard.js";
import conversationsRoutes from "./routes/conversations.js";
import platformsRoutes     from "./routes/platforms.js";
import contentRoutes       from "./routes/content.js";
import resourcesRoutes     from "./routes/resources.js";

const app = new Hono();

const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? "http://localhost:5174,http://localhost:5173").split(",").map(s => s.trim());

app.use("*", cors({
  origin: (origin) => allowedOrigins.includes(origin) ? origin : allowedOrigins[0],
  allowHeaders:  ["Content-Type", "Authorization"],
  allowMethods:  ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  credentials:   true,
}));

app.use("*", logger());

// Health check
app.get("/health", (c) => c.json({ ok: true, ts: new Date().toISOString() }));

const api = new Hono();

api.route("/auth",           authRoutes);
api.route("/settings",       settingsRoutes);
api.route("/clients",        clientsRoutes);
api.route("/dashboard",      dashboardRoutes);
api.route("/conversations",  conversationsRoutes);
api.route("/platforms",      platformsRoutes);
api.route("/content",        contentRoutes);
api.route("/resources",      resourcesRoutes);

app.route("/api", api);

const port = Number(process.env.PORT ?? 3001);
console.log(`🚀 SocialPilot backend running on port ${port}`);

serve({ fetch: app.fetch, port });
