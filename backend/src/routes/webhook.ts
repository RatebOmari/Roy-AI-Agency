import { Hono } from "hono";
import { createHmac } from "crypto";
import { eq, and } from "drizzle-orm";
import { db } from "../db/index.js";
import { conversations, messages } from "../db/schema.js";
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
  const platform = c.req.param("platform") as "instagram" | "facebook" | "whatsapp" | "tiktok";
  const userId   = c.req.param("userId");
  const rawBody  = await c.req.text();

  // ── Signature verification ──────────────────────────────────────────────────
  const appSecret = process.env.META_APP_SECRET ?? process.env.TIKTOK_CLIENT_SECRET;
  if (appSecret) {
    const sigHeader =
      c.req.header("x-hub-signature-256") ??
      c.req.header("x-tiktok-signature") ??
      "";
    if (sigHeader && !verifyHmacSha256(appSecret, rawBody, sigHeader)) {
      console.warn(`[webhook] Signature mismatch for ${platform}/${userId}`);
      return c.json({ message: "Invalid signature" }, 401);
    }
  }

  // ── Parse body ──────────────────────────────────────────────────────────────
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return c.json({ message: "Invalid JSON" }, 400);
  }

  // ── Extract events ──────────────────────────────────────────────────────────
  let events: InboundEvent[] = [];
  switch (platform) {
    case "instagram": events = parseInstagram(body); break;
    case "facebook":  events = parseFacebook(body);  break;
    case "whatsapp":  events = parseWhatsApp(body);  break;
    case "tiktok":    events = parseTikTok(body);    break;
    default:
      return c.json({ message: "Unsupported platform" }, 400);
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
        .catch(err => console.error("[webhook] contactSync failed:", err));

      // ── Flow engine ─────────────────────────────────────────────────────────
      if (hasActiveFlow(conv.id)) {
        const activeFlowId = getActiveFlowId(conv.id);
        if (activeFlowId) {
          const resumed = await continueFlow(conv.id, event.text, activeFlowId);
          if (resumed) {
            console.log(`[webhook] flow resumed for conv ${conv.id}`);
            continue;
          }
        }
      }

      const matchedFlow = await checkFlowTrigger(event.text, userId, platform, conv.id);
      if (matchedFlow) {
        await executeFlow(matchedFlow, conv, event.handle);
        console.log(`[webhook] flow "${matchedFlow.name}" triggered for conv ${conv.id}`);
        continue;
      }

      // No flow matched — conversation stays pending for AI/human handling
      console.log(`[webhook] ${platform} message from ${event.contactId} → conv ${conv.id}`);
    } catch (err) {
      console.error(`[webhook] Failed to process event:`, err);
    }
  }

  // Platforms expect a fast 200 — always respond OK
  return c.json({ ok: true });
});

export default app;
