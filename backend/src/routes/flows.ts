import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";
import { db } from "../db/index.js";
import { chatbotFlows } from "../db/schema.js";
import { authMiddleware } from "../middleware/auth.js";

const app = new Hono();
app.use("*", authMiddleware);

// GET / — list all flows for user, ordered by createdAt desc
app.get("/", async (c) => {
  const user = c.get("user");
  const rows = await db
    .select()
    .from(chatbotFlows)
    .where(eq(chatbotFlows.userId, user.sub))
    .orderBy(desc(chatbotFlows.createdAt));
  return c.json(rows);
});

const flowSchema = z.object({
  name:         z.string().min(1),
  trigger:      z.enum(["greeting", "keyword", "order", "inquiry", "fallback"]),
  platform:     z.string().min(1),
  triggerValue: z.string().nullable().optional(),
  steps:        z.string().optional(),
  active:       z.boolean().optional(),
});

// POST / — create flow
app.post("/", zValidator("json", flowSchema), async (c) => {
  const user = c.get("user");
  const body = c.req.valid("json");
  const [row] = await db
    .insert(chatbotFlows)
    .values({
      userId:       user.sub,
      name:         body.name,
      trigger:      body.trigger,
      platform:     body.platform,
      triggerValue: body.triggerValue ?? null,
      steps:        body.steps ?? "[]",
      active:       body.active ?? false,
    })
    .returning();
  return c.json(row, 201);
});

// PUT /:id — update flow (ownership check)
app.put("/:id", zValidator("json", flowSchema.partial()), async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const body = c.req.valid("json");

  const [row] = await db
    .update(chatbotFlows)
    .set({
      ...(body.name         !== undefined && { name:         body.name }),
      ...(body.trigger      !== undefined && { trigger:      body.trigger }),
      ...(body.platform     !== undefined && { platform:     body.platform }),
      ...(body.triggerValue !== undefined && { triggerValue: body.triggerValue ?? null }),
      ...(body.steps        !== undefined && { steps:        body.steps }),
      ...(body.active       !== undefined && { active:       body.active }),
    })
    .where(and(eq(chatbotFlows.id, id), eq(chatbotFlows.userId, user.sub)))
    .returning();

  if (!row) return c.json({ message: "Not found" }, 404);
  return c.json(row);
});

// DELETE /:id — delete flow (ownership check)
app.delete("/:id", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  await db
    .delete(chatbotFlows)
    .where(and(eq(chatbotFlows.id, id), eq(chatbotFlows.userId, user.sub)));
  return c.json({ ok: true });
});

export default app;
