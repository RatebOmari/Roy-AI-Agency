/**
 * Outreach — multi-channel broadcast feature.
 * Handles creation, editing, AI generation, sending and result tracking
 * for WhatsApp / SMS / Email broadcast messages.
 */

import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, and, desc, inArray } from "drizzle-orm";
import Anthropic from "@anthropic-ai/sdk";
import { db } from "../db/index.js";
import {
  outreachMessages,
  outreachResults,
  contacts,
  agencyClients,
  users,
} from "../db/schema.js";
import { authMiddleware } from "../middleware/auth.js";
import { clientContextMiddleware } from "../middleware/clientContext.js";
import { buildKnowledgeContext } from "../lib/knowledge.js";
import { AI_FAST_MODEL } from "../lib/constants.js";
import { sendWhatsAppMessage } from "../lib/platformDelivery.js";
import { createMiddleware } from "hono/factory";

// ── Helpers ────────────────────────────────────────────────────────────────────

function parseJSON<T>(raw: string, fallback: T): T {
  try { return JSON.parse(raw) as T; } catch { return fallback; }
}

interface AudienceFilter {
  type: "all" | "tag" | "platform";
  tagValue?: string | null;
  platformValue?: string | null;
  activeDays?: number | null;
}

interface Handle {
  channel: string;
  username: string;
}

type ContactRow = typeof contacts.$inferSelect;

/** Returns contacts that match the given audience filter. */
function applyAudienceFilter(
  allContacts: ContactRow[],
  filter: AudienceFilter,
): ContactRow[] {
  let result = allContacts;

  // activeDays filter (applies across all types)
  if (filter.activeDays) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - filter.activeDays);
    result = result.filter(c => c.lastSeenAt >= cutoff);
  }

  if (filter.type === "tag" && filter.tagValue) {
    result = result.filter(c =>
      parseJSON<string[]>(c.tags, []).includes(filter.tagValue as string),
    );
  } else if (filter.type === "platform" && filter.platformValue) {
    const pv = filter.platformValue;
    result = result.filter(c =>
      parseJSON<Handle[]>(c.handles, []).some(h => h.channel.includes(pv)),
    );
  }

  return result;
}

/** Returns the subset of contacts that can be reached on the given channel. */
function filterByChannel(
  contacts: ContactRow[],
  channel: "whatsapp" | "sms" | "email",
): ContactRow[] {
  switch (channel) {
    case "whatsapp":
      return contacts.filter(c =>
        parseJSON<Handle[]>(c.handles, []).some(h => h.channel === "whatsapp_business"),
      );
    case "sms":
      return contacts.filter(c => c.phone != null);
    case "email":
      return contacts.filter(c => c.email != null);
  }
}

// ── Role guards ────────────────────────────────────────────────────────────────

const agencyOnly = createMiddleware(async (c, next) => {
  if (c.get("user").role !== "agency") {
    return c.json({ message: "Agency access required" }, 403);
  }
  await next();
});

// ── App & global middleware ────────────────────────────────────────────────────

const app = new Hono();
app.use("*", authMiddleware);
app.use("*", clientContextMiddleware);

// ── Schemas ────────────────────────────────────────────────────────────────────

const audienceFilterSchema = z.object({
  type:          z.enum(["all", "tag", "platform"]),
  tagValue:      z.string().nullable().optional(),
  platformValue: z.string().nullable().optional(),
  activeDays:    z.number().nullable().optional(),
});

const createSchema = z.object({
  title:          z.string().min(1),
  channel:        z.enum(["whatsapp", "sms", "email"]),
  messageBody:    z.string().min(1),
  subject:        z.string().optional(),
  imageUrl:       z.string().nullable().optional(),
  quickReplies:   z.array(z.string()).max(3).optional(),
  audienceFilter: audienceFilterSchema,
});

const updateSchema = createSchema.partial();

const generateSchema = z.object({
  prompt:  z.string().min(1).max(2000),
  channel: z.enum(["whatsapp", "sms", "email"]),
  tone:    z.enum(["friendly", "professional", "fun", "informative"]).optional().default("friendly"),
});

// ── GET /all-clients — agency only, no x-client-id required ──────────────────

app.get("/all-clients", agencyOnly, async (c) => {
  // The original user sub before clientContextMiddleware may have overridden it.
  // For this endpoint we always need the agency's own ID, not a client ID.
  // We re-read the raw JWT sub via the raw user before override — but since
  // clientContextMiddleware only overrides when x-client-id is set, and this
  // endpoint description says "no x-client-id needed", user.sub is the agency.
  const user = c.get("user");
  const agencyId = user.ownerId ?? user.sub;

  const rels = await db
    .select({ clientId: agencyClients.clientId })
    .from(agencyClients)
    .where(eq(agencyClients.agencyId, agencyId));

  if (rels.length === 0) return c.json([]);

  const clientIds = rels.map(r => r.clientId);

  const rows = await db
    .select({
      id:             outreachMessages.id,
      userId:         outreachMessages.userId,
      createdBy:      outreachMessages.createdBy,
      title:          outreachMessages.title,
      channel:        outreachMessages.channel,
      messageBody:    outreachMessages.messageBody,
      subject:        outreachMessages.subject,
      imageUrl:       outreachMessages.imageUrl,
      quickReplies:   outreachMessages.quickReplies,
      audienceFilter: outreachMessages.audienceFilter,
      estimatedReach: outreachMessages.estimatedReach,
      actualReach:    outreachMessages.actualReach,
      sentCount:      outreachMessages.sentCount,
      deliveredCount: outreachMessages.deliveredCount,
      openedCount:    outreachMessages.openedCount,
      clickedCount:   outreachMessages.clickedCount,
      repliedCount:   outreachMessages.repliedCount,
      failedCount:    outreachMessages.failedCount,
      status:         outreachMessages.status,
      scheduledAt:    outreachMessages.scheduledAt,
      sentAt:         outreachMessages.sentAt,
      createdAt:      outreachMessages.createdAt,
      clientName:         users.name,
      clientBusinessName: users.businessName,
    })
    .from(outreachMessages)
    .innerJoin(users, eq(outreachMessages.userId, users.id))
    .where(inArray(outreachMessages.userId, clientIds))
    .orderBy(desc(outreachMessages.createdAt));

  return c.json(rows);
});

// ── GET /reach — compute audience size for given filter + channel ─────────────

app.get("/reach", async (c) => {
  const user          = c.get("user");
  const type          = (c.req.query("type") ?? "all") as "all" | "tag" | "platform";
  const tagValue      = c.req.query("tagValue")      ?? null;
  const platformValue = c.req.query("platformValue") ?? null;
  const activeDaysRaw = c.req.query("activeDays");
  const activeDays    = activeDaysRaw ? Number(activeDaysRaw) : null;
  const channel       = (c.req.query("channel") ?? "whatsapp") as "whatsapp" | "sms" | "email";

  const allContacts = await db
    .select()
    .from(contacts)
    .where(eq(contacts.userId, user.sub));

  const filter: AudienceFilter = { type, tagValue, platformValue, activeDays };
  const filtered     = applyAudienceFilter(allContacts, filter);
  const channelReach = filterByChannel(filtered, channel);

  return c.json({ total: filtered.length, channelReach: channelReach.length });
});

// ── POST /generate — AI-generate message content ──────────────────────────────

app.post("/generate", zValidator("json", generateSchema), async (c) => {
  const user = c.get("user");
  const body = c.req.valid("json");

  const knowledgeContext = await buildKnowledgeContext(user.sub);

  const toneInstruction: Record<string, string> = {
    friendly:      "Write in a warm, conversational, friendly tone.",
    professional:  "Write in a clear, professional, business-appropriate tone.",
    fun:           "Write in an upbeat, playful, energetic tone. Use casual language.",
    informative:   "Write in a clear, informative tone focused on facts and value.",
  };

  const channelInstructions: Record<string, string> = {
    whatsapp: "Generate a WhatsApp broadcast message. Return a JSON object with a single key: { \"body\": \"<message>\" }.",
    sms:      "Generate an SMS message. Keep it under 160 characters. Return a JSON object with a single key: { \"body\": \"<message>\" }.",
    email:    "Generate an email broadcast. Return a JSON object with two keys: { \"subject\": \"<subject line>\", \"body\": \"<full email body>\" }.",
  };

  const systemPrompt = `You are a marketing copywriter. Use the following business knowledge to personalise the message.\n\n${knowledgeContext}\n\n${toneInstruction[body.tone]}\n\n${channelInstructions[body.channel]}\n\nRespond ONLY with valid JSON — no markdown, no extra text.`;

  // Fallback if no API key
  if (!process.env.ANTHROPIC_API_KEY) {
    if (body.channel === "email") {
      return c.json({
        subject: `Special offer from us — ${body.prompt.slice(0, 40)}`,
        body:    `Hello!\n\nWe wanted to reach out regarding: ${body.prompt}\n\nThank you for being our valued customer.\n\nBest regards`,
      });
    }
    return c.json({ body: `Hi! ${body.prompt.slice(0, 130)}` });
  }

  try {
    const anthropic = new Anthropic();
    const resp = await anthropic.messages.create({
      model: AI_FAST_MODEL,
      max_tokens: 512,
      system: systemPrompt,
      messages: [{ role: "user", content: body.prompt }],
    });

    const text = resp.content.find(b => b.type === "text")?.text ?? "{}";
    // Strip markdown code fences if the model wraps in them
    const cleaned = text.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
    const parsed = JSON.parse(cleaned) as Record<string, string>;

    if (body.channel === "email") {
      return c.json({ subject: parsed.subject ?? "", body: parsed.body ?? "" });
    }
    return c.json({ body: parsed.body ?? "" });
  } catch (err) {
    console.error("[outreach/generate] AI generation failed:", err);
    // Graceful fallback
    if (body.channel === "email") {
      return c.json({
        subject: `Message about: ${body.prompt.slice(0, 50)}`,
        body:    body.prompt,
      });
    }
    return c.json({ body: body.prompt.slice(0, 160) });
  }
});

// ── GET / — list outreach for current user ────────────────────────────────────

app.get("/", async (c) => {
  const user = c.get("user");
  const rows = await db
    .select()
    .from(outreachMessages)
    .where(eq(outreachMessages.userId, user.sub))
    .orderBy(desc(outreachMessages.createdAt));
  return c.json(rows);
});

// ── POST / — create new outreach ──────────────────────────────────────────────

app.post("/", zValidator("json", createSchema), async (c) => {
  const user = c.get("user");

  // Agency must supply x-client-id (clientContextMiddleware already overrode sub if present)
  // If role is still "agency" and sub == agency's own id, that means no x-client-id was given
  const rawUser = c.get("user");
  if (rawUser.role === "agency" && !c.req.header("x-client-id")) {
    return c.json({ message: "Agency must specify x-client-id to create outreach on behalf of a client" }, 403);
  }

  const body = c.req.valid("json");

  // Compute estimated reach
  const allContacts = await db
    .select()
    .from(contacts)
    .where(eq(contacts.userId, user.sub));

  const filter = body.audienceFilter as AudienceFilter;
  const filtered = applyAudienceFilter(allContacts, filter);
  const channelFiltered = filterByChannel(filtered, body.channel);
  const estimatedReach = channelFiltered.length;

  const [row] = await db
    .insert(outreachMessages)
    .values({
      userId:         user.sub,
      createdBy:      rawUser.role === "agency" ? (rawUser.ownerId ?? rawUser.sub) : user.sub,
      title:          body.title,
      channel:        body.channel,
      messageBody:    body.messageBody,
      subject:        body.subject ?? null,
      imageUrl:       body.imageUrl ?? null,
      quickReplies:   JSON.stringify(body.quickReplies ?? []),
      audienceFilter: JSON.stringify(body.audienceFilter),
      estimatedReach,
      status:         "draft",
    })
    .returning();

  return c.json(row, 201);
});

// ── PUT /:id — update (draft only) ───────────────────────────────────────────

app.put("/:id", zValidator("json", updateSchema), async (c) => {
  const user = c.get("user");
  const id   = c.req.param("id");
  const body = c.req.valid("json");

  // Fetch current status
  const [existing] = await db
    .select({ status: outreachMessages.status })
    .from(outreachMessages)
    .where(and(eq(outreachMessages.id, id), eq(outreachMessages.userId, user.sub)))
    .limit(1);

  if (!existing) return c.json({ message: "Not found" }, 404);
  if (existing.status !== "draft") {
    return c.json({ message: "Only draft outreach messages can be edited" }, 409);
  }

  const updates: Record<string, unknown> = {};
  if (body.title         !== undefined) updates.title         = body.title;
  if (body.channel       !== undefined) updates.channel       = body.channel;
  if (body.messageBody   !== undefined) updates.messageBody   = body.messageBody;
  if (body.subject       !== undefined) updates.subject       = body.subject ?? null;
  if (body.imageUrl      !== undefined) updates.imageUrl      = body.imageUrl ?? null;
  if (body.quickReplies  !== undefined) updates.quickReplies  = JSON.stringify(body.quickReplies);
  if (body.audienceFilter !== undefined) {
    updates.audienceFilter = JSON.stringify(body.audienceFilter);

    // Recompute estimated reach if audience filter changed
    const channelTarget = body.channel ?? "whatsapp";
    const allContacts = await db
      .select()
      .from(contacts)
      .where(eq(contacts.userId, user.sub));
    const filtered = applyAudienceFilter(allContacts, body.audienceFilter as AudienceFilter);
    const channelFiltered = filterByChannel(filtered, channelTarget as "whatsapp" | "sms" | "email");
    updates.estimatedReach = channelFiltered.length;
  }

  const [row] = await db
    .update(outreachMessages)
    .set(updates)
    .where(and(eq(outreachMessages.id, id), eq(outreachMessages.userId, user.sub)))
    .returning();

  return c.json(row);
});

// ── DELETE /:id — delete (not if sent/sending) ────────────────────────────────

app.delete("/:id", async (c) => {
  const user = c.get("user");
  const id   = c.req.param("id");

  const [existing] = await db
    .select({ status: outreachMessages.status })
    .from(outreachMessages)
    .where(and(eq(outreachMessages.id, id), eq(outreachMessages.userId, user.sub)))
    .limit(1);

  if (!existing) return c.json({ message: "Not found" }, 404);
  if (existing.status === "sent" || existing.status === "sending") {
    return c.json({ message: "Cannot delete a sent or in-progress outreach message" }, 409);
  }

  await db
    .delete(outreachMessages)
    .where(and(eq(outreachMessages.id, id), eq(outreachMessages.userId, user.sub)));

  return c.json({ ok: true });
});

// ── POST /:id/send — send immediately ────────────────────────────────────────

app.post("/:id/send", async (c) => {
  const user = c.get("user");
  const id   = c.req.param("id");

  const [outreach] = await db
    .select()
    .from(outreachMessages)
    .where(and(eq(outreachMessages.id, id), eq(outreachMessages.userId, user.sub)))
    .limit(1);

  if (!outreach) return c.json({ message: "Not found" }, 404);

  // Mark as sending
  await db
    .update(outreachMessages)
    .set({ status: "sending" })
    .where(eq(outreachMessages.id, id));

  try {
    // Compute audience
    const allContacts = await db
      .select()
      .from(contacts)
      .where(eq(contacts.userId, user.sub));

    const filter = parseJSON<AudienceFilter>(outreach.audienceFilter, { type: "all" });
    const filtered = applyAudienceFilter(allContacts, filter);
    const audience = filterByChannel(filtered, outreach.channel);

    let sentCount      = 0;
    let deliveredCount = 0;
    let failedCount    = 0;

    const resultRows: (typeof outreachResults.$inferInsert)[] = [];

    for (const contact of audience) {
      const now = new Date();

      if (outreach.channel === "whatsapp") {
        const handles = parseJSON<Handle[]>(contact.handles, []);
        const waHandle = handles.find(h => h.channel === "whatsapp_business");

        if (!waHandle) {
          failedCount++;
          resultRows.push({
            outreachId:    outreach.id,
            contactId:     contact.id,
            channel:       "whatsapp",
            failed:        true,
            failureReason: "no_whatsapp_handle",
            createdAt:     now,
          });
          continue;
        }

        const result = await sendWhatsAppMessage(user.sub, waHandle.username, outreach.messageBody);
        sentCount++;

        if (result.ok) {
          deliveredCount++;
          resultRows.push({
            outreachId:  outreach.id,
            contactId:   contact.id,
            channel:     "whatsapp",
            sentAt:      now,
            deliveredAt: now,
            failed:      false,
            createdAt:   now,
          });
        } else if ("skipped" in result) {
          // No credential — log and count as failed
          console.log(`[outreach/send] WhatsApp skipped for ${contact.name}: ${result.reason}`);
          failedCount++;
          resultRows.push({
            outreachId:    outreach.id,
            contactId:     contact.id,
            channel:       "whatsapp",
            sentAt:        now,
            failed:        true,
            failureReason: result.reason,
            createdAt:     now,
          });
        } else {
          failedCount++;
          resultRows.push({
            outreachId:    outreach.id,
            contactId:     contact.id,
            channel:       "whatsapp",
            sentAt:        now,
            failed:        true,
            failureReason: result.error,
            createdAt:     now,
          });
        }
      } else if (outreach.channel === "sms") {
        // SMS: log to console (real delivery outside scope)
        console.log(`[outreach/send] Would send SMS to ${contact.name} (${contact.phone}): ${outreach.messageBody}`);
        sentCount++;
        deliveredCount++;
        resultRows.push({
          outreachId:  outreach.id,
          contactId:   contact.id,
          channel:     "sms",
          sentAt:      now,
          deliveredAt: now,
          failed:      false,
          createdAt:   now,
        });
      } else if (outreach.channel === "email") {
        // Email: log to console (real delivery outside scope)
        console.log(`[outreach/send] Would send Email to ${contact.name} (${contact.email}) subject="${outreach.subject}": ${outreach.messageBody}`);
        sentCount++;
        deliveredCount++;
        resultRows.push({
          outreachId:  outreach.id,
          contactId:   contact.id,
          channel:     "email",
          sentAt:      now,
          deliveredAt: now,
          failed:      false,
          createdAt:   now,
        });
      }
    }

    // Bulk-insert results
    if (resultRows.length > 0) {
      await db.insert(outreachResults).values(resultRows);
    }

    // Update outreach record
    const [updated] = await db
      .update(outreachMessages)
      .set({
        status:        "sent",
        sentAt:        new Date(),
        actualReach:   audience.length,
        sentCount,
        deliveredCount,
        failedCount,
      })
      .where(eq(outreachMessages.id, id))
      .returning();

    return c.json(updated);
  } catch (err) {
    console.error("[outreach/send] Send failed:", err);
    await db
      .update(outreachMessages)
      .set({ status: "failed" })
      .where(eq(outreachMessages.id, id));
    return c.json({ message: "Send failed" }, 500);
  }
});

// ── POST /:id/cancel — cancel scheduled outreach ──────────────────────────────

app.post("/:id/cancel", async (c) => {
  const user = c.get("user");
  const id   = c.req.param("id");

  const [existing] = await db
    .select({ status: outreachMessages.status })
    .from(outreachMessages)
    .where(and(eq(outreachMessages.id, id), eq(outreachMessages.userId, user.sub)))
    .limit(1);

  if (!existing) return c.json({ message: "Not found" }, 404);
  if (existing.status !== "scheduled") {
    return c.json({ message: "Only scheduled outreach can be cancelled" }, 409);
  }

  const [row] = await db
    .update(outreachMessages)
    .set({ status: "draft", scheduledAt: null })
    .where(and(eq(outreachMessages.id, id), eq(outreachMessages.userId, user.sub)))
    .returning();

  return c.json(row);
});

// ── POST /:id/duplicate — clone as new draft ──────────────────────────────────

app.post("/:id/duplicate", async (c) => {
  const user = c.get("user");
  const id   = c.req.param("id");

  const [original] = await db
    .select()
    .from(outreachMessages)
    .where(and(eq(outreachMessages.id, id), eq(outreachMessages.userId, user.sub)))
    .limit(1);

  if (!original) return c.json({ message: "Not found" }, 404);

  const [copy] = await db
    .insert(outreachMessages)
    .values({
      userId:         original.userId,
      createdBy:      original.createdBy,
      title:          `Copy of ${original.title}`,
      channel:        original.channel,
      messageBody:    original.messageBody,
      subject:        original.subject,
      imageUrl:       original.imageUrl,
      quickReplies:   original.quickReplies,
      audienceFilter: original.audienceFilter,
      estimatedReach: original.estimatedReach,
      status:         "draft",
    })
    .returning();

  return c.json(copy, 201);
});

export default app;
