import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { eq, and } from "drizzle-orm";
import { db } from "../db/index.js";
import { users, teamMembers, clientInvites, agencyClients } from "../db/schema.js";
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
// inviteToken is a 64-char hex secret generated at invite time; it is NOT the row ID.
// First login (invited → active) extends the token expiry by 30 days.
// Expired tokens return 401 — admin must delete and re-invite the member.
app.post("/team-login", zValidator("json", z.object({
  inviteToken: z.string().min(64),
})), async (c) => {
  const { inviteToken } = c.req.valid("json");

  const [member] = await db
    .select()
    .from(teamMembers)
    .where(eq(teamMembers.inviteToken, inviteToken))
    .limit(1);

  if (!member || member.status === "disabled") {
    return c.json({ message: "Invalid or expired invite link" }, 401);
  }

  if (!member.inviteExpiresAt || new Date() > member.inviteExpiresAt) {
    return c.json({ message: "This invite link has expired. Ask your admin for a new one." }, 401);
  }

  // Fetch owner's business info so the token looks the same as an owner token
  const [owner] = await db
    .select({ businessName: users.businessName, role: users.role })
    .from(users)
    .where(eq(users.id, member.userId))
    .limit(1);

  const jwtToken = signToken({
    sub:          member.id,
    role:         owner?.role ?? "client",
    name:         member.name,
    businessName: owner?.businessName ?? "",
    teamRole:     member.role,
    ownerId:      member.userId,
  });

  // First login: activate + extend expiry 30 days. Re-login: refresh expiry.
  const newExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await db
    .update(teamMembers)
    .set({
      status:          "active",
      inviteExpiresAt: newExpiry,
    })
    .where(eq(teamMembers.id, member.id));

  return c.json({
    token: jwtToken,
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

// POST /accept-invite — client follows invite link and sets their password
app.post("/accept-invite", zValidator("json", z.object({
  token:    z.string().min(1),
  password: z.string().min(8),
})), async (c) => {
  const { token, password } = c.req.valid("json");

  const [invite] = await db.select().from(clientInvites)
    .where(eq(clientInvites.token, token)).limit(1);

  if (!invite)         return c.json({ message: "Invalid invite link" }, 404);
  if (invite.usedAt)   return c.json({ message: "This invite link has already been used" }, 409);
  if (new Date() > invite.expiresAt) return c.json({ message: "This invite link has expired" }, 410);

  const passwordHash = await bcrypt.hash(password, 10);

  await db.transaction(async (tx) => {
    await tx.update(users).set({ passwordHash }).where(eq(users.id, invite.clientId));
    await tx.update(clientInvites).set({ usedAt: new Date() }).where(eq(clientInvites.id, invite.id));
    await tx.update(agencyClients)
      .set({ status: "active" })
      .where(and(eq(agencyClients.clientId, invite.clientId), eq(agencyClients.agencyId, invite.agencyId)));
  });

  return c.json({ ok: true });
});

export default app;
