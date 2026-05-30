import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, and, desc, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { replyTemplates } from "../db/schema.js";
import { authMiddleware } from "../middleware/auth.js";

const app = new Hono();
app.use("*", authMiddleware);

// GET / — list all templates for user, ordered by createdAt desc
app.get("/", async (c) => {
  const user = c.get("user");
  const rows = await db
    .select()
    .from(replyTemplates)
    .where(eq(replyTemplates.userId, user.sub))
    .orderBy(desc(replyTemplates.createdAt));
  return c.json(rows);
});

const templateSchema = z.object({
  title:     z.string().min(1),
  content:   z.string().min(1),
  platforms: z.array(z.string()).min(1),
  language:  z.string(),
  active:    z.boolean().optional(),
  category:  z.string().optional().default(""),
});

// POST / — create template
app.post("/", zValidator("json", templateSchema), async (c) => {
  const user = c.get("user");
  const body = c.req.valid("json");
  const [row] = await db
    .insert(replyTemplates)
    .values({
      userId:    user.sub,
      title:     body.title,
      content:   body.content,
      platforms: body.platforms,
      language:  body.language,
      active:    body.active ?? true,
      category:  body.category ?? "",
    })
    .returning();
  return c.json(row, 201);
});

// PUT /:id — update template (ownership check)
app.put("/:id", zValidator("json", templateSchema.partial()), async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const body = c.req.valid("json");

  const [row] = await db
    .update(replyTemplates)
    .set({
      ...(body.title     !== undefined && { title:     body.title }),
      ...(body.content   !== undefined && { content:   body.content }),
      ...(body.platforms !== undefined && { platforms: body.platforms }),
      ...(body.language  !== undefined && { language:  body.language }),
      ...(body.active    !== undefined && { active:    body.active }),
      ...(body.category  !== undefined && { category:  body.category }),
    })
    .where(and(eq(replyTemplates.id, id), eq(replyTemplates.userId, user.sub)))
    .returning();

  if (!row) return c.json({ message: "Not found" }, 404);
  return c.json(row);
});

// POST /generate — AI-generate a template (must be before /:id routes)
app.post("/generate", zValidator("json", z.object({
  description: z.string().min(1),
  platforms: z.array(z.string()).optional(),
  language: z.string().optional(),
})), async (c) => {
  const { description, platforms, language } = c.req.valid("json");
  const Anthropic = (await import("@anthropic-ai/sdk")).default;
  const client = new Anthropic();
  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 400,
    messages: [{
      role: "user",
      content: `Generate a social media reply template.\nDescription: "${description}"\nPlatforms: ${platforms?.join(", ") || "general"}\nLanguage: ${language || "en"}\n\nReturn ONLY valid JSON: {"title": "...", "content": "..."}\nUse {{name}} for customer name where natural. Keep content concise.`
    }]
  });
  const text = response.content[0].type === "text" ? response.content[0].text : "";
  const match = text.match(/\{[\s\S]*\}/);
  try {
    const parsed = JSON.parse(match?.[0] ?? "{}");
    return c.json({ title: parsed.title ?? "", content: parsed.content ?? "" });
  } catch {
    return c.json({ title: "", content: text }, 200);
  }
});

// POST /:id/use — increment usage count
app.post("/:id/use", async (c) => {
  const user = c.get("user");
  const id   = c.req.param("id");
  await db
    .update(replyTemplates)
    .set({ usedCount: sql`${replyTemplates.usedCount} + 1` })
    .where(and(eq(replyTemplates.id, id), eq(replyTemplates.userId, user.sub)));
  return c.json({ ok: true });
});

// DELETE /:id — delete template (ownership check)
app.delete("/:id", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  await db
    .delete(replyTemplates)
    .where(and(eq(replyTemplates.id, id), eq(replyTemplates.userId, user.sub)));
  return c.json({ ok: true });
});

export default app;
