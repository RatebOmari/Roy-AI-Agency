import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { api, registerUnauthorizedHandler } from "@/lib/api";
import { authStorage } from "@/lib/auth";
import type { User, LoginResponse } from "@/types";

interface AuthContextValue {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<User>;
  teamLogin: (memberId: string) => Promise<User>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(authStorage.getUser());
  const [token, setToken] = useState<string | null>(authStorage.getToken());
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const savedToken = authStorage.getToken();
    const savedUser = authStorage.getUser();
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(savedUser);
    }
  }, []);

  useEffect(() => {
    registerUnauthorizedHandler(() => {
      setToken(null);
      setUser(null);
      window.location.replace("/login");
    });
  }, []);

  const login = useCallback(async (
    email: string,
    password: string,
  ): Promise<User> => {
    setIsLoading(true);

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
      "agency@demo.com": { password: "demo123", role: "agency", name: "Roy Agency", businessName: "Roy AI Agency" },
    };

    try {
      const data = await api.post<LoginResponse>("/auth/login", { email, password });
      authStorage.setToken(data.token);
      authStorage.setUser(data.user);
      setToken(data.token);
      setUser(data.user);
      return data.user;
    } catch (err) {
      // Always fall back to demo credentials if backend is unavailable or creds don't match
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
        const demoToken = "demo_token_" + Date.now();
        authStorage.setToken(demoToken);
        authStorage.setUser(demoUser);
        setToken(demoToken);
        setUser(demoUser);
        return demoUser;
      }
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const teamLogin = useCallback(async (memberId: string): Promise<User> => {
    setIsLoading(true);
    try {
      const data = await api.post<LoginResponse>("/auth/team-login", { memberId });
      authStorage.setToken(data.token);
      authStorage.setUser(data.user);
      setToken(data.token);
      setUser(data.user);
      return data.user;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    authStorage.clear();
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
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
