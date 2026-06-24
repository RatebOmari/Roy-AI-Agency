import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { db } from "../db/index.js";
import { resources } from "../db/schema.js";
import { authMiddleware } from "../middleware/auth.js";
import { clientContextMiddleware } from "../middleware/clientContext.js";

const app = new Hono();
app.use("*", authMiddleware);
app.use("*", clientContextMiddleware);

// GET / — list all resources for user
app.get("/", async (c) => {
  const user = c.get("user");
  const rows = await db
    .select()
    .from(resources)
    .where(eq(resources.userId, user.sub))
    .orderBy(resources.createdAt);
  return c.json(rows);
});

const resourceSchema = z.object({
  type:    z.enum(["info", "hours", "menu_item", "offer", "document", "faq"]),
  title:   z.string().default(""),
  content: z.string().default("{}"),
  fileUrl: z.string().nullable().optional(),
  active:  z.boolean().optional(),
});

// POST / — create resource
app.post("/", zValidator("json", resourceSchema), async (c) => {
  const user = c.get("user");
  const body = c.req.valid("json");
  const [row] = await db
    .insert(resources)
    .values({
      userId:  user.sub,
      type:    body.type,
      title:   body.title,
      content: body.content,
      fileUrl: body.fileUrl ?? null,
      active:  body.active ?? true,
    })
    .returning();
  return c.json(row, 201);
});

// PUT /:id — update resource
app.put("/:id", zValidator("json", resourceSchema.partial()), async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const body = c.req.valid("json");
  const now = new Date();

  const [row] = await db
    .update(resources)
    .set({
      ...(body.type    !== undefined && { type: body.type }),
      ...(body.title   !== undefined && { title: body.title }),
      ...(body.content !== undefined && { content: body.content }),
      ...(body.fileUrl !== undefined && { fileUrl: body.fileUrl }),
      ...(body.active  !== undefined && { active: body.active }),
      updatedAt: now,
    })
    .where(and(eq(resources.id, id), eq(resources.userId, user.sub)))
    .returning();

  if (!row) return c.json({ message: "Not found" }, 404);
  return c.json(row);
});

// DELETE /:id — delete resource
app.delete("/:id", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  await db
    .delete(resources)
    .where(and(eq(resources.id, id), eq(resources.userId, user.sub)));
  return c.json({ ok: true });
});

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
]);

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB

// POST /upload — save document to disk, return accessible URL
app.post("/upload", async (c) => {
  const body = await c.req.parseBody();
  const file = body["file"] as File | undefined;
  if (!file) return c.json({ message: "No file provided" }, 400);

  if (file.size > MAX_UPLOAD_BYTES) {
    return c.json({ message: "File too large — maximum size is 10 MB" }, 413);
  }

  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return c.json({ message: "File type not allowed" }, 415);
  }

  // Sanitise filename — keep only safe characters
  const safeName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const uploadsDir = join(process.cwd(), "uploads");

  await mkdir(uploadsDir, { recursive: true });
  await writeFile(join(uploadsDir, safeName), Buffer.from(await file.arrayBuffer()));

  return c.json({ url: `/uploads/${safeName}`, name: file.name, size: file.size });
});

export default app;
