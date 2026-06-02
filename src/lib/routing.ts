/** Single source of truth for post-login landing routes. */
export function homeRoute(user: { role: string; teamRole?: string }): string {
  if (user.role === "agency")        return "/agency/dashboard";
  if (user.teamRole === "agent")     return "/inbox";
  if (user.teamRole === "viewer")    return "/analytics";
  return "/dashboard";
}
