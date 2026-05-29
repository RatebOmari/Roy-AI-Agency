import { Hono } from "hono";
import { eq, and, count, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { conversations, messages, platformCredentials, platformPermissions } from "../db/schema.js";
import { authMiddleware } from "../middleware/auth.js";

const app = new Hono();
app.use("*", authMiddleware);

const ALL_PLATFORMS = ["tiktok", "instagram", "facebook", "whatsapp", "sms", "phone"] as const;

app.get("/", async (c) => {
  const user = c.get("user");

  // Count total replies sent (approved/auto_sent messages)
  const [replyCount] = await db
    .select({ count: count() })
    .from(messages)
    .innerJoin(conversations, eq(messages.convId, conversations.id))
    .where(and(
      eq(conversations.userId, user.sub),
      sql`${messages.replyStatus} IN ('approved', 'auto_sent', 'edited')`,
    ));

  // Count pending review
  const [pendingCount] = await db
    .select({ count: count() })
    .from(messages)
    .innerJoin(conversations, eq(messages.convId, conversations.id))
    .where(and(
      eq(conversations.userId, user.sub),
      eq(messages.replyStatus, "pending"),
    ));

  // Platform credential status
  const creds = await db
    .select()
    .from(platformCredentials)
    .where(eq(platformCredentials.userId, user.sub));

  // Platform permissions (for clients managed by an agency)
  const perms = await db
    .select()
    .from(platformPermissions)
    .where(eq(platformPermissions.clientId, user.sub));

  const platformsV2 = ALL_PLATFORMS.map((platform) => {
    const commentsCred = creds.find((c) => c.platform === platform && c.feature === "comments");
    const messagesCred = creds.find((c) => c.platform === platform && c.feature === "messages");
    const perm = perms.find((p) => p.platform === platform);

    return {
      platform,
      comments: {
        connected: !!commentsCred,
        enabled:   perm ? perm.commentsEnabled : platform !== "phone",
        replies:   0,
        pending:   0,
      },
      messages: {
        connected: !!messagesCred,
        enabled:   perm ? perm.messagesEnabled : platform !== "phone",
        replies:   0,
        pending:   0,
      },
    };
  });

  return c.json({
    totalReplies:    replyCount.count,
    pendingReview:   pendingCount.count,
    avgResponseTime: "< 3 min",
    engagementRate:  87,
    platforms:       [],
    platformsV2,
  });
});

export default app;
