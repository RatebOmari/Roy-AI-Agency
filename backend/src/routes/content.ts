import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, and, asc, desc, inArray } from "drizzle-orm";
import Anthropic from "@anthropic-ai/sdk";
import { db } from "../db/index.js";
import { scheduledPosts, postMetrics, agencyClients, users } from "../db/schema.js";
import { authMiddleware } from "../middleware/auth.js";
import { clientContextMiddleware } from "../middleware/clientContext.js";
import { buildKnowledgeContext } from "../lib/knowledge.js";
import { AI_FAST_MODEL } from "../lib/constants.js";
import { createMiddleware } from "hono/factory";

const app = new Hono();
app.use("*", authMiddleware);
app.use("*", clientContextMiddleware);

// ── Role guards ────────────────────────────────────────────────────────────────

const agencyOnly = createMiddleware(async (c, next) => {
  if (c.get("user").role !== "agency") {
    return c.json({ message: "Agency access required" }, 403);
  }
  await next();
});

const clientOnly = createMiddleware(async (c, next) => {
  if (c.get("user").role !== "client") {
    return c.json({ message: "Client access required" }, 403);
  }
  await next();
});

// ── GET / — list posts for current user (client) or selected client (agency via x-client-id) ──

app.get("/", async (c) => {
  const user = c.get("user");
  const posts = await db
    .select()
    .from(scheduledPosts)
    .where(eq(scheduledPosts.userId, user.sub))
    .orderBy(asc(scheduledPosts.scheduledAt));
  return c.json(posts);
});

// ── GET /all-clients — agency only: all posts for every managed client ─────────

app.get("/all-clients", agencyOnly, async (c) => {
  const user = c.get("user");
  // user.sub here is the agency's own ID (no x-client-id header for this endpoint)
  const agencyId = user.sub;

  const rels = await db
    .select({ clientId: agencyClients.clientId, approvalEnabled: agencyClients.contentApprovalEnabled })
    .from(agencyClients)
    .where(eq(agencyClients.agencyId, agencyId));

  if (rels.length === 0) return c.json([]);

  const clientIds = rels.map(r => r.clientId);

  const posts = await db
    .select({
      id:                     scheduledPosts.id,
      userId:                 scheduledPosts.userId,
      createdBy:              scheduledPosts.createdBy,
      platforms:              scheduledPosts.platforms,
      content:                scheduledPosts.content,
      mediaUrl:               scheduledPosts.mediaUrl,
      scheduledAt:            scheduledPosts.scheduledAt,
      publishedAt:            scheduledPosts.publishedAt,
      status:                 scheduledPosts.status,
      aiGenerated:            scheduledPosts.aiGenerated,
      createdAt:              scheduledPosts.createdAt,
      approvalRequired:       scheduledPosts.approvalRequired,
      approvalStatus:         scheduledPosts.approvalStatus,
      submittedForApprovalAt: scheduledPosts.submittedForApprovalAt,
      approvedAt:             scheduledPosts.approvedAt,
      approvalFeedback:       scheduledPosts.approvalFeedback,
      overridePublished:      scheduledPosts.overridePublished,
      overridePublishedBy:    scheduledPosts.overridePublishedBy,
      clientName:             users.name,
      clientBusinessName:     users.businessName,
    })
    .from(scheduledPosts)
    .innerJoin(users, eq(scheduledPosts.userId, users.id))
    .where(inArray(scheduledPosts.userId, clientIds))
    .orderBy(asc(scheduledPosts.scheduledAt));

  return c.json(posts);
});

// ── POST / — create post (agency only) ────────────────────────────────────────

const postSchema = z.object({
  platforms:   z.array(z.string()).min(1),
  content:     z.string().min(1),
  mediaUrl:    z.string().nullable().optional(),
  scheduledAt: z.string().nullable().optional(),
  status:      z.enum(["draft", "scheduled", "published", "failed", "pending_approval", "changes_requested"]).optional(),
  aiGenerated: z.boolean().optional(),
});

app.post("/", agencyOnly, zValidator("json", postSchema), async (c) => {
  const user = c.get("user");
  const body = c.req.valid("json");

  // When agency creates for a client (user.sub = clientId after middleware),
  // check if the client has content approval enabled.
  let finalStatus: string = body.status ?? "draft";
  let approvalRequired = false;
  let approvalStatus: "not_required" | "pending" = "not_required";
  let submittedForApprovalAt: Date | null = null;

  const clientId = user.sub;
  const [rel] = await db
    .select({ enabled: agencyClients.contentApprovalEnabled })
    .from(agencyClients)
    .where(eq(agencyClients.clientId, clientId))
    .limit(1);

  if (rel?.enabled !== false) {
    // Approval enabled (default) — submit for approval
    finalStatus = "pending_approval";
    approvalRequired = true;
    approvalStatus = "pending";
    submittedForApprovalAt = new Date();
  }

  const [post] = await db
    .insert(scheduledPosts)
    .values({
      userId:                 clientId,
      platforms:              body.platforms,
      content:                body.content,
      mediaUrl:               body.mediaUrl ?? null,
      scheduledAt:            body.scheduledAt ? new Date(body.scheduledAt) : null,
      status:                 finalStatus as "draft" | "pending_approval",
      aiGenerated:            body.aiGenerated ?? false,
      approvalRequired,
      approvalStatus,
      submittedForApprovalAt,
    })
    .returning();
  return c.json(post, 201);
});

// ── PUT /:id — edit post (agency only) ────────────────────────────────────────

app.put("/:id", agencyOnly, zValidator("json", postSchema.partial()), async (c) => {
  const user = c.get("user");
  const id   = c.req.param("id");
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

// ── DELETE /:id — delete post (agency only) ───────────────────────────────────

app.delete("/:id", agencyOnly, async (c) => {
  const user = c.get("user");
  const id   = c.req.param("id");
  await db
    .delete(scheduledPosts)
    .where(and(eq(scheduledPosts.id, id), eq(scheduledPosts.userId, user.sub)));
  return c.json({ ok: true });
});

// ── POST /:id/submit-for-approval — agency resends a draft for client approval ─

app.post("/:id/submit-for-approval", agencyOnly, async (c) => {
  const user = c.get("user");
  const id   = c.req.param("id");

  const [post] = await db
    .update(scheduledPosts)
    .set({
      status:                 "pending_approval",
      approvalRequired:       true,
      approvalStatus:         "pending",
      submittedForApprovalAt: new Date(),
      approvalFeedback:       null,
    })
    .where(and(eq(scheduledPosts.id, id), eq(scheduledPosts.userId, user.sub)))
    .returning();

  if (!post) return c.json({ message: "Not found" }, 404);
  return c.json(post);
});

// ── POST /:id/approve — client approves a post ────────────────────────────────

app.post("/:id/approve", clientOnly, async (c) => {
  const user = c.get("user");
  const id   = c.req.param("id");

  const [post] = await db
    .update(scheduledPosts)
    .set({
      status:         "scheduled",
      approvalStatus: "approved",
      approvedAt:     new Date(),
    })
    .where(and(eq(scheduledPosts.id, id), eq(scheduledPosts.userId, user.sub)))
    .returning();

  if (!post) return c.json({ message: "Not found" }, 404);
  return c.json(post);
});

// ── POST /:id/request-changes — client requests changes ───────────────────────

const changesSchema = z.object({ feedback: z.string().min(1) });

app.post("/:id/request-changes", clientOnly, zValidator("json", changesSchema), async (c) => {
  const user = c.get("user");
  const id   = c.req.param("id");
  const { feedback } = c.req.valid("json");

  const [post] = await db
    .update(scheduledPosts)
    .set({
      status:           "changes_requested",
      approvalStatus:   "changes_requested",
      approvalFeedback: feedback,
    })
    .where(and(eq(scheduledPosts.id, id), eq(scheduledPosts.userId, user.sub)))
    .returning();

  if (!post) return c.json({ message: "Not found" }, 404);
  return c.json(post);
});

// ── POST /:id/override-publish — agency publishes regardless of approval status ─

app.post("/:id/override-publish", agencyOnly, async (c) => {
  const user = c.get("user");
  const id   = c.req.param("id");

  // Find the post by id under this client (user.sub = clientId after middleware)
  const [post] = await db
    .update(scheduledPosts)
    .set({
      status:              "scheduled",
      overridePublished:   true,
      approvalStatus:      "approved",
      approvedAt:          new Date(),
    })
    .where(eq(scheduledPosts.id, id))
    .returning();

  if (!post) return c.json({ message: "Not found" }, 404);
  return c.json(post);
});

// ── AI caption / image generation (agency only) ───────────────────────────────

const generateSchema = z.object({
  prompt:   z.string().min(1),
  platform: z.string().optional(),
  tone:     z.enum(["friendly", "professional", "fun", "informative"]).optional(),
});

app.post("/generate", agencyOnly, zValidator("json", generateSchema), async (c) => {
  const user = c.get("user");
  const { prompt, platform, tone } = c.req.valid("json");

  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (apiKey) {
    try {
      const knowledge = await buildKnowledgeContext(user.sub);

      const systemParts = [
        `You are a social media copywriter creating posts for a business on ${platform ?? "social media"}.`,
        `Tone: ${tone ?? "friendly"}. Keep it engaging and platform-appropriate.`,
      ];
      if (knowledge) {
        systemParts.push(`\nBUSINESS KNOWLEDGE BASE (use facts from here when relevant):\n${knowledge}`);
      }
      systemParts.push(
        `\nReturn ONLY valid JSON: { "caption": "<post text>", "hashtags": ["tag1", "tag2"] }`,
        `Hashtags without the # symbol. 3-5 hashtags. No other text outside the JSON.`
      );

      const anthropic = new Anthropic({ apiKey });
      const response = await anthropic.messages.create({
        model: AI_FAST_MODEL,
        max_tokens: 512,
        system: systemParts.join("\n"),
        messages: [{ role: "user", content: prompt }],
      });

      const raw = response.content[0].type === "text" ? response.content[0].text : "";
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON in response");
      const parsed = JSON.parse(jsonMatch[0]) as { caption: string; hashtags: string[] };
      return c.json({ caption: parsed.caption, hashtags: parsed.hashtags ?? [] });
    } catch {
      // fall through to demo
    }
  }

  const toneMap: Record<string, string> = {
    friendly:     "✨ We're so excited to share this with you!",
    professional: "We are pleased to announce:",
    fun:          "🔥 You won't believe what we've got for you!",
    informative:  "Here's what you need to know:",
  };
  const prefix = toneMap[tone ?? "friendly"];
  const hashtags = ["business", (platform ?? "social").replace("_", ""), "content"];
  return c.json({
    caption: `${prefix} ${prompt}. Come experience the difference! 🌟`,
    hashtags,
  });
});

const generateImageSchema = z.object({
  prompt:     z.string().min(1),
  caption:    z.string().optional(),
  platform:   z.string().optional(),
  brandStyle: z.string().optional(),
});

const DEMO_IMAGES = [
  "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600",
  "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600",
  "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600",
  "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600",
  "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=600",
];

app.post("/generate-image", agencyOnly, zValidator("json", generateImageSchema), async (c) => {
  const { prompt, caption, platform, brandStyle } = c.req.valid("json");
  const apiKey = process.env.OPENAI_API_KEY;

  if (apiKey) {
    try {
      const styleGuide = brandStyle?.trim()
        ? `Brand visual style: ${brandStyle}.`
        : "Professional photography style, vibrant colors, high quality.";
      const fullPrompt = [
        `Social media post image for ${platform ?? "Instagram"}.`,
        `Topic: ${prompt}.`,
        caption ? `Caption context: ${caption}.` : "",
        styleGuide,
        "Optimized for social media, no text overlays.",
      ].filter(Boolean).join(" ");

      const res = await fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ model: "dall-e-3", prompt: fullPrompt, n: 1, size: "1024x1024" }),
      });
      const data = await res.json() as { data: { url: string }[] };
      return c.json({ url: data.data[0].url });
    } catch {
      // fall through to demo
    }
  }

  return c.json({ url: DEMO_IMAGES[Math.floor(Math.random() * DEMO_IMAGES.length)] });
});

// ── GET /metrics — post performance (all roles) ───────────────────────────────

app.get("/metrics", async (c) => {
  const user = c.get("user");
  const rows = await db
    .select({
      postId:        postMetrics.postId,
      likes:         postMetrics.likes,
      comments:      postMetrics.comments,
      reach:         postMetrics.reach,
      shares:        postMetrics.shares,
      recordedAt:    postMetrics.recordedAt,
      postContent:   scheduledPosts.content,
      postPlatforms: scheduledPosts.platforms,
    })
    .from(postMetrics)
    .innerJoin(scheduledPosts, eq(postMetrics.postId, scheduledPosts.id))
    .where(eq(scheduledPosts.userId, user.sub))
    .orderBy(desc(postMetrics.recordedAt))
    .limit(10);
  return c.json(rows);
});

export default app;
