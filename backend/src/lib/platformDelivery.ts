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
import { decryptToken, encryptToken } from "./crypto.js";
import { logger } from "./logger.js";

export type DeliveryResult =
  | { ok: true; sid?: string }
  | { ok: false; skipped: true; reason: string }
  | { ok: false; error: string };

// ── Meta token refresh ────────────────────────────────────────────────────────

const META_PLATFORMS = new Set(["instagram", "facebook", "whatsapp"]);
const TOKEN_REFRESH_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1000; // refresh if < 7 days remain

async function refreshAndUpdateMetaToken(
  userId: string,
  platform: string,
  feature: string,
  currentToken: string,
): Promise<string | null> {
  const appId     = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  if (!appId || !appSecret) return null; // can't refresh without app credentials

  const url =
    `https://graph.facebook.com/v19.0/oauth/access_token` +
    `?grant_type=fb_exchange_token` +
    `&client_id=${encodeURIComponent(appId)}` +
    `&client_secret=${encodeURIComponent(appSecret)}` +
    `&fb_exchange_token=${encodeURIComponent(currentToken)}`;

  const res = await fetch(url).catch(() => null);
  if (!res?.ok) return null;

  const data = await res.json().catch(() => null) as {
    access_token?: string;
    expires_in?: number;
  } | null;
  if (!data?.access_token) return null;

  const newExpiry = new Date(Date.now() + (data.expires_in ?? 60 * 86_400) * 1000);

  await db
    .update(platformCredentials)
    .set({
      accessTokenEnc: encryptToken(data.access_token),
      expiresAt:      newExpiry,
      disconnectedAt: null, // clear any previous disconnect marker
    })
    .where(
      and(
        eq(platformCredentials.userId, userId),
        eq(platformCredentials.platform, platform as typeof platformCredentials.$inferSelect.platform),
        eq(platformCredentials.feature,  feature  as typeof platformCredentials.$inferSelect.feature),
      )
    );

  logger.info(
    `[platform] Token refreshed for ${platform}/${feature} userId=${userId} ` +
    `newExpiry=${newExpiry.toISOString()}`
  );
  return data.access_token;
}

async function markTokenExpired(
  userId: string,
  platform: string,
  feature: string,
): Promise<void> {
  await db
    .update(platformCredentials)
    .set({ disconnectedAt: new Date() })
    .where(
      and(
        eq(platformCredentials.userId, userId),
        eq(platformCredentials.platform, platform as typeof platformCredentials.$inferSelect.platform),
        eq(platformCredentials.feature,  feature  as typeof platformCredentials.$inferSelect.feature),
      )
    );
  logger.warn(
    `[platform] Token expired for ${platform}/${feature} userId=${userId} — reconnect required`
  );
}

// ── Credential lookup (with Meta token refresh) ───────────────────────────────

async function getToken(
  userId: string,
  platform: "tiktok" | "instagram" | "facebook" | "whatsapp" | "sms" | "phone",
  feature: "comments" | "messages" | "publishing"
): Promise<string | null> {
  const [cred] = await db
    .select({
      token:     platformCredentials.accessTokenEnc,
      expiresAt: platformCredentials.expiresAt,
    })
    .from(platformCredentials)
    .where(
      and(
        eq(platformCredentials.userId, userId),
        eq(platformCredentials.platform, platform),
        eq(platformCredentials.feature, feature)
      )
    )
    .limit(1);

  if (!cred?.token) return null;
  const decrypted = decryptToken(cred.token);

  // Proactive refresh for Meta platforms when token expires within 7 days
  if (cred.expiresAt && META_PLATFORMS.has(platform)) {
    const msToExpiry = cred.expiresAt.getTime() - Date.now();

    if (msToExpiry < TOKEN_REFRESH_THRESHOLD_MS) {
      const refreshed = await refreshAndUpdateMetaToken(userId, platform, feature, decrypted);
      if (refreshed) return refreshed;

      if (msToExpiry <= 0) {
        // Token is past expiry and refresh failed — mark as requiring reconnect
        await markTokenExpired(userId, platform, feature);
        return null;
      }
      // Token still valid but refresh failed (e.g. META_APP_ID not configured) — use as-is
      logger.warn(
        `[platform] Token for ${platform}/${feature} expires in ${Math.round(msToExpiry / 86_400_000)}d ` +
        `but refresh failed — set META_APP_ID to enable auto-refresh`
      );
    }
  }

  return decrypted;
}

async function getPublishingCred(
  userId: string,
  platform: "instagram" | "facebook"
): Promise<{ token: string; accountId: string | null } | null> {
  const [cred] = await db
    .select({
      token:     platformCredentials.accessTokenEnc,
      scope:     platformCredentials.scope,
      expiresAt: platformCredentials.expiresAt,
    })
    .from(platformCredentials)
    .where(
      and(
        eq(platformCredentials.userId, userId),
        eq(platformCredentials.platform, platform),
        eq(platformCredentials.feature, "publishing")
      )
    )
    .limit(1);

  if (!cred?.token) return null;
  const decrypted = decryptToken(cred.token);

  // Proactive refresh for Meta publishing tokens
  let finalToken = decrypted;
  if (cred.expiresAt) {
    const msToExpiry = cred.expiresAt.getTime() - Date.now();
    if (msToExpiry < TOKEN_REFRESH_THRESHOLD_MS) {
      const refreshed = await refreshAndUpdateMetaToken(userId, platform, "publishing", decrypted);
      if (refreshed) {
        finalToken = refreshed;
      } else if (msToExpiry <= 0) {
        await markTokenExpired(userId, platform, "publishing");
        return null;
      } else {
        logger.warn(
          `[platform] Publishing token for ${platform} expires in ${Math.round(msToExpiry / 86_400_000)}d ` +
          `but refresh failed — set META_APP_ID to enable auto-refresh`
        );
      }
    }
  }

  let accountId: string | null = null;
  if (cred.scope) {
    try { accountId = (JSON.parse(cred.scope) as { accountId?: string }).accountId ?? null; } catch {}
  }
  return { token: finalToken, accountId };
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

// ── Twilio SMS ────────────────────────────────────────────────────────────────

export async function sendSmsMessage(
  to: string,
  text: string
): Promise<DeliveryResult> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken  = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    return { ok: false, skipped: true, reason: "twilio_credentials_not_set" };
  }

  const digits = to.replace(/\D/g, "");
  const phone  = digits.startsWith("1") && digits.length === 11 ? `+${digits}` : `+1${digits}`;

  const credentials = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
  const body = new URLSearchParams({ To: phone, From: fromNumber, Body: text });

  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
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
    const data = await res.json().catch(() => ({})) as { message?: string };
    return { ok: false, error: data?.message ?? `Twilio SMS API ${res.status}` };
  }

  const data = await res.json() as { sid: string };
  logger.info(`[sms] Sent SID=${data.sid} → ${phone}`);
  return { ok: true, sid: data.sid };
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
  if (process.env.APP_URL) {
    body.append("StatusCallback", `${process.env.APP_URL}/api/calls/webhook/status`);
    body.append("StatusCallbackMethod", "POST");
  }
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
  logger.info(`[call] Initiated SID=${data.sid} → ${phone} status=${data.status}`);
  return { ok: true, sid: data.sid };
}

// ── Instagram Content Publishing ──────────────────────────────────────────────

export async function publishInstagramPost(
  userId: string,
  caption: string,
  imageUrl?: string | null
): Promise<DeliveryResult> {
  const cred = await getPublishingCred(userId, "instagram");
  if (!cred) return { ok: false, skipped: true, reason: "no_instagram_publishing_credential" };

  // Discover IG Business Account ID if not stored at connect time
  let igUserId = cred.accountId;
  if (!igUserId) {
    const meRes = await fetch(
      `https://graph.facebook.com/v19.0/me?fields=instagram_business_account&access_token=${cred.token}`
    );
    if (!meRes.ok) return { ok: false, error: `Instagram account discovery failed: ${meRes.status}` };
    const me = await meRes.json() as { instagram_business_account?: { id: string } };
    igUserId = me.instagram_business_account?.id ?? null;
  }
  if (!igUserId) return { ok: false, skipped: true, reason: "no_instagram_business_account_linked" };

  // Step 1: Create media container
  const containerBody: Record<string, string> = {
    caption,
    access_token: cred.token,
  };
  if (imageUrl) {
    containerBody.image_url = imageUrl;
    containerBody.media_type = "IMAGE";
  } else {
    containerBody.media_type = "IMAGE"; // carousel requires image; fallback for text-only
  }

  const containerRes = await fetch(`https://graph.facebook.com/v19.0/${igUserId}/media`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(containerBody),
  });

  if (!containerRes.ok) {
    const body = await containerRes.json().catch(() => ({})) as { error?: { message: string } };
    return { ok: false, error: body?.error?.message ?? `Instagram media create ${containerRes.status}` };
  }

  const { id: creationId } = await containerRes.json() as { id: string };

  // Step 2: Publish the container
  const publishRes = await fetch(`https://graph.facebook.com/v19.0/${igUserId}/media_publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ creation_id: creationId, access_token: cred.token }),
  });

  if (!publishRes.ok) {
    const body = await publishRes.json().catch(() => ({})) as { error?: { message: string } };
    return { ok: false, error: body?.error?.message ?? `Instagram media_publish ${publishRes.status}` };
  }

  const { id: postId } = await publishRes.json() as { id: string };
  logger.info(`[publish] Instagram post created: ${postId}`);
  return { ok: true, sid: postId };
}

// ── Facebook Page Post Publishing ─────────────────────────────────────────────

export async function publishFacebookPost(
  userId: string,
  message: string,
  imageUrl?: string | null
): Promise<DeliveryResult> {
  const cred = await getPublishingCred(userId, "facebook");
  if (!cred) return { ok: false, skipped: true, reason: "no_facebook_publishing_credential" };

  // Discover Page ID if not stored at connect time
  let pageId = cred.accountId;
  let pageToken = cred.token;

  if (!pageId) {
    const accountsRes = await fetch(
      `https://graph.facebook.com/v19.0/me/accounts?fields=id,access_token&access_token=${cred.token}`
    );
    if (!accountsRes.ok) return { ok: false, error: `Facebook page discovery failed: ${accountsRes.status}` };
    const accounts = await accountsRes.json() as { data?: { id: string; access_token: string }[] };
    const page = accounts.data?.[0];
    if (!page) return { ok: false, skipped: true, reason: "no_facebook_page_found" };
    pageId = page.id;
    pageToken = page.access_token;
  }

  const endpoint = imageUrl
    ? `https://graph.facebook.com/v19.0/${pageId}/photos`
    : `https://graph.facebook.com/v19.0/${pageId}/feed`;

  const postBody: Record<string, string> = { access_token: pageToken };
  if (imageUrl) {
    postBody.url     = imageUrl;
    postBody.caption = message;
  } else {
    postBody.message = message;
  }

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(postBody),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: { message: string } };
    return { ok: false, error: body?.error?.message ?? `Facebook post API ${res.status}` };
  }

  const result = await res.json() as { id?: string; post_id?: string };
  const postId = result.post_id ?? result.id ?? "unknown";
  logger.info(`[publish] Facebook post created: ${postId}`);
  return { ok: true, sid: postId };
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

    case "sms":
      return sendSmsMessage(recipientHandle, text);

    case "phone_call":
      return makePhoneCall(recipientHandle, text);

    default:
      return { ok: false, skipped: true, reason: `channel_not_supported: ${channel}` };
  }
}

// ── Logging helper ────────────────────────────────────────────────────────────

export function logDelivery(result: DeliveryResult, ctx: string): void {
  if (result.ok) {
    logger.info(`[delivery] ✓ ${ctx}`);
  } else if ("skipped" in result) {
    logger.info(`[delivery] – ${ctx} skipped: ${result.reason}`);
  } else {
    logger.error(`[delivery] ✗ ${ctx} failed: ${result.error}`);
  }
}
