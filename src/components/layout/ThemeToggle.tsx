import { Sun, Moon, SunMoon } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { cn } from "@/lib/utils";

const OPTIONS = [
  { key: "light", icon: Sun,     label: "Light" },
  { key: "dark",  icon: Moon,    label: "Dark" },
  { key: "auto",  icon: SunMoon, label: "Auto" },
] as const;

export function ThemeToggle({ collapsed }: { collapsed?: boolean }) {
  const { theme, setTheme } = useTheme();

  if (collapsed) {
    const current = OPTIONS.find(o => o.key === theme) ?? OPTIONS[2];
    const Icon = current.icon;
    return (
      <button
        onClick={() => {
          const idx = OPTIONS.findIndex(o => o.key === theme);
          setTheme(OPTIONS[(idx + 1) % OPTIONS.length].key);
        }}
        className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground mx-auto block"
      >
        <Icon className="w-4 h-4" />
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1 bg-muted rounded-xl p-1">
      {OPTIONS.map(({ key, icon: Icon, label }) => (
        <button
          key={key}
          onClick={() => setTheme(key)}
          title={key === "auto" ? "Auto (day 6am–7pm / night 7pm–6am)" : label}
          className={cn(
            "flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-medium transition-colors",
            theme === key
              ? "bg-white dark:bg-card shadow-sm text-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Icon className="w-3 h-3" />
          {label}
        </button>
      ))}
    </div>
  );
}
