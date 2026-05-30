import { createMiddleware } from "hono/factory";
import { eq, and } from "drizzle-orm";
import { db } from "../db/index.js";
import { agencyClients } from "../db/schema.js";

/**
 * When an agency user sends `x-client-id: <uuid>`, this middleware verifies
 * they manage that client and overrides user.sub so all downstream route
 * handlers automatically scope their DB queries to the client's data.
 * No-op for client users or requests without the header.
 */
export const clientContextMiddleware = createMiddleware(async (c, next) => {
  const user = c.get("user");
  const clientId = c.req.header("x-client-id");

  if (clientId && user?.role === "agency") {
    const [rel] = await db
      .select({ clientId: agencyClients.clientId })
      .from(agencyClients)
      .where(
        and(
          eq(agencyClients.agencyId, user.sub),
          eq(agencyClients.clientId, clientId),
        ),
      )
      .limit(1);

    if (!rel) return c.json({ message: "Client not found or access denied" }, 403);

    // Override sub so all route handlers query this client's data transparently
    c.set("user", { ...user, sub: clientId });
  }

  await next();
});
