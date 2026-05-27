import { db } from "../db/index.js";
import { scheduledPosts } from "../db/schema.js";
import { eq, and, lte, isNotNull } from "drizzle-orm";

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
      // TODO: call real platform APIs here (Instagram Graph API, WhatsApp Business API, etc.)
      // For each platform in post.platforms, deliver the post content.

      await db
        .update(scheduledPosts)
        .set({ status: "published" })
        .where(eq(scheduledPosts.id, post.id));

      console.log(`[scheduler] Published post ${post.id} → ${post.platforms.join(", ")}`);
    } catch (err) {
      // Mark failed so the UI can surface it — don't let one failure block others
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
