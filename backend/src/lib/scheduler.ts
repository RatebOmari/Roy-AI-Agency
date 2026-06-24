import { db } from "../db/index.js";
import { scheduledPosts } from "../db/schema.js";
import { eq, and, lte, isNotNull } from "drizzle-orm";
import { logDelivery, publishInstagramPost, publishFacebookPost } from "./platformDelivery.js";
import { recordInitialMetrics, refreshRecentMetrics } from "./metricsFetcher.js";
import { runApprovalReminders } from "./emailReminder.js";
import { logger } from "./logger.js";

const INTERVAL_MS = 60_000; // check every 60 seconds

// Platforms where the Content Posting API is fully supported and real posts go out.
const REAL_PUBLISH_PLATFORMS = new Set(["instagram", "facebook"]);

// Platforms where publishing is intentionally not yet implemented.
// Posts targeting ONLY these platforms will be marked "skipped" — never "published".
const STUBBED_PUBLISH_PLATFORMS: Record<string, string> = {
  tiktok:   "TikTok publishing requires business API approval. Post not published.",
  whatsapp: "WhatsApp broadcast publishing requires Campaign API. Post not published.",
};

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
      // Per-platform outcomes for aggregate status calculation.
      // "ok"      — API call succeeded, post is live
      // "error"   — API call attempted but failed
      // "stubbed" — platform not yet supported; intentionally not attempted
      // "ok"      — API call succeeded, post is live
      // "error"   — API call attempted but failed
      // "stubbed" — not attempted: platform unsupported, OR no credential connected
      const outcomes = new Map<string, "ok" | "error" | "stubbed">();
      const deliveryLog: string[] = [];

      for (const platform of post.platforms) {
        if (platform === "instagram") {
          const r = await publishInstagramPost(post.userId, post.content, post.mediaUrl);
          logDelivery(r, `post ${post.id} → instagram`);
          const o = "skipped" in r ? "stubbed" : r.ok ? "ok" : "error";
          outcomes.set(platform, o);
          deliveryLog.push(`instagram:${o}`);

        } else if (platform === "facebook") {
          const r = await publishFacebookPost(post.userId, post.content, post.mediaUrl);
          logDelivery(r, `post ${post.id} → facebook`);
          const o = "skipped" in r ? "stubbed" : r.ok ? "ok" : "error";
          outcomes.set(platform, o);
          deliveryLog.push(`facebook:${o}`);

        } else if (platform in STUBBED_PUBLISH_PLATFORMS) {
          // Platform explicitly not yet supported — record stub and move on.
          // Never mark these as "ok" or count them toward published status.
          logDelivery(
            { ok: false, skipped: true, reason: STUBBED_PUBLISH_PLATFORMS[platform] },
            `post ${post.id} → ${platform}`
          );
          outcomes.set(platform, "stubbed");
          deliveryLog.push(`${platform}:stubbed`);

        } else {
          outcomes.set(platform, "stubbed");
          deliveryLog.push(`${platform}:stubbed`);
        }
      }

      // Determine aggregate post status:
      //   published — at least one real platform succeeded
      //   failed    — had real platform(s) but none succeeded
      //   skipped   — every targeted platform is stubbed (nothing went out)
      const vals = [...outcomes.values()];
      const anyRealOk    = vals.some(v => v === "ok");
      const anyRealError = vals.some(v => v === "error");
      // Guard against an empty platforms array: vals.every(...) is vacuously
      // true on [], which would wrongly mark a post with no targets "skipped".
      const allStubbed   = vals.length > 0 && vals.every(v => v === "stubbed");

      type FinalStatus = "published" | "failed" | "skipped";
      let finalStatus: FinalStatus;
      let publishedAt: Date | null = null;

      if (anyRealOk) {
        finalStatus = "published";
        publishedAt = new Date();
      } else if (allStubbed) {
        finalStatus = "skipped";
      } else {
        // anyRealError, or a malformed post with no platforms at all
        finalStatus = "failed";
      }

      await db
        .update(scheduledPosts)
        .set({ status: finalStatus, publishedAt })
        .where(eq(scheduledPosts.id, post.id));

      if (finalStatus === "published" && publishedAt) {
        // Only record metrics for platforms that actually published
        const publishedPlatforms = [...outcomes.entries()]
          .filter(([, v]) => v === "ok")
          .map(([p]) => p);
        recordInitialMetrics(post.id, post.userId, publishedPlatforms, publishedAt)
          .catch(err => logger.error({ err }, `[scheduler] metrics recording failed for ${post.id}`));
      }

      const icon = finalStatus === "published" ? "✓" : finalStatus === "skipped" ? "⚠" : "✗";
      logger.info(`[scheduler] Post ${post.id} ${icon} ${finalStatus} [${deliveryLog.join(", ")}]`);

      if (finalStatus === "skipped") {
        logger.warn(
          `[scheduler] Post ${post.id} NOT published — all targeted platforms ` +
          `(${post.platforms.join(", ")}) are unsupported for auto-publishing. ` +
          `Connect Instagram or Facebook to enable publishing.`
        );
      }

    } catch (err) {
      await db
        .update(scheduledPosts)
        .set({ status: "failed" })
        .where(eq(scheduledPosts.id, post.id));

      logger.error({ err }, `[scheduler] Failed to publish post ${post.id}`);
    }
  }
}

const METRICS_INTERVAL_MS = 6 * 3_600_000; // refresh metrics every 6 hours

export function startScheduler(): () => void {
  // Run once immediately in case posts were due while the server was down
  publishDuePosts().catch(err => logger.error({ err }, "[scheduler] Initial run error"));

  const publishInterval = setInterval(async () => {
    try { await publishDuePosts(); }
    catch (err) { logger.error({ err }, "[scheduler] Error"); }
  }, INTERVAL_MS);

  // Refresh post metrics for recently published posts
  refreshRecentMetrics().catch(err => logger.error({ err }, "[scheduler] metrics refresh error"));
  const metricsInterval = setInterval(async () => {
    try { await refreshRecentMetrics(); }
    catch (err) { logger.error({ err }, "[scheduler] metrics refresh error"); }
  }, METRICS_INTERVAL_MS);

  // Run approval reminders hourly (24h / 48h / 72h after submission)
  const REMINDER_INTERVAL_MS = 3_600_000;
  runApprovalReminders().catch(err => logger.error({ err }, "[scheduler] approval reminders error"));
  const remindersInterval = setInterval(async () => {
    try { await runApprovalReminders(); }
    catch (err) { logger.error({ err }, "[scheduler] approval reminders error"); }
  }, REMINDER_INTERVAL_MS);

  logger.info(`[scheduler] Post publisher started — checking every ${INTERVAL_MS / 1000}s`);
  logger.info(`[scheduler] Metrics refresher started — running every ${METRICS_INTERVAL_MS / 3_600_000}h`);
  logger.info(`[scheduler] Approval reminder checker started — running every 1h`);

  return () => {
    clearInterval(publishInterval);
    clearInterval(metricsInterval);
    clearInterval(remindersInterval);
    logger.info("[scheduler] Stopped");
  };
}
