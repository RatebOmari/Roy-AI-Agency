import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { db } from "../db/index.js";
import { platformCredentials } from "../db/schema.js";
import { authMiddleware } from "../middleware/auth.js";

const app = new Hono();
app.use("*", authMiddleware);

const connectSchema = z.object({
  platform: z.enum(["tiktok", "instagram", "facebook", "whatsapp", "sms", "phone"]),
  feature:  z.enum(["comments", "messages"]).optional().default("comments"),
});

app.post("/connect", zValidator("json", connectSchema), async (c) => {
  const { platform, feature } = c.req.valid("json");
  // Phase 2: Real OAuth redirect URL returned here
  // For now, return stub
  return c.json({
    connected: false,
    message:   `OAuth for ${platform} ${feature} will be available in Phase 2`,
  });
});

app.post("/disconnect", zValidator("json", connectSchema), async (c) => {
  const user = c.get("user");
  const { platform, feature } = c.req.valid("json");

  await db
    .delete(platformCredentials)
    .where(and(
      eq(platformCredentials.userId, user.sub),
      eq(platformCredentials.platform, platform),
      eq(platformCredentials.feature, feature),
    ));

  return c.json({ ok: true });
});

export default app;
