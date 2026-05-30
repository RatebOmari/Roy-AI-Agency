import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { brandSettings } from "../db/schema.js";
import { authMiddleware } from "../middleware/auth.js";
import { clientContextMiddleware } from "../middleware/clientContext.js";

const app = new Hono();
app.use("*", authMiddleware);
app.use("*", clientContextMiddleware);

app.get("/", async (c) => {
  const user = c.get("user");
  const [row] = await db
    .select()
    .from(brandSettings)
    .where(eq(brandSettings.userId, user.sub))
    .limit(1);
  return c.json({ imageStyle: row?.imageStyle ?? "" });
});

const brandSchema = z.object({
  imageStyle: z.string(),
});

app.post("/", zValidator("json", brandSchema), async (c) => {
  const user = c.get("user");
  const { imageStyle } = c.req.valid("json");

  const existing = await db
    .select({ id: brandSettings.id })
    .from(brandSettings)
    .where(eq(brandSettings.userId, user.sub))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(brandSettings)
      .set({ imageStyle, updatedAt: new Date() })
      .where(eq(brandSettings.userId, user.sub));
  } else {
    await db.insert(brandSettings).values({ userId: user.sub, imageStyle });
  }

  return c.json({ ok: true });
});

export default app;
