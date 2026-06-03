import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { api, registerUnauthorizedHandler } from "@/lib/api";
import { authStorage } from "@/lib/auth";
import type { User, LoginResponse } from "@/types";

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<User>;
  teamLogin: (inviteToken: string) => Promise<User>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(authStorage.getUser());
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    registerUnauthorizedHandler(() => {
      setUser(null);
      window.location.replace("/login");
    });
  }, []);

  const login = useCallback(async (
    email: string,
    password: string,
  ): Promise<User> => {
    setIsLoading(true);

    try {
      const data = await api.post<LoginResponse>("/auth/login", { email, password });
      // Token is set as httpOnly cookie by the server — only store user info
      authStorage.setUser(data.user);
      authStorage.setDemoMode(false);
      setUser(data.user);
      return data.user;
    } catch (err) {
      // Demo fallback only available in development builds
      if (import.meta.env.DEV) {
        const DEMO_PLATFORM_PERMISSIONS: User["platformPermissions"] = {
          tiktok:    { comments: true,  messages: false },
          instagram: { comments: true,  messages: true  },
          facebook:  { comments: true,  messages: true  },
          whatsapp:  { comments: false, messages: true  },
          sms:       { comments: false, messages: true  },
          phone:     { comments: false, messages: false },
        };

        const DEMO_ACCOUNTS: Record<string, { password: string; role: "client" | "agency"; name: string; businessName: string }> = {
          "client@demo.com": { password: "demo123", role: "client", name: "Demo Business", businessName: "Raleigh Eats" },
          "agency@demo.com": { password: "demo123", role: "agency", name: "Roy Agency",    businessName: "Roy AI Agency" },
        };

        const demo = DEMO_ACCOUNTS[email.toLowerCase()];
        if (demo && password === demo.password) {
          const demoUser: User = {
            id: "demo-" + demo.role,
            email,
            role: demo.role,
            name: demo.name,
            businessName: demo.businessName,
            platformPermissions: demo.role === "client" ? DEMO_PLATFORM_PERMISSIONS : undefined,
          };
          authStorage.setUser(demoUser);
          authStorage.setDemoMode(true);
          setUser(demoUser);
          return demoUser;
        }
      }
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const teamLogin = useCallback(async (inviteToken: string): Promise<User> => {
    setIsLoading(true);
    try {
      const data = await api.post<LoginResponse>("/auth/team-login", { inviteToken });
      authStorage.setUser(data.user);
      authStorage.setDemoMode(false);
      setUser(data.user);
      return data.user;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    // Clear the httpOnly cookie server-side (fire-and-forget — local state is cleared regardless)
    if (!authStorage.isDemoMode()) {
      api.post("/auth/logout").catch(() => {});
    }
    authStorage.clear();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        teamLogin,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
