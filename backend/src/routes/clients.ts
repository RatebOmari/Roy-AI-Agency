import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { db } from "../db/index.js";
import { agencyClients, users, platformPermissions, platformCredentials } from "../db/schema.js";
import { authMiddleware } from "../middleware/auth.js";

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
      platform:    platformCredentials.platform,
      feature:     platformCredentials.feature,
      connectedAt: platformCredentials.connectedAt,
    })
    .from(platformCredentials)
    .where(eq(platformCredentials.userId, clientId));

  return c.json(
    creds.map((cr) => ({
      platform:    cr.platform,
      feature:     cr.feature,
      connected:   true,
      connectedAt: cr.connectedAt,
    }))
  );
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
  feature:     z.enum(["comments", "messages"]),
  accessToken: z.string().min(1),
});

const revokeCredentialSchema = z.object({
  action:   z.literal("revokeCredential"),
  clientId: z.string().uuid(),
  platform: z.enum(["tiktok", "instagram", "facebook", "whatsapp", "sms", "phone"]),
  feature:  z.enum(["comments", "messages"]),
});

const actionSchema = z.discriminatedUnion("action", [
  updateStatusSchema,
  updatePermissionsSchema,
  setPlatformCredentialSchema,
  revokeCredentialSchema,
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
        .set({ accessTokenEnc: accessToken, connectedAt: new Date() })
        .where(eq(platformCredentials.id, existing.id));
    } else {
      await db.insert(platformCredentials).values({
        userId:         clientId,
        platform,
        feature,
        accessTokenEnc: accessToken, // TODO: encrypt at rest in production
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

  return c.json({ message: "Unknown action" }, 400);
});

export default app;
