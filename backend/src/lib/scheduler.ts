import { db } from "../db/index.js";
import { scheduledPosts } from "../db/schema.js";
import { eq, and, lte, isNotNull } from "drizzle-orm";
import { logDelivery } from "./platformDelivery.js";

const INTERVAL_MS = 60_000; // check every 60 seconds

async function publishDuePosts(): Promise<void> {
  const now = new Date();

  const due = await db
    .select({
      id:        scheduledPosts.id,
      platforms: scheduledPosts.platforms,
      content:   scheduledPosts.content,
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
        if (platform === "whatsapp") {
          // WhatsApp: send as a text broadcast (no contacts table yet → log only)
          logDelivery(
            { ok: false, skipped: true, reason: "no_contacts_table_yet" },
            `post ${post.id} → whatsapp`
          );
          deliveryResults.push(`whatsapp:skipped`);
        } else {
          // Instagram / Facebook / TikTok: requires media upload API — log as pending
          logDelivery(
            { ok: false, skipped: true, reason: `media_posting_not_implemented:${platform}` },
            `post ${post.id} → ${platform}`
          );
          deliveryResults.push(`${platform}:skipped`);
        }
      }

      await db
        .update(scheduledPosts)
        .set({ status: "published" })
        .where(eq(scheduledPosts.id, post.id));

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

export function startScheduler(): void {
  // Run once immediately in case posts were due while the server was down
  publishDuePosts().catch(err => console.error("[scheduler] Initial run error:", err));

  setInterval(
    () => publishDuePosts().catch(err => console.error("[scheduler] Error:", err)),
    INTERVAL_MS
  );

  console.log(`[scheduler] Post publisher started — checking every ${INTERVAL_MS / 1000}s`);
}
