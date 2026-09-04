import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { agencyConfig } from "../db/schema.js";
import { authMiddleware } from "../middleware/auth.js";

const app = new Hono();
app.use("*", authMiddleware);

app.get("/config", async (c) => {
  const user = c.get("user");
  if (user.role !== "agency") return c.json({ message: "Forbidden" }, 403);

  const [config] = await db.select().from(agencyConfig)
    .where(eq(agencyConfig.agencyId, user.sub)).limit(1);

  return c.json({
    globalBlocked: config?.globalBlocked ?? "",
    website:       config?.website ?? "",
    contactEmail:  config?.contactEmail ?? "",
    phone:         config?.phone ?? "",
  });
});

// Every field is optional so a caller can update just one section (AI control
// or contact info) without clobbering the other.
app.post("/config", zValidator("json", z.object({
  globalBlocked: z.string().optional(),
  website:       z.string().optional(),
  contactEmail:  z.string().optional(),
  phone:         z.string().optional(),
})), async (c) => {
  const user = c.get("user");
  if (user.role !== "agency") return c.json({ message: "Forbidden" }, 403);

  const body = c.req.valid("json");

  const [existing] = await db.select({ id: agencyConfig.id }).from(agencyConfig)
    .where(eq(agencyConfig.agencyId, user.sub)).limit(1);

  if (existing) {
    await db.update(agencyConfig)
      .set({
        ...(body.globalBlocked !== undefined && { globalBlocked: body.globalBlocked }),
        ...(body.website       !== undefined && { website:       body.website }),
        ...(body.contactEmail  !== undefined && { contactEmail:  body.contactEmail }),
        ...(body.phone         !== undefined && { phone:         body.phone }),
        updatedAt: new Date(),
      })
      .where(eq(agencyConfig.id, existing.id));
  } else {
    await db.insert(agencyConfig).values({
      agencyId:      user.sub,
      globalBlocked: body.globalBlocked ?? "",
      website:       body.website ?? "",
      contactEmail:  body.contactEmail ?? "",
      phone:         body.phone ?? "",
    });
  }

  return c.json({ ok: true });
});

export default app;
