import { useTranslation } from "react-i18next";
import { Globe } from "lucide-react";
import { cn } from "@/lib/utils";

const langs = [
  { code: "en", label: "EN", fullLabel: "English",  dir: "ltr" },
  { code: "ar", label: "عر", fullLabel: "العربية",  dir: "rtl" },
  { code: "es", label: "ES", fullLabel: "Español",  dir: "ltr" },
] as const;

interface LanguageSwitcherProps {
  expanded?: boolean;
}

export function LanguageSwitcher({ expanded }: LanguageSwitcherProps) {
  const { i18n } = useTranslation();

  const change = (code: string) => {
    i18n.changeLanguage(code);
    localStorage.setItem("sp-lang", code);
    document.documentElement.lang = code;
    document.documentElement.dir  = langs.find(l => l.code === code)?.dir ?? "ltr";
  };

  if (expanded) {
    return (
      <div className="flex flex-col gap-2">
        {langs.map((l) => {
          const isActive = i18n.language === l.code;
          return (
            <button
              key={l.code}
              onClick={() => change(l.code)}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium transition-colors text-left",
                isActive
                  ? "bg-primary/10 border-primary text-primary"
                  : "bg-muted border-transparent text-foreground hover:border-border"
              )}
            >
              <span className="text-base w-6 text-center">{l.code === "ar" ? "🇸🇦" : l.code === "es" ? "🇪🇸" : "🇺🇸"}</span>
              <span>{l.fullLabel}</span>
              {isActive && <span className="ml-auto text-xs text-primary font-semibold">Active</span>}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 bg-muted rounded-xl p-1">
      <Globe className="w-3.5 h-3.5 text-muted-foreground mx-1" />
      {langs.map((l) => (
        <button
          key={l.code}
          onClick={() => change(l.code)}
          className={`px-2 py-1 rounded-lg text-xs font-semibold transition-colors ${
            i18n.language === l.code
              ? "bg-white shadow-sm text-foreground dark:bg-card"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}
