import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { db } from "../db/index.js";
import { automationRules } from "../db/schema.js";
import { authMiddleware } from "../middleware/auth.js";
import { clientContextMiddleware } from "../middleware/clientContext.js";

const app = new Hono();
app.use("*", authMiddleware);
app.use("*", clientContextMiddleware);

const ruleBodySchema = z.object({
  name:         z.string().min(1).max(120),
  trigger:      z.enum(["contains_word", "is_question", "sentiment_positive", "sentiment_negative", "new_follower"]),
  triggerValue: z.string().optional(),
  action:       z.enum(["auto_send", "skip_review", "escalate", "assign_to"]),
  actionValue:  z.string().optional(),
  channels:     z.array(z.string()).default([]),
  active:       z.boolean().default(true),
});

// GET / — list all rules
app.get("/", async (c) => {
  const user = c.get("user");
  const rows = await db
    .select()
    .from(automationRules)
    .where(eq(automationRules.userId, user.sub))
    .orderBy(automationRules.createdAt);

  return c.json(rows.map(r => ({
    ...r,
    channels: (() => { try { return JSON.parse(r.channels) as string[]; } catch { return []; } })(),
  })));
});

// POST / — create rule
app.post("/", zValidator("json", ruleBodySchema), async (c) => {
  const user = c.get("user");
  const body = c.req.valid("json");

  const [created] = await db
    .insert(automationRules)
    .values({
      userId:       user.sub,
      name:         body.name,
      trigger:      body.trigger,
      triggerValue: body.triggerValue ?? null,
      action:       body.action,
      actionValue:  body.actionValue ?? null,
      channels:     JSON.stringify(body.channels),
      active:       body.active,
    })
    .returning();

  return c.json({ ...created, channels: body.channels }, 201);
});

// PATCH /:id — update rule (partial)
app.patch("/:id", zValidator("json", ruleBodySchema.partial()), async (c) => {
  const user = c.get("user");
  const { id } = c.req.param();
  const body = c.req.valid("json");

  const updateData: Record<string, unknown> = {};
  if (body.name         !== undefined) updateData.name         = body.name;
  if (body.trigger      !== undefined) updateData.trigger      = body.trigger;
  if (body.triggerValue !== undefined) updateData.triggerValue = body.triggerValue;
  if (body.action       !== undefined) updateData.action       = body.action;
  if (body.actionValue  !== undefined) updateData.actionValue  = body.actionValue;
  if (body.channels     !== undefined) updateData.channels     = JSON.stringify(body.channels);
  if (body.active       !== undefined) updateData.active       = body.active;

  const [updated] = await db
    .update(automationRules)
    .set(updateData)
    .where(and(eq(automationRules.id, id), eq(automationRules.userId, user.sub)))
    .returning();

  if (!updated) return c.json({ message: "Rule not found" }, 404);

  let channels: string[] = [];
  try { channels = JSON.parse(updated.channels) as string[]; } catch { /* */ }
  return c.json({ ...updated, channels });
});

// DELETE /:id — delete rule
app.delete("/:id", async (c) => {
  const user = c.get("user");
  const { id } = c.req.param();

  const [deleted] = await db
    .delete(automationRules)
    .where(and(eq(automationRules.id, id), eq(automationRules.userId, user.sub)))
    .returning();

  if (!deleted) return c.json({ message: "Rule not found" }, 404);
  return c.json({ ok: true });
});

export default app;
