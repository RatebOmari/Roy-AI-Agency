/**
 * Content approval email reminders.
 *
 * Runs hourly from the scheduler. For every post where:
 *   status = "pending_approval" AND approval_flow_enabled = true
 *
 * Sends reminder emails at 24h, 48h, 72h after submission.
 * At 72h, also notifies the agency in-app (logged here; surfaced via /agency/content).
 *
 * Tracks sent reminders in the email_reminders table to avoid duplicates.
 */

import { db } from "../db/index.js";
import { scheduledPosts, agencyClients, emailReminders, users } from "../db/schema.js";
import { eq, and, isNotNull, lte } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { logger } from "./logger.js";

const APP_URL = (process.env.APP_URL ?? "http://localhost:5174").replace(/\/$/, "");
const RESEND_KEY = process.env.RESEND_API_KEY;
const FROM_DOMAIN = process.env.EMAIL_FROM_DOMAIN ?? "socialpilot.app";

const REMINDER_HOURS = [24, 48, 72] as const;

async function sendReminderEmail(
  to: string,
  recipientName: string,
  post: {
    id: string;
    content: string;
    mediaUrl: string | null;
    platforms: string[];
    scheduledAt: Date | null;
  },
  clientBusinessName: string,
  reminderNumber: 1 | 2 | 3,
): Promise<void> {
  const subject = `Action Required — Post Awaiting Your Approval`;
  const approveUrl  = `${APP_URL}/content?tab=pending&action=approve&postId=${post.id}`;
  const changesUrl  = `${APP_URL}/content?tab=pending&action=changes&postId=${post.id}`;
  const contentUrl  = `${APP_URL}/content?tab=pending`;

  const platformList = post.platforms.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(", ");
  const scheduledStr = post.scheduledAt
    ? new Date(post.scheduledAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })
    : "Not yet scheduled";

  const urgencyNote = reminderNumber === 3
    ? `<p style="color:#ef4444;font-weight:600">⚠️ This is your final reminder. If no action is taken, your agency may publish this post without approval.</p>`
    : "";

  const html = `
<div style="font-family:sans-serif;max-width:520px;padding:24px;color:#111">
  <h2 style="margin:0 0 16px">Post Awaiting Your Approval</h2>
  <p>Hi ${recipientName},</p>
  <p>Your agency has submitted a post for <strong>${clientBusinessName}</strong> that needs your approval.</p>
  ${urgencyNote}

  <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:16px;margin:20px 0">
    <p style="margin:0 0 8px;font-weight:600;font-size:14px">Post Preview</p>
    ${post.mediaUrl ? `<img src="${post.mediaUrl}" alt="Post image" style="width:100%;max-width:400px;border-radius:8px;margin-bottom:12px" />` : ""}
    <p style="font-size:14px;line-height:1.6;color:#374151">${post.content.replace(/\n/g, "<br>")}</p>
    <table style="margin-top:12px;font-size:13px;color:#6b7280;border-collapse:collapse">
      <tr><td style="padding:2px 12px 2px 0;font-weight:600">Platforms:</td><td>${platformList}</td></tr>
      <tr><td style="padding:2px 12px 2px 0;font-weight:600">Scheduled:</td><td>${scheduledStr}</td></tr>
    </table>
  </div>

  <div style="display:flex;gap:12px;margin:24px 0">
    <a href="${approveUrl}"
       style="display:inline-block;background:#22c55e;color:#fff;padding:11px 22px;border-radius:8px;text-decoration:none;font-weight:600;margin-right:12px">
      ✓ Approve Post
    </a>
    <a href="${changesUrl}"
       style="display:inline-block;background:#f97316;color:#fff;padding:11px 22px;border-radius:8px;text-decoration:none;font-weight:600">
      ✏ Request Changes
    </a>
  </div>

  <p style="margin-top:16px">
    <a href="${contentUrl}" style="color:#6366f1;text-decoration:none">
      View all pending posts →
    </a>
  </p>

  <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0">
  <p style="font-size:12px;color:#9ca3af">
    If you have questions, contact your agency directly.<br>
    This is reminder ${reminderNumber} of 3.
  </p>
</div>`;

  const text = [
    `Hi ${recipientName},`,
    ``,
    `A post for ${clientBusinessName} is awaiting your approval.`,
    ``,
    `Caption: ${post.content}`,
    `Platforms: ${platformList}`,
    `Scheduled: ${scheduledStr}`,
    ``,
    `Approve: ${approveUrl}`,
    `Request Changes: ${changesUrl}`,
    ``,
    `Reminder ${reminderNumber} of 3.`,
  ].join("\n");

  if (RESEND_KEY) {
    const res = await fetch("https://api.resend.com/emails", {
      method:  "POST",
      headers: { Authorization: `Bearer ${RESEND_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from:    `Roy AI Agency <noreply@${FROM_DOMAIN}>`,
        to:      [to],
        subject,
        text,
        html,
      }),
    });
    if (!res.ok) {
      logger.error({ err: await res.json().catch(() => ({})) }, "[emailReminder] Resend failed");
    } else {
      logger.info(`[emailReminder] Reminder ${reminderNumber} sent to ${to}`);
    }
  } else {
    logger.info(`[emailReminder] ── No provider – reminder ${reminderNumber} for post ${post.id} ──`);
    logger.info(`[emailReminder] Would email: ${to}`);
    logger.info(`[emailReminder] Approve URL: ${approveUrl}`);
  }
}

export async function runApprovalReminders(): Promise<void> {
  const now = new Date();

  // Load all posts pending approval that have been submitted
  const pending = await db
    .select({
      id:                     scheduledPosts.id,
      userId:                 scheduledPosts.userId,
      content:                scheduledPosts.content,
      mediaUrl:               scheduledPosts.mediaUrl,
      platforms:              scheduledPosts.platforms,
      scheduledAt:            scheduledPosts.scheduledAt,
      submittedForApprovalAt: scheduledPosts.submittedForApprovalAt,
    })
    .from(scheduledPosts)
    .where(
      and(
        eq(scheduledPosts.status, "pending_approval"),
        eq(scheduledPosts.approvalRequired, true),
        isNotNull(scheduledPosts.submittedForApprovalAt),
      )
    );

  if (pending.length === 0) return;

  for (const post of pending) {
    if (!post.submittedForApprovalAt) continue;

    const submittedMs  = post.submittedForApprovalAt.getTime();
    const elapsedHours = (now.getTime() - submittedMs) / 3_600_000;

    // Determine which reminders are due
    for (const reminderHours of REMINDER_HOURS) {
      if (elapsedHours < reminderHours) break; // Not due yet

      const reminderNumber = REMINDER_HOURS.indexOf(reminderHours) + 1 as 1 | 2 | 3;

      // Check if already sent
      const [alreadySent] = await db
        .select({ id: emailReminders.id })
        .from(emailReminders)
        .where(
          and(
            eq(emailReminders.postId, post.id),
            eq(emailReminders.reminderNumber, reminderNumber),
          )
        )
        .limit(1);

      if (alreadySent) continue; // Already sent this reminder

      // Get client email and name
      const [clientUser] = await db
        .select({ email: users.email, name: users.name, businessName: users.businessName })
        .from(users)
        .where(eq(users.id, post.userId))
        .limit(1);

      if (!clientUser) continue;

      // Send the email
      try {
        await sendReminderEmail(
          clientUser.email,
          clientUser.name,
          {
            id:          post.id,
            content:     post.content,
            mediaUrl:    post.mediaUrl ?? null,
            platforms:   post.platforms,
            scheduledAt: post.scheduledAt,
          },
          clientUser.businessName,
          reminderNumber,
        );

        // Record the reminder
        await db.insert(emailReminders).values({
          postId:         post.id,
          clientId:       post.userId,
          reminderNumber,
          emailAddress:   clientUser.email,
        });

        // At 72h, log agency alert (surfaced in /agency/content via badge)
        if (reminderNumber === 3) {
          logger.info(
            `[emailReminder] AGENCY ALERT: Post "${post.id}" for client "${clientUser.businessName}" ` +
            `has been pending approval for 72h. Override available in /agency/content.`
          );
        }
      } catch (err) {
        logger.error({ err }, `[emailReminder] Failed to process reminder ${reminderNumber} for post ${post.id}`);
      }
    }
  }
}
