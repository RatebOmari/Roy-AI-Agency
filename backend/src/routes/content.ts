import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, and, asc } from "drizzle-orm";
import { db } from "../db/index.js";
import { scheduledPosts } from "../db/schema.js";
import { authMiddleware } from "../middleware/auth.js";

const app = new Hono();
app.use("*", authMiddleware);

// GET / — list all posts for user
app.get("/", async (c) => {
  const user = c.get("user");
  const posts = await db
    .select()
    .from(scheduledPosts)
    .where(eq(scheduledPosts.userId, user.sub))
    .orderBy(asc(scheduledPosts.scheduledAt));
  return c.json(posts);
});

const postSchema = z.object({
  platforms:   z.array(z.string()).min(1),
  content:     z.string().min(1),
  mediaUrl:    z.string().nullable().optional(),
  scheduledAt: z.string().nullable().optional(),
  status:      z.enum(["draft", "scheduled", "published", "failed"]).optional(),
  aiGenerated: z.boolean().optional(),
});

// POST / — create post
app.post("/", zValidator("json", postSchema), async (c) => {
  const user = c.get("user");
  const body = c.req.valid("json");
  const [post] = await db
    .insert(scheduledPosts)
    .values({
      userId:      user.sub,
      platforms:   body.platforms,
      content:     body.content,
      mediaUrl:    body.mediaUrl ?? null,
      scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : null,
      status:      body.status ?? "draft",
      aiGenerated: body.aiGenerated ?? false,
    })
    .returning();
  return c.json(post, 201);
});

// PUT /:id — update post
app.put("/:id", zValidator("json", postSchema.partial()), async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const body = c.req.valid("json");

  const [post] = await db
    .update(scheduledPosts)
    .set({
      ...(body.platforms   !== undefined && { platforms: body.platforms }),
      ...(body.content     !== undefined && { content: body.content }),
      ...(body.mediaUrl    !== undefined && { mediaUrl: body.mediaUrl }),
      ...(body.scheduledAt !== undefined && { scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : null }),
      ...(body.status      !== undefined && { status: body.status }),
      ...(body.aiGenerated !== undefined && { aiGenerated: body.aiGenerated }),
    })
    .where(and(eq(scheduledPosts.id, id), eq(scheduledPosts.userId, user.sub)))
    .returning();

  if (!post) return c.json({ message: "Not found" }, 404);
  return c.json(post);
});

// DELETE /:id — delete post
app.delete("/:id", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  await db
    .delete(scheduledPosts)
    .where(and(eq(scheduledPosts.id, id), eq(scheduledPosts.userId, user.sub)));
  return c.json({ ok: true });
});

const generateSchema = z.object({
  prompt:   z.string().min(1),
  platform: z.string().optional(),
  tone:     z.enum(["friendly", "professional", "fun", "informative"]).optional(),
});

// POST /generate — AI caption generation (real OpenAI or mock)
app.post("/generate", zValidator("json", generateSchema), async (c) => {
  const { prompt, platform, tone } = c.req.valid("json");

  const apiKey = process.env.OPENAI_API_KEY;

  if (apiKey) {
    try {
      const systemMsg = `You are a social media copywriter. Write engaging posts optimized for ${platform ?? "social media"} in a ${tone ?? "friendly"} tone. Return JSON: { "caption": string, "hashtags": string[] }`;
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [{ role: "system", content: systemMsg }, { role: "user", content: prompt }],
          response_format: { type: "json_object" },
        }),
      });
      const data = await res.json() as { choices: { message: { content: string } }[] };
      const parsed = JSON.parse(data.choices[0].message.content);
      return c.json({ caption: parsed.caption, hashtags: parsed.hashtags ?? [] });
    } catch {
      // fall through to mock
    }
  }

  // Demo mode — generate mock caption
  const toneMap: Record<string, string> = {
    friendly: "✨ We're so excited to share this with you!",
    professional: "We are pleased to announce:",
    fun: "🔥 You won't believe what we've got for you!",
    informative: "Here's what you need to know:",
  };
  const prefix = toneMap[tone ?? "friendly"];
  const hashtags = ["#business", `#${(platform ?? "social").replace("_", "")}`, "#content"];
  return c.json({
    caption: `${prefix} ${prompt}. Come visit us and experience the difference! 🌟`,
    hashtags,
  });
});

export default app;
