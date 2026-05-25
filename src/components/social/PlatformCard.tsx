import { motion } from "framer-motion";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { useTranslation } from "react-i18next";

export type Platform = "tiktok" | "instagram" | "facebook" | "whatsapp";

interface PlatformCardProps {
  platform: Platform;
  connected: boolean;
  stats?: { replies: number; pending: number };
  onConnect: (p: Platform) => void;
  onDisconnect: (p: Platform) => void;
}

const meta: Record<Platform, { name: string; bg: string; letter: string }> = {
  tiktok:    { name: "TikTok",    bg: "bg-black",                                       letter: "T" },
  instagram: { name: "Instagram", bg: "bg-gradient-to-br from-purple-500 to-pink-500",  letter: "I" },
  facebook:  { name: "Facebook",  bg: "bg-blue-600",                                    letter: "F" },
  whatsapp:  { name: "WhatsApp",  bg: "bg-green-500",                                   letter: "W" },
};

export function PlatformCard({ platform, connected, stats, onConnect, onDisconnect }: PlatformCardProps) {
  const { t } = useTranslation();
  const m = meta[platform];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-2xl p-5 border border-border flex flex-col gap-4 shadow-sm"
    >
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl ${m.bg} flex items-center justify-center text-white font-bold text-lg flex-shrink-0`}>
          {m.letter}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground">{m.name}</p>
          <div className="flex items-center gap-1 mt-0.5">
            {connected
              ? <><CheckCircle2 className="w-3 h-3 text-green-500" /><span className="text-xs text-green-600">{t("platforms.connected")}</span></>
              : <><AlertCircle className="w-3 h-3 text-muted-foreground" /><span className="text-xs text-muted-foreground">{t("platforms.disconnected")}</span></>
            }
          </div>
        </div>
      </div>

      {connected && stats && (
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-muted rounded-xl p-3 text-center">
            <p className="text-xl font-bold text-foreground">{stats.replies}</p>
            <p className="text-xs text-muted-foreground">{t("platforms.repliesToday")}</p>
          </div>
          <div className="bg-muted rounded-xl p-3 text-center">
            <p className="text-xl font-bold text-foreground">{stats.pending}</p>
            <p className="text-xs text-muted-foreground">{t("platforms.pending")}</p>
          </div>
        </div>
      )}

      <button
        onClick={() => connected ? onDisconnect(platform) : onConnect(platform)}
        className={`w-full py-2 rounded-xl text-sm font-medium transition-colors border ${
          connected
            ? "border-border text-muted-foreground hover:text-foreground hover:bg-muted"
            : "bg-primary text-white border-primary hover:bg-primary/90"
        }`}
      >
        {connected ? t("platforms.disconnect") : t("platforms.connect")}
      </button>
    </motion.div>
  );
}
