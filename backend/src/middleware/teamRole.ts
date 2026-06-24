/**
 * teamRole.ts
 *
 * Enforces team member role permissions on protected routes.
 *
 * Roles (from most to least privileged):
 *   admin  — full access (same as the account owner)
 *   agent  — can respond to and read conversations; cannot manage team/settings
 *   viewer — read-only on conversations/analytics; cannot write or respond
 *
 * Usage:
 *   app.delete("/members/:id", requireTeamRole(["admin"]), handler);
 *   app.post("/generate-reply", requireTeamRole(["admin", "agent"]), handler);
 *
 * Non-team JWTs (no teamRole field) always pass through — they belong to the
 * account owner who has unrestricted access.
 */

import type { Context, Next } from "hono";

type TeamRole = "admin" | "agent" | "viewer";

export function requireTeamRole(allowedRoles: TeamRole[]) {
  return async (c: Context, next: Next) => {
    const user = c.get("user");

    // Account owners have no teamRole — always allowed
    if (!user.teamRole) {
      await next();
      return;
    }

    if (!allowedRoles.includes(user.teamRole)) {
      return c.json(
        { message: `Forbidden: requires role ${allowedRoles.join(" or ")}` },
        403,
      );
    }

    await next();
  };
}

/** Convenience: block viewer-only tokens from write operations. */
export const requireNotViewer = requireTeamRole(["admin", "agent"]);

/** Convenience: admin-only operations (team management, settings). */
export const requireAdmin = requireTeamRole(["admin"]);
