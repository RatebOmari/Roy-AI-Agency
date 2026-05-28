/**
 * Platform Delivery Layer
 * Sends approved AI replies to social media platforms using the access
 * tokens stored in platformCredentials by the agency.
 *
 * Each function returns:
 *   { ok: true }                               — delivered successfully
 *   { ok: false, skipped: true, reason: ... }  — no credentials, skipped gracefully
 *   { ok: false, error: ... }                  — had credentials but API call failed
 */

import { db } from "../db/index.js";
import { platformCredentials } from "../db/schema.js";
import { eq, and } from "drizzle-orm";

type DeliveryResult =
  | { ok: true }
  | { ok: false; skipped: true; reason: string }
  | { ok: false; error: string };

// ── Credential lookup ─────────────────────────────────────────────────────────

async function getToken(
  userId: string,
  platform: "tiktok" | "instagram" | "facebook" | "whatsapp" | "sms" | "phone",
  feature: "comments" | "messages"
): Promise<string | null> {
  const [cred] = await db
    .select({ token: platformCredentials.accessTokenEnc })
    .from(platformCredentials)
    .where(
      and(
        eq(platformCredentials.userId, userId),
        eq(platformCredentials.platform, platform),
        eq(platformCredentials.feature, feature)
      )
    )
    .limit(1);
  return cred?.token ?? null;
}

// ── WhatsApp Business Cloud API ───────────────────────────────────────────────

export async function sendWhatsAppMessage(
  userId: string,
  to: string,
  text: string
): Promise<DeliveryResult> {
  const token = await getToken(userId, "whatsapp", "messages");
  if (!token) return { ok: false, skipped: true, reason: "no_whatsapp_credential" };

  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!phoneNumberId) return { ok: false, skipped: true, reason: "WHATSAPP_PHONE_NUMBER_ID not set" };

  const phone = to.replace(/\D/g, ""); // strip non-digits
  const res = await fetch(`https://graph.facebook.com/v19.0/${phoneNumberId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: phone,
      type: "text",
      text: { body: text },
    }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: { message: string } };
    return { ok: false, error: body?.error?.message ?? `WhatsApp API ${res.status}` };
  }
  return { ok: true };
}

// ── Instagram Comment Reply ───────────────────────────────────────────────────

export async function replyToInstagramComment(
  userId: string,
  platformCommentId: string | null,
  text: string
): Promise<DeliveryResult> {
  if (!platformCommentId) {
    return { ok: false, skipped: true, reason: "no_platform_comment_id" };
  }
  const token = await getToken(userId, "instagram", "comments");
  if (!token) return { ok: false, skipped: true, reason: "no_instagram_credential" };

  const res = await fetch(
    `https://graph.facebook.com/v19.0/${platformCommentId}/replies`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text, access_token: token }),
    }
  );

  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: { message: string } };
    return { ok: false, error: body?.error?.message ?? `Instagram API ${res.status}` };
  }
  return { ok: true };
}

// ── Instagram Direct Message ──────────────────────────────────────────────────

export async function sendInstagramDM(
  userId: string,
  recipientId: string,
  text: string
): Promise<DeliveryResult> {
  const token = await getToken(userId, "instagram", "messages");
  if (!token) return { ok: false, skipped: true, reason: "no_instagram_dm_credential" };

  const res = await fetch("https://graph.facebook.com/v19.0/me/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      recipient: { id: recipientId },
      message: { text },
      access_token: token,
    }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: { message: string } };
    return { ok: false, error: body?.error?.message ?? `Instagram DM API ${res.status}` };
  }
  return { ok: true };
}

// ── Facebook Comment Reply ────────────────────────────────────────────────────

export async function replyToFacebookComment(
  userId: string,
  platformCommentId: string | null,
  text: string
): Promise<DeliveryResult> {
  if (!platformCommentId) {
    return { ok: false, skipped: true, reason: "no_platform_comment_id" };
  }
  const token = await getToken(userId, "facebook", "comments");
  if (!token) return { ok: false, skipped: true, reason: "no_facebook_credential" };

  const res = await fetch(
    `https://graph.facebook.com/v19.0/${platformCommentId}/comments`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text, access_token: token }),
    }
  );

  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: { message: string } };
    return { ok: false, error: body?.error?.message ?? `Facebook API ${res.status}` };
  }
  return { ok: true };
}

// ── Facebook Messenger ────────────────────────────────────────────────────────

export async function sendFacebookMessage(
  userId: string,
  recipientId: string,
  text: string
): Promise<DeliveryResult> {
  const token = await getToken(userId, "facebook", "messages");
  if (!token) return { ok: false, skipped: true, reason: "no_facebook_messenger_credential" };

  const res = await fetch("https://graph.facebook.com/v19.0/me/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      recipient: { id: recipientId },
      message: { text },
      access_token: token,
    }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: { message: string } };
    return { ok: false, error: body?.error?.message ?? `Facebook Messenger API ${res.status}` };
  }
  return { ok: true };
}

// ── TikTok Comment Reply ──────────────────────────────────────────────────────

export async function replyToTikTokComment(
  userId: string,
  videoId: string,
  platformCommentId: string | null,
  text: string
): Promise<DeliveryResult> {
  if (!platformCommentId) {
    return { ok: false, skipped: true, reason: "no_platform_comment_id" };
  }
  const token = await getToken(userId, "tiktok", "comments");
  if (!token) return { ok: false, skipped: true, reason: "no_tiktok_credential" };

  const res = await fetch("https://open.tiktokapis.com/v2/comment/reply/", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      video_id: videoId,
      text,
      parent_comment_id: platformCommentId,
    }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: { message: string } };
    return { ok: false, error: body?.error?.message ?? `TikTok API ${res.status}` };
  }
  return { ok: true };
}

// ── Twilio Voice Call ─────────────────────────────────────────────────────────

export async function makePhoneCall(
  to: string,
  message: string
): Promise<DeliveryResult> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken  = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    return { ok: false, skipped: true, reason: "twilio_credentials_not_set" };
  }

  // Normalize phone number — ensure E.164 format
  const digits = to.replace(/\D/g, "");
  const phone  = digits.startsWith("1") && digits.length === 11 ? `+${digits}` : `+1${digits}`;

  // Inline TwiML — no public webhook URL required
  const safeMsg = message.replace(/[<>&'"]/g, c =>
    c === "<" ? "&lt;" : c === ">" ? "&gt;" : c === "&" ? "&amp;" : c === "'" ? "&apos;" : "&quot;"
  );
  const twiml = `<Response><Say voice="alice" language="en-US">${safeMsg}</Say></Response>`;

  const body = new URLSearchParams({ To: phone, From: fromNumber, Twiml: twiml });
  const credentials = Buffer.from(`${accountSid}:${authToken}`).toString("base64");

  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${credentials}`,
      },
      body: body.toString(),
    }
  );

  if (!res.ok) {
    const data = await res.json().catch(() => ({})) as { message?: string; code?: number };
    return { ok: false, error: data?.message ?? `Twilio API ${res.status}` };
  }

  const data = await res.json() as { sid: string; status: string };
  console.log(`[call] Initiated SID=${data.sid} → ${phone} status=${data.status}`);
  return { ok: true };
}

// ── Main dispatcher ───────────────────────────────────────────────────────────

export type DeliveryChannel =
  | "instagram_comment" | "instagram_dm"
  | "facebook_comment"  | "facebook_messenger"
  | "tiktok_comment"    | "tiktok_dm"
  | "whatsapp_business" | "sms" | "phone_call";

export async function deliverReply(params: {
  userId: string;
  channel: DeliveryChannel;
  recipientHandle: string;       // phone / @handle / platform user ID
  platformCommentId?: string | null; // required for comment-type channels
  platformVideoId?: string | null;   // TikTok only
  text: string;
}): Promise<DeliveryResult> {
  const { userId, channel, recipientHandle, platformCommentId, platformVideoId, text } = params;

  switch (channel) {
    case "whatsapp_business":
      return sendWhatsAppMessage(userId, recipientHandle, text);

    case "instagram_dm":
      return sendInstagramDM(userId, recipientHandle, text);

    case "instagram_comment":
      return replyToInstagramComment(userId, platformCommentId ?? null, text);

    case "facebook_comment":
      return replyToFacebookComment(userId, platformCommentId ?? null, text);

    case "facebook_messenger":
      return sendFacebookMessage(userId, recipientHandle, text);

    case "tiktok_comment":
      return replyToTikTokComment(userId, platformVideoId ?? "", platformCommentId ?? null, text);

    case "phone_call":
      return makePhoneCall(recipientHandle, text);

    default:
      return { ok: false, skipped: true, reason: `channel_not_supported: ${channel}` };
  }
}

// ── Logging helper ────────────────────────────────────────────────────────────

export function logDelivery(result: DeliveryResult, ctx: string): void {
  if (result.ok) {
    console.log(`[delivery] ✓ ${ctx}`);
  } else if ("skipped" in result) {
    console.log(`[delivery] – ${ctx} skipped: ${result.reason}`);
  } else {
    console.error(`[delivery] ✗ ${ctx} failed: ${result.error}`);
  }
}
