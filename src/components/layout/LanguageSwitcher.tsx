import { useTranslation } from "react-i18next";
import { Globe } from "lucide-react";

const langs = [
  { code: "en", label: "EN", dir: "ltr" },
  { code: "ar", label: "عر", dir: "rtl" },
  { code: "es", label: "ES", dir: "ltr" },
] as const;

export function LanguageSwitcher() {
  const { i18n } = useTranslation();

  const change = (code: string, dir: string) => {
    i18n.changeLanguage(code);
    localStorage.setItem("sp-lang", code);
    document.documentElement.dir = dir;
    document.documentElement.lang = code;
  };

  return (
    <div className="flex items-center gap-1 bg-muted rounded-xl p-1">
      <Globe className="w-3.5 h-3.5 text-muted-foreground mx-1" />
      {langs.map((l) => (
        <button
          key={l.code}
          onClick={() => change(l.code, l.dir)}
          className={`px-2 py-1 rounded-lg text-xs font-semibold transition-colors ${
            i18n.language === l.code
              ? "bg-white shadow-sm text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}
