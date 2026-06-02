import { Hono } from "hono";
import { eq, and, gte, desc } from "drizzle-orm";
import { db } from "../db/index.js";
import { conversations, messages, outreachMessages as campaigns } from "../db/schema.js";
import { authMiddleware } from "../middleware/auth.js";
import { clientContextMiddleware } from "../middleware/clientContext.js";

const app = new Hono();
app.use("*", authMiddleware);
app.use("*", clientContextMiddleware);

type Range = "7d" | "30d" | "90d";

function rangeStart(range: Range): Date {
  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
  return new Date(Date.now() - days * 86_400_000);
}

// Returns chart bucket labels and the number of buckets
function buckets(range: Range): { labels: string[]; bucketMs: number } {
  if (range === "7d") {
    const days = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
    const today = new Date().getDay();
    const labels = Array.from({ length: 7 }, (_, i) => days[(today - 6 + i + 7) % 7]);
    return { labels, bucketMs: 86_400_000 };
  }
  if (range === "30d") {
    return { labels: ["W1","W2","W3","W4"], bucketMs: 7 * 86_400_000 };
  }
  // 90d → 3 months
  const now = new Date();
  const labels = Array.from({ length: 3 }, (_, i) => {
    const d = new Date(now);
    d.setMonth(d.getMonth() - (2 - i));
    return d.toLocaleString("en-US", { month: "short" });
  });
  return { labels, bucketMs: 30 * 86_400_000 };
}

// GET /?range=7d|30d|90d — returns aggregated analytics
app.get("/", async (c) => {
  const user  = c.get("user");
  const range = (c.req.query("range") ?? "7d") as Range;
  const since = rangeStart(range);
  const { labels, bucketMs } = buckets(range);
  const n = labels.length;

  // ── Messages (outbound, auto_sent/manual/escalated) ───────────────────────

  // Get messages joined to user conversations
  const userOutbound = await db
    .select({
      timestamp:   messages.timestamp,
      replyStatus: messages.replyStatus,
    })
    .from(messages)
    .innerJoin(conversations, eq(messages.convId, conversations.id))
    .where(
      and(
        eq(conversations.userId, user.sub),
        eq(messages.direction, "outbound"),
        gte(messages.timestamp, since),
      )
    );

  // Bucket messages
  const msgBuckets = labels.map((label, i) => {
    const bucketStart = new Date(since.getTime() + i * bucketMs);
    const bucketEnd   = new Date(bucketStart.getTime() + bucketMs);
    const bucket      = userOutbound.filter(m =>
      m.timestamp >= bucketStart && m.timestamp < bucketEnd
    );
    return {
      date:      label,
      autoSent:  bucket.filter(m => m.replyStatus === "auto_sent").length,
      manual:    bucket.filter(m => m.replyStatus === "approved" || m.replyStatus === "edited").length,
      escalated: bucket.filter(m => m.replyStatus === "escalated").length,
    };
  });

  // ── Summary KPIs ──────────────────────────────────────────────────────────

  const totalAutoSent  = userOutbound.filter(m => m.replyStatus === "auto_sent").length;
  const totalManual    = userOutbound.filter(m => m.replyStatus === "approved" || m.replyStatus === "edited").length;
  const totalEscalated = userOutbound.filter(m => m.replyStatus === "escalated").length;
  const totalMessages  = userOutbound.length;
  const autoSentRate   = totalMessages > 0 ? Math.round((totalAutoSent / totalMessages) * 100) : 0;

  // ── Conversations stats ───────────────────────────────────────────────────

  const userConvs = await db
    .select({
      channel:      conversations.channel,
      status:       conversations.status,
      lastMessageAt: conversations.lastMessageAt,
    })
    .from(conversations)
    .where(
      and(
        eq(conversations.userId, user.sub),
        gte(conversations.lastMessageAt, since),
      )
    );

  const pendingCount  = userConvs.filter(c => c.status === "pending").length;
  const resolvedCount = userConvs.filter(c => c.status === "resolved").length;

  // Channel breakdown
  const channelCounts: Record<string, number> = {};
  for (const conv of userConvs) {
    channelCounts[conv.channel] = (channelCounts[conv.channel] ?? 0) + 1;
  }
  const channelBreakdown = Object.entries(channelCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([channel, count]) => ({ channel, count }));

  // ── Outreach (formerly Campaigns) ────────────────────────────────────────

  const userCampaigns = await db
    .select({
      sentCount:   campaigns.sentCount,
      openedCount: campaigns.openedCount,
      repliedCount: campaigns.repliedCount,
      status:      campaigns.status,
      createdAt:   campaigns.createdAt,
    })
    .from(campaigns)
    .where(
      and(
        eq(campaigns.userId, user.sub),
        gte(campaigns.createdAt, since),
      )
    );

  const campSent  = userCampaigns.reduce((s, c) => s + c.sentCount,   0);
  const campRead  = userCampaigns.reduce((s, c) => s + c.openedCount, 0);
  const campReply = userCampaigns.reduce((s, c) => s + c.repliedCount, 0);

  return c.json({
    range,
    summary: {
      totalMessages,
      autoSentRate,
      totalAutoSent,
      totalManual,
      totalEscalated,
      pendingConversations: pendingCount,
      resolvedConversations: resolvedCount,
    },
    msgChart:       msgBuckets,
    channelBreakdown,
    campaigns: {
      sent:  campSent,
      read:  campRead,
      reply: campReply,
      readRate:  campSent > 0 ? Math.round((campRead  / campSent) * 100) : 0,
      replyRate: campSent > 0 ? Math.round((campReply / campSent) * 100) : 0,
    },
  });
});

export default app;
