import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";
import Anthropic from "@anthropic-ai/sdk";
import { db } from "../db/index.js";
import { listeningKeywords, listeningMentions } from "../db/schema.js";
import { authMiddleware } from "../middleware/auth.js";
import { clientContextMiddleware } from "../middleware/clientContext.js";
import { buildKnowledgeContext } from "../lib/knowledge.js";
import { AI_FAST_MODEL } from "../lib/constants.js";

const anthropic = new Anthropic();

const app = new Hono();
app.use("*", authMiddleware);
app.use("*", clientContextMiddleware);

// GET / — list all keywords for user
app.get("/", async (c) => {
  const user = c.get("user");
  const rows = await db
    .select()
    .from(listeningKeywords)
    .where(eq(listeningKeywords.userId, user.sub))
    .orderBy(desc(listeningKeywords.createdAt));
  return c.json(rows);
});

const keywordSchema = z.object({
  keyword:   z.string().min(1),
  platforms: z.array(z.string()).min(1),
});

// POST / — create keyword
app.post("/", zValidator("json", keywordSchema), async (c) => {
  const user = c.get("user");
  const body = c.req.valid("json");
  const [row] = await db
    .insert(listeningKeywords)
    .values({
      userId:    user.sub,
      keyword:   body.keyword,
      platforms: body.platforms,
      active:    true,
    })
    .returning();
  return c.json(row, 201);
});

// PUT /:id — update keyword (ownership check)
app.put("/:id", zValidator("json", keywordSchema.partial().extend({ active: z.boolean().optional() })), async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const body = c.req.valid("json");

  const [row] = await db
    .update(listeningKeywords)
    .set({
      ...(body.keyword   !== undefined && { keyword:   body.keyword }),
      ...(body.platforms !== undefined && { platforms: body.platforms }),
      ...(body.active    !== undefined && { active:    body.active }),
    })
    .where(and(eq(listeningKeywords.id, id), eq(listeningKeywords.userId, user.sub)))
    .returning();

  if (!row) return c.json({ message: "Not found" }, 404);
  return c.json(row);
});

// DELETE /:id — delete keyword (ownership check)
app.delete("/:id", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  await db
    .delete(listeningKeywords)
    .where(and(eq(listeningKeywords.id, id), eq(listeningKeywords.userId, user.sub)));
  return c.json({ ok: true });
});

// GET /mentions — list persisted mentions, seeding mock data if empty
app.get("/mentions", async (c) => {
  const user = c.get("user");

  // Return persisted mentions newest first
  const existing = await db
    .select()
    .from(listeningMentions)
    .where(eq(listeningMentions.userId, user.sub))
    .orderBy(desc(listeningMentions.timestamp))
    .limit(50);

  if (existing.length > 0) {
    return c.json(existing);
  }

  // Seed mock mentions into DB on first load so they have stable IDs
  const userKeywords = await db
    .select()
    .from(listeningKeywords)
    .where(eq(listeningKeywords.userId, user.sub));

  const sampleKeywords = userKeywords.length > 0
    ? userKeywords.map((k) => ({ id: k.id, keyword: k.keyword }))
    : [{ id: null as string | null, keyword: "brand" }];

  const platforms   = ["instagram", "tiktok", "facebook", "twitter"];
  const sentiments  = ["positive", "negative", "neutral"] as const;
  const usernames   = ["foodie_adventures","sara_eats_out","ahmed_reviews","layla_foodblog","the_real_critic","yummy_bites99","local_explorer","taste_hunter","casual_diner","street_food_fan"];
  const templates   = [
    (kw: string) => `Just tried the best ${kw} spot in town! Absolutely loved it 😍`,
    (kw: string) => `Has anyone else had issues with ${kw} lately? Not my best experience...`,
    (kw: string) => `Looking for recommendations — which ${kw} place do you prefer?`,
    (kw: string) => `This ${kw} is absolutely fire 🔥 must visit!`,
    (kw: string) => `Honest review: the ${kw} was okay but nothing special.`,
    (kw: string) => `Can't stop thinking about that ${kw} I had yesterday 😋`,
    (kw: string) => `My go-to ${kw} never disappoints, highly recommend!`,
    (kw: string) => `Why is ${kw} so expensive now?? Used to be affordable 😤`,
    (kw: string) => `Found a hidden gem for ${kw} — you guys need to check it out!`,
    (kw: string) => `The ${kw} craze is real and I'm here for it 🙌`,
  ];

  const now       = Date.now();
  const sevenDays = 7 * 24 * 60 * 60 * 1000;

  const toInsert = Array.from({ length: 10 }, (_, i) => {
    const kwEntry = sampleKeywords[i % sampleKeywords.length];
    return {
      userId:    user.sub,
      keywordId: kwEntry.id ?? undefined,
      keyword:   kwEntry.keyword,
      platform:  platforms[i % platforms.length],
      username:  usernames[i],
      content:   templates[i](kwEntry.keyword),
      url:       `https://${platforms[i % platforms.length]}.com/${usernames[i]}/post/${Math.random().toString(36).slice(2, 10)}`,
      sentiment: sentiments[i % sentiments.length],
      handled:   false,
      timestamp: new Date(now - Math.floor(Math.random() * sevenDays)),
    };
  });

  const seeded = await db
    .insert(listeningMentions)
    .values(toInsert)
    .returning();

  return c.json(seeded.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()));
});

// PATCH /mentions/:id/handle — mark a mention as handled
app.patch("/mentions/:id/handle", async (c) => {
  const user = c.get("user");
  const { id } = c.req.param();

  const [updated] = await db
    .update(listeningMentions)
    .set({ handled: true, handledAt: new Date() })
    .where(and(eq(listeningMentions.id, id), eq(listeningMentions.userId, user.sub)))
    .returning();

  if (!updated) return c.json({ message: "Mention not found" }, 404);
  return c.json(updated);
});

// PATCH /mentions/:id/unhandle — unmark a mention as handled
app.patch("/mentions/:id/unhandle", async (c) => {
  const user = c.get("user");
  const { id } = c.req.param();

  const [updated] = await db
    .update(listeningMentions)
    .set({ handled: false, handledAt: null })
    .where(and(eq(listeningMentions.id, id), eq(listeningMentions.userId, user.sub)))
    .returning();

  if (!updated) return c.json({ message: "Mention not found" }, 404);
  return c.json(updated);
});

// POST /generate-reply — AI-suggested reply for a mention
app.post("/generate-reply", zValidator("json", z.object({
  content:  z.string().min(1),
  platform: z.string(),
  username: z.string().optional(),
  keyword:  z.string().optional(),
})), async (c) => {
  const user = c.get("user");
  const { content, platform, username, keyword } = c.req.valid("json");

  const knowledgeCtx = await buildKnowledgeContext(user.sub, platform);

  const systemParts = [
    `You are a social media manager responding to a brand mention on ${platform}.`,
    username ? `You are replying to @${username}.` : "",
    keyword  ? `The mention involves the keyword: "${keyword}".` : "",
    "Write a single short, friendly, on-brand reply. 1-2 sentences max. No hashtags unless natural.",
  ].filter(Boolean);

  if (knowledgeCtx) systemParts.push(`\n${knowledgeCtx}`);

  const response = await anthropic.messages.create({
    model:      AI_FAST_MODEL,
    max_tokens: 150,
    system:     systemParts.join(" "),
    messages:   [{ role: "user", content: `Mention: "${content}"\n\nWrite a reply:` }],
  });

  const reply = response.content[0].type === "text" ? response.content[0].text.trim() : "";
  return c.json({ reply });
});

export default app;
