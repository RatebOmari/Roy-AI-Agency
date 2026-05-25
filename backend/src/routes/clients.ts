import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { db } from "../db/index.js";
import { agencyClients, users, platformPermissions } from "../db/schema.js";
import { authMiddleware } from "../middleware/auth.js";

const app = new Hono();
app.use("*", authMiddleware);

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

  // Get permission counts per client (count active platforms)
  const result = rows.map((r) => ({
    id:       r.clientId,
    name:     r.name,
    owner:    r.owner,
    email:    r.email,
    status:   r.status,
    replies:  0,
    platforms: [],
  }));

  return c.json(result);
});

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

const actionSchema = z.discriminatedUnion("action", [
  updateStatusSchema,
  updatePermissionsSchema,
]);

app.post("/action", zValidator("json", actionSchema), async (c) => {
  const user = c.get("user");
  if (user.role !== "agency") return c.json({ message: "Forbidden" }, 403);

  const body = c.req.valid("json");

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

  if (body.action === "updatePermissions") {
    const { clientId, permissions } = body;

    // Verify this client belongs to this agency
    const [rel] = await db
      .select({ id: agencyClients.id })
      .from(agencyClients)
      .where(and(eq(agencyClients.agencyId, user.sub), eq(agencyClients.clientId, clientId)))
      .limit(1);

    if (!rel) return c.json({ message: "Client not found" }, 404);

    await db.transaction(async (tx) => {
      for (const [platform, perms] of Object.entries(permissions)) {
        const existing = await tx
          .select({ id: platformPermissions.id })
          .from(platformPermissions)
          .where(and(
            eq(platformPermissions.clientId, clientId),
            eq(platformPermissions.platform, platform as any),
          ))
          .limit(1);

        if (existing.length > 0) {
          await tx
            .update(platformPermissions)
            .set({
              commentsEnabled: perms.comments,
              messagesEnabled: perms.messages,
              updatedAt: new Date(),
            })
            .where(eq(platformPermissions.id, existing[0].id));
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

  return c.json({ message: "Unknown action" }, 400);
});

export default app;
