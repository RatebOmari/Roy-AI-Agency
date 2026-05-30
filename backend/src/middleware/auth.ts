import type { Context, Next } from "hono";
import { createMiddleware } from "hono/factory";
import jwt from "jsonwebtoken";

export interface JwtPayload {
  sub:          string;
  role:         "client" | "agency";
  name:         string;
  businessName: string;
  // Present only for team member tokens — ownerId is the account owner's userId
  teamRole?:    "admin" | "agent" | "viewer";
  ownerId?:     string;
  iat:          number;
  exp:          number;
}

declare module "hono" {
  interface ContextVariableMap {
    user: JwtPayload;
  }
}

export const authMiddleware = createMiddleware(async (c: Context, next: Next) => {
  const authHeader = c.req.header("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return c.json({ message: "Unauthorized" }, 401);
  }

  const token = authHeader.slice(7);
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET not set");

  try {
    const payload = jwt.verify(token, secret) as JwtPayload;
    c.set("user", payload);
    await next();
  } catch {
    return c.json({ message: "Invalid or expired token" }, 401);
  }
});

export function signToken(payload: Omit<JwtPayload, "iat" | "exp">) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET not set");
  return jwt.sign(payload, secret, { expiresIn: "7d" });
}
