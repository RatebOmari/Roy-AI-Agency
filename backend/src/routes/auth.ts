import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";
import { signToken } from "../middleware/auth.js";

const app = new Hono();

const loginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(1),
});

app.post("/login", zValidator("json", loginSchema), async (c) => {
  const { email, password } = c.req.valid("json");

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email.toLowerCase()))
    .limit(1);

  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return c.json({ message: "Invalid email or password" }, 401);
  }

  const token = signToken({
    sub: user.id,
    role: user.role,
    name: user.name,
    businessName: user.businessName,
  });

  return c.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      businessName: user.businessName,
    },
  });
});

export default app;
