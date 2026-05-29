import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";
import Anthropic from "@anthropic-ai/sdk";
import { db } from "../db/index.js";
import { conversations, messages, toneSettings } from "../db/schema.js";
import { authMiddleware } from "../middleware/auth.js";
import { buildKnowledgeContext } from "../lib/knowledge.js";
import { deliverReply, makePhoneCall, logDelivery, type DeliveryChannel } from "../lib/platformDelivery.js";

const app = new Hono();
app.use("*", authMiddleware);

// Map channel string → platform for tone settings lookup
function channelToPlatform(channel: string): "tiktok" | "instagram" | "facebook" | "whatsapp" {
  if (channel.startsWith("tiktok"))    return "tiktok";
  if (channel.startsWith("instagram")) return "instagram";
  if (channel.startsWith("facebook"))  return "facebook";
  return "whatsapp";
}

// Map channel string → DeliveryChannel for platform delivery
function toDeliveryChannel(channel: string): DeliveryChannel {
  const map: Record<string, DeliveryChannel> = {
    tiktok_comment:       "tiktok_comment",
    tiktok_dm:            "tiktok_comment", // TikTok DMs not yet supported via API
    instagram_comment:    "instagram_comment",
    instagram_dm:         "instagram_dm",
    facebook_comment:     "facebook_comment",
    facebook_messenger:   "facebook_messenger",
    whatsapp_business:    "whatsapp_business",
    sms:                  "sms",
    phone_call:           "phone_call",
  };
  return map[channel] ?? "whatsapp_business";
}

// Confidence integer (0–100) → float (0.0–1.0) for frontend
function toConfidenceFloat(n: number | null | undefined): number | undefined {
  if (n === null || n === undefined) return undefined;
  return n / 100;
}

app.get("/", async (c) => {
  const user = c.get("user");

  const convRows = await db
    .select()
    .from(conversations)
    .where(eq(conversations.userId, user.sub))
    .orderBy(desc(conversations.lastMessageAt));

  const result = await Promise.all(
    convRows.map(async (conv) => {
      const msgs = await db
        .select()
        .from(messages)
        .where(eq(messages.convId, conv.id))
        .orderBy(messages.timestamp);

      return {
        id:            conv.id,
        contactId:     conv.contactId,
        contactName:   conv.contactName,
        contactHandle: conv.contactHandle,
        channel:       conv.channel,
        lastMessage:   conv.lastMessage,
        lastMessageAt: conv.lastMessageAt.toISOString(),
        unreadCount:   conv.unreadCount,
        status:        conv.status,
        priority:      conv.priority,
        assignedTo:    conv.assignedTo ?? undefined,
        tags:          conv.tags,
        messages:      msgs.map((m) => ({
          id:             m.id,
          conversationId: conv.id,
          direction:      m.direction,
          content:        m.content,
          aiReply:        m.aiReply ?? undefined,
          aiConfidence:   toConfidenceFloat(m.aiConfidence),
          replyStatus:    m.replyStatus ?? undefined,
          sentBy:         m.sentBy ?? undefined,
          timestamp:      m.timestamp.toISOString(),
          mediaUrl:       m.mediaUrl ?? undefined,
        })),
      };
    })
  );

  return c.json(result);
});

// ── Generate AI reply for a conversation ─────────────────────────────────────

const generateReplySchema = z.object({
  conversationId: z.string().uuid(),
});

app.post("/generate-reply", zValidator("json", generateReplySchema), async (c) => {
  const user = c.get("user");
  const { conversationId } = c.req.valid("json");

  // Verify ownership
  const [conv] = await db
    .select()
    .from(conversations)
    .where(and(eq(conversations.id, conversationId), eq(conversations.userId, user.sub)))
    .limit(1);
  if (!conv) return c.json({ message: "Conversation not found" }, 404);

  // Get the most recent inbound message
  const [lastInbound] = await db
    .select()
    .from(messages)
    .where(and(eq(messages.convId, conversationId), eq(messages.direction, "inbound")))
    .orderBy(desc(messages.timestamp))
    .limit(1);
  if (!lastInbound) return c.json({ message: "No inbound message to reply to" }, 400);

  // Get conversation history for context (last 6 messages)
  const history = await db
    .select()
    .from(messages)
    .where(eq(messages.convId, conversationId))
    .orderBy(desc(messages.timestamp))
    .limit(6);

  // Get tone settings for this channel's platform
  const platform = channelToPlatform(conv.channel);
  const [tone] = await db
    .select()
    .from(toneSettings)
    .where(and(eq(toneSettings.userId, user.sub), eq(toneSettings.platform, platform)))
    .limit(1);

  const toneStr     = tone?.tone     ?? "friendly";
  const langStr     = tone?.language ?? "en";
  const blocked     = tone?.blockedWords ?? "";
  const extra       = tone?.extra ?? "";

  const langInstruction =
    langStr === "ar"    ? "Always respond in Arabic." :
    langStr === "ar_en" ? "Respond primarily in Arabic; you may use English words where natural." :
                          "Respond in English.";

  // Fetch knowledge base context
  const knowledge = await buildKnowledgeContext(user.sub);

  // Build system prompt
  const systemParts: string[] = [
    `You are an AI customer support assistant replying on behalf of a business on ${platform}.`,
    `Tone: ${toneStr}. ${langInstruction}`,
    `Keep replies concise and natural (1–3 sentences for social media, up to 5 for DMs).`,
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
    `\nAfter writing your reply, rate your confidence (0–100) that it's accurate and helpful given the knowledge base.`,
    `Return ONLY valid JSON: { "reply": "<your reply>", "confidence": <integer 0-100> }`
  );

  const apiKey = process.env.ANTHROPIC_API_KEY;

  let reply: string;
  let confidence: number;

  if (apiKey) {
    try {
      const anthropic = new Anthropic({ apiKey });

      // Build conversation turns for context
      const historyTurns = [...history].reverse().map(m => ({
        role: m.direction === "inbound" ? "user" as const : "assistant" as const,
        content: m.aiReply ?? m.content,
      }));

      const response = await anthropic.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 512,
        system: systemParts.join("\n"),
        messages: historyTurns.length > 0
          ? historyTurns
          : [{ role: "user", content: lastInbound.content }],
      });

      const raw = response.content[0].type === "text" ? response.content[0].text : "";
      // Extract JSON — Claude sometimes wraps it in markdown
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON in response");
      const parsed = JSON.parse(jsonMatch[0]) as { reply: string; confidence: number };
      reply      = parsed.reply;
      confidence = Math.max(0, Math.min(100, Math.round(parsed.confidence)));
    } catch {
      // Fallback to mock if API call fails
      reply      = `Thank you for your message! We'll get back to you shortly.`;
      confidence = 55;
    }
  } else {
    // Demo mode — return a plausible mock reply
    const demoReplies = [
      "Thank you for reaching out! We'd love to help — could you share a few more details?",
      "Great question! Feel free to DM us and we'll sort it out right away 😊",
      "Hi there! We appreciate you contacting us. Our team will follow up shortly.",
    ];
    reply      = demoReplies[Math.floor(Math.random() * demoReplies.length)];
    confidence = 60 + Math.floor(Math.random() * 30); // 60–89
  }

  // Apply 3-tier confidence system
  const replyStatus =
    confidence >= 85 ? "auto_sent"  as const :
    confidence >= 50 ? "pending"    as const :
                       "escalated"  as const;

  // Create outbound message with the AI reply
  const [newMsg] = await db
    .insert(messages)
    .values({
      convId:       conversationId,
      direction:    "outbound",
      content:      reply,
      aiReply:      reply,
      aiConfidence: confidence,
      replyStatus,
      sentBy:       "ai",
      timestamp:    new Date(),
    })
    .returning();

  // Update conversation last message timestamp
  await db
    .update(conversations)
    .set({ lastMessageAt: new Date() })
    .where(eq(conversations.id, conversationId));

  // Auto-deliver when confidence is high enough (≥85%) — no human needed
  if (replyStatus === "auto_sent") {
    deliverReply({
      userId:          user.sub,
      channel:         toDeliveryChannel(conv.channel),
      recipientHandle: conv.contactHandle,
      text:            reply,
    })
      .then(result => logDelivery(result, `auto conv ${conversationId} → ${conv.channel}`))
      .catch(err => console.error("[delivery] Unexpected error:", err));
  }

  return c.json({
    messageId:    newMsg.id,
    reply,
    confidence:   confidence / 100, // return as float for frontend
    replyStatus,
  });
});

// ── Approve / reject / edit / updateStatus ───────────────────────────────────

const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.enum(["approve", "reject", "edit"]), conversationId: z.string().uuid(), content: z.string() }),
  z.object({ action: z.literal("updateStatus"), id: z.string().uuid(), status: z.enum(["open", "pending", "resolved", "closed"]) }),
]);

app.post("/action", zValidator("json", actionSchema), async (c) => {
  const user = c.get("user");
  const body = c.req.valid("json");

  if (body.action === "updateStatus") {
    const [conv] = await db
      .select({ id: conversations.id })
      .from(conversations)
      .where(and(eq(conversations.id, body.id), eq(conversations.userId, user.sub)))
      .limit(1);

    if (!conv) return c.json({ message: "Not found" }, 404);
    await db.update(conversations).set({ status: body.status }).where(eq(conversations.id, body.id));
    return c.json({ ok: true });
  }

  // approve / reject / edit
  const [conv] = await db
    .select()
    .from(conversations)
    .where(and(eq(conversations.id, body.conversationId), eq(conversations.userId, user.sub)))
    .limit(1);

  if (!conv) return c.json({ message: "Conversation not found" }, 404);

  const [pendingMsg] = await db
    .select()
    .from(messages)
    .where(and(eq(messages.convId, body.conversationId), eq(messages.replyStatus, "pending")))
    .orderBy(desc(messages.timestamp))
    .limit(1);

  if (!pendingMsg) return c.json({ message: "No pending message found" }, 404);

  const newStatus =
    body.action === "approve" ? "approved" as const :
    body.action === "reject"  ? "rejected" as const :
                                "edited"   as const;

  const replyText = body.action === "edit" ? body.content : (pendingMsg.aiReply ?? pendingMsg.content);

  await db
    .update(messages)
    .set({
      replyStatus: newStatus,
      aiReply:     body.action === "edit" ? body.content : undefined,
    })
    .where(eq(messages.id, pendingMsg.id));

  if (body.action !== "reject") {
    await db
      .update(conversations)
      .set({ unreadCount: 0 })
      .where(eq(conversations.id, body.conversationId));

    // Deliver to platform (fire-and-forget — DB status is already updated)
    deliverReply({
      userId:          user.sub,
      channel:         toDeliveryChannel(conv.channel),
      recipientHandle: conv.contactHandle,
      text:            replyText,
    })
      .then(result => logDelivery(result, `conv ${body.conversationId} → ${conv.channel}`))
      .catch(err => console.error("[delivery] Unexpected error:", err));
  }

  return c.json({ ok: true });
});

// ── Initiate outbound phone call ──────────────────────────────────────────────

app.post("/:id/call", async (c) => {
  const user   = c.get("user");
  const convId = c.req.param("id");

  const [conv] = await db
    .select()
    .from(conversations)
    .where(and(eq(conversations.id, convId), eq(conversations.userId, user.sub)))
    .limit(1);

  if (!conv) return c.json({ message: "Conversation not found" }, 404);
  if (conv.channel !== "phone_call") {
    return c.json({ message: "Not a phone channel" }, 400);
  }

  // Attempt Twilio outbound call
  const result = await makePhoneCall(conv.contactHandle, "Hello! This is a call from our support team. Please stay on the line.");
  logDelivery(result, `phone call → ${conv.contactHandle}`);

  // Record call attempt as a message
  const statusText = result.ok
    ? "📞 Outbound call initiated"
    : "skipped" in result
      ? `📞 Call skipped: ${result.reason}`
      : `📞 Call failed: ${(result as { error: string }).error}`;

  await db.insert(messages).values({
    convId:    convId,
    direction: "outbound",
    content:   statusText,
    sentBy:    "human",
    timestamp: new Date(),
  });

  await db
    .update(conversations)
    .set({ lastMessageAt: new Date() })
    .where(eq(conversations.id, convId));

  return c.json({ ok: result.ok });
});

// POST /:id/draft — insert template as pending draft reply
app.post("/:id/draft", zValidator("json", z.object({ content: z.string().min(1) })), async (c) => {
  const user   = c.get("user");
  const convId = c.req.param("id");
  const { content } = c.req.valid("json");

  const [conv] = await db
    .select({ id: conversations.id })
    .from(conversations)
    .where(and(eq(conversations.id, convId), eq(conversations.userId, user.sub)))
    .limit(1);
  if (!conv) return c.json({ message: "Not found" }, 404);

  const [msg] = await db
    .insert(messages)
    .values({
      convId,
      direction:    "outbound",
      content,
      aiReply:      content,
      aiConfidence: 100,
      replyStatus:  "pending",
      sentBy:       "human",
      timestamp:    new Date(),
    })
    .returning();

  await db
    .update(conversations)
    .set({ lastMessageAt: new Date() })
    .where(eq(conversations.id, convId));

  return c.json({ messageId: msg.id });
});

export default app;
