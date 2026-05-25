import { useState } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { AppLayout } from "@/components/layout/AppLayout";
import type { Platform } from "@/components/social/PlatformCard";
import { CheckCircle2 } from "lucide-react";

const platforms: { id: Platform; label: string }[] = [
  { id: "tiktok",    label: "TikTok" },
  { id: "instagram", label: "Instagram" },
  { id: "facebook",  label: "Facebook" },
  { id: "whatsapp",  label: "WhatsApp" },
];

const toneKeys = ["friendly", "professional", "fun", "informative"] as const;
const languageKeys = ["ar", "en", "ar_en"] as const;

interface Config { tone: string; language: string; blocked: string; extra: string }

const defaultConfig: Config = { tone: "friendly", language: "ar", blocked: "", extra: "" };

export default function ToneSettings() {
  const { t } = useTranslation();
  const [active, setActive] = useState<Platform>("tiktok");
  const [saved, setSaved] = useState(false);
  const [configs, setConfigs] = useState<Record<Platform, Config>>({
    tiktok:    { ...defaultConfig },
    instagram: { ...defaultConfig },
    facebook:  { ...defaultConfig, tone: "professional" },
    whatsapp:  { ...defaultConfig, tone: "friendly" },
  });

  const cfg = configs[active];
  const update = (field: keyof Config, val: string) =>
    setConfigs(p => ({ ...p, [active]: { ...p[active], [field]: val } }));

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <AppLayout role="client" businessName="Al-Asala Restaurant">
      <div className="space-y-6 max-w-2xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-bold text-foreground">{t("settings.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("settings.subtitle")}</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="flex gap-2 flex-wrap"
        >
          {platforms.map(p => (
            <button key={p.id} onClick={() => setActive(p.id)}
              className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${active === p.id ? "bg-primary text-white border-primary" : "bg-card border-border text-muted-foreground hover:border-primary/40"}`}>
              {p.label}
            </button>
          ))}
        </motion.div>

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

          <button onClick={handleSave}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-primary text-white rounded-xl font-medium hover:bg-primary/90 transition-colors">
            {saved ? <><CheckCircle2 className="w-4 h-4" /> {t("settings.saved")}</> : t("settings.save")}
          </button>
        </motion.div>
      </div>
    </AppLayout>
  );
}
