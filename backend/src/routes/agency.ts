import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { agencyConfig } from "../db/schema.js";
import { authMiddleware } from "../middleware/auth.js";
import { aiRateLimit } from "../middleware/rateLimit.js";
import { generateModeratedReply, LANGUAGE_INSTRUCTION } from "../lib/aiModeration.js";

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

// ── POST /onboarding/test-reply — verify AI setup for a client being onboarded ─
// The onboarding wizard's final step calls this. It previously had no server
// implementation at all, so the UI always fell back to a fabricated "success".

app.post("/onboarding/test-reply", aiRateLimit, zValidator("json", z.object({
  platform:     z.string(),
  message:      z.string().min(1).max(2000),
  tone:         z.string().optional(),
  extra:        z.string().optional(),
  businessName: z.string().optional(),
  description:  z.string().optional(),
})), async (c) => {
  const user = c.get("user");
  if (user.role !== "agency") return c.json({ message: "Forbidden" }, 403);

  const { platform, message, tone, extra, businessName, description } = c.req.valid("json");

  const systemParts = [
    `You are an AI customer support assistant replying on behalf of ${businessName || "a business"} on ${platform}.`,
    description ? `About the business: ${description}` : "",
    `Tone: ${tone || "friendly"}.`,
    LANGUAGE_INSTRUCTION,
    extra ? `Additional business instructions: ${extra}` : "",
    `\nAfter writing your reply, rate your confidence (0-100) that it is accurate and helpful.`,
    `Return ONLY valid JSON: { "reply": "<your reply>", "confidence": <integer 0-100> }`,
  ].filter(Boolean);

  const { reply, confidence } = await generateModeratedReply({
    system:        systemParts.join("\n"),
    messages:      [{ role: "user", content: message }],
    maxTokens:     256,
    fallbackReply: "Thanks for reaching out! We'll get back to you shortly.",
    demoReplies:   [
      "Thanks for reaching out! We'd be happy to help — could you share a few more details?",
      "Hi there! Appreciate you contacting us. We'll follow up shortly.",
    ],
  });

  // Tell the UI whether this was a real model call, so the wizard can't imply
  // the AI is configured when it is only echoing demo text.
  return c.json({ reply, confidence, demo: !process.env.ANTHROPIC_API_KEY });
});

export default app;
