import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";
import { db } from "../db/index.js";
import { conversations, messages } from "../db/schema.js";
import { authMiddleware } from "../middleware/auth.js";

const app = new Hono();
app.use("*", authMiddleware);

app.get("/", async (c) => {
  const user = c.get("user");

  const convRows = await db
    .select()
    .from(conversations)
    .where(eq(conversations.userId, user.sub))
    .orderBy(desc(conversations.lastMessageAt));

  const result = await Promise.all(
    convRows.map(async (conv) => {
      const msgs = await db
        .select()
        .from(messages)
        .where(eq(messages.convId, conv.id))
        .orderBy(messages.timestamp);

      return {
        id:            conv.id,
        contactId:     conv.contactId,
        contactName:   conv.contactName,
        contactHandle: conv.contactHandle,
        channel:       conv.channel,
        lastMessage:   conv.lastMessage,
        lastMessageAt: conv.lastMessageAt.toISOString(),
        unreadCount:   conv.unreadCount,
        status:        conv.status,
        priority:      conv.priority,
        assignedTo:    conv.assignedTo ?? undefined,
        tags:          conv.tags,
        messages:      msgs.map((m) => ({
          id:           m.id,
          conversationId: conv.id,
          direction:    m.direction,
          content:      m.content,
          aiReply:      m.aiReply ?? undefined,
          aiConfidence: m.aiConfidence ?? undefined,
          replyStatus:  m.replyStatus ?? undefined,
          sentBy:       m.sentBy ?? undefined,
          timestamp:    m.timestamp.toISOString(),
          mediaUrl:     m.mediaUrl ?? undefined,
        })),
      };
    })
  );

  return c.json(result);
});

const replyActionSchema = z.object({
  action:         z.enum(["approve", "reject", "edit"]),
  conversationId: z.string().uuid(),
  content:        z.string(),
});

const statusActionSchema = z.object({
  action: z.literal("updateStatus"),
  id:     z.string().uuid(),
  status: z.enum(["open", "pending", "resolved", "closed"]),
});

const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.enum(["approve", "reject", "edit"]), conversationId: z.string().uuid(), content: z.string() }),
  statusActionSchema,
]);

app.post("/action", zValidator("json", actionSchema), async (c) => {
  const user = c.get("user");
  const body = c.req.valid("json");

  if (body.action === "updateStatus") {
    // Verify ownership
    const [conv] = await db
      .select({ id: conversations.id })
      .from(conversations)
      .where(and(eq(conversations.id, body.id), eq(conversations.userId, user.sub)))
      .limit(1);

    if (!conv) return c.json({ message: "Not found" }, 404);
    await db.update(conversations).set({ status: body.status }).where(eq(conversations.id, body.id));
    return c.json({ ok: true });
  }

  // approve / reject / edit — find the pending message in this conversation
  const [conv] = await db
    .select({ id: conversations.id })
    .from(conversations)
    .where(and(eq(conversations.id, body.conversationId), eq(conversations.userId, user.sub)))
    .limit(1);

  if (!conv) return c.json({ message: "Conversation not found" }, 404);

  // Find the most recent pending message in this conversation
  const [pendingMsg] = await db
    .select({ id: messages.id })
    .from(messages)
    .where(and(eq(messages.convId, body.conversationId), eq(messages.replyStatus, "pending")))
    .orderBy(desc(messages.timestamp))
    .limit(1);

  if (!pendingMsg) return c.json({ message: "No pending message found" }, 404);

  const newStatus =
    body.action === "approve" ? "approved" as const :
    body.action === "reject"  ? "rejected" as const :
                                 "edited"  as const;

  await db
    .update(messages)
    .set({
      replyStatus: newStatus,
      aiReply: body.action === "edit" ? body.content : undefined,
    })
    .where(eq(messages.id, pendingMsg.id));

  // Mark conversation unread as 0 if approved/edited
  if (body.action !== "reject") {
    await db
      .update(conversations)
      .set({ unreadCount: 0 })
      .where(eq(conversations.id, body.conversationId));
  }

  return c.json({ ok: true });
});

export default app;
