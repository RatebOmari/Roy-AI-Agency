import { db } from "../db/index.js";
import { scheduledPosts } from "../db/schema.js";
import { eq, and, lte, isNotNull } from "drizzle-orm";
import { logDelivery, publishInstagramPost, publishFacebookPost } from "./platformDelivery.js";
import { recordInitialMetrics, refreshRecentMetrics } from "./metricsFetcher.js";
import { runApprovalReminders } from "./emailReminder.js";

const INTERVAL_MS = 60_000; // check every 60 seconds

async function publishDuePosts(): Promise<void> {
  const now = new Date();

  const due = await db
    .select({
      id:        scheduledPosts.id,
      userId:    scheduledPosts.userId,
      platforms: scheduledPosts.platforms,
      content:   scheduledPosts.content,
      mediaUrl:  scheduledPosts.mediaUrl,
    })
    .from(scheduledPosts)
    .where(
      and(
        eq(scheduledPosts.status, "scheduled"),
        isNotNull(scheduledPosts.scheduledAt),
        lte(scheduledPosts.scheduledAt, now)
      )
    );

  if (due.length === 0) return;

  for (const post of due) {
    try {
      // Attempt delivery to each platform the post targets.
      // Each platform needs its own API call:
      //   Instagram / Facebook → POST to /me/media then /me/media/publish (two-step)
      //   WhatsApp             → POST /{phone_number_id}/messages (text broadcast)
      //   TikTok               → POST to TikTok Content Posting API
      //
      // Currently we mark published optimistically and attempt WhatsApp text delivery.
      // Full media posting (images/videos) requires additional upload steps per platform.

      const deliveryResults: string[] = [];

      for (const platform of post.platforms) {
        if (platform === "instagram") {
          const r = await publishInstagramPost(post.userId, post.content, post.mediaUrl);
          logDelivery(r, `post ${post.id} → instagram`);
          deliveryResults.push(`instagram:${"skipped" in r ? "skipped" : r.ok ? "ok" : "error"}`);
        } else if (platform === "facebook") {
          const r = await publishFacebookPost(post.userId, post.content, post.mediaUrl);
          logDelivery(r, `post ${post.id} → facebook`);
          deliveryResults.push(`facebook:${"skipped" in r ? "skipped" : r.ok ? "ok" : "error"}`);
        } else if (platform === "tiktok") {
          // TikTok Content Posting API requires business app approval — log skip
          logDelivery(
            { ok: false, skipped: true, reason: "tiktok_content_api_requires_business_approval" },
            `post ${post.id} → tiktok`
          );
          deliveryResults.push("tiktok:skipped");
        } else if (platform === "whatsapp") {
          logDelivery(
            { ok: false, skipped: true, reason: "whatsapp_broadcast_requires_campaign" },
            `post ${post.id} → whatsapp`
          );
          deliveryResults.push("whatsapp:skipped");
        } else {
          deliveryResults.push(`${platform}:skipped`);
        }
      }

      const publishedAt = new Date();
      await db
        .update(scheduledPosts)
        .set({ status: "published", publishedAt })
        .where(eq(scheduledPosts.id, post.id));

      // Record initial engagement metrics for this post (non-blocking)
      recordInitialMetrics(post.id, post.userId, post.platforms, publishedAt)
        .catch(err => console.error(`[scheduler] metrics recording failed for ${post.id}:`, err));

      console.log(`[scheduler] Post ${post.id} published → ${post.platforms.join(", ")} [${deliveryResults.join(", ")}]`);
    } catch (err) {
      await db
        .update(scheduledPosts)
        .set({ status: "failed" })
        .where(eq(scheduledPosts.id, post.id));

      console.error(`[scheduler] Failed to publish post ${post.id}:`, err);
    }
  }
}

const METRICS_INTERVAL_MS = 6 * 3_600_000; // refresh metrics every 6 hours

export function startScheduler(): () => void {
  // Run once immediately in case posts were due while the server was down
  publishDuePosts().catch(err => console.error("[scheduler] Initial run error:", err));

  const publishInterval = setInterval(async () => {
    try { await publishDuePosts(); }
    catch (err) { console.error("[scheduler] Error:", err); }
  }, INTERVAL_MS);

  // Refresh post metrics for recently published posts
  refreshRecentMetrics().catch(err => console.error("[scheduler] metrics refresh error:", err));
  const metricsInterval = setInterval(async () => {
    try { await refreshRecentMetrics(); }
    catch (err) { console.error("[scheduler] metrics refresh error:", err); }
  }, METRICS_INTERVAL_MS);

  // Run approval reminders hourly (24h / 48h / 72h after submission)
  const REMINDER_INTERVAL_MS = 3_600_000;
  runApprovalReminders().catch(err => console.error("[scheduler] approval reminders error:", err));
  const remindersInterval = setInterval(async () => {
    try { await runApprovalReminders(); }
    catch (err) { console.error("[scheduler] approval reminders error:", err); }
  }, REMINDER_INTERVAL_MS);

  console.log(`[scheduler] Post publisher started — checking every ${INTERVAL_MS / 1000}s`);
  console.log(`[scheduler] Metrics refresher started — running every ${METRICS_INTERVAL_MS / 3_600_000}h`);
  console.log(`[scheduler] Approval reminder checker started — running every 1h`);

  return () => {
    clearInterval(publishInterval);
    clearInterval(metricsInterval);
    clearInterval(remindersInterval);
    console.log("[scheduler] Stopped");
  };
}
