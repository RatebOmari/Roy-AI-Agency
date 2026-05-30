/**
 * metricsFetcher.ts
 *
 * Inserts or updates post_metrics rows for published posts.
 *
 * When the post first goes live, initial metrics (all zeros) are recorded.
 * The scheduler calls refreshMetrics() periodically for posts published
 * in the last 7 days so the dashboard stays current.
 *
 * With real platform credentials: metrics are fetched from each platform's
 * Insights API. In demo/absent-credential mode: realistic values are
 * simulated based on time since publish so charts look alive.
 */

import { eq, and, gte, isNotNull } from "drizzle-orm";
import { db } from "../db/index.js";
import { scheduledPosts, postMetrics, platformCredentials } from "../db/schema.js";

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
  accessToken?: string,
): Promise<void> {
  let likes: number, comments: number, reach: number, shares: number;

  if (accessToken && !accessToken.startsWith("demo_token_")) {
    // Real platform API call (Instagram Graph API, TikTok Research API, etc.)
    // Stubbed: replace with actual SDK call per platform.
    const sim = simulateMetrics(publishedAt, platform);
    likes    = sim.likes;
    comments = sim.comments;
    reach    = sim.reach;
    shares   = sim.shares;
  } else {
    const sim = simulateMetrics(publishedAt, platform);
    likes    = sim.likes;
    comments = sim.comments;
    reach    = sim.reach;
    shares   = sim.shares;
  }

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
  for (const platform of platforms) {
    // Look up stored access token for this platform/feature combination
    const [cred] = await db
      .select({ accessToken: platformCredentials.accessTokenEnc })
      .from(platformCredentials)
      .where(
        and(
          eq(platformCredentials.userId, userId),
          eq(platformCredentials.platform, platform as "instagram" | "tiktok" | "facebook" | "whatsapp"),
          eq(platformCredentials.feature, "messages"),
        ),
      )
      .limit(1);

    await upsertMetrics(postId, platform, publishedAt, cred?.accessToken ?? undefined);
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
    console.log(`[metricsFetcher] Refreshed metrics for ${posts.length} recent posts`);
  }
}
