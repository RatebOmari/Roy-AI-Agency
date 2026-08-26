import { createMiddleware } from "hono/factory";

/** Rejects any request whose authenticated user is not an agency operator. */
export const agencyOnly = createMiddleware(async (c, next) => {
  if (c.get("user").role !== "agency") {
    return c.json({ message: "Agency access required" }, 403);
  }
  await next();
});

/** Rejects any request whose authenticated user is not a client. */
export const clientOnly = createMiddleware(async (c, next) => {
  if (c.get("user").role !== "client") {
    return c.json({ message: "Client access required" }, 403);
  }
  await next();
});
