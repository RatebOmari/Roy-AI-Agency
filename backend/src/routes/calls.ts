import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";
import { createHmac } from "crypto";
import { db } from "../db/index.js";
import { logger } from "../lib/logger.js";
import { calls, conversations, messages } from "../db/schema.js";
import { authMiddleware } from "../middleware/auth.js";
import { clientContextMiddleware } from "../middleware/clientContext.js";
import { makePhoneCall, logDelivery } from "../lib/platformDelivery.js";

const app = new Hono();

// ── Twilio HMAC-SHA1 signature verification ───────────────────────────────────

function verifyTwilioSignature(
  authToken: string,
  url: string,
  params: Record<string, string>,
  signature: string,
): boolean {
  // Twilio: sort params alphabetically, append key+value to URL, HMAC-SHA1, base64
  const sortedKeys = Object.keys(params).sort();
  const str = url + sortedKeys.map(k => k + params[k]).join("");
  const expected = createHmac("sha1", authToken).update(str).digest("base64");
  if (expected.length !== signature.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  return diff === 0;
}

// ── Twilio status webhook — signature-verified ────────────────────────────────

app.post("/webhook/status", async (c) => {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (authToken) {
    const sig = c.req.header("x-twilio-signature") ?? "";
    const url = c.req.url;
    const rawBody = await c.req.text();
    const params = Object.fromEntries(new URLSearchParams(rawBody).entries());
    if (!verifyTwilioSignature(authToken, url, params, sig)) {
      logger.warn("[calls] Twilio signature verification failed");
      return c.text("Forbidden", 403);
    }
    // Re-parse params since we already consumed the body
    const sid      = params["CallSid"]        ?? null;
    const status   = params["CallStatus"]     ?? null;
    const duration = params["CallDuration"]   ?? null;
    const recUrl   = params["RecordingUrl"]   ?? null;

    if (!sid) return c.text("missing CallSid", 400);

    const endStatuses = ["completed", "failed", "busy", "no-answer", "canceled"];
    if (endStatuses.includes(status ?? "")) {
      try {
        await db.update(calls).set({
          status:       (status as typeof calls.$inferSelect.status),
          duration:     duration ? parseInt(duration, 10) : undefined,
          recordingUrl: recUrl ?? undefined,
          endedAt:      new Date(),
        }).where(eq(calls.twilioSid, sid));
      } catch {
        // call may not exist yet
      }
    } else {
      try {
        await db.update(calls).set({
          status: (status as typeof calls.$inferSelect.status),
        }).where(eq(calls.twilioSid, sid));
      } catch {
        // ignore
      }
    }
  } else {
    // No TWILIO_AUTH_TOKEN configured — process without verification (dev mode)
    const body     = await c.req.formData();
    const sid      = body.get("CallSid")      as string | null;
    const status   = body.get("CallStatus")   as string | null;
    const duration = body.get("CallDuration") as string | null;
    const recUrl   = body.get("RecordingUrl") as string | null;

    if (!sid) return c.text("missing CallSid", 400);

    const endStatuses = ["completed", "failed", "busy", "no-answer", "canceled"];
    if (endStatuses.includes(status ?? "")) {
      try {
        await db.update(calls).set({
          status:       (status as typeof calls.$inferSelect.status),
          duration:     duration ? parseInt(duration, 10) : undefined,
          recordingUrl: recUrl ?? undefined,
          endedAt:      new Date(),
        }).where(eq(calls.twilioSid, sid));
      } catch { /* ignore */ }
    } else {
      try {
        await db.update(calls).set({
          status: (status as typeof calls.$inferSelect.status),
        }).where(eq(calls.twilioSid, sid));
      } catch { /* ignore */ }
    }
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
  await db.update(calls).set({ notes }).where(and(eq(calls.id, id), eq(calls.userId, user.sub)));
  return c.json({ ok: true });
});

export default app;
