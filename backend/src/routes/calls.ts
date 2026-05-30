import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";
import { db } from "../db/index.js";
import { calls, conversations, messages } from "../db/schema.js";
import { authMiddleware } from "../middleware/auth.js";
import { clientContextMiddleware } from "../middleware/clientContext.js";
import { makePhoneCall, logDelivery } from "../lib/platformDelivery.js";

const app = new Hono();

// ── Twilio status webhook — no auth ───────────────────────────────────────────

app.post("/webhook/status", async (c) => {
  const body = await c.req.formData();
  const sid      = body.get("CallSid") as string | null;
  const status   = body.get("CallStatus") as string | null;
  const duration = body.get("CallDuration") as string | null;
  const recUrl   = body.get("RecordingUrl") as string | null;

  if (!sid) return c.text("missing CallSid", 400);

  const endStatuses = ["completed", "failed", "busy", "no-answer", "canceled"];
  const updateData: Record<string, unknown> = { status };
  if (endStatuses.includes(status ?? "")) {
    if (duration) updateData.duration = parseInt(duration, 10);
    if (recUrl)   updateData.recordingUrl = recUrl;
    updateData.endedAt = new Date();
  }

  try {
    await db.update(calls).set(updateData as any).where(eq(calls.twilioSid, sid));
  } catch {
    // ignore — call may not exist yet
  }

  return c.text(`<?xml version="1.0" encoding="UTF-8"?><Response></Response>`, 200, {
    "Content-Type": "application/xml",
  });
});

// ── All routes below require auth ─────────────────────────────────────────────

app.use("*", authMiddleware);
app.use("*", clientContextMiddleware);

// GET /api/calls — list calls for authenticated user
app.get("/", async (c) => {
  const user      = c.get("user");
  const direction = c.req.query("direction");
  const status    = c.req.query("status");

  const rows = await db
    .select()
    .from(calls)
    .where(eq(calls.userId, user.sub))
    .orderBy(desc(calls.startedAt));

  const filtered = rows
    .filter(r => !direction || r.direction === direction)
    .filter(r => !status    || r.status    === status);

  return c.json(filtered.map(r => ({
    ...r,
    startedAt: r.startedAt.toISOString(),
    endedAt:   r.endedAt?.toISOString() ?? null,
    createdAt: r.createdAt.toISOString(),
  })));
});

// POST /api/calls/outbound — initiate an outbound call
const outboundSchema = z.object({
  toNumber:    z.string().min(6),
  contactName: z.string().default(""),
  message:     z.string().default("Hello! This is a call from our support team. Please hold while we connect you."),
  convId:      z.string().uuid().optional(),
});

app.post("/outbound", zValidator("json", outboundSchema), async (c) => {
  const user = c.get("user");
  const { toNumber, contactName, message, convId } = c.req.valid("json");

  // Create call record first (so webhook can update it by SID later)
  const [callRecord] = await db
    .insert(calls)
    .values({
      userId:      user.sub,
      convId:      convId ?? null,
      direction:   "outbound",
      toNumber,
      contactName,
      status:      "initiated",
      startedAt:   new Date(),
    })
    .returning();

  // Initiate Twilio call
  const result = await makePhoneCall(toNumber, message);
  logDelivery(result, `outbound call → ${toNumber}`);

  if (result.ok) {
    await db.update(calls)
      .set({ twilioSid: result.sid ?? null, status: "ringing" })
      .where(eq(calls.id, callRecord.id));
  } else if ("error" in result) {
    await db.update(calls)
      .set({ status: "failed", endedAt: new Date() })
      .where(eq(calls.id, callRecord.id));
  }

  // If linked to a conversation, log a message there too
  if (convId && result.ok) {
    await db.insert(messages).values({
      convId,
      direction: "outbound",
      content:   `📞 Outbound call initiated → ${toNumber}`,
      sentBy:    "human",
      timestamp: new Date(),
    });
    await db.update(conversations)
      .set({ lastMessageAt: new Date() })
      .where(eq(conversations.id, convId));
  }

  return c.json({
    ok:     result.ok,
    callId: callRecord.id,
    status: result.ok ? "ringing" : ("error" in result ? result.error : result.reason),
  });
});

// PUT /api/calls/:id/notes — save call notes
app.put("/:id/notes", zValidator("json", z.object({ notes: z.string() })), async (c) => {
  const user  = c.get("user");
  const id    = c.req.param("id");
  const { notes } = c.req.valid("json");

  const [call] = await db
    .select({ id: calls.id })
    .from(calls)
    .where(and(eq(calls.id, id), eq(calls.userId, user.sub)))
    .limit(1);

  if (!call) return c.json({ message: "Not found" }, 404);
  await db.update(calls).set({ notes }).where(eq(calls.id, id));
  return c.json({ ok: true });
});

export default app;
