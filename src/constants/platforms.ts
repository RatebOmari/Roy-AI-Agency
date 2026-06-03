import { AtSign, MessageCircle, MessageSquare, Phone, Smartphone } from "lucide-react";
import type React from "react";

export interface PlatformConfig {
  id: string;
  label: string;
  color: string;     // chip bg + text-white Tailwind classes (for badges)
  dotColor: string;  // plain bg-* class (for small dot indicators)
  icon: React.ComponentType<{ className?: string }>;
}

export const PLATFORM_CONFIG: Record<string, PlatformConfig> = {
  instagram: {
    id:       "instagram",
    label:    "Instagram",
    color:    "bg-gradient-to-r from-purple-500 to-pink-500 text-white",
    dotColor: "bg-pink-500",
    icon:     AtSign,
  },
  tiktok: {
    id:       "tiktok",
    label:    "TikTok",
    color:    "bg-zinc-900 dark:bg-zinc-700 text-white",
    dotColor: "bg-zinc-700",
    icon:     MessageCircle,
  },
  facebook: {
    id:       "facebook",
    label:    "Facebook",
    color:    "bg-blue-600 text-white",
    dotColor: "bg-blue-600",
    icon:     MessageSquare,
  },
  whatsapp: {
    id:       "whatsapp",
    label:    "WhatsApp",
    color:    "bg-green-500 text-white",
    dotColor: "bg-green-500",
    icon:     MessageSquare,
  },
  sms: {
    id:       "sms",
    label:    "SMS",
    color:    "bg-indigo-500 text-white",
    dotColor: "bg-indigo-500",
    icon:     Smartphone,
  },
  phone: {
    id:       "phone",
    label:    "Phone",
    color:    "bg-slate-600 text-white",
    dotColor: "bg-slate-600",
    icon:     Phone,
  },
};
