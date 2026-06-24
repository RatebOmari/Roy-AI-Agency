import type { Context, Next } from "hono";
import { createMiddleware } from "hono/factory";
import { getCookie } from "hono/cookie";
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
  // Prefer httpOnly cookie; fall back to Authorization header (API clients, demo mode)
  let token: string | undefined = getCookie(c, "sp_token");
  if (!token) {
    const authHeader = c.req.header("authorization");
    if (authHeader?.startsWith("Bearer ")) token = authHeader.slice(7);
  }

  if (!token) return c.json({ message: "Unauthorized" }, 401);

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
