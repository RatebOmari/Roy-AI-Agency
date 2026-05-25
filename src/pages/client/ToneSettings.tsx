import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { AppLayout } from "@/components/layout/AppLayout";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { CheckCircle2, Loader2, Bell } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useSettings, useSaveSettings } from "@/hooks/useSettings";
import type { ToneSettingsMap, PlatformSettings } from "@/types";
import type { Platform } from "@/types";

const AI_PLATFORMS: { id: Platform; label: string }[] = [
  { id: "tiktok",    label: "TikTok" },
  { id: "instagram", label: "Instagram" },
  { id: "facebook",  label: "Facebook" },
  { id: "whatsapp",  label: "WhatsApp" },
];

const toneKeys = ["friendly", "professional", "fun", "informative"] as const;
const languageKeys = ["ar", "en", "ar_en"] as const;

const defaultConfig: PlatformSettings = { tone: "friendly", language: "ar", blocked: "", extra: "" };

type TabKey = "ai" | "appearance" | "notifications";

const TABS: { key: TabKey; label: string }[] = [
  { key: "ai",            label: "AI Settings" },
  { key: "appearance",    label: "Appearance" },
  { key: "notifications", label: "Notifications" },
];

export default function ToneSettings() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { data: serverSettings, isLoading } = useSettings();
  const saveMutation = useSaveSettings();

  const [tab, setTab] = useState<TabKey>("ai");
  const [active, setActive] = useState<Platform>("tiktok");
  const [saved, setSaved] = useState(false);
  const [configs, setConfigs] = useState<ToneSettingsMap>({
    tiktok:    { ...defaultConfig },
    instagram: { ...defaultConfig },
    facebook:  { ...defaultConfig, tone: "professional" },
    whatsapp:  { ...defaultConfig, tone: "informative" },
  });

  useEffect(() => {
    if (serverSettings) setConfigs(serverSettings);
  }, [serverSettings]);

  const cfg = configs[active];
  const update = (field: keyof PlatformSettings, val: string) =>
    setConfigs(p => ({ ...p, [active]: { ...p[active], [field]: val } }));

  const handleSave = async () => {
    await saveMutation.mutateAsync(configs);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <AppLayout role="client" businessName={user?.businessName ?? "SocialPilot"}>
      <div className="space-y-6 max-w-2xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-bold text-foreground">Settings</h1>
          <p className="text-sm text-muted-foreground">Manage your account preferences</p>
        </motion.div>

        {/* Tab bar */}
        <div className="flex gap-1 bg-muted p-1 rounded-xl w-fit">
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === key
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* AI Settings tab */}
        {tab === "ai" && (
          <motion.div key="ai" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex gap-2 flex-wrap mb-6">
              {AI_PLATFORMS.map(p => (
                <button key={p.id} onClick={() => setActive(p.id)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${active === p.id ? "bg-primary text-white border-primary" : "bg-card border-border text-muted-foreground hover:border-primary/40"}`}>
                  {p.label}
                </button>
              ))}
            </div>

            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : (
              <motion.div key={active} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="bg-card rounded-2xl border border-border p-6 shadow-sm space-y-6"
              >
                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground">{t("settings.toneLabel")}</p>
                  <div className="grid grid-cols-2 gap-2">
                    {toneKeys.map(key => (
                      <button key={key} onClick={() => update("tone", key)}
                        className={`p-3 rounded-xl text-left border transition-colors ${cfg.tone === key ? "bg-primary/10 border-primary" : "bg-muted border-transparent hover:border-border"}`}>
                        <p className={`text-sm font-medium ${cfg.tone === key ? "text-primary" : "text-foreground"}`}>{t(`settings.tones.${key}`)}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{t(`settings.tones.${key}Desc`)}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground">{t("settings.languageLabel")}</p>
                  <div className="flex gap-2">
                    {languageKeys.map(key => (
                      <button key={key} onClick={() => update("language", key)}
                        className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors ${cfg.language === key ? "bg-primary text-white border-primary" : "bg-muted border-transparent text-muted-foreground"}`}>
                        {t(`settings.languages.${key}`)}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground">{t("settings.blockedLabel")}</p>
                  <input
                    value={cfg.blocked}
                    onChange={e => update("blocked", e.target.value)}
                    placeholder={t("settings.blockedPlaceholder")}
                    className="w-full px-4 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-background"
                  />
                  <p className="text-xs text-muted-foreground">{t("settings.blockedHint")}</p>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground">{t("settings.extraLabel")}</p>
                  <textarea
                    value={cfg.extra}
                    onChange={e => update("extra", e.target.value)}
                    rows={3}
                    placeholder={t("settings.extraPlaceholder")}
                    className="w-full px-4 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-background resize-none"
                  />
                </div>

                <button
                  onClick={handleSave}
                  disabled={saveMutation.isPending}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-primary text-white rounded-xl font-medium hover:bg-primary/90 transition-colors disabled:opacity-60"
                >
                  {saveMutation.isPending
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : saved
                      ? <><CheckCircle2 className="w-4 h-4" /> {t("settings.saved")}</>
                      : t("settings.save")
                  }
                </button>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* Appearance tab */}
        {tab === "appearance" && (
          <motion.div key="appearance" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-2xl border border-border p-6 shadow-sm space-y-6"
          >
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">Theme</p>
              <p className="text-xs text-muted-foreground">Auto switches dark at 7 pm and light at 6 am</p>
              <div className="mt-2">
                <ThemeToggle />
              </div>
            </div>

            <div className="border-t border-border" />

            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">Language</p>
              <p className="text-xs text-muted-foreground">App interface language — saved to your account</p>
              <div className="mt-2">
                <LanguageSwitcher expanded />
              </div>
            </div>
          </motion.div>
        )}

        {/* Notifications tab */}
        {tab === "notifications" && (
          <motion.div key="notifications" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-2xl border border-border p-6 shadow-sm"
          >
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Bell className="w-10 h-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm font-medium text-foreground">Notifications</p>
              <p className="text-xs text-muted-foreground mt-1">Notification preferences are coming soon</p>
            </div>
          </motion.div>
        )}
      </div>
    </AppLayout>
  );
}
