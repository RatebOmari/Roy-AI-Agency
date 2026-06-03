import type { Context, Next } from "hono";
import { createMiddleware } from "hono/factory";

// In-memory sliding-window rate limiter keyed by userId + route path.
// Timestamps older than the window are pruned on each request.
const windows = new Map<string, number[]>();

export function rateLimit(maxRequests: number, windowMs: number) {
  return createMiddleware(async (c: Context, next: Next) => {
    const user = c.get("user");
    if (!user) return next();

    const key = `${user.sub}:${c.req.path}`;
    const now = Date.now();
    const cutoff = now - windowMs;

    const timestamps = (windows.get(key) ?? []).filter(t => t > cutoff);

    if (timestamps.length >= maxRequests) {
      const retryAfterMs = timestamps[0] - cutoff;
      c.header("Retry-After", String(Math.ceil(retryAfterMs / 1000)));
      return c.json(
        { message: "Too many requests — please wait before generating again." },
        429,
      );
    }

    timestamps.push(now);
    windows.set(key, timestamps);
    await next();
  });
}

// Convenience: 10 AI-generate calls per user per minute
export const aiRateLimit = rateLimit(10, 60_000);

// Strict: 2 outreach sends per user per minute (prevents accidental mass-send spam)
export const outreachSendRateLimit = rateLimit(2, 60_000);
