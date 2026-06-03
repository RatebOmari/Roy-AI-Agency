import { Hono } from "hono";
import { createHmac, timingSafeEqual } from "crypto";
import { eq, and } from "drizzle-orm";
import { db } from "../db/index.js";
import { logger } from "../lib/logger.js";
import { conversations, messages, listeningKeywords, listeningMentions } from "../db/schema.js";
import type { channelEnum } from "../db/schema.js";
import type { InferSelectModel } from "drizzle-orm";
import {
  checkFlowTrigger,
  hasActiveFlow,
  getActiveFlowId,
  executeFlow,
  continueFlow,
} from "../lib/flowEngine.js";
import { syncContact } from "../lib/contactSync.js";

type Channel = typeof channelEnum.enumValues[number];

const app = new Hono();

// ── Helpers ───────────────────────────────────────────────────────────────────

function verifyHmacSha256(
  secret: string,
  rawBody: string,
  signature: string
): boolean {
  const expected = "sha256=" + createHmac("sha256", secret).update(rawBody).digest("hex");
  // Constant-time compare
  if (expected.length !== signature.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  return diff === 0;
}

function verifyTwilioSmsSignature(
  authToken: string,
  url: string,
  params: Record<string, string>,
  signature: string,
): boolean {
  const sortedKeys = Object.keys(params).sort();
  const str = url + sortedKeys.map(k => k + params[k]).join("");
  const expected = createHmac("sha1", authToken).update(str).digest("base64");
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

/** Normalised inbound event extracted from any platform payload */
interface InboundEvent {
  contactId:   string;   // platform user ID / phone number
  contactName: string;
  handle:      string;   // @username / phone / display name
  text:        string;
  channel:     Channel;
  platformMessageId?: string;
}

// ── Payload parsers ───────────────────────────────────────────────────────────

function parseInstagram(body: Record<string, unknown>): InboundEvent[] {
  const events: InboundEvent[] = [];
  const entries = (body.entry as Array<Record<string, unknown>>) ?? [];
  for (const entry of entries) {
    const messaging = (entry.messaging as Array<Record<string, unknown>>) ?? [];
    for (const m of messaging) {
      const msg = m.message as Record<string, unknown> | undefined;
      if (!msg || !msg.text) continue;
      const sender = m.sender as Record<string, string>;
      events.push({
        contactId:   sender.id,
        contactName: sender.id,
        handle:      sender.id,
        text:        String(msg.text),
        channel:     "instagram_dm",
        platformMessageId: String(msg.mid ?? ""),
      });
    }
  }
  return events;
}

function parseFacebook(body: Record<string, unknown>): InboundEvent[] {
  const events: InboundEvent[] = [];
  const entries = (body.entry as Array<Record<string, unknown>>) ?? [];
  for (const entry of entries) {
    const messaging = (entry.messaging as Array<Record<string, unknown>>) ?? [];
    for (const m of messaging) {
      const msg = m.message as Record<string, unknown> | undefined;
      if (!msg || !msg.text) continue;
      const sender = m.sender as Record<string, string>;
      events.push({
        contactId:   sender.id,
        contactName: sender.id,
        handle:      sender.id,
        text:        String(msg.text),
        channel:     "facebook_messenger",
        platformMessageId: String(msg.mid ?? ""),
      });
    }
  }
  return events;
}

function parseWhatsApp(body: Record<string, unknown>): InboundEvent[] {
  const events: InboundEvent[] = [];
  const entries = (body.entry as Array<Record<string, unknown>>) ?? [];
  for (const entry of entries) {
    const changes = (entry.changes as Array<Record<string, unknown>>) ?? [];
    for (const change of changes) {
      const value = change.value as Record<string, unknown> | undefined;
      if (!value) continue;
      const msgs = (value.messages as Array<Record<string, unknown>>) ?? [];
      const contacts = (value.contacts as Array<Record<string, unknown>>) ?? [];
      for (const msg of msgs) {
        if (msg.type !== "text") continue;
        const from     = String(msg.from ?? "");
        const contact  = contacts.find((ct) => ct.wa_id === from);
        const name     = (contact?.profile as Record<string, string> | undefined)?.name ?? from;
        const textBody = (msg.text as Record<string, string> | undefined)?.body ?? "";
        events.push({
          contactId:   from,
          contactName: name,
          handle:      `+${from}`,
          text:        textBody,
          channel:     "whatsapp_business",
          platformMessageId: String(msg.id ?? ""),
        });
      }
    }
  }
  return events;
}

function parseSms(form: URLSearchParams): InboundEvent[] {
  const from = form.get("From") ?? "";
  const body = form.get("Body") ?? "";
  const sid  = form.get("MessageSid") ?? "";
  if (!from || !body) return [];
  return [{
    contactId:   from,
    contactName: from,
    handle:      from,
    text:        body,
    channel:     "sms",
    platformMessageId: sid,
  }];
}

function parseTikTok(body: Record<string, unknown>): InboundEvent[] {
  const data = body.data as Record<string, unknown> | undefined;
  const comment = data?.comment as Record<string, unknown> | undefined;
  if (!comment) return [];

  const user = comment.user as Record<string, string> | undefined;
  const text = String(comment.text ?? "");
  if (!text) return [];

  return [{
    contactId:   user?.open_id ?? "unknown",
    contactName: user?.display_name ?? "TikTok User",
    handle:      user?.display_name ?? "TikTok User",
    text,
    channel:     "tiktok_comment",
    platformMessageId: String(comment.cid ?? ""),
  }];
}

// ── Brand listening keyword scan ──────────────────────────────────────────────

async function scanForMentions(userId: string, event: InboundEvent): Promise<void> {
  const keywords = await db
    .select()
    .from(listeningKeywords)
    .where(and(eq(listeningKeywords.userId, userId), eq(listeningKeywords.active, true)));

  if (keywords.length === 0) return;

  const text = event.text.toLowerCase();
  const platform = event.channel.split("_")[0]; // "instagram", "facebook", etc.

  for (const kw of keywords) {
    if (!text.includes(kw.keyword.toLowerCase())) continue;

    const sentiment =
      /love|great|amazing|best|awesome|delicious|wonderful|excellent|fantastic|perfect/i.test(event.text) ? "positive" :
      /bad|terrible|awful|horrible|worst|disappoint|issue|problem|hate|never again/i.test(event.text)   ? "negative" :
      "neutral";

    await db.insert(listeningMentions).values({
      userId,
      keywordId: kw.id,
      keyword:   kw.keyword,
      platform,
      username:  event.contactName || event.contactId,
      content:   event.text,
      sentiment,
      handled:   false,
      timestamp: new Date(),
    });

    break; // one mention per event (first matching keyword wins)
  }
}

// ── Conversation / message upsert ─────────────────────────────────────────────

async function upsertConversation(
  userId: string,
  event: InboundEvent
): Promise<InferSelectModel<typeof conversations>> {
  // Find existing open/pending conversation for this contact + channel
  const [existing] = await db
    .select()
    .from(conversations)
    .where(
      and(
        eq(conversations.userId, userId),
        eq(conversations.contactId, event.contactId),
        eq(conversations.channel, event.channel),
      ),
    )
    .limit(1);

  if (existing) {
    const [updated] = await db
      .update(conversations)
      .set({
        lastMessage:   event.text.slice(0, 200),
        lastMessageAt: new Date(),
        unreadCount:   existing.unreadCount + 1,
        status:        existing.status === "resolved" || existing.status === "closed"
          ? "pending"   // re-open if closed
          : existing.status,
      })
      .where(eq(conversations.id, existing.id))
      .returning();
    return updated;
  }

  const [created] = await db
    .insert(conversations)
    .values({
      userId,
      contactId:     event.contactId,
      contactName:   event.contactName,
      contactHandle: event.handle,
      channel:       event.channel,
      lastMessage:   event.text.slice(0, 200),
      lastMessageAt: new Date(),
      unreadCount:   1,
      status:        "pending",
    })
    .returning();

  return created;
}

// ── GET /:platform — platform verification handshake (Meta / TikTok) ──────────

app.get("/:platform", (c) => {
  const mode      = c.req.query("hub.mode");
  const challenge = c.req.query("hub.challenge");
  const token     = c.req.query("hub.verify_token");
  const verifyToken = process.env.WEBHOOK_VERIFY_TOKEN;

  if (mode === "subscribe" && verifyToken && token === verifyToken) {
    return c.text(challenge ?? "");
  }

  // TikTok uses a different query param name
  const tikTokChallenge = c.req.query("challenge");
  if (tikTokChallenge) {
    return c.text(tikTokChallenge);
  }

  return c.json({ message: "Forbidden" }, 403);
});

// ── POST /:platform/:userId — inbound message from platform ───────────────────

app.post("/:platform/:userId", async (c) => {
  const platform = c.req.param("platform") as "instagram" | "facebook" | "whatsapp" | "tiktok" | "sms";
  const userId   = c.req.param("userId");
  const rawBody  = await c.req.text();

  // ── Signature verification ──────────────────────────────────────────────────
  if (platform === "sms") {
    // Twilio SMS uses X-Twilio-Signature (HMAC-SHA1)
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    if (authToken) {
      const sig    = c.req.header("x-twilio-signature") ?? "";
      const params = Object.fromEntries(new URLSearchParams(rawBody).entries());
      if (!verifyTwilioSmsSignature(authToken, c.req.url, params, sig)) {
        logger.warn(`[webhook] Twilio SMS signature mismatch for ${userId}`);
        return c.json({ message: "Invalid signature" }, 401);
      }
    }
  } else {
    // Meta and TikTok use HMAC-SHA256
    const appSecret = process.env.META_APP_SECRET ?? process.env.TIKTOK_CLIENT_SECRET;
    if (appSecret) {
      const sigHeader =
        c.req.header("x-hub-signature-256") ??
        c.req.header("x-tiktok-signature") ??
        "";
      if (sigHeader && !verifyHmacSha256(appSecret, rawBody, sigHeader)) {
        logger.warn(`[webhook] Signature mismatch for ${platform}/${userId}`);
        return c.json({ message: "Invalid signature" }, 401);
      }
    }
  }

  // ── Extract events ──────────────────────────────────────────────────────────
  let events: InboundEvent[] = [];

  if (platform === "sms") {
    // Twilio sends application/x-www-form-urlencoded
    events = parseSms(new URLSearchParams(rawBody));
  } else {
    // All other platforms send JSON
    let body: Record<string, unknown>;
    try {
      body = JSON.parse(rawBody) as Record<string, unknown>;
    } catch {
      return c.json({ message: "Invalid JSON" }, 400);
    }

    switch (platform) {
      case "instagram": events = parseInstagram(body); break;
      case "facebook":  events = parseFacebook(body);  break;
      case "whatsapp":  events = parseWhatsApp(body);  break;
      case "tiktok":    events = parseTikTok(body);    break;
      default:
        return c.json({ message: "Unsupported platform" }, 400);
    }
  }

  // ── Process each event ──────────────────────────────────────────────────────
  for (const event of events) {
    try {
      const conv = await upsertConversation(userId, event);

      await db.insert(messages).values({
        convId:    conv.id,
        direction: "inbound",
        content:   event.text,
        timestamp: new Date(),
      });

      // Update contacts CRM (fire-and-forget; non-blocking)
      syncContact(userId, event.contactId, event.contactName, event.handle, event.channel)
        .catch(err => logger.error({ err }, "[webhook] contactSync failed"));

      // Scan message text against active listening keywords (fire-and-forget)
      scanForMentions(userId, event)
        .catch(err => logger.error({ err }, "[webhook] mention scan failed"));

      // ── Flow engine ─────────────────────────────────────────────────────────
      if (await hasActiveFlow(conv.id)) {
        const activeFlowId = await getActiveFlowId(conv.id);
        if (activeFlowId) {
          const resumed = await continueFlow(conv.id, event.text, activeFlowId);
          if (resumed) {
            logger.info(`[webhook] flow resumed for conv ${conv.id}`);
            continue;
          }
        }
      }

      const matchedFlow = await checkFlowTrigger(event.text, userId, platform, conv.id);
      if (matchedFlow) {
        await executeFlow(matchedFlow, conv, event.handle);
        logger.info(`[webhook] flow "${matchedFlow.name}" triggered for conv ${conv.id}`);
        continue;
      }

      // No flow matched — conversation stays pending for AI/human handling
      logger.info(`[webhook] ${platform} message from ${event.contactId} → conv ${conv.id}`);
    } catch (err) {
      logger.error({ err }, `[webhook] Failed to process event`);
    }
  }

  // Platforms expect a fast 200 — always respond OK
  return c.json({ ok: true });
});

export default app;
