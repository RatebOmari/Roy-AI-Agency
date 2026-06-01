import type { AgencyClient } from "./useClients";

const DEMO_HEALTH: Record<string, number> = {
  "1": 88,
  "2": 74,
  "3": 52,
  "4": 65,
  "5": 28,
};

export function computeHealthScore(client: AgencyClient): number {
  if (client.id in DEMO_HEALTH) return DEMO_HEALTH[client.id];
  let score = 50;
  if (client.status === "active") score += 15;
  if (client.status === "setup")  score -= 25;
  score += Math.min(25, Math.floor(client.replies / 15));
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function healthColor(score: number): "green" | "amber" | "red" {
  if (score >= 80) return "green";
  if (score >= 50) return "amber";
  return "red";
}
