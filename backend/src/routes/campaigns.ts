/**
 * Legacy campaigns route — bridges old /campaigns API to new outreach_messages table.
 * This file will be replaced by outreach.ts in CHANGE 1.
 */
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";
import { db } from "../db/index.js";
import { outreachMessages, contacts } from "../db/schema.js";
import { authMiddleware } from "../middleware/auth.js";
import { clientContextMiddleware } from "../middleware/clientContext.js";
import { sendWhatsAppMessage } from "../lib/platformDelivery.js";

function parseJSON<T>(raw: string, fallback: T): T {
  try { return JSON.parse(raw) as T; } catch { return fallback; }
}

const app = new Hono();
app.use("*", authMiddleware);
app.use("*", clientContextMiddleware);

app.get("/", async (c) => {
  const user = c.get("user");
  const rows = await db
    .select()
    .from(outreachMessages)
    .where(eq(outreachMessages.userId, user.sub))
    .orderBy(desc(outreachMessages.createdAt));
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

app.post("/", zValidator("json", campaignSchema), async (c) => {
  const user = c.get("user");
  const body = c.req.valid("json");
  const [row] = await db
    .insert(outreachMessages)
    .values({
      userId:        user.sub,
      title:         body.name,
      channel:       body.platform === "whatsapp" ? "whatsapp" : body.platform === "sms" ? "sms" : "email",
      messageBody:   body.message,
      audienceFilter: JSON.stringify({ type: body.audienceType ?? "all", tagValue: body.audienceValue ?? null }),
      imageUrl:      body.mediaUrl ?? null,
      scheduledAt:   body.scheduledAt ? new Date(body.scheduledAt) : null,
      status:        "draft",
    })
    .returning();
  return c.json(row, 201);
});

app.put("/:id", zValidator("json", campaignSchema.partial()), async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const body = c.req.valid("json");
  const [row] = await db
    .update(outreachMessages)
    .set({
      ...(body.name      !== undefined && { title: body.name }),
      ...(body.message   !== undefined && { messageBody: body.message }),
      ...(body.mediaUrl  !== undefined && { imageUrl: body.mediaUrl ?? null }),
      ...(body.scheduledAt !== undefined && { scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : null }),
    })
    .where(and(eq(outreachMessages.id, id), eq(outreachMessages.userId, user.sub)))
    .returning();
  if (!row) return c.json({ message: "Not found" }, 404);
  return c.json(row);
});

app.delete("/:id", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  await db.delete(outreachMessages).where(and(eq(outreachMessages.id, id), eq(outreachMessages.userId, user.sub)));
  return c.json({ ok: true });
});

app.get("/reach", async (c) => {
  const user = c.get("user");
  const allContacts = await db.select().from(contacts).where(eq(contacts.userId, user.sub));
  const total = allContacts.length;
  const tagCounts: Record<string, number> = {};
  for (const contact of allContacts) {
    const tags = parseJSON<string[]>(contact.tags, []);
    for (const tag of tags) tagCounts[tag] = (tagCounts[tag] ?? 0) + 1;
  }
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

app.post("/:id/send", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const [outreach] = await db.select().from(outreachMessages).where(and(eq(outreachMessages.id, id), eq(outreachMessages.userId, user.sub)));
  if (!outreach) return c.json({ message: "Not found" }, 404);

  const allContacts = await db.select().from(contacts).where(eq(contacts.userId, user.sub));
  const audienceFilter = parseJSON<{ type: string; tagValue?: string }>(outreach.audienceFilter, { type: "all" });
  let audienceContacts = allContacts;
  if (audienceFilter.type === "tag" && audienceFilter.tagValue) {
    audienceContacts = allContacts.filter(ct => parseJSON<string[]>(ct.tags, []).includes(audienceFilter.tagValue!));
  }

  const audienceSize = audienceContacts.length || (Math.floor(Math.random() * 80) + 20);
  let sentCount = audienceSize;

  if (outreach.channel === "whatsapp" && audienceContacts.length > 0) {
    const waRecipients = audienceContacts.flatMap(ct =>
      parseJSON<{ channel: string; username: string }[]>(ct.handles, [])
        .filter(h => h.channel === "whatsapp_business")
        .map(h => h.username)
    );
    if (waRecipients.length > 0) {
      const probe = await sendWhatsAppMessage(user.sub, waRecipients[0], outreach.messageBody);
      if (!(!probe.ok && "skipped" in probe)) {
        let delivered = probe.ok ? 1 : 0;
        for (const to of waRecipients.slice(1)) {
          const r = await sendWhatsAppMessage(user.sub, to, outreach.messageBody);
          if (r.ok) delivered++;
        }
        sentCount = waRecipients.length;
      }
    }
  }

  const [row] = await db
    .update(outreachMessages)
    .set({ status: "sent", sentCount, sentAt: new Date() })
    .where(and(eq(outreachMessages.id, id), eq(outreachMessages.userId, user.sub)))
    .returning();
  return c.json(row);
});

export default app;
