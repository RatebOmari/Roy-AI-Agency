/**
 * Email delivery for team member invitations.
 *
 * Provider priority:
 *   1. Resend (RESEND_API_KEY + optional EMAIL_FROM_DOMAIN)
 *   2. Console log fallback — prints the invite link so it can be shared manually
 *
 * No extra npm packages needed — uses the built-in fetch API.
 */

import { logger } from "./logger.js";

interface InviteParams {
  to:            string;
  recipientName: string;
  role:          string;
  inviteToken:   string;
  businessName:  string;
}

export async function sendInviteEmail(params: InviteParams): Promise<void> {
  const { to, recipientName, role, inviteToken, businessName } = params;
  const appUrl    = (process.env.APP_URL ?? "http://localhost:5174").replace(/\/$/, "");
  const inviteUrl = `${appUrl}/team-login/${inviteToken}`;

  const subject = `You're invited to join ${businessName} on SocialPilot`;

  const text = [
    `Hi ${recipientName},`,
    ``,
    `You've been invited to join ${businessName} on SocialPilot as a ${role}.`,
    ``,
    `Click the link below to set up your account (expires in 7 days):`,
    inviteUrl,
    ``,
    `Keep this link private — it grants access to your account.`,
  ].join("\n");

  const html = `
<div style="font-family:sans-serif;max-width:480px;padding:24px">
  <h2 style="margin:0 0 16px">You're invited to SocialPilot</h2>
  <p>Hi ${recipientName},</p>
  <p>You've been invited to join <strong>${businessName}</strong> as a <strong>${role}</strong>.</p>
  <p style="margin:20px 0">
    <a href="${inviteUrl}" style="display:inline-block;background:#6366f1;color:#fff;padding:11px 22px;border-radius:8px;text-decoration:none;font-weight:600">
      Accept Invite
    </a>
  </p>
  <p style="color:#666;font-size:14px">This link expires in 7 days. If it stops working, ask your admin to send a new invite.</p>
  <p style="margin-top:24px;font-size:12px;color:#999">
    Keep this link private — it grants access to your account.
  </p>
</div>`;

  const resendKey = process.env.RESEND_API_KEY;

  if (resendKey) {
    const fromDomain = process.env.EMAIL_FROM_DOMAIN ?? "socialpilot.app";
    const res = await fetch("https://api.resend.com/emails", {
      method:  "POST",
      headers: {
        Authorization:  `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from:    `SocialPilot <noreply@${fromDomain}>`,
        to:      [to],
        subject,
        text,
        html,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      logger.error({ err }, "[email] Resend delivery failed");
    } else {
      logger.info(`[email] Invite sent to ${to} via Resend`);
    }
    return;
  }

  // No provider configured — log so the invite can be shared manually
  logger.info(`[invite] ─────────────────────────────────────────────────────`);
  logger.info(`[invite] No email provider configured. Send this link to ${to}:`);
  logger.info(`[invite] ${inviteUrl}`);
  logger.info(`[invite] ─────────────────────────────────────────────────────`);
}

// ── Broadcast email (outreach) ────────────────────────────────────────────────

interface BroadcastEmailResult {
  ok: boolean;
  error?: string;
  skipped?: boolean;
  reason?: string;
}

/**
 * Sends a single outreach broadcast email via Resend.
 * Returns { ok: false, skipped: true } when RESEND_API_KEY is not configured
 * rather than throwing, so the caller can track it as a clean skip.
 */
export async function sendBroadcastEmail(params: {
  to:       string;
  subject:  string;
  text:     string;
  fromName?: string;
}): Promise<BroadcastEmailResult> {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    return { ok: false, skipped: true, reason: "resend_api_key_not_set" };
  }

  const fromDomain = process.env.EMAIL_FROM_DOMAIN ?? "socialpilot.app";
  const fromName   = params.fromName ?? "Roy AI Agency";

  const res = await fetch("https://api.resend.com/emails", {
    method:  "POST",
    headers: {
      Authorization:  `Bearer ${resendKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from:    `${fromName} <noreply@${fromDomain}>`,
      to:      [params.to],
      subject: params.subject,
      text:    params.text,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { message?: string; name?: string };
    const msg = err.message ?? `Resend API ${res.status}`;
    logger.error({ err }, `[email/broadcast] Delivery failed to ${params.to}`);
    return { ok: false, error: msg };
  }

  const data = await res.json() as { id: string };
  logger.info(`[email/broadcast] Sent id=${data.id} → ${params.to}`);
  return { ok: true };
}
