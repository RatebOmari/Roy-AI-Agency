import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";
import Anthropic from "@anthropic-ai/sdk";
import { db } from "../db/index.js";
import { comments, toneSettings } from "../db/schema.js";
import { authMiddleware } from "../middleware/auth.js";
import { buildKnowledgeContext } from "../lib/knowledge.js";

const app = new Hono();
app.use("*", authMiddleware);

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
    .select({ id: comments.id })
    .from(comments)
    .where(and(eq(comments.id, id), eq(comments.userId, user.sub)))
    .limit(1);

  if (!comment) return c.json({ message: "Comment not found" }, 404);

  const newStatus =
    action === "approve" ? "approved" as const :
    action === "reject"  ? "rejected" as const :
                           "edited"   as const;

  await db
    .update(comments)
    .set({
      status:  newStatus,
      aiReply: action === "edit" && aiReply !== undefined ? aiReply : undefined,
    })
    .where(eq(comments.id, id));

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
        model: "claude-haiku-4-5-20251001",
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
    confidence >= 85 ? "auto_sent" as const :
    confidence >= 50 ? "pending"   as const :
                       "pending"   as const; // <50 = escalation (shown via low confidence in UI)

  // Update comment with the AI reply
  await db
    .update(comments)
    .set({
      aiReply:      reply,
      aiConfidence: confidence,
      status:       replyStatus,
    })
    .where(eq(comments.id, commentId));

  return c.json({
    commentId,
    reply,
    confidence:  confidence / 100, // return as float for frontend
    replyStatus,
  });
});

export default app;
