import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { api } from "@/lib/api";
import { authStorage } from "@/lib/auth";
import type { User, LoginResponse } from "@/types";

interface AuthContextValue {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string, roleHint?: "client" | "agency") => Promise<User>;
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

  const login = useCallback(async (
    email: string,
    password: string,
    roleHint: "client" | "agency" = "client"
  ): Promise<User> => {
    setIsLoading(true);
    try {
      const data = await api.post<LoginResponse>("/auth/login", { email, password });
      authStorage.setToken(data.token);
      authStorage.setUser(data.user);
      setToken(data.token);
      setUser(data.user);
      return data.user;
    } catch (err) {
      // Demo fallback when n8n is not configured
      if (!import.meta.env.VITE_N8N_WEBHOOK_URL) {
        const demoUser: User = {
          id: "demo-1",
          email,
          role: roleHint,
          name: roleHint === "agency" ? "Roy Agency" : "مطعم الأصيل",
          businessName: roleHint === "agency" ? "Roy AI Agency" : "مطعم الأصيل",
        };
        authStorage.setToken("demo_token_" + Date.now());
        authStorage.setUser(demoUser);
        setToken("demo_token_" + Date.now());
        setUser(demoUser);
        return demoUser;
      }
      throw err;
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
