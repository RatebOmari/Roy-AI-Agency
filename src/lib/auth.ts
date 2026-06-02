import type { User } from "@/types";

const USER_KEY  = "sp_user";
// Sentinel flag: "1" when running in demo mode so the API client
// knows no real httpOnly cookie exists and should suppress auto-logout on 401.
const DEMO_FLAG = "sp_demo";

export const authStorage = {
  getUser(): User | null {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try { return JSON.parse(raw) as User; } catch { return null; }
  },
  setUser(user: User): void {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  removeUser(): void {
    localStorage.removeItem(USER_KEY);
  },
  isDemoMode(): boolean {
    return localStorage.getItem(DEMO_FLAG) === "1";
  },
  setDemoMode(on: boolean): void {
    if (on) localStorage.setItem(DEMO_FLAG, "1");
    else    localStorage.removeItem(DEMO_FLAG);
  },
  clear(): void {
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(DEMO_FLAG);
  },
};
