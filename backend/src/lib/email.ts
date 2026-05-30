/**
 * Email delivery for team member invitations.
 *
 * Provider priority:
 *   1. Resend (RESEND_API_KEY + optional EMAIL_FROM_DOMAIN)
 *   2. Console log fallback — prints the invite link so it can be shared manually
 *
 * No extra npm packages needed — uses the built-in fetch API.
 */

interface InviteParams {
  to:           string;
  recipientName: string;
  role:         string;
  memberId:     string;
  businessName: string;
}

export async function sendInviteEmail(params: InviteParams): Promise<void> {
  const { to, recipientName, role, memberId, businessName } = params;
  const appUrl   = (process.env.APP_URL ?? "http://localhost:5174").replace(/\/$/, "");
  const loginUrl = `${appUrl}/login`;

  const subject = `You're invited to join ${businessName} on SocialPilot`;

  const text = [
    `Hi ${recipientName},`,
    ``,
    `You've been invited to join ${businessName} on SocialPilot as a ${role}.`,
    ``,
    `Your login ID: ${memberId}`,
    `Login at: ${loginUrl}`,
    ``,
    `Keep this ID private — it grants access to your account.`,
  ].join("\n");

  const html = `
<div style="font-family:sans-serif;max-width:480px;padding:24px">
  <h2 style="margin:0 0 16px">You're invited to SocialPilot</h2>
  <p>Hi ${recipientName},</p>
  <p>You've been invited to join <strong>${businessName}</strong> as a <strong>${role}</strong>.</p>
  <p style="margin:20px 0">
    <strong>Your login ID:</strong><br>
    <code style="display:inline-block;background:#f4f4f5;padding:8px 14px;border-radius:6px;font-size:15px;letter-spacing:0.02em">${memberId}</code>
  </p>
  <a href="${loginUrl}" style="display:inline-block;background:#6366f1;color:#fff;padding:11px 22px;border-radius:8px;text-decoration:none;font-weight:600">
    Log in to SocialPilot
  </a>
  <p style="margin-top:24px;font-size:12px;color:#999">
    Keep your login ID private — it grants full access to your account.
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
      console.error("[email] Resend delivery failed:", err);
    } else {
      console.log(`[email] Invite sent to ${to} via Resend`);
    }
    return;
  }

  // No provider configured — log so the invite can be shared manually
  console.log(`[invite] ─────────────────────────────────────────────────────`);
  console.log(`[invite] No email provider configured. Send this to ${to}:`);
  console.log(text);
  console.log(`[invite] ─────────────────────────────────────────────────────`);
}
