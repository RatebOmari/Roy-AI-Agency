import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, and, ilike, count } from "drizzle-orm";
import { db } from "../db/index.js";
import { contacts } from "../db/schema.js";
import { authMiddleware } from "../middleware/auth.js";
import { clientContextMiddleware } from "../middleware/clientContext.js";

const app = new Hono();
app.use("*", authMiddleware);
app.use("*", clientContextMiddleware);

function parseJSON<T>(raw: string, fallback: T): T {
  try { return JSON.parse(raw) as T; } catch { return fallback; }
}

function serializeContact(row: typeof contacts.$inferSelect) {
  return {
    id:                 row.id,
    name:               row.name,
    phone:              row.phone ?? undefined,
    email:              row.email ?? undefined,
    handles:            parseJSON<{ channel: string; username: string }[]>(row.handles, []),
    tags:               parseJSON<string[]>(row.tags, []),
    notes:              row.notes,
    totalConversations: row.totalConversations,
    lastSeenAt:         row.lastSeenAt.toISOString(),
  };
}

// GET / — list contacts (optional ?search=, ?tag=, ?platform=, ?page=1, ?limit=50)
app.get("/", async (c) => {
  const user      = c.get("user");
  const search    = c.req.query("search")   ?? "";
  const tagFilter = c.req.query("tag")      ?? "";
  const platform  = c.req.query("platform") ?? "";
  const page      = Math.max(1, parseInt(c.req.query("page")  ?? "1"));
  const limit     = Math.min(100, Math.max(1, parseInt(c.req.query("limit") ?? "50")));
  const offset    = (page - 1) * limit;

  // Load all scoped rows for in-memory filter (search/tag/platform use JSON text fields)
  let rows = await db
    .select()
    .from(contacts)
    .where(eq(contacts.userId, user.sub))
    .orderBy(contacts.lastSeenAt);

  if (search) {
    const lower = search.toLowerCase();
    rows = rows.filter(r =>
      r.name.toLowerCase().includes(lower) ||
      r.phone?.includes(search) ||
      r.email?.toLowerCase().includes(lower) ||
      parseJSON<{ username: string }[]>(r.handles, []).some(h => h.username.toLowerCase().includes(lower))
    );
  }
  if (tagFilter) {
    rows = rows.filter(r => parseJSON<string[]>(r.tags, []).includes(tagFilter));
  }
  if (platform) {
    rows = rows.filter(r =>
      parseJSON<{ channel: string }[]>(r.handles, []).some(h => h.channel.includes(platform))
    );
  }

  rows.reverse(); // newest first
  const total   = rows.length;
  const pageRows = rows.slice(offset, offset + limit);

  return c.json({
    data: pageRows.map(serializeContact),
    pagination: { page, limit, total, hasMore: offset + pageRows.length < total },
  });
});

// GET /:id
app.get("/:id", async (c) => {
  const user = c.get("user");
  const { id } = c.req.param();
  const [row] = await db
    .select()
    .from(contacts)
    .where(and(eq(contacts.id, id), eq(contacts.userId, user.sub)))
    .limit(1);
  if (!row) return c.json({ message: "Contact not found" }, 404);
  return c.json(serializeContact(row));
});

// PATCH /:id — update notes and tags
const patchSchema = z.object({
  notes: z.string().optional(),
  tags:  z.array(z.string()).optional(),
  name:  z.string().min(1).optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
});

app.patch("/:id", zValidator("json", patchSchema), async (c) => {
  const user = c.get("user");
  const { id } = c.req.param();
  const body = c.req.valid("json");

  const updateData: Record<string, unknown> = {};
  if (body.notes !== undefined) updateData.notes = body.notes;
  if (body.tags  !== undefined) updateData.tags  = JSON.stringify(body.tags);
  if (body.name  !== undefined) updateData.name  = body.name;
  if (body.phone !== undefined) updateData.phone = body.phone;
  if (body.email !== undefined) updateData.email = body.email;

  const [updated] = await db
    .update(contacts)
    .set(updateData)
    .where(and(eq(contacts.id, id), eq(contacts.userId, user.sub)))
    .returning();

  if (!updated) return c.json({ message: "Contact not found" }, 404);
  return c.json(serializeContact(updated));
});

// DELETE /:id
app.delete("/:id", async (c) => {
  const user = c.get("user");
  const { id } = c.req.param();

  const [deleted] = await db
    .delete(contacts)
    .where(and(eq(contacts.id, id), eq(contacts.userId, user.sub)))
    .returning();

  if (!deleted) return c.json({ message: "Contact not found" }, 404);
  return c.json({ ok: true });
});

export default app;
