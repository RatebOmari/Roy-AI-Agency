import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";
import { db } from "../db/index.js";
import { campaigns, contacts } from "../db/schema.js";
import { authMiddleware } from "../middleware/auth.js";
import { clientContextMiddleware } from "../middleware/clientContext.js";

function parseJSON<T>(raw: string, fallback: T): T {
  try { return JSON.parse(raw) as T; } catch { return fallback; }
}

const app = new Hono();
app.use("*", authMiddleware);
app.use("*", clientContextMiddleware);

// GET / — list all campaigns for user, ordered by createdAt desc
app.get("/", async (c) => {
  const user = c.get("user");
  const rows = await db
    .select()
    .from(campaigns)
    .where(eq(campaigns.userId, user.sub))
    .orderBy(desc(campaigns.createdAt));
  return c.json(rows);
});

const campaignSchema = z.object({
  name:          z.string().min(1),
  message:       z.string().min(1),
  platform:      z.string().min(1),
  audienceType:  z.enum(["all", "tag", "platform"]).optional().default("all"),
  audienceValue: z.string().nullable().optional(),
  scheduledAt:   z.string().nullable().optional(),
  mediaUrl:      z.string().nullable().optional(),
});

// POST / — create campaign
app.post("/", zValidator("json", campaignSchema), async (c) => {
  const user = c.get("user");
  const body = c.req.valid("json");
  const [row] = await db
    .insert(campaigns)
    .values({
      userId:        user.sub,
      name:          body.name,
      message:       body.message,
      platform:      body.platform,
      audienceType:  body.audienceType ?? "all",
      audienceValue: body.audienceType !== "all" ? (body.audienceValue ?? null) : null,
      scheduledAt:   body.scheduledAt ? new Date(body.scheduledAt) : null,
      mediaUrl:      body.mediaUrl ?? null,
      status:        "draft",
    })
    .returning();
  return c.json(row, 201);
});

// PUT /:id — update campaign (ownership check)
app.put("/:id", zValidator("json", campaignSchema.partial()), async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const body = c.req.valid("json");

  const [row] = await db
    .update(campaigns)
    .set({
      ...(body.name          !== undefined && { name:          body.name }),
      ...(body.message       !== undefined && { message:       body.message }),
      ...(body.platform      !== undefined && { platform:      body.platform }),
      ...(body.audienceType  !== undefined && { audienceType:  body.audienceType }),
      ...(body.audienceValue !== undefined && { audienceValue: body.audienceType !== "all" ? (body.audienceValue ?? null) : null }),
      ...(body.scheduledAt   !== undefined && { scheduledAt:   body.scheduledAt ? new Date(body.scheduledAt) : null }),
      ...(body.mediaUrl      !== undefined && { mediaUrl:      body.mediaUrl ?? null }),
    })
    .where(and(eq(campaigns.id, id), eq(campaigns.userId, user.sub)))
    .returning();

  if (!row) return c.json({ message: "Not found" }, 404);
  return c.json(row);
});

// DELETE /:id — delete campaign (ownership check)
app.delete("/:id", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  await db
    .delete(campaigns)
    .where(and(eq(campaigns.id, id), eq(campaigns.userId, user.sub)));
  return c.json({ ok: true });
});

// GET /reach — return real audience counts from contacts table
app.get("/reach", async (c) => {
  const user = c.get("user");
  const allContacts = await db
    .select()
    .from(contacts)
    .where(eq(contacts.userId, user.sub));

  const total = allContacts.length;

  // Tag reach: count contacts that include each tag
  const tagCounts: Record<string, number> = {};
  for (const contact of allContacts) {
    const tags = parseJSON<string[]>(contact.tags, []);
    for (const tag of tags) {
      tagCounts[tag] = (tagCounts[tag] ?? 0) + 1;
    }
  }

  // Platform reach: count contacts that have at least one handle on each platform
  const platformCounts: Record<string, number> = {};
  for (const contact of allContacts) {
    const handles = parseJSON<{ channel: string }[]>(contact.handles, []);
    const platforms = new Set(handles.map(h => {
      if (h.channel.includes("instagram")) return "instagram";
      if (h.channel.includes("tiktok"))    return "tiktok";
      if (h.channel.includes("facebook") || h.channel === "facebook_messenger") return "facebook";
      if (h.channel === "whatsapp_business") return "whatsapp";
      if (h.channel === "sms")               return "sms";
      return null;
    }).filter(Boolean));
    for (const pl of platforms) {
      if (pl) platformCounts[pl] = (platformCounts[pl] ?? 0) + 1;
    }
  }

  return c.json({ total, tagCounts, platformCounts });
});

// POST /:id/send — send campaign (audience-aware mock until WhatsApp API is wired)
app.post("/:id/send", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");

  const [campaign] = await db
    .select()
    .from(campaigns)
    .where(and(eq(campaigns.id, id), eq(campaigns.userId, user.sub)));

  if (!campaign) return c.json({ message: "Not found" }, 404);

  // Compute real audience size from contacts table
  const allContacts = await db.select().from(contacts).where(eq(contacts.userId, user.sub));
  let audienceSize = allContacts.length;

  if (campaign.audienceType === "tag" && campaign.audienceValue) {
    audienceSize = allContacts.filter(ct =>
      parseJSON<string[]>(ct.tags, []).includes(campaign.audienceValue!)
    ).length;
  } else if (campaign.audienceType === "platform" && campaign.audienceValue) {
    audienceSize = allContacts.filter(ct =>
      parseJSON<{ channel: string }[]>(ct.handles, []).some(h => h.channel.includes(campaign.audienceValue!))
    ).length;
  }

  // If no real contacts yet, fall back to a plausible mock range
  if (audienceSize === 0) audienceSize = Math.floor(Math.random() * 80) + 20;

  const sentCount = audienceSize;
  const readCount = Math.floor(sentCount * (Math.random() * 0.4 + 0.4)); // 40–80%

  const [row] = await db
    .update(campaigns)
    .set({ status: "sent", sentCount, readCount })
    .where(and(eq(campaigns.id, id), eq(campaigns.userId, user.sub)))
    .returning();

  return c.json(row);
});

export default app;
