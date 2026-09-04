import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, and, gte, desc, asc, inArray } from "drizzle-orm";
import { db } from "../db/index.js";
import { bookings, conversations, bookingStatusEnum, bookingSourceEnum } from "../db/schema.js";
import { authMiddleware } from "../middleware/auth.js";
import { clientContextMiddleware } from "../middleware/clientContext.js";
import { requireNotViewer } from "../middleware/teamRole.js";
import { deliverReply, logDelivery, type DeliveryChannel } from "../lib/platformDelivery.js";
import { logger } from "../lib/logger.js";

const app = new Hono();
app.use("*", authMiddleware);
app.use("*", clientContextMiddleware);

// ── GET / — bookings for the current business ─────────────────────────────────
// ?scope=upcoming (default) | all | requested

app.get("/", async (c) => {
  const user  = c.get("user");
  const scope = c.req.query("scope") ?? "upcoming";
  const limit = Math.min(200, Math.max(1, parseInt(c.req.query("limit") ?? "100")));

  const conditions = [eq(bookings.userId, user.sub)];
  if (scope === "upcoming") {
    conditions.push(gte(bookings.scheduledFor, new Date()));
    conditions.push(inArray(bookings.status, ["requested", "confirmed"]));
  } else if (scope === "requested") {
    conditions.push(eq(bookings.status, "requested"));
  }

  const rows = await db
    .select()
    .from(bookings)
    .where(and(...conditions))
    .orderBy(scope === "all" ? desc(bookings.scheduledFor) : asc(bookings.scheduledFor))
    .limit(limit);

  return c.json(rows);
});

// ── POST / — create a booking ─────────────────────────────────────────────────
// Always starts as `requested`: a person confirms it. Callers may capture it
// from a conversation, a call, the chatbot, or enter it manually.

const createSchema = z.object({
  source:       z.enum(bookingSourceEnum.enumValues).default("manual"),
  convId:       z.string().uuid().nullable().optional(),
  callId:       z.string().uuid().nullable().optional(),
  contactId:    z.string().uuid().nullable().optional(),
  contactName:  z.string().min(1),
  contactPhone: z.string().optional().default(""),
  service:      z.string().min(1),
  partySize:    z.number().int().positive().nullable().optional(),
  durationMins: z.number().int().positive().nullable().optional(),
  staffName:    z.string().optional().default(""),
  scheduledFor: z.string().datetime({ offset: true }).or(z.string().min(1)),
  notes:        z.string().optional().default(""),
});

app.post("/", requireNotViewer, zValidator("json", createSchema), async (c) => {
  const user = c.get("user");
  const body = c.req.valid("json");

  const when = new Date(body.scheduledFor);
  if (isNaN(when.getTime())) {
    return c.json({ message: "Invalid booking date/time" }, 400);
  }

  const [booking] = await db
    .insert(bookings)
    .values({
      userId:       user.sub,
      source:       body.source,
      convId:       body.convId ?? null,
      callId:       body.callId ?? null,
      contactId:    body.contactId ?? null,
      contactName:  body.contactName,
      contactPhone: body.contactPhone ?? "",
      service:      body.service,
      partySize:    body.partySize ?? null,
      durationMins: body.durationMins ?? null,
      staffName:    body.staffName ?? "",
      scheduledFor: when,
      notes:        body.notes ?? "",
      status:       "requested",
    })
    .returning();

  return c.json(booking, 201);
});

// ── PATCH /:id — change status or details ─────────────────────────────────────
// Confirming or declining optionally messages the customer back on the same
// channel the request came in on.

const updateSchema = z.object({
  status:       z.enum(bookingStatusEnum.enumValues).optional(),
  scheduledFor: z.string().min(1).optional(),
  service:      z.string().min(1).optional(),
  partySize:    z.number().int().positive().nullable().optional(),
  durationMins: z.number().int().positive().nullable().optional(),
  staffName:    z.string().optional(),
  notes:        z.string().optional(),
  /** When set, send this text to the customer on the originating channel. */
  notifyMessage: z.string().max(2000).optional(),
});

app.patch("/:id", requireNotViewer, zValidator("json", updateSchema), async (c) => {
  const user = c.get("user");
  const id   = c.req.param("id");
  const body = c.req.valid("json");

  const [existing] = await db
    .select()
    .from(bookings)
    .where(and(eq(bookings.id, id), eq(bookings.userId, user.sub)))
    .limit(1);
  if (!existing) return c.json({ message: "Not found" }, 404);

  let when: Date | undefined;
  if (body.scheduledFor !== undefined) {
    when = new Date(body.scheduledFor);
    if (isNaN(when.getTime())) return c.json({ message: "Invalid booking date/time" }, 400);
  }

  const [updated] = await db
    .update(bookings)
    .set({
      ...(body.status       !== undefined && { status: body.status }),
      ...(when              !== undefined && { scheduledFor: when }),
      ...(body.service      !== undefined && { service: body.service }),
      ...(body.partySize    !== undefined && { partySize: body.partySize }),
      ...(body.durationMins !== undefined && { durationMins: body.durationMins }),
      ...(body.staffName    !== undefined && { staffName: body.staffName }),
      ...(body.notes        !== undefined && { notes: body.notes }),
      ...(body.status === "confirmed" && { confirmedAt: new Date() }),
    })
    .where(eq(bookings.id, id))
    .returning();

  // Let the customer know, on the channel they originally used.
  if (body.notifyMessage && updated.convId) {
    const [conv] = await db
      .select({ channel: conversations.channel, handle: conversations.contactHandle })
      .from(conversations)
      .where(eq(conversations.id, updated.convId))
      .limit(1);

    if (conv) {
      deliverReply({
        userId:          user.sub,
        channel:         conv.channel as DeliveryChannel,
        recipientHandle: conv.handle,
        text:            body.notifyMessage,
      })
        .then(result => logDelivery(result, `booking ${id} → ${conv.channel}`))
        .catch(err => logger.error({ err }, "[bookings] notify failed"));
    }
  }

  return c.json(updated);
});

export default app;
