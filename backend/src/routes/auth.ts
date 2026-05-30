import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { users, teamMembers } from "../db/schema.js";
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

// POST /team-login — team member login via invite token
// The invite token is the team member's record ID (UUID) — sent in the invite email.
// In production, add a separate short-lived invite_token column + expiry.
app.post("/team-login", zValidator("json", z.object({
  memberId: z.string().uuid(),
})), async (c) => {
  const { memberId } = c.req.valid("json");

  const [member] = await db
    .select()
    .from(teamMembers)
    .where(eq(teamMembers.id, memberId))
    .limit(1);

  if (!member || member.status === "disabled") {
    return c.json({ message: "Invalid or expired invite" }, 401);
  }

  // Fetch owner's business info so the token looks the same as an owner token
  const [owner] = await db
    .select({ businessName: users.businessName, role: users.role })
    .from(users)
    .where(eq(users.id, member.userId))
    .limit(1);

  const token = signToken({
    sub:          member.id,
    role:         owner?.role ?? "client",
    name:         member.name,
    businessName: owner?.businessName ?? "",
    teamRole:     member.role,
    ownerId:      member.userId,
  });

  // Mark member as active on first login
  if (member.status === "invited") {
    await db
      .update(teamMembers)
      .set({ status: "active" })
      .where(eq(teamMembers.id, member.id));
  }

  return c.json({
    token,
    user: {
      id:           member.id,
      name:         member.name,
      email:        member.email,
      role:         owner?.role ?? "client",
      teamRole:     member.role,
      businessName: owner?.businessName ?? "",
    },
  });
});

export default app;
