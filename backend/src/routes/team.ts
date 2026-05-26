import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";
import { db } from "../db/index.js";
import { teamMembers, internalNotes } from "../db/schema.js";
import { authMiddleware } from "../middleware/auth.js";

const app = new Hono();
app.use("*", authMiddleware);

// ── Team Members ──────────────────────────────────────────────────────────────

// GET /members — list all team members for user
app.get("/members", async (c) => {
  const user = c.get("user");
  const rows = await db
    .select()
    .from(teamMembers)
    .where(eq(teamMembers.userId, user.sub))
    .orderBy(desc(teamMembers.createdAt));
  return c.json(rows);
});

const memberSchema = z.object({
  name:  z.string().min(1),
  email: z.string().email(),
  role:  z.enum(["admin", "agent", "viewer"]).optional(),
});

// POST /members — create team member
app.post("/members", zValidator("json", memberSchema), async (c) => {
  const user = c.get("user");
  const body = c.req.valid("json");
  const [row] = await db
    .insert(teamMembers)
    .values({
      userId: user.sub,
      name:   body.name,
      email:  body.email,
      role:   body.role ?? "agent",
      status: "invited",
    })
    .returning();
  return c.json(row, 201);
});

// PUT /members/:id — update team member (ownership check)
app.put("/members/:id", zValidator("json", memberSchema.partial()), async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const body = c.req.valid("json");

  const [row] = await db
    .update(teamMembers)
    .set({
      ...(body.name  !== undefined && { name:  body.name }),
      ...(body.email !== undefined && { email: body.email }),
      ...(body.role  !== undefined && { role:  body.role }),
    })
    .where(and(eq(teamMembers.id, id), eq(teamMembers.userId, user.sub)))
    .returning();

  if (!row) return c.json({ message: "Not found" }, 404);
  return c.json(row);
});

// DELETE /members/:id — delete team member (ownership check)
app.delete("/members/:id", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  await db
    .delete(teamMembers)
    .where(and(eq(teamMembers.id, id), eq(teamMembers.userId, user.sub)));
  return c.json({ ok: true });
});

// ── Internal Notes ────────────────────────────────────────────────────────────

// GET /notes/:conversationId — list notes for a conversation
app.get("/notes/:conversationId", async (c) => {
  const user = c.get("user");
  const conversationId = c.req.param("conversationId");
  const rows = await db
    .select()
    .from(internalNotes)
    .where(
      and(
        eq(internalNotes.conversationId, conversationId),
        eq(internalNotes.userId, user.sub),
      ),
    )
    .orderBy(desc(internalNotes.createdAt));
  return c.json(rows);
});

const noteSchema = z.object({
  conversationId: z.string().min(1),
  content:        z.string().min(1),
  authorName:     z.string().min(1),
});

// POST /notes — create internal note
app.post("/notes", zValidator("json", noteSchema), async (c) => {
  const user = c.get("user");
  const body = c.req.valid("json");
  const [row] = await db
    .insert(internalNotes)
    .values({
      userId:         user.sub,
      conversationId: body.conversationId,
      content:        body.content,
      authorName:     body.authorName,
    })
    .returning();
  return c.json(row, 201);
});

// DELETE /notes/:id — delete note (ownership check)
app.delete("/notes/:id", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  await db
    .delete(internalNotes)
    .where(and(eq(internalNotes.id, id), eq(internalNotes.userId, user.sub)));
  return c.json({ ok: true });
});

export default app;
