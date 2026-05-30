import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";
import Anthropic from "@anthropic-ai/sdk";
import { db } from "../db/index.js";
import { comments, toneSettings } from "../db/schema.js";
import { authMiddleware } from "../middleware/auth.js";
import { clientContextMiddleware } from "../middleware/clientContext.js";
import { buildKnowledgeContext } from "../lib/knowledge.js";
import { deliverReply, logDelivery, type DeliveryChannel } from "../lib/platformDelivery.js";
import { AI_FAST_MODEL } from "../lib/constants.js";

function platformToCommentChannel(platform: string): DeliveryChannel {
  if (platform === "instagram") return "instagram_comment";
  if (platform === "facebook")  return "facebook_comment";
  if (platform === "tiktok")    return "tiktok_comment";
  if (platform === "whatsapp")  return "whatsapp_business";
  return "instagram_comment"; // fallback
}

const app = new Hono();
app.use("*", authMiddleware);
app.use("*", clientContextMiddleware);

// Confidence integer (0–100) → float (0.0–1.0) for frontend
function toFloat(n: number | null | undefined): number | undefined {
  if (n === null || n === undefined) return undefined;
  return n / 100;
}

// ── List comments ─────────────────────────────────────────────────────────────

app.get("/", async (c) => {
  const user = c.get("user");
  const platform = c.req.query("platform");
  const status   = c.req.query("status");

  let query = db
    .select()
    .from(comments)
    .where(eq(comments.userId, user.sub))
    .orderBy(desc(comments.timestamp))
    .$dynamic();

  const rows = await query;

  const filtered = rows
    .filter(r => !platform || r.platform === platform)
    .filter(r => !status   || r.status   === status);

  return c.json(filtered.map(r => ({
    id:            r.id,
    platform:      r.platform,
    username:      r.username,
    text:          r.text,
    aiReply:       r.aiReply,
    aiConfidence:  toFloat(r.aiConfidence),
    status:        r.status,
    timestamp:     r.timestamp.toISOString(),
  })));
});

// ── Approve / reject / edit ───────────────────────────────────────────────────

const actionSchema = z.object({
  action:  z.enum(["approve", "reject", "edit"]),
  id:      z.string().uuid(),
  aiReply: z.string().optional(),
});

app.post("/action", zValidator("json", actionSchema), async (c) => {
  const user = c.get("user");
  const { action, id, aiReply } = c.req.valid("json");

  const [comment] = await db
    .select()
    .from(comments)
    .where(and(eq(comments.id, id), eq(comments.userId, user.sub)))
    .limit(1);

  if (!comment) return c.json({ message: "Comment not found" }, 404);

  const newStatus =
    action === "approve" ? "approved" as const :
    action === "reject"  ? "rejected" as const :
                           "edited"   as const;

  const replyText = action === "edit" && aiReply !== undefined ? aiReply : comment.aiReply;

  await db
    .update(comments)
    .set({
      status:  newStatus,
      aiReply: action === "edit" && aiReply !== undefined ? aiReply : undefined,
    })
    .where(eq(comments.id, id));

  // Deliver to platform when approved or edited (fire-and-forget — don't block response)
  if (action !== "reject") {
    deliverReply({
      userId:            user.sub,
      channel:           platformToCommentChannel(comment.platform),
      recipientHandle:   comment.username,
      platformCommentId: comment.platformCommentId,
      platformVideoId:   comment.platformVideoId,
      text:              replyText,
    })
      .then(result => logDelivery(result, `comment ${id} → ${comment.platform}`))
      .catch(err => console.error("[delivery] Unexpected error:", err));
  }

  return c.json({ ok: true });
});

// ── Generate AI reply for a comment ──────────────────────────────────────────

const generateReplySchema = z.object({
  commentId: z.string().uuid(),
});

app.post("/generate-reply", zValidator("json", generateReplySchema), async (c) => {
  const user = c.get("user");
  const { commentId } = c.req.valid("json");

  // Verify ownership and fetch comment
  const [comment] = await db
    .select()
    .from(comments)
    .where(and(eq(comments.id, commentId), eq(comments.userId, user.sub)))
    .limit(1);

  if (!comment) return c.json({ message: "Comment not found" }, 404);

  // Get tone settings for this platform
  const [tone] = await db
    .select()
    .from(toneSettings)
    .where(and(eq(toneSettings.userId, user.sub), eq(toneSettings.platform, comment.platform)))
    .limit(1);

  const toneStr = tone?.tone     ?? "friendly";
  const langStr = tone?.language ?? "en";
  const blocked = tone?.blockedWords ?? "";
  const extra   = tone?.extra ?? "";

  const langInstruction =
    langStr === "ar"    ? "Always respond in Arabic." :
    langStr === "ar_en" ? "Respond primarily in Arabic; you may use English words where natural." :
                          "Respond in English.";

  // Fetch knowledge base context
  const knowledge = await buildKnowledgeContext(user.sub);

  // Build system prompt — comments are public so replies must be concise (1–2 sentences)
  const systemParts: string[] = [
    `You are an AI assistant replying to a public ${comment.platform} comment on behalf of a business.`,
    `Tone: ${toneStr}. ${langInstruction}`,
    `Keep your reply SHORT — 1 to 2 sentences maximum. This is a public comment reply, not a DM.`,
    `Be warm, professional, and reflect the brand voice.`,
  ];
  if (knowledge) {
    systemParts.push(`\nBUSINESS KNOWLEDGE BASE:\n${knowledge}`);
  }
  if (blocked) {
    systemParts.push(`\nNever use these words: ${blocked}`);
  }
  if (extra) {
    systemParts.push(`\nAdditional instructions: ${extra}`);
  }
  systemParts.push(
    `\nAfter writing your reply, rate your confidence (0–100) that it's accurate and helpful.`,
    `Return ONLY valid JSON: { "reply": "<your reply>", "confidence": <integer 0-100> }`
  );

  const apiKey = process.env.ANTHROPIC_API_KEY;

  let reply: string;
  let confidence: number;

  if (apiKey) {
    try {
      const anthropic = new Anthropic({ apiKey });
      const response = await anthropic.messages.create({
        model: AI_FAST_MODEL,
        max_tokens: 256,
        system: systemParts.join("\n"),
        messages: [{ role: "user", content: comment.text }],
      });

      const raw = response.content[0].type === "text" ? response.content[0].text : "";
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON in response");
      const parsed = JSON.parse(jsonMatch[0]) as { reply: string; confidence: number };
      reply      = parsed.reply;
      confidence = Math.max(0, Math.min(100, Math.round(parsed.confidence)));
    } catch {
      reply      = "Thank you for your comment! Feel free to DM us for more details 😊";
      confidence = 55;
    }
  } else {
    // Demo mode
    const demoReplies = [
      "Thank you so much! We really appreciate your kind words 🙏",
      "Great question! Feel free to DM us and we'll help you right away 😊",
      "We're so glad you reached out! Check the link in our bio for more info ✨",
    ];
    reply      = demoReplies[Math.floor(Math.random() * demoReplies.length)];
    confidence = 60 + Math.floor(Math.random() * 30);
  }

  // 3-tier confidence system — same thresholds as inbox
  const replyStatus =
    confidence >= 85 ? "auto_sent"  as const :
    confidence >= 50 ? "pending"    as const :
                       "escalated"  as const;

  // Update comment with the AI reply
  await db
    .update(comments)
    .set({
      aiReply:      reply,
      aiConfidence: confidence,
      status:       replyStatus,
    })
    .where(eq(comments.id, commentId));

  // Auto-deliver when confidence is high enough — no human needed
  if (replyStatus === "auto_sent") {
    deliverReply({
      userId:            user.sub,
      channel:           platformToCommentChannel(comment.platform),
      recipientHandle:   comment.username,
      platformCommentId: comment.platformCommentId,
      platformVideoId:   comment.platformVideoId,
      text:              reply,
    })
      .then(result => logDelivery(result, `auto comment ${commentId} → ${comment.platform}`))
      .catch(err => console.error("[delivery] Unexpected error:", err));
  }

  return c.json({
    commentId,
    reply,
    confidence:  confidence / 100, // return as float for frontend
    replyStatus,
  });
});

export default app;
