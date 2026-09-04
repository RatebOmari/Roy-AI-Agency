import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, and, count, inArray, sql } from "drizzle-orm";
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { db } from "../db/index.js";
import { agencyClients, users, platformPermissions, platformCredentials, conversations, messages, clientInvites, toneSettings, replyTemplates, resources, platformEnum, langEnum, type PlatformValue } from "../db/schema.js";
import { authMiddleware } from "../middleware/auth.js";
import { encryptToken } from "../lib/crypto.js";

const app = new Hono();
app.use("*", authMiddleware);

// ── GET / — list clients for agency ──────────────────────────────────────────

app.get("/", async (c) => {
  const user = c.get("user");
  if (user.role !== "agency") return c.json({ message: "Forbidden" }, 403);

  const rows = await db
    .select({
      id:       agencyClients.id,
      status:   agencyClients.status,
      clientId: agencyClients.clientId,
      name:     users.businessName,
      owner:    users.name,
      email:    users.email,
    })
    .from(agencyClients)
    .innerJoin(users, eq(agencyClients.clientId, users.id))
    .where(eq(agencyClients.agencyId, user.sub));

  const result = rows.map((r) => ({
    id:        r.clientId,
    name:      r.name,
    owner:     r.owner,
    email:     r.email,
    status:    r.status,
    replies:   0,
    platforms: [],
  }));

  return c.json(result);
});

// ── GET /stats — aggregated metrics across all managed clients ────────────────

app.get("/stats", async (c) => {
  const user = c.get("user");
  if (user.role !== "agency") return c.json({ message: "Forbidden" }, 403);

  const clientRows = await db
    .select({ clientId: agencyClients.clientId })
    .from(agencyClients)
    .where(eq(agencyClients.agencyId, user.sub));

  const clientIds = clientRows.map((r) => r.clientId);

  if (clientIds.length === 0) {
    return c.json({ totalReplies: 0, autoSentRate: 0, activeClients: 0, avgPerClient: 0, weeklyData: [] });
  }

  const [counts] = await db
    .select({
      total:    sql<number>`count(*) filter (where ${messages.replyStatus} in ('approved', 'auto_sent', 'edited'))`,
      autoSent: sql<number>`count(*) filter (where ${messages.replyStatus} = 'auto_sent')`,
    })
    .from(messages)
    .innerJoin(conversations, eq(messages.convId, conversations.id))
    .where(inArray(conversations.userId, clientIds));

  const totalReplies = Number(counts?.total ?? 0);
  const autoSent     = Number(counts?.autoSent ?? 0);
  const autoSentRate = totalReplies > 0 ? Math.round((autoSent / totalReplies) * 100) : 0;

  const weeklyRows = await db
    .select({
      day:     sql<string>`to_char(${messages.timestamp}, 'Dy')`,
      replies: count(),
    })
    .from(messages)
    .innerJoin(conversations, eq(messages.convId, conversations.id))
    .where(
      and(
        inArray(conversations.userId, clientIds),
        sql`${messages.replyStatus} IN ('approved', 'auto_sent', 'edited')`,
        sql`${messages.timestamp} >= NOW() - INTERVAL '7 days'`,
      ),
    )
    .groupBy(sql`to_char(${messages.timestamp}, 'Dy'), DATE(${messages.timestamp})`)
    .orderBy(sql`DATE(${messages.timestamp})`);

  return c.json({
    totalReplies,
    autoSentRate,
    activeClients: clientIds.length,
    avgPerClient:  clientIds.length > 0 ? Math.round(totalReplies / clientIds.length) : 0,
    weeklyData:    weeklyRows.map((r) => ({ day: r.day, replies: r.replies })),
  });
});

// ── GET /:id/permissions — saved feature permissions for a client ─────────────
// Without this the agency UI had no way to read what was actually saved, so it
// rendered hardcoded defaults and could overwrite real settings on save.

app.get("/:id/permissions", async (c) => {
  const user = c.get("user");
  if (user.role !== "agency") return c.json({ message: "Forbidden" }, 403);

  const clientId = c.req.param("id");

  const [rel] = await db
    .select({ id: agencyClients.id })
    .from(agencyClients)
    .where(and(eq(agencyClients.agencyId, user.sub), eq(agencyClients.clientId, clientId)))
    .limit(1);
  if (!rel) return c.json({ message: "Not found" }, 404);

  const rows = await db
    .select({
      platform:        platformPermissions.platform,
      commentsEnabled: platformPermissions.commentsEnabled,
      messagesEnabled: platformPermissions.messagesEnabled,
    })
    .from(platformPermissions)
    .where(eq(platformPermissions.clientId, clientId));

  return c.json(rows);
});

// ── GET /:id/platforms — credential status for a client ───────────────────────

app.get("/:id/platforms", async (c) => {
  const user = c.get("user");
  if (user.role !== "agency") return c.json({ message: "Forbidden" }, 403);

  const clientId = c.req.param("id");

  const [rel] = await db
    .select({ id: agencyClients.id })
    .from(agencyClients)
    .where(and(eq(agencyClients.agencyId, user.sub), eq(agencyClients.clientId, clientId)))
    .limit(1);
  if (!rel) return c.json({ message: "Not found" }, 404);

  const creds = await db
    .select({
      platform:       platformCredentials.platform,
      feature:        platformCredentials.feature,
      connectedAt:    platformCredentials.connectedAt,
      expiresAt:      platformCredentials.expiresAt,
      disconnectedAt: platformCredentials.disconnectedAt,
    })
    .from(platformCredentials)
    .where(eq(platformCredentials.userId, clientId));

  const now = new Date();
  return c.json(
    creds.map((cr) => {
      const requiresReconnect =
        cr.disconnectedAt != null ||
        (cr.expiresAt != null && cr.expiresAt <= now);
      const expiresInDays = cr.expiresAt
        ? Math.round((cr.expiresAt.getTime() - now.getTime()) / 86_400_000)
        : null;
      return {
        platform:        cr.platform,
        feature:         cr.feature,
        connected:       !requiresReconnect,
        connectedAt:     cr.connectedAt,
        expiresAt:       cr.expiresAt ?? null,
        expiresInDays,
        requiresReconnect,
        disconnectedAt:  cr.disconnectedAt ?? null,
      };
    })
  );
});

// ── POST /create — agency creates a new client + one-time invite link ────────

// Accepts the full onboarding wizard payload. Everything past `platforms` is
// optional so a bare create still works, but when the wizard collects working
// hours, products, FAQs, tone, and platform tokens we persist them here rather
// than dropping them on the floor.
const createClientSchema = z.object({
  name:         z.string().min(1),
  owner:        z.string().min(1),
  email:        z.string().email(),
  businessType: z.string().optional(),
  description:  z.string().optional(),
  platforms:    z.array(z.enum(platformEnum.enumValues)).optional(),

  credentials: z.array(z.object({
    platform:    z.enum(platformEnum.enumValues),
    feature:     z.enum(["comments", "messages", "publishing"]),
    accessToken: z.string().min(1),
  })).optional(),

  knowledge: z.object({
    hours:    z.array(z.object({
      day:  z.string(),
      open: z.boolean(),
      from: z.string(),
      to:   z.string(),
    })).optional(),
    products: z.array(z.object({
      name:  z.string(),
      price: z.string().optional(),
    })).optional(),
    faqs:     z.array(z.object({
      question: z.string(),
      answer:   z.string(),
    })).optional(),
  }).optional(),

  tones: z.record(z.object({
    tone:  z.enum(["friendly", "professional", "fun", "informative"]),
    extra: z.string().optional(),
  })).optional(),
});

app.post("/create", zValidator("json", createClientSchema), async (c) => {
  const user = c.get("user");
  if (user.role !== "agency") return c.json({ message: "Forbidden" }, 403);

  const { name, owner, email, description, platforms, credentials, knowledge, tones } =
    c.req.valid("json");

  const [existing] = await db.select({ id: users.id }).from(users)
    .where(eq(users.email, email.toLowerCase())).limit(1);
  if (existing) return c.json({ message: "A user with this email already exists" }, 409);

  // Create client user with a randomised password — client sets their own via the invite link
  const tempHash = await bcrypt.hash(randomBytes(32).toString("hex"), 10);
  const token     = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const clientId = await db.transaction(async (tx) => {
    const [newClient] = await tx.insert(users).values({
      email:        email.toLowerCase(),
      passwordHash: tempHash,
      role:         "client",
      name:         owner,
      businessName: name,
    }).returning({ id: users.id });

    await tx.insert(agencyClients).values({
      agencyId: user.sub,
      clientId: newClient.id,
      status:   "setup",
    });

    await tx.insert(clientInvites).values({
      token,
      clientId: newClient.id,
      agencyId: user.sub,
      expiresAt,
    });

    // Selected platforms become feature permissions.
    if (platforms?.length) {
      await tx.insert(platformPermissions).values(
        platforms.map((platform) => ({
          clientId:        newClient.id,
          grantedBy:       user.sub,
          platform,
          commentsEnabled: true,
          messagesEnabled: true,
        }))
      );
    }

    // Platform tokens, encrypted at rest.
    if (credentials?.length) {
      await tx.insert(platformCredentials).values(
        credentials.map((cred) => ({
          userId:         newClient.id,
          platform:       cred.platform,
          feature:        cred.feature,
          accessTokenEnc: encryptToken(cred.accessToken),
        }))
      );
    }

    // Knowledge base — shapes must match what buildKnowledgeContext() reads.
    const resourceRows: {
      userId: string;
      type: "info" | "hours" | "menu_item" | "faq";
      title: string;
      content: string;
    }[] = [];

    if (description) {
      resourceRows.push({
        userId: newClient.id, type: "info", title: name,
        content: JSON.stringify({ name, description }),
      });
    }
    if (knowledge?.hours?.length) {
      resourceRows.push({
        userId: newClient.id, type: "hours", title: "Working hours",
        content: JSON.stringify(knowledge.hours),
      });
    }
    for (const p of knowledge?.products ?? []) {
      resourceRows.push({
        userId: newClient.id, type: "menu_item", title: p.name,
        content: JSON.stringify({ name: p.name, price: p.price ?? "" }),
      });
    }
    for (const f of knowledge?.faqs ?? []) {
      resourceRows.push({
        userId: newClient.id, type: "faq", title: f.question,
        content: JSON.stringify({ question: f.question, answer: f.answer }),
      });
    }
    if (resourceRows.length) await tx.insert(resources).values(resourceRows);

    // Per-platform AI tone. Reply language is not stored — replies always
    // mirror the customer's language.
    const toneRows = Object.entries(tones ?? {})
      .filter(([platform]) => (platformEnum.enumValues as readonly string[]).includes(platform))
      .map(([platform, cfg]) => ({
        userId:   newClient.id,
        platform: platform as PlatformValue,
        tone:     cfg.tone,
        extra:    cfg.extra ?? "",
      }));
    if (toneRows.length) await tx.insert(toneSettings).values(toneRows);

    return newClient.id;
  });

  return c.json({ clientId, token });
});

// ── POST /action — agency actions on clients ──────────────────────────────────

const updateStatusSchema = z.object({
  action: z.literal("updateStatus"),
  id:     z.string().uuid(),
  status: z.enum(["active", "paused", "setup"]),
});

const permissionEntrySchema = z.object({
  comments: z.boolean(),
  messages: z.boolean(),
});

const updatePermissionsSchema = z.object({
  action:      z.literal("updatePermissions"),
  clientId:    z.string().uuid(),
  permissions: z.record(permissionEntrySchema),
});

const setPlatformCredentialSchema = z.object({
  action:      z.literal("setPlatformCredential"),
  clientId:    z.string().uuid(),
  platform:    z.enum(["tiktok", "instagram", "facebook", "whatsapp", "sms", "phone"]),
  feature:     z.enum(["comments", "messages", "publishing"]),
  accessToken: z.string().min(1),
});

const revokeCredentialSchema = z.object({
  action:   z.literal("revokeCredential"),
  clientId: z.string().uuid(),
  platform: z.enum(["tiktok", "instagram", "facebook", "whatsapp", "sms", "phone"]),
  feature:  z.enum(["comments", "messages", "publishing"]),
});

const resetAiSettingsSchema = z.object({
  action:   z.literal("resetAiSettings"),
  clientId: z.string().uuid(),
});

const actionSchema = z.discriminatedUnion("action", [
  updateStatusSchema,
  updatePermissionsSchema,
  setPlatformCredentialSchema,
  revokeCredentialSchema,
  resetAiSettingsSchema,
]);

app.post("/action", zValidator("json", actionSchema), async (c) => {
  const user = c.get("user");
  if (user.role !== "agency") return c.json({ message: "Forbidden" }, 403);

  const body = c.req.valid("json");

  // ── Update client status ────────────────────────────────────────────────────

  if (body.action === "updateStatus") {
    await db
      .update(agencyClients)
      .set({ status: body.status })
      .where(and(
        eq(agencyClients.agencyId, user.sub),
        eq(agencyClients.clientId, body.id),
      ));
    return c.json({ ok: true });
  }

  // ── Update feature permissions ──────────────────────────────────────────────

  if (body.action === "updatePermissions") {
    const { clientId, permissions } = body;

    const [rel] = await db
      .select({ id: agencyClients.id })
      .from(agencyClients)
      .where(and(eq(agencyClients.agencyId, user.sub), eq(agencyClients.clientId, clientId)))
      .limit(1);
    if (!rel) return c.json({ message: "Client not found" }, 404);

    await db.transaction(async (tx) => {
      for (const [platform, perms] of Object.entries(permissions)) {
        const [existing] = await tx
          .select({ id: platformPermissions.id })
          .from(platformPermissions)
          .where(and(
            eq(platformPermissions.clientId, clientId),
            eq(platformPermissions.platform, platform as any),
          ))
          .limit(1);

        if (existing) {
          await tx
            .update(platformPermissions)
            .set({ commentsEnabled: perms.comments, messagesEnabled: perms.messages, updatedAt: new Date() })
            .where(eq(platformPermissions.id, existing.id));
        } else {
          await tx.insert(platformPermissions).values({
            clientId,
            grantedBy:       user.sub,
            platform:        platform as any,
            commentsEnabled: perms.comments,
            messagesEnabled: perms.messages,
          });
        }
      }
    });

    return c.json({ ok: true });
  }

  // ── Set platform credential (agency provides token for client) ──────────────

  if (body.action === "setPlatformCredential") {
    const { clientId, platform, feature, accessToken } = body;

    const [rel] = await db
      .select({ id: agencyClients.id })
      .from(agencyClients)
      .where(and(eq(agencyClients.agencyId, user.sub), eq(agencyClients.clientId, clientId)))
      .limit(1);
    if (!rel) return c.json({ message: "Client not found" }, 404);

    const [existing] = await db
      .select({ id: platformCredentials.id })
      .from(platformCredentials)
      .where(and(
        eq(platformCredentials.userId, clientId),
        eq(platformCredentials.platform, platform),
        eq(platformCredentials.feature, feature),
      ))
      .limit(1);

    if (existing) {
      await db
        .update(platformCredentials)
        .set({ accessTokenEnc: encryptToken(accessToken), connectedAt: new Date(), disconnectedAt: null })
        .where(eq(platformCredentials.id, existing.id));
    } else {
      await db.insert(platformCredentials).values({
        userId:         clientId,
        platform,
        feature,
        accessTokenEnc: encryptToken(accessToken),
      });
    }

    return c.json({ ok: true });
  }

  // ── Revoke platform credential ──────────────────────────────────────────────

  if (body.action === "revokeCredential") {
    const { clientId, platform, feature } = body;

    const [rel] = await db
      .select({ id: agencyClients.id })
      .from(agencyClients)
      .where(and(eq(agencyClients.agencyId, user.sub), eq(agencyClients.clientId, clientId)))
      .limit(1);
    if (!rel) return c.json({ message: "Client not found" }, 404);

    await db
      .delete(platformCredentials)
      .where(and(
        eq(platformCredentials.userId, clientId),
        eq(platformCredentials.platform, platform),
        eq(platformCredentials.feature, feature),
      ));

    return c.json({ ok: true });
  }

  // ── Reset client AI settings to defaults ───────────────────────────────────

  if (body.action === "resetAiSettings") {
    const { clientId } = body;
    const [rel] = await db.select({ id: agencyClients.id }).from(agencyClients)
      .where(and(eq(agencyClients.agencyId, user.sub), eq(agencyClients.clientId, clientId))).limit(1);
    if (!rel) return c.json({ message: "Client not found" }, 404);
    await db.delete(toneSettings).where(eq(toneSettings.userId, clientId));
    return c.json({ ok: true });
  }

  return c.json({ message: "Unknown action" }, 400);
});

// ── POST /push-template — copy a template to one or more clients ─────────────

app.post("/push-template", zValidator("json", z.object({
  clientIds: z.array(z.string().uuid()).min(1),
  title:     z.string().min(1),
  content:   z.string().min(1),
  platforms: z.array(z.enum(platformEnum.enumValues)),
  language:  z.enum(langEnum.enumValues).default("en"),
  category:  z.string().default(""),
})), async (c) => {
  const user = c.get("user");
  if (user.role !== "agency") return c.json({ message: "Forbidden" }, 403);

  const { clientIds, title, content, platforms, language, category } = c.req.valid("json");

  const rows = await db.select({ clientId: agencyClients.clientId })
    .from(agencyClients)
    .where(and(eq(agencyClients.agencyId, user.sub), inArray(agencyClients.clientId, clientIds)));

  const allowedIds = new Set(rows.map(r => r.clientId));

  const toInsert = clientIds
    .filter(id => allowedIds.has(id))
    .map(clientId => ({ userId: clientId, title, content, platforms, language, active: true, category }));

  if (toInsert.length > 0) {
    await db.insert(replyTemplates).values(toInsert);
  }

  return c.json({ ok: true, pushed: toInsert.length });
});

export default app;
