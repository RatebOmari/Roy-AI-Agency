import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

type Theme = "light" | "dark" | "auto";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (t: Theme) => void;
  resolvedTheme: "light" | "dark";
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function resolveAutoTheme(): "light" | "dark" {
  const hour = new Date().getHours();
  if (hour >= 19 || hour < 6) return "dark";
  return "light";
}

function applyTheme(theme: Theme) {
  const resolved = theme === "auto" ? resolveAutoTheme() : theme;
  document.documentElement.classList.toggle("dark", resolved === "dark");
  return resolved;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    return (localStorage.getItem("sp-theme") as Theme) ?? "auto";
  });
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("light");

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    localStorage.setItem("sp-theme", t);
    const resolved = applyTheme(t);
    setResolvedTheme(resolved);
  }, []);

  useEffect(() => {
    const resolved = applyTheme(theme);
    setResolvedTheme(resolved);
    // Re-check auto every minute
    if (theme === "auto") {
      const interval = setInterval(() => {
        const r = applyTheme("auto");
        setResolvedTheme(r);
      }, 60_000);
      return () => clearInterval(interval);
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be inside ThemeProvider");
  return ctx;
}
