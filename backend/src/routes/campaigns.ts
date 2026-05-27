import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";
import { db } from "../db/index.js";
import { campaigns } from "../db/schema.js";
import { authMiddleware } from "../middleware/auth.js";

const app = new Hono();
app.use("*", authMiddleware);

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

// POST /:id/send — send campaign (audience-aware mock until WhatsApp API is wired)
app.post("/:id/send", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");

  const [campaign] = await db
    .select()
    .from(campaigns)
    .where(and(eq(campaigns.id, id), eq(campaigns.userId, user.sub)));

  if (!campaign) return c.json({ message: "Not found" }, 404);

  // Scale audience size by type so stats reflect the actual audience scope
  const baseRange =
    campaign.audienceType === "all"      ? { min: 200, max: 500 } :
    campaign.audienceType === "platform" ? { min: 80,  max: 300 } :
                                           { min: 20,  max: 120 }; // tag

  const sentCount = Math.floor(Math.random() * (baseRange.max - baseRange.min + 1)) + baseRange.min;
  const readCount = Math.floor(sentCount * (Math.random() * 0.4 + 0.4)); // 40–80%

  const [row] = await db
    .update(campaigns)
    .set({ status: "sent", sentCount, readCount })
    .where(and(eq(campaigns.id, id), eq(campaigns.userId, user.sub)))
    .returning();

  return c.json(row);
});

export default app;
