import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { db } from "../db/index.js";
import { toneSettings } from "../db/schema.js";
import { authMiddleware } from "../middleware/auth.js";
import { clientContextMiddleware } from "../middleware/clientContext.js";

const app = new Hono();
app.use("*", authMiddleware);
app.use("*", clientContextMiddleware);

const platformSettingsSchema = z.object({
  tone:     z.enum(["friendly", "professional", "fun", "informative"]),
  language: z.enum(["ar", "en", "ar_en"]),
  blocked:  z.string(),
  extra:    z.string(),
});

const settingsSchema = z.object({
  tiktok:    platformSettingsSchema,
  instagram: platformSettingsSchema,
  facebook:  platformSettingsSchema,
  whatsapp:  platformSettingsSchema,
});

const PLATFORMS = ["tiktok", "instagram", "facebook", "whatsapp"] as const;

app.get("/", async (c) => {
  const user = c.get("user");
  const rows = await db
    .select()
    .from(toneSettings)
    .where(eq(toneSettings.userId, user.sub));

  const defaults = {
    tone: "friendly" as const,
    language: "ar" as const,
    blocked: "",
    extra: "",
  };

  const result = Object.fromEntries(
    PLATFORMS.map((p) => {
      const row = rows.find((r) => r.platform === p);
      return [
        p,
        row
          ? { tone: row.tone, language: row.language, blocked: row.blockedWords, extra: row.extra }
          : defaults,
      ];
    })
  );

  return c.json(result);
});

app.post("/", zValidator("json", settingsSchema), async (c) => {
  const user = c.get("user");
  const body = c.req.valid("json");

  await db.transaction(async (tx) => {
    for (const platform of PLATFORMS) {
      const cfg = body[platform];
      const existing = await tx
        .select({ id: toneSettings.id })
        .from(toneSettings)
        .where(and(eq(toneSettings.userId, user.sub), eq(toneSettings.platform, platform)))
        .limit(1);

      if (existing.length > 0) {
        await tx
          .update(toneSettings)
          .set({
            tone: cfg.tone,
            language: cfg.language,
            blockedWords: cfg.blocked,
            extra: cfg.extra,
            updatedAt: new Date(),
          })
          .where(and(eq(toneSettings.userId, user.sub), eq(toneSettings.platform, platform)));
      } else {
        await tx.insert(toneSettings).values({
          userId:       user.sub,
          platform,
          tone:         cfg.tone,
          language:     cfg.language,
          blockedWords: cfg.blocked,
          extra:        cfg.extra,
        });
      }
    }
  });

  return c.json({ ok: true });
});

export default app;
