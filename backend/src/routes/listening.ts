import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";
import { db } from "../db/index.js";
import { listeningKeywords } from "../db/schema.js";
import { authMiddleware } from "../middleware/auth.js";

const app = new Hono();
app.use("*", authMiddleware);

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

// GET /mentions — return mock mention data
app.get("/mentions", async (c) => {
  const user = c.get("user");

  // Fetch user's keywords to make mock data more realistic
  const userKeywords = await db
    .select()
    .from(listeningKeywords)
    .where(eq(listeningKeywords.userId, user.sub));

  const sampleKeywords = userKeywords.length > 0
    ? userKeywords.map((k) => ({ id: k.id, keyword: k.keyword }))
    : [
        { id: "sample-1", keyword: "restaurant" },
        { id: "sample-2", keyword: "food" },
        { id: "sample-3", keyword: "delivery" },
      ];

  const platforms = ["instagram", "tiktok", "facebook", "twitter"];
  const sentiments = ["positive", "negative", "neutral"] as const;

  const mockUsernames = [
    "foodie_adventures", "sara_eats_out", "ahmed_reviews", "layla_foodblog",
    "the_real_critic", "yummy_bites99", "local_explorer", "taste_hunter",
    "casual_diner", "street_food_fan",
  ];

  const contentTemplates = [
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

  const now = Date.now();
  const sevenDays = 7 * 24 * 60 * 60 * 1000;

  const mentions = Array.from({ length: 10 }, (_, i) => {
    const kwEntry = sampleKeywords[i % sampleKeywords.length];
    const platform = platforms[i % platforms.length];
    const sentiment = sentiments[i % sentiments.length];
    const username = mockUsernames[i];
    const template = contentTemplates[i];
    const timestamp = new Date(now - Math.floor(Math.random() * sevenDays)).toISOString();

    return {
      id:        `mention-${Date.now()}-${i}`,
      keywordId: kwEntry.id,
      keyword:   kwEntry.keyword,
      platform,
      username,
      content:   template(kwEntry.keyword),
      url:       `https://${platform}.com/${username}/post/${Math.random().toString(36).slice(2, 10)}`,
      sentiment,
      timestamp,
    };
  });

  return c.json(mentions);
});

export default app;
