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

  return c.json({ globalBlocked: config?.globalBlocked ?? "" });
});

app.post("/config", zValidator("json", z.object({
  globalBlocked: z.string(),
})), async (c) => {
  const user = c.get("user");
  if (user.role !== "agency") return c.json({ message: "Forbidden" }, 403);

  const { globalBlocked } = c.req.valid("json");

  const [existing] = await db.select({ id: agencyConfig.id }).from(agencyConfig)
    .where(eq(agencyConfig.agencyId, user.sub)).limit(1);

  if (existing) {
    await db.update(agencyConfig)
      .set({ globalBlocked, updatedAt: new Date() })
      .where(eq(agencyConfig.id, existing.id));
  } else {
    await db.insert(agencyConfig).values({ agencyId: user.sub, globalBlocked });
  }

  return c.json({ ok: true });
});

export default app;
