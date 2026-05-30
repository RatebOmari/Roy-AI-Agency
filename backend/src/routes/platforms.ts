import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { db } from "../db/index.js";
import { platformCredentials } from "../db/schema.js";
import { authMiddleware } from "../middleware/auth.js";
import { clientContextMiddleware } from "../middleware/clientContext.js";
import { encryptToken } from "../lib/crypto.js";

const app = new Hono();
app.use("*", authMiddleware);
app.use("*", clientContextMiddleware);

const connectSchema = z.object({
  platform:    z.enum(["tiktok", "instagram", "facebook", "whatsapp", "sms", "phone"]),
  feature:     z.enum(["comments", "messages"]).optional().default("comments"),
  accessToken: z.string().min(1),
  expiresAt:   z.string().datetime().optional(),
});

app.post("/connect", zValidator("json", connectSchema), async (c) => {
  const user = c.get("user");
  const { platform, feature, accessToken, expiresAt } = c.req.valid("json");

  // Delete any existing credential for this user/platform/feature, then insert fresh.
  await db
    .delete(platformCredentials)
    .where(and(
      eq(platformCredentials.userId, user.sub),
      eq(platformCredentials.platform, platform),
      eq(platformCredentials.feature, feature),
    ));

  await db
    .insert(platformCredentials)
    .values({
      userId:         user.sub,
      platform,
      feature,
      accessTokenEnc: encryptToken(accessToken),
      expiresAt:      expiresAt ? new Date(expiresAt) : null,
      connectedAt:    new Date(),
    });

  return c.json({ connected: true, platform, feature });
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
