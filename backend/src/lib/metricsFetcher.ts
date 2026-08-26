/**
 * metricsFetcher.ts
 *
 * Inserts or updates post_metrics rows for published posts.
 *
 * When the post first goes live, initial metrics (all zeros) are recorded.
 * The scheduler calls refreshMetrics() periodically for posts published
 * in the last 7 days so the dashboard stays current.
 *
 * IMPORTANT: metrics are currently SIMULATED. There is no real platform
 * Insights integration yet — values are generated from time-since-publish so
 * charts look alive in the demo. See simulateMetrics below; the real
 * integration is a TODO (it will look up the publishing credential per
 * platform and call each Insights API).
 */

import { eq, and, gte, isNotNull } from "drizzle-orm";
import { db } from "../db/index.js";
import { scheduledPosts, postMetrics } from "../db/schema.js";
import { logger } from "./logger.js";

// ── Demo metric simulation ────────────────────────────────────────────────────

function simulateMetrics(
  publishedAt: Date,
  platform: string,
): { likes: number; comments: number; reach: number; shares: number } {
  const ageHours = (Date.now() - publishedAt.getTime()) / 3_600_000;

  // Engagement grows fast in first 24h then plateaus
  const growthFactor = Math.min(1, ageHours / 24) * (0.8 + Math.random() * 0.4);

  const base: Record<string, { reach: [number, number]; likeRate: number; commentRate: number; shareRate: number }> = {
    instagram: { reach: [500,  2000], likeRate: 0.08, commentRate: 0.012, shareRate: 0.005 },
    tiktok:    { reach: [1000, 8000], likeRate: 0.15, commentRate: 0.02,  shareRate: 0.01  },
    facebook:  { reach: [300,  1200], likeRate: 0.05, commentRate: 0.008, shareRate: 0.015 },
    whatsapp:  { reach: [50,   300],  likeRate: 0,    commentRate: 0,     shareRate: 0.02  },
  };

  const cfg = base[platform] ?? base.instagram;
  const maxReach = cfg.reach[0] + Math.floor(Math.random() * (cfg.reach[1] - cfg.reach[0]));
  const reach    = Math.floor(maxReach * growthFactor);
  const likes    = Math.floor(reach * cfg.likeRate);
  const comments = Math.floor(reach * cfg.commentRate);
  const shares   = Math.floor(reach * cfg.shareRate);

  return { likes, comments, reach, shares };
}

// ── Core upsert ───────────────────────────────────────────────────────────────

async function upsertMetrics(
  postId: string,
  platform: string,
  publishedAt: Date,
): Promise<void> {
  // Simulated — no real Insights API call yet (see module header).
  const { likes, comments, reach, shares } = simulateMetrics(publishedAt, platform);

  // Check if a metrics row already exists
  const [existing] = await db
    .select({ id: postMetrics.id })
    .from(postMetrics)
    .where(eq(postMetrics.postId, postId))
    .limit(1);

  if (existing) {
    await db
      .update(postMetrics)
      .set({ likes, comments, reach, shares, recordedAt: new Date() })
      .where(eq(postMetrics.id, existing.id));
  } else {
    await db
      .insert(postMetrics)
      .values({ postId, likes, comments, reach, shares, recordedAt: new Date() });
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/** Insert initial metrics for a newly published post (called by scheduler after publish). */
export async function recordInitialMetrics(
  postId:     string,
  userId:     string,
  platforms:  string[],
  publishedAt: Date,
): Promise<void> {
  // userId is kept in the signature for the future real-Insights integration
  // (which will look up the publishing credential per platform). Metrics are
  // simulated for now, so it is intentionally unused here.
  void userId;
  for (const platform of platforms) {
    await upsertMetrics(postId, platform, publishedAt);
  }
}

/** Refresh metrics for all posts published in the last 7 days (called by periodic scheduler). */
export async function refreshRecentMetrics(): Promise<void> {
  const since = new Date(Date.now() - 7 * 86_400_000);

  const posts = await db
    .select({
      id:          scheduledPosts.id,
      userId:      scheduledPosts.userId,
      platforms:   scheduledPosts.platforms,
      publishedAt: scheduledPosts.publishedAt,
    })
    .from(scheduledPosts)
    .where(
      and(
        eq(scheduledPosts.status, "published"),
        isNotNull(scheduledPosts.publishedAt),
        gte(scheduledPosts.publishedAt, since),
      ),
    );

  for (const post of posts) {
    if (!post.publishedAt) continue;
    await recordInitialMetrics(post.id, post.userId, post.platforms, post.publishedAt);
  }

  if (posts.length > 0) {
    logger.info(`[metricsFetcher] Refreshed metrics for ${posts.length} recent posts`);
  }
}
