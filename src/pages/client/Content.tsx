import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  CalendarDays, List, Sparkles, Plus, Pencil, Trash2,
  Loader2, ChevronLeft, ChevronRight, ChevronDown, X, CheckCircle2,
  Heart, MessageCircle, Send, Bookmark, Share2, MoreHorizontal,
  Globe, ThumbsUp, Music, CheckCheck, Image, Upload, Info,
  LayoutGrid, Clock, Star, Palette,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  useScheduledPosts, useCreatePost, useUpdatePost, useDeletePost,
  useGeneratePost, useGenerateImage,
} from "@/hooks/useContent";
import { useBrandSettings } from "@/hooks/useSettings";
import type { ScheduledPost, Platform, ToneType, PostStatus } from "@/types";
import { cn } from "@/lib/utils";

// ── Constants ─────────────────────────────────────────────────────────────────

const PLATFORMS: { key: Platform; label: string; color: string }[] = [
  { key: "instagram", label: "Instagram", color: "bg-gradient-to-br from-purple-500 to-pink-500" },
  { key: "tiktok",    label: "TikTok",    color: "bg-black" },
  { key: "facebook",  label: "Facebook",  color: "bg-blue-600" },
  { key: "whatsapp",  label: "WhatsApp",  color: "bg-green-500" },
];

const PLATFORM_COLOR: Record<Platform, string> = {
  instagram: "bg-gradient-to-br from-purple-500 to-pink-500",
  tiktok:    "bg-black",
  facebook:  "bg-blue-600",
  whatsapp:  "bg-green-500",
};

const STATUS_STYLE: Record<PostStatus, string> = {
  draft:     "bg-muted text-muted-foreground",
  scheduled: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400",
  published: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400",
  failed:    "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400",
};

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

// ── Best Time to Post (static recommendations) ───────────────────────────────

const BEST_TIMES: Record<Platform, { day: string; time: string; note: string }[]> = {
  instagram: [
    { day: "Tuesday",   time: "11:00", note: "Peak engagement" },
    { day: "Wednesday", time: "14:00", note: "Lunch scroll" },
    { day: "Friday",    time: "17:00", note: "End of week" },
  ],
  tiktok: [
    { day: "Tuesday",  time: "09:00", note: "Morning commute" },
    { day: "Thursday", time: "19:00", note: "Evening prime" },
    { day: "Saturday", time: "11:00", note: "Weekend browse" },
  ],
  facebook: [
    { day: "Wednesday", time: "13:00", note: "Midday break" },
    { day: "Thursday",  time: "08:00", note: "Morning check" },
    { day: "Friday",    time: "13:00", note: "TGIF scroll" },
  ],
  whatsapp: [
    { day: "Monday",   time: "08:30", note: "Start of week" },
    { day: "Thursday", time: "18:00", note: "After work" },
    { day: "Sunday",   time: "20:00", note: "Weekend evening" },
  ],
};

// ── Seasonal Templates ────────────────────────────────────────────────────────

interface SeasonalTemplate {
  id: string;
  category: string;
  emoji: string;
  title: string;
  prompt: string;
  platform: Platform;
  tone: ToneType;
  color: string;
}

const SEASONAL_TEMPLATES: SeasonalTemplate[] = [

  // ── American Holidays (12) ─────────────────────────────────────────────────
  {
    id: "ah1", category: "American Holidays", emoji: "🦃",
    title: "Thanksgiving",
    prompt: "It's Thanksgiving week! Express gratitude to our loyal customers, share what we're thankful for this year, and promote our Thanksgiving family meal special. Warm and heartfelt tone.",
    platform: "facebook", tone: "friendly",
    color: "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800/40",
  },
  {
    id: "ah2", category: "American Holidays", emoji: "🎄",
    title: "Christmas Special",
    prompt: "Merry Christmas! Spread holiday cheer, announce our festive holiday menu, and remind customers we're the perfect spot for Christmas family gatherings and holiday celebrations.",
    platform: "instagram", tone: "friendly",
    color: "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/40",
  },
  {
    id: "ah3", category: "American Holidays", emoji: "🎆",
    title: "New Year's Eve",
    prompt: "Ring in the New Year with us! Promote our New Year's Eve special dinner, countdown event, or limited reservation slots. Build excitement and urgency.",
    platform: "instagram", tone: "fun",
    color: "bg-violet-50 dark:bg-violet-900/20 border-violet-200 dark:border-violet-800/40",
  },
  {
    id: "ah4", category: "American Holidays", emoji: "🎊",
    title: "New Year's Day",
    prompt: "Happy New Year! Welcome the new year with a message of hope and fresh beginnings. Promote our New Year's Day brunch or first-day-of-the-year special offer.",
    platform: "instagram", tone: "friendly",
    color: "bg-violet-50 dark:bg-violet-900/20 border-violet-200 dark:border-violet-800/40",
  },
  {
    id: "ah5", category: "American Holidays", emoji: "💝",
    title: "Valentine's Day",
    prompt: "Valentine's Day is here! Promote our romantic dining experience, couples special menu, or sweet treats for loved ones. Make it feel special and intimate.",
    platform: "instagram", tone: "friendly",
    color: "bg-pink-50 dark:bg-pink-900/20 border-pink-200 dark:border-pink-800/40",
  },
  {
    id: "ah6", category: "American Holidays", emoji: "🍀",
    title: "St. Patrick's Day",
    prompt: "Happy St. Patrick's Day! Share in the luck of the Irish with a fun, festive post. Promote our green-themed specials or Irish-inspired dishes for the holiday.",
    platform: "instagram", tone: "fun",
    color: "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800/40",
  },
  {
    id: "ah7", category: "American Holidays", emoji: "💐",
    title: "Mother's Day",
    prompt: "Honor the amazing moms in our community! Promote our Mother's Day brunch or dinner special and make it easy for families to book a memorable celebration.",
    platform: "facebook", tone: "friendly",
    color: "bg-pink-50 dark:bg-pink-900/20 border-pink-200 dark:border-pink-800/40",
  },
  {
    id: "ah8", category: "American Holidays", emoji: "👨‍👧",
    title: "Father's Day",
    prompt: "Celebrate Dad this Father's Day! Promote our Father's Day dining special — hearty portions, bold flavors, and a great time for the whole family to treat the man of the house.",
    platform: "facebook", tone: "fun",
    color: "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800/40",
  },
  {
    id: "ah9", category: "American Holidays", emoji: "🇺🇸",
    title: "4th of July",
    prompt: "Happy Independence Day! Celebrate American freedom with patriotic energy. Promote our summer BBQ-style specials and create a fun, festive vibe for the holiday.",
    platform: "instagram", tone: "fun",
    color: "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/40",
  },
  {
    id: "ah10", category: "American Holidays", emoji: "🏈",
    title: "Super Bowl Sunday",
    prompt: "It's Super Bowl Sunday! Promote our game-day party platters, shareable appetizers, and takeout specials. Perfect post for sports fans gathering to watch the big game.",
    platform: "instagram", tone: "fun",
    color: "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800/40",
  },
  {
    id: "ah11", category: "American Holidays", emoji: "🎃",
    title: "Halloween",
    prompt: "Happy Halloween! Get spooky with a fun, themed post promoting our Halloween special menu, costume night, or trick-or-treat family deal. Playful and festive energy.",
    platform: "tiktok", tone: "fun",
    color: "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800/40",
  },
  {
    id: "ah12", category: "American Holidays", emoji: "🎓",
    title: "Back to School",
    prompt: "Back to school season is here! Promote our family meal deals, quick lunch specials, or student discounts to help busy families and students get through the new school year.",
    platform: "facebook", tone: "friendly",
    color: "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800/40",
  },

  // ── Religious & Cultural (9) ───────────────────────────────────────────────
  {
    id: "rc1", category: "Religious & Cultural", emoji: "🌙",
    title: "Ramadan Iftar Special",
    prompt: "We're offering a special Ramadan iftar platter for families. Highlight the festive atmosphere, the warmth of sharing a meal together, and our exclusive Ramadan discount.",
    platform: "instagram", tone: "friendly",
    color: "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/40",
  },
  {
    id: "rc2", category: "Religious & Cultural", emoji: "🌙",
    title: "Ramadan Kareem",
    prompt: "Wishing our customers Ramadan Kareem! Share warm wishes for the holy month and let them know about our special Ramadan hours and menu.",
    platform: "facebook", tone: "friendly",
    color: "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/40",
  },
  {
    id: "rc3", category: "Religious & Cultural", emoji: "🎊",
    title: "Eid Mubarak",
    prompt: "Eid Mubarak to all our customers! Announce our special Eid celebration offer. Warm festive message that resonates with both Arabic and English speaking communities.",
    platform: "whatsapp", tone: "fun",
    color: "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800/40",
  },
  {
    id: "rc4", category: "Religious & Cultural", emoji: "✝️",
    title: "Easter Sunday",
    prompt: "Happy Easter! Promote our Easter brunch special or family Sunday meal. Warm, celebratory message welcoming families to spend their Easter Sunday with us.",
    platform: "facebook", tone: "friendly",
    color: "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800/40",
  },
  {
    id: "rc5", category: "Religious & Cultural", emoji: "🕎",
    title: "Hanukkah",
    prompt: "Happy Hanukkah! Celebrate the Festival of Lights with a warm message to our community and share our holiday dining options for festive family gatherings.",
    platform: "instagram", tone: "friendly",
    color: "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800/40",
  },
  {
    id: "rc6", category: "Religious & Cultural", emoji: "🪔",
    title: "Diwali",
    prompt: "Happy Diwali! Celebrate the Festival of Lights with a warm, colorful post. Promote our Diwali special menu or sweet treats and welcome our South Asian community.",
    platform: "instagram", tone: "friendly",
    color: "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/40",
  },
  {
    id: "rc7", category: "Religious & Cultural", emoji: "🐉",
    title: "Chinese New Year",
    prompt: "Happy Chinese New Year! Celebrate the Lunar New Year with a festive post featuring lucky dishes or themed specials. Welcome the new year with prosperity and good fortune.",
    platform: "instagram", tone: "fun",
    color: "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/40",
  },
  {
    id: "rc8", category: "Religious & Cultural", emoji: "✡️",
    title: "Rosh Hashanah",
    prompt: "Shana Tova! Wishing our Jewish community a sweet New Year. Promote our honey cake, apple dishes, or holiday family meal options for Rosh Hashanah gatherings.",
    platform: "facebook", tone: "friendly",
    color: "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800/40",
  },
  {
    id: "rc9", category: "Religious & Cultural", emoji: "🇸🇦",
    title: "Saudi National Day",
    prompt: "Happy Saudi National Day! Celebrate with a special promotion and express pride in the occasion. Post in both Arabic and English with patriotic and festive energy.",
    platform: "instagram", tone: "fun",
    color: "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800/40",
  },

  // ── Promotions (8) ─────────────────────────────────────────────────────────
  {
    id: "pr1", category: "Promotions", emoji: "🔥",
    title: "Weekend Special",
    prompt: "It's the weekend! Promote our weekend special menu and create excitement. Perfect for a Friday or Saturday post to drive foot traffic and takeout orders.",
    platform: "tiktok", tone: "fun",
    color: "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800/40",
  },
  {
    id: "pr2", category: "Promotions", emoji: "🏷️",
    title: "Black Friday Deal",
    prompt: "Black Friday isn't just for retail! Announce our biggest food deal of the year — limited time offer, creates urgency and excitement. Perfect for driving same-day traffic.",
    platform: "instagram", tone: "fun",
    color: "bg-zinc-50 dark:bg-zinc-900/20 border-zinc-200 dark:border-zinc-800/40",
  },
  {
    id: "pr3", category: "Promotions", emoji: "🍹",
    title: "Happy Hour",
    prompt: "It's happy hour! Promote our daily happy hour deals — discounted drinks, appetizer specials, or combo offers. Create urgency with timing and make it feel like a can't-miss moment.",
    platform: "instagram", tone: "fun",
    color: "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800/40",
  },
  {
    id: "pr4", category: "Promotions", emoji: "🎁",
    title: "Buy One Get One",
    prompt: "BOGO time! We're running a buy-one-get-one deal on our most popular item. Make the offer clear, create excitement, and push customers to bring a friend.",
    platform: "facebook", tone: "fun",
    color: "bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800/40",
  },
  {
    id: "pr5", category: "Promotions", emoji: "🥡",
    title: "Free Delivery Day",
    prompt: "Today only — free delivery on all orders! Announce our free delivery promotion with urgency and make it easy for customers to order right now from their phone.",
    platform: "whatsapp", tone: "fun",
    color: "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800/40",
  },
  {
    id: "pr6", category: "Promotions", emoji: "☀️",
    title: "Summer Special",
    prompt: "Summer is here! Promote our refreshing summer menu — cold drinks, light dishes, and seasonal specials perfect for the hot weather. Energetic and sunny vibe.",
    platform: "instagram", tone: "fun",
    color: "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800/40",
  },
  {
    id: "pr7", category: "Promotions", emoji: "🤝",
    title: "Refer a Friend",
    prompt: "Spread the love! Tell your friends about our referral program — both you and a friend get a reward when they place their first order. Keep it simple, fun, and shareable.",
    platform: "whatsapp", tone: "friendly",
    color: "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800/40",
  },
  {
    id: "pr8", category: "Promotions", emoji: "🍱",
    title: "Lunch Special",
    prompt: "Lunchtime deal alert! Promote our affordable lunch combo or midday special — quick, filling, and great value. Target the office crowd and lunch-break crowd.",
    platform: "facebook", tone: "informative",
    color: "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800/40",
  },

  // ── Business (8) ───────────────────────────────────────────────────────────
  {
    id: "bz1", category: "Business", emoji: "✨",
    title: "New Item Launch",
    prompt: "We just added a new dish to our menu! Build excitement and curiosity, tease the flavors and ingredients, and encourage followers to come try it this week.",
    platform: "instagram", tone: "fun",
    color: "bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800/40",
  },
  {
    id: "bz2", category: "Business", emoji: "⭐",
    title: "Ask for a Review",
    prompt: "Kindly ask happy customers to leave us a Google or Yelp review. Warm, appreciative tone. Mention that reviews help small businesses grow and that we personally read every single one.",
    platform: "whatsapp", tone: "friendly",
    color: "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800/40",
  },
  {
    id: "bz3", category: "Business", emoji: "🎉",
    title: "Grand Opening",
    prompt: "We're officially open! Announce our grand opening with excitement, share our story, and invite the community to come experience what makes us special. Include a grand opening offer.",
    platform: "instagram", tone: "fun",
    color: "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800/40",
  },
  {
    id: "bz4", category: "Business", emoji: "🏆",
    title: "Business Anniversary",
    prompt: "We're celebrating our anniversary! Thank our incredible customers for their loyalty over the years, share a milestone moment, and announce a special anniversary offer as our way of saying thank you.",
    platform: "instagram", tone: "friendly",
    color: "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/40",
  },
  {
    id: "bz5", category: "Business", emoji: "📸",
    title: "Behind the Scenes",
    prompt: "Take followers behind the scenes of our kitchen or prep process. Build trust and authenticity by showing the care and passion that goes into every dish we make.",
    platform: "tiktok", tone: "informative",
    color: "bg-slate-50 dark:bg-slate-900/20 border-slate-200 dark:border-slate-800/40",
  },
  {
    id: "bz6", category: "Business", emoji: "👨‍🍳",
    title: "Meet the Team",
    prompt: "Introduce a team member or the face behind the food! Humanize the brand, share a fun fact about a staff member, and make customers feel connected to the people serving them.",
    platform: "instagram", tone: "friendly",
    color: "bg-teal-50 dark:bg-teal-900/20 border-teal-200 dark:border-teal-800/40",
  },
  {
    id: "bz7", category: "Business", emoji: "💬",
    title: "Customer Spotlight",
    prompt: "Share a glowing customer review or testimonial as a post. Express genuine gratitude, quote the review (with permission), and reinforce that real people love what we do.",
    platform: "facebook", tone: "friendly",
    color: "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800/40",
  },
  {
    id: "bz8", category: "Business", emoji: "🕐",
    title: "Hours Change",
    prompt: "Important update: our hours are changing! Announce the new operating hours clearly and thank customers for their understanding. Keep it short, clear, and helpful.",
    platform: "whatsapp", tone: "informative",
    color: "bg-slate-50 dark:bg-slate-900/20 border-slate-200 dark:border-slate-800/40",
  },
];

const SEASONAL_CATEGORIES = ["All", "American Holidays", "Religious & Cultural", "Promotions", "Business"];

function formatDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function shortTime(iso?: string) {
  if (!iso) return new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
  return new Date(iso).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
}

function initials(name: string) {
  return name.split(" ").slice(0, 2).map(w => w[0] ?? "").join("").toUpperCase() || "RE";
}

// ── Platform Preview Cards ────────────────────────────────────────────────────

interface PreviewCardProps {
  post: ScheduledPost;
  platform: Platform;
  businessName: string;
}

function InstagramCard({ post, businessName }: PreviewCardProps) {
  return (
    <div className="relative w-full max-w-sm mx-auto bg-white dark:bg-zinc-900 rounded-xl overflow-hidden shadow-lg border border-zinc-200 dark:border-zinc-700 text-sm">
      {/* Status chip */}
      <span className={cn("absolute top-2 right-2 z-10 text-[10px] font-semibold px-2 py-0.5 rounded-full", STATUS_STYLE[post.status])}>
        {post.status}
      </span>

      {/* Header */}
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
          {initials(businessName)}
        </div>
        <div className="flex-1">
          <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 leading-none">{businessName}</p>
          <p className="text-[10px] text-zinc-500 mt-0.5">Sponsored</p>
        </div>
        <MoreHorizontal className="w-4 h-4 text-zinc-500" />
      </div>

      {/* Image */}
      <div className="w-full aspect-square bg-gradient-to-br from-purple-400 via-pink-400 to-orange-300 overflow-hidden">
        {post.mediaUrl ? (
          <img src={post.mediaUrl} alt="Post" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center opacity-30">
            <Image className="w-16 h-16 text-white" />
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="px-3 py-2 flex items-center">
        <div className="flex gap-3 flex-1">
          <Heart className="w-5 h-5 text-zinc-700 dark:text-zinc-300" />
          <MessageCircle className="w-5 h-5 text-zinc-700 dark:text-zinc-300" />
          <Send className="w-5 h-5 text-zinc-700 dark:text-zinc-300" />
        </div>
        <Bookmark className="w-5 h-5 text-zinc-700 dark:text-zinc-300" />
      </div>

      {/* Caption */}
      <div className="px-3 pb-3 space-y-1">
        <p className="text-xs text-zinc-900 dark:text-zinc-100">
          <span className="font-semibold">{businessName.toLowerCase().replace(/\s+/g, "_")}</span>{" "}
          <span className="line-clamp-3">{post.content}</span>
        </p>
      </div>
    </div>
  );
}

function TikTokCard({ post, businessName }: PreviewCardProps) {
  return (
    <div className="relative w-full max-w-[220px] mx-auto rounded-xl overflow-hidden shadow-lg aspect-[9/16] bg-zinc-950">
      {/* Status chip */}
      <span className={cn("absolute top-2 left-2 z-10 text-[10px] font-semibold px-2 py-0.5 rounded-full", STATUS_STYLE[post.status])}>
        {post.status}
      </span>

      {/* Background image or gradient */}
      {post.mediaUrl ? (
        <img src={post.mediaUrl} alt="Post" className="absolute inset-0 w-full h-full object-cover" />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-b from-zinc-800 via-zinc-900 to-zinc-950" />
      )}

      {/* Dark overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20" />

      {/* Right-side actions */}
      <div className="absolute right-2 bottom-24 flex flex-col items-center gap-4">
        <div className="flex flex-col items-center gap-0.5">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-[10px] font-bold border-2 border-white">
            {initials(businessName)}
          </div>
        </div>
        <div className="flex flex-col items-center gap-0.5">
          <Heart className="w-6 h-6 text-white" />
          <span className="text-white text-[10px]">12K</span>
        </div>
        <div className="flex flex-col items-center gap-0.5">
          <MessageCircle className="w-6 h-6 text-white" />
          <span className="text-white text-[10px]">348</span>
        </div>
        <div className="flex flex-col items-center gap-0.5">
          <Share2 className="w-6 h-6 text-white" />
          <span className="text-white text-[10px]">Share</span>
        </div>
      </div>

      {/* Bottom info */}
      <div className="absolute bottom-0 left-0 right-10 p-3 space-y-1">
        <p className="text-white text-xs font-semibold">@{businessName.toLowerCase().replace(/\s+/g, "")}</p>
        <p className="text-white text-[10px] line-clamp-2 opacity-90">{post.content}</p>
        <div className="flex items-center gap-1.5 mt-1">
          <Music className="w-3 h-3 text-white animate-spin" style={{ animationDuration: "3s" }} />
          <p className="text-white text-[10px] opacity-80">Original Sound — {businessName}</p>
        </div>
      </div>
    </div>
  );
}

function FacebookCard({ post, businessName }: PreviewCardProps) {
  return (
    <div className="relative w-full max-w-sm mx-auto bg-white dark:bg-zinc-900 rounded-xl overflow-hidden shadow-lg border border-zinc-200 dark:border-zinc-700">
      {/* Status chip */}
      <span className={cn("absolute top-2 right-2 z-10 text-[10px] font-semibold px-2 py-0.5 rounded-full", STATUS_STYLE[post.status])}>
        {post.status}
      </span>

      {/* Header */}
      <div className="flex items-start gap-2.5 px-3 pt-3 pb-2">
        <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
          {initials(businessName)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 leading-tight">{businessName}</p>
          <div className="flex items-center gap-1 mt-0.5">
            <span className="text-[10px] text-zinc-500">Just now</span>
            <span className="text-zinc-400">·</span>
            <Globe className="w-2.5 h-2.5 text-zinc-400" />
          </div>
        </div>
        <MoreHorizontal className="w-4 h-4 text-zinc-500 mt-1" />
      </div>

      {/* Caption */}
      <p className="px-3 pb-2 text-xs text-zinc-800 dark:text-zinc-200 line-clamp-3">{post.content}</p>

      {/* Image */}
      {post.mediaUrl ? (
        <img src={post.mediaUrl} alt="Post" className="w-full aspect-video object-cover" />
      ) : (
        <div className="w-full aspect-video bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
          <Image className="w-12 h-12 text-white opacity-30" />
        </div>
      )}

      {/* Reactions bar */}
      <div className="px-3 py-2 border-t border-zinc-200 dark:border-zinc-700 flex items-center gap-1">
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 flex-1 justify-center transition-colors">
          <ThumbsUp className="w-3.5 h-3.5 text-zinc-500" />
          <span className="text-[11px] text-zinc-500 font-medium">Like</span>
        </button>
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 flex-1 justify-center transition-colors">
          <MessageCircle className="w-3.5 h-3.5 text-zinc-500" />
          <span className="text-[11px] text-zinc-500 font-medium">Comment</span>
        </button>
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 flex-1 justify-center transition-colors">
          <Share2 className="w-3.5 h-3.5 text-zinc-500" />
          <span className="text-[11px] text-zinc-500 font-medium">Share</span>
        </button>
      </div>
    </div>
  );
}

function WhatsAppCard({ post }: PreviewCardProps) {
  return (
    <div className="relative w-full max-w-xs mx-auto rounded-xl overflow-hidden shadow-lg bg-[#0d1117] p-3 min-h-[120px]">
      {/* Status chip */}
      <span className={cn("absolute top-2 left-2 z-10 text-[10px] font-semibold px-2 py-0.5 rounded-full", STATUS_STYLE[post.status])}>
        {post.status}
      </span>

      {/* Bubble */}
      <div className="mt-6 ml-auto max-w-[90%] bg-[#005c4b] rounded-2xl rounded-tr-sm overflow-hidden shadow">
        {post.mediaUrl && (
          <img src={post.mediaUrl} alt="Post" className="w-full aspect-video object-cover rounded-t-2xl" />
        )}
        <div className="px-3 py-2">
          <p className="text-white text-xs leading-relaxed line-clamp-4">{post.content}</p>
          <div className="flex items-center justify-end gap-1 mt-1">
            <span className="text-[10px] text-white/60">{shortTime(post.scheduledAt)}</span>
            <CheckCheck className="w-3 h-3 text-blue-400" />
          </div>
        </div>
      </div>
    </div>
  );
}

function PlatformPreviewCard(props: PreviewCardProps) {
  switch (props.platform) {
    case "instagram": return <InstagramCard {...props} />;
    case "tiktok":    return <TikTokCard    {...props} />;
    case "facebook":  return <FacebookCard  {...props} />;
    case "whatsapp":  return <WhatsAppCard  {...props} />;
  }
}

// ── Post Dialog ───────────────────────────────────────────────────────────────

interface PostDialogProps {
  initial?: Partial<ScheduledPost>;
  onSave: (data: Omit<ScheduledPost, "id" | "createdAt">) => void;
  onClose: () => void;
  saving: boolean;
}

function PostDialog({ initial, onSave, onClose, saving }: PostDialogProps) {
  const [platforms, setPlatforms] = useState<Platform[]>(initial?.platforms ?? ["instagram"]);
  const [content, setContent]     = useState(initial?.content ?? "");
  const [scheduledAt, setScheduledAt] = useState(
    initial?.scheduledAt ? initial.scheduledAt.slice(0, 16) : ""
  );
  const [status, setStatus]   = useState<PostStatus>(initial?.status ?? "scheduled");
  const [mediaUrl, setMediaUrl] = useState<string | undefined>(initial?.mediaUrl);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const toggle = (p: Platform) =>
    setPlatforms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);

  const handleImageSelect = async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`${import.meta.env.VITE_API_URL ?? ""}/api/resources/upload`, {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        const data = await res.json() as { url: string };
        setMediaUrl(data.url);
      } else {
        setMediaUrl(URL.createObjectURL(file));
      }
    } catch {
      setMediaUrl(URL.createObjectURL(file));
    } finally {
      setUploading(false);
    }
  };

  const handleSave = () => {
    if (!content.trim() || platforms.length === 0) return;
    onSave({
      platforms,
      content: content.trim(),
      mediaUrl,
      scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
      status,
      aiGenerated: initial?.aiGenerated ?? false,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-lg bg-card rounded-2xl border border-border shadow-xl p-6 space-y-4 max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-foreground">{initial?.id ? "Edit Post" : "New Post"}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Platforms */}
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">Platforms</p>
          <div className="flex gap-2 flex-wrap">
            {PLATFORMS.map(p => (
              <button
                key={p.key}
                onClick={() => toggle(p.key)}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-medium transition-all border",
                  platforms.includes(p.key)
                    ? "bg-primary text-white border-primary"
                    : "border-border text-muted-foreground hover:border-primary/50"
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Caption */}
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">Caption</p>
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            rows={4}
            placeholder="Write your post caption…"
            className="w-full px-3 py-2.5 text-sm rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
          />
          <p className="text-[11px] text-muted-foreground mt-1 text-right">{content.length} chars</p>
        </div>

        {/* Image upload */}
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">Image (optional)</p>
          {mediaUrl ? (
            <div className="relative rounded-xl overflow-hidden border border-border w-32 h-32">
              <img src={mediaUrl} alt="Preview" className="w-full h-full object-cover" />
              <button
                onClick={() => setMediaUrl(undefined)}
                className="absolute top-1 right-1 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center text-white hover:bg-black/80 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-border text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors text-xs disabled:opacity-50"
            >
              {uploading
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Uploading…</>
                : <><Upload className="w-4 h-4" /> Upload Image</>
              }
            </button>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleImageSelect(f); }}
          />
        </div>

        {/* Schedule + Status */}
        {platforms.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-primary" /> Best Times to Post
            </p>
            <div className="flex flex-wrap gap-2">
              {platforms.flatMap(p =>
                (BEST_TIMES[p] ?? []).slice(0, 2).map(slot => (
                  <button
                    key={p + slot.day + slot.time}
                    onClick={() => {
                      const now = new Date();
                      const dayIndex = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"].indexOf(slot.day);
                      const diff = (dayIndex - now.getDay() + 7) % 7;
                      const target = new Date(now);
                      target.setDate(now.getDate() + (diff === 0 ? 7 : diff));
                      const [h, m] = slot.time.split(":").map(Number);
                      target.setHours(h, m, 0, 0);
                      setScheduledAt(target.toISOString().slice(0, 16));
                    }}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-border text-xs text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
                  >
                    <div className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", PLATFORM_COLOR[p])} />
                    <span className="font-medium">{slot.day.slice(0, 3)}</span>
                    <span>{slot.time}</span>
                    <span className="text-[10px] opacity-60">{slot.note}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Schedule Date & Time</p>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={e => setScheduledAt(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Status</p>
            <select
              value={status}
              onChange={e => setStatus(e.target.value as PostStatus)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="draft">Draft</option>
              <option value="scheduled">Scheduled</option>
            </select>
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          <button
            onClick={handleSave}
            disabled={saving || !content.trim() || platforms.length === 0}
            className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white text-sm font-medium rounded-xl hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
            {initial?.id ? "Save Changes" : "Add to Queue"}
          </button>
          <button onClick={onClose} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground rounded-xl hover:bg-muted transition-colors">
            Cancel
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Queue Tab helpers ─────────────────────────────────────────────────────────

const PLATFORM_BADGE: Record<Platform, { label: string; className: string }> = {
  instagram: { label: "IG", className: "bg-gradient-to-r from-purple-500 to-pink-500 text-white" },
  tiktok:    { label: "TT", className: "bg-zinc-900 text-white dark:bg-zinc-700" },
  facebook:  { label: "FB", className: "bg-blue-600 text-white" },
  whatsapp:  { label: "WA", className: "bg-green-500 text-white" },
};

const STATUS_BORDER: Record<PostStatus, string> = {
  draft:     "border-l-zinc-300 dark:border-l-zinc-600",
  scheduled: "border-l-blue-500",
  published: "border-l-green-500",
  failed:    "border-l-red-500",
};

const DATE_GROUPS = ["Today", "Tomorrow", "This Week", "Upcoming", "Drafts", "Past"] as const;
type DateGroup = typeof DATE_GROUPS[number];

function getPostGroup(post: ScheduledPost): DateGroup {
  if (!post.scheduledAt || post.status === "draft") return "Drafts";
  const d = new Date(post.scheduledAt);
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffDays = Math.floor((d.getTime() - todayStart.getTime()) / 86_400_000);
  if (d < now && post.status !== "scheduled") return "Past";
  if (diffDays < 0) return "Past";
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays < 7) return "This Week";
  return "Upcoming";
}

function relativeTime(iso?: string): string {
  if (!iso) return "Unscheduled";
  const d = new Date(iso);
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffDays = Math.floor((d.getTime() - todayStart.getTime()) / 86_400_000);
  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  if (diffDays === 0) return `Today · ${time}`;
  if (diffDays === 1) return `Tomorrow · ${time}`;
  if (diffDays < 0) return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  if (diffDays < 7) return `${d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} · ${time}`;
  return `${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })} · ${time}`;
}

// ── Queue Tab ─────────────────────────────────────────────────────────────────

function QueueTab({ posts, onEdit, onDelete, onNew, businessName }: {
  posts: ScheduledPost[];
  onEdit: (p: ScheduledPost) => void;
  onDelete: (id: string) => void;
  onNew: () => void;
  businessName: string;
}) {
  const [platformFilter, setPlatformFilter] = useState<Platform | "all">("all");
  const [viewMode, setViewMode] = useState<"list" | "preview">("list");
  const [bannerDismissed, setBannerDismissed] = useState(
    () => sessionStorage.getItem("sp-queue-banner") === "1"
  );

  // Only show platform filter chips for platforms that actually have posts
  const usedPlatforms = PLATFORMS.filter(p => posts.some(post => post.platforms.includes(p.key)));

  const filtered = platformFilter === "all"
    ? posts
    : posts.filter(p => p.platforms.includes(platformFilter));

  const sorted = [...filtered].sort((a, b) =>
    (a.scheduledAt ?? "zzz").localeCompare(b.scheduledAt ?? "zzz")
  );

  // Group by date band
  const groups = DATE_GROUPS.reduce<Record<DateGroup, ScheduledPost[]>>((acc, g) => {
    acc[g] = sorted.filter(p => getPostGroup(p) === g);
    return acc;
  }, { Today: [], Tomorrow: [], "This Week": [], Upcoming: [], Drafts: [], Past: [] });

  const activeGroups = DATE_GROUPS.filter(g => groups[g].length > 0);

  const dismissBanner = () => {
    sessionStorage.setItem("sp-queue-banner", "1");
    setBannerDismissed(true);
  };

  return (
    <div className="space-y-4">
      {/* Header row: filters + view toggle + New Post */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex gap-1.5 flex-wrap flex-1 min-w-0">
          <button
            onClick={() => setPlatformFilter("all")}
            className={cn("px-3 py-1.5 rounded-full text-xs font-medium transition-colors flex-shrink-0",
              platformFilter === "all" ? "bg-primary text-white" : "bg-muted text-muted-foreground hover:text-foreground"
            )}
          >
            All ({posts.length})
          </button>
          {usedPlatforms.map(p => (
            <button
              key={p.key}
              onClick={() => setPlatformFilter(p.key)}
              className={cn("px-3 py-1.5 rounded-full text-xs font-medium transition-colors flex-shrink-0",
                platformFilter === p.key ? "bg-primary text-white" : "bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              {p.label} ({posts.filter(post => post.platforms.includes(p.key)).length})
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="flex bg-muted rounded-lg p-0.5 gap-0.5">
            <button
              onClick={() => setViewMode("list")}
              className={cn("p-1.5 rounded-md transition-colors", viewMode === "list" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}
              title="List view"
            >
              <List className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode("preview")}
              className={cn("p-1.5 rounded-md transition-colors", viewMode === "preview" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}
              title="Preview"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
          </div>
          <button
            onClick={onNew}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white text-xs font-semibold rounded-xl hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> New Post
          </button>
        </div>
      </div>

      {/* Compact info banner */}
      {!bannerDismissed && (
        <div className="flex items-center gap-3 px-4 py-2.5 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl text-xs text-blue-700 dark:text-blue-300">
          <Info className="w-3.5 h-3.5 flex-shrink-0" />
          <p className="flex-1">Auto-publishing to social platforms coming soon — posts are saved and ready.</p>
          <button onClick={dismissBanner} className="text-blue-400 hover:text-blue-600 flex-shrink-0">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Empty state */}
      {sorted.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <CalendarDays className="w-10 h-10 mx-auto mb-3 opacity-20" />
          <p className="text-sm font-medium">{platformFilter === "all" ? "No posts yet" : `No ${platformFilter} posts`}</p>
          <p className="text-xs mt-1 opacity-70">Create your first post to get started</p>
        </div>

      ) : viewMode === "list" ? (
        /* ── List view ── */
        <div className="space-y-6">
          {activeGroups.map(group => (
            <div key={group}>
              {/* Date group header */}
              <div className="flex items-center gap-3 mb-3">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">
                  {group}
                </span>
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {groups[group].length} post{groups[group].length !== 1 ? "s" : ""}
                </span>
              </div>

              {/* Cards in group */}
              <div className="space-y-2">
                {groups[group].map((post, i) => (
                  <motion.div
                    key={post.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className={cn(
                      "bg-card rounded-2xl border border-border border-l-4 hover:shadow-sm transition-shadow",
                      STATUS_BORDER[post.status]
                    )}
                  >
                    <div className="p-4 flex items-start gap-3">
                      {/* Main content */}
                      <div className="flex-1 min-w-0 space-y-2">
                        {/* Row 1: time + platform badges + status */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-foreground tabular-nums">
                            {relativeTime(post.scheduledAt)}
                          </span>
                          <div className="flex gap-1">
                            {post.platforms.map(p => (
                              <span
                                key={p}
                                className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-md", PLATFORM_BADGE[p].className)}
                              >
                                {PLATFORM_BADGE[p].label}
                              </span>
                            ))}
                          </div>
                          {post.aiGenerated && (
                            <span className="flex items-center gap-0.5 text-[10px] text-primary/70 font-medium">
                              <Sparkles className="w-2.5 h-2.5" /> AI
                            </span>
                          )}
                          <span className={cn("ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full", STATUS_STYLE[post.status])}>
                            {post.status}
                          </span>
                        </div>

                        {/* Caption */}
                        <p className="text-sm text-foreground leading-relaxed line-clamp-2">{post.content}</p>
                      </div>

                      {/* Right: thumbnail + actions stacked */}
                      <div className="flex flex-col items-end justify-between gap-3 flex-shrink-0 self-stretch">
                        {post.mediaUrl && (
                          <div className="w-14 h-14 rounded-xl overflow-hidden border border-border flex-shrink-0">
                            <img src={post.mediaUrl} alt="Post" className="w-full h-full object-cover" />
                          </div>
                        )}
                        <div className="flex items-center gap-0.5 mt-auto">
                          <button
                            onClick={() => onEdit(post)}
                            title="Edit"
                            className="p-2 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onDelete(post.id)}
                            title="Delete"
                            className="p-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 text-muted-foreground hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          ))}
        </div>

      ) : (
        /* ── Preview / grid view ── */
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {sorted.flatMap(post =>
            post.platforms
              .filter(platform => platformFilter === "all" || platform === platformFilter)
              .map(platform => (
              <motion.div
                key={post.id + platform}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-2"
              >
                <PlatformPreviewCard post={post} platform={platform} businessName={businessName} />
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-1.5">
                    <div className={cn("w-2 h-2 rounded-full", PLATFORM_COLOR[platform])} />
                    <span className="text-xs text-muted-foreground capitalize">{platform}</span>
                    <span className="text-[10px] text-muted-foreground">· {relativeTime(post.scheduledAt)}</span>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => onEdit(post)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => onDelete(post.id)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-red-500 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ── Calendar Tab ──────────────────────────────────────────────────────────────

function CalendarPostPreview({ post, businessName, onEdit, onClose }: {
  post: ScheduledPost;
  businessName: string;
  onEdit: (p: ScheduledPost) => void;
  onClose: () => void;
}) {
  const [activePlatform, setActivePlatform] = useState<Platform>(post.platforms[0] ?? "instagram");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-sm bg-card rounded-2xl border border-border shadow-xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm font-semibold text-foreground truncate">{formatDate(post.scheduledAt)}</span>
            <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0", STATUS_STYLE[post.status])}>
              {post.status}
            </span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground flex-shrink-0 ml-2">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Platform tabs — only if multi-platform */}
        {post.platforms.length > 1 && (
          <div className="flex gap-1.5 px-4 pt-3">
            {post.platforms.map(pl => (
              <button
                key={pl}
                onClick={() => setActivePlatform(pl)}
                className={cn(
                  "px-3 py-1 rounded-lg text-xs font-medium capitalize transition-colors",
                  activePlatform === pl ? "bg-primary text-white" : "bg-muted text-muted-foreground hover:text-foreground"
                )}
              >
                {pl}
              </button>
            ))}
          </div>
        )}

        {/* Preview card */}
        <div className="p-4 overflow-y-auto max-h-[60vh]">
          <PlatformPreviewCard post={post} platform={activePlatform} businessName={businessName} />
        </div>

        {/* Actions */}
        <div className="flex gap-2 px-4 pb-4">
          <button
            onClick={() => { onEdit(post); onClose(); }}
            className="flex items-center justify-center gap-1.5 px-4 py-2 bg-primary text-white text-sm font-medium rounded-xl hover:bg-primary/90 transition-colors flex-1"
          >
            <Pencil className="w-3.5 h-3.5" /> Edit Post
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground rounded-xl hover:bg-muted transition-colors"
          >
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function CalendarTab({ posts, onNew, onEdit, businessName }: {
  posts: ScheduledPost[];
  onNew: (date?: string) => void;
  onEdit: (p: ScheduledPost) => void;
  businessName: string;
}) {
  const today = new Date();
  const [year, setYear]     = useState(today.getFullYear());
  const [month, setMonth]   = useState(today.getMonth());
  const [selectedDay, setSelectedDay]   = useState<number | null>(null);
  const [previewPost, setPreviewPost]   = useState<ScheduledPost | null>(null);

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = Array.from({ length: firstDay + daysInMonth }, (_, i) =>
    i < firstDay ? null : i - firstDay + 1
  );

  const postsForDay = (day: number) => posts.filter(p => {
    if (!p.scheduledAt) return false;
    const d = new Date(p.scheduledAt);
    return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
  });

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); setSelectedDay(null); };
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); setSelectedDay(null); };
  const goToday   = () => { setYear(today.getFullYear()); setMonth(today.getMonth()); setSelectedDay(null); };

  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth();
  const selectedPosts = selectedDay ? postsForDay(selectedDay) : [];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <h3 className="font-semibold text-foreground w-36 text-center">{MONTHS[month]} {year}</h3>
          <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        {!isCurrentMonth && (
          <button
            onClick={goToday}
            className="text-xs font-medium text-primary hover:bg-primary/10 px-2.5 py-1 rounded-lg transition-colors"
          >
            Today
          </button>
        )}
      </div>

      {/* Grid */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="grid grid-cols-7 border-b border-border">
          {DAYS.map(d => (
            <div key={d} className="py-2 text-center text-[11px] font-medium text-muted-foreground">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((day, i) => {
            if (!day) return <div key={i} className="h-16 border-b border-r border-border/50 last:border-r-0" />;
            const dayPosts = postsForDay(day);
            const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
            const isSelected = selectedDay === day;
            return (
              <button
                key={i}
                onClick={() => setSelectedDay(isSelected ? null : day)}
                className={cn(
                  "h-16 p-1.5 border-b border-r border-border/50 last:border-r-0 text-left transition-colors hover:bg-muted/50 flex flex-col",
                  isSelected && "bg-primary/5 border-primary/30"
                )}
              >
                <span className={cn(
                  "text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full",
                  isToday ? "bg-primary text-white" : "text-foreground"
                )}>
                  {day}
                </span>
                <div className="flex flex-wrap gap-0.5 mt-0.5">
                  {dayPosts.slice(0, 3).map(p =>
                    p.platforms.slice(0, 1).map(pl => (
                      <span key={p.id + pl} className={cn("w-1.5 h-1.5 rounded-full", PLATFORM_COLOR[pl])} />
                    ))
                  )}
                  {dayPosts.length > 3 && <span className="text-[9px] text-muted-foreground">+{dayPosts.length - 3}</span>}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Day panel */}
      <AnimatePresence>
        {selectedDay && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="bg-card rounded-2xl border border-border p-4 space-y-2"
          >
            <div className="flex items-center justify-between mb-1">
              <h4 className="font-medium text-foreground text-sm">{MONTHS[month]} {selectedDay}</h4>
              <button
                onClick={() => onNew(new Date(year, month, selectedDay, 10).toISOString())}
                className="flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <Plus className="w-3 h-3" /> Add post
              </button>
            </div>

            {selectedPosts.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">No posts scheduled — click Add post to create one.</p>
            ) : (
              selectedPosts
                .sort((a, b) => (a.scheduledAt ?? "").localeCompare(b.scheduledAt ?? ""))
                .map(p => (
                  <button
                    key={p.id}
                    onClick={() => setPreviewPost(p)}
                    className="w-full flex items-center gap-3 p-2.5 bg-muted/40 hover:bg-muted rounded-xl transition-colors text-left group"
                  >
                    {/* Time */}
                    <span className="text-[11px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-lg flex-shrink-0 tabular-nums">
                      {shortTime(p.scheduledAt)}
                    </span>

                    {/* Platform dots */}
                    <div className="flex gap-1 flex-shrink-0">
                      {p.platforms.map(pl => (
                        <span key={pl} className={cn("w-2 h-2 rounded-full flex-shrink-0", PLATFORM_COLOR[pl])} />
                      ))}
                    </div>

                    {/* Thumbnail */}
                    {p.mediaUrl && (
                      <img src={p.mediaUrl} alt="" className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
                    )}

                    {/* Caption */}
                    <p className="text-xs text-foreground line-clamp-1 flex-1 min-w-0">{p.content}</p>

                    {/* Status + arrow */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded-full hidden sm:inline", STATUS_STYLE[p.status])}>
                        {p.status}
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                  </button>
                ))
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Post preview modal */}
      <AnimatePresence>
        {previewPost && (
          <CalendarPostPreview
            post={previewPost}
            businessName={businessName}
            onEdit={onEdit}
            onClose={() => setPreviewPost(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ── AI Generate Tab ───────────────────────────────────────────────────────────

function GenerateTab({ onAddToQueue }: {
  onAddToQueue: (content: string, platform: Platform, mediaUrl?: string) => void;
}) {
  const [prompt, setPrompt]         = useState("");
  const [platform, setPlatform]     = useState<Platform>("instagram");
  const [tone, setTone]             = useState<ToneType>("friendly");
  const [captionResult, setCaptionResult] = useState<{ caption: string; hashtags: string[] } | null>(null);
  const [imageResult, setImageResult]     = useState<string | null>(null);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [seasonalCategory, setSeasonalCategory] = useState("All");

  const generateCaption = useGeneratePost();
  const generateImage   = useGenerateImage();
  const { data: brandData } = useBrandSettings();

  const isGenerating = generateCaption.isPending || generateImage.isPending;
  const hasResult    = captionResult !== null || generateCaption.isPending;
  const activeBrandStyle = brandData?.imageStyle?.trim() || undefined;

  const handleGenerate = () => {
    if (!prompt.trim()) return;
    setCaptionResult(null);
    setImageResult(null);
    generateCaption.mutate(
      { prompt: prompt.trim(), platform, tone },
      { onSuccess: (data) => setCaptionResult(data) }
    );
    generateImage.mutate(
      { prompt: prompt.trim(), platform, brandStyle: activeBrandStyle },
      { onSuccess: (data) => setImageResult(data.url) }
    );
  };

  const handleReset = () => {
    setCaptionResult(null);
    setImageResult(null);
    generateCaption.reset();
    generateImage.reset();
  };

  return (
    <div className="max-w-2xl space-y-4">

      {/* Quick-start templates — collapsed by default */}
      <div>
        <button
          onClick={() => setTemplatesOpen(o => !o)}
          className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <Star className="w-3.5 h-3.5 text-amber-500" />
          Quick-start templates
          <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", templatesOpen && "rotate-180")} />
        </button>

        <AnimatePresence>
          {templatesOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="pt-3 space-y-3">
                <div className="flex gap-2 flex-wrap">
                  {SEASONAL_CATEGORIES.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setSeasonalCategory(cat)}
                      className={cn("px-3 py-1 rounded-full text-xs font-medium transition-colors",
                        seasonalCategory === cat ? "bg-primary text-white" : "bg-muted text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {SEASONAL_TEMPLATES
                    .filter(t => seasonalCategory === "All" || t.category === seasonalCategory)
                    .map(t => (
                      <button
                        key={t.id}
                        onClick={() => {
                          setPrompt(t.prompt);
                          setPlatform(t.platform);
                          setTone(t.tone);
                          setTemplatesOpen(false);
                        }}
                        className={cn("text-left p-3 rounded-xl border text-xs transition-all hover:shadow-sm", t.color)}
                      >
                        <span className="text-base leading-none">{t.emoji}</span>
                        <p className="font-semibold text-foreground mt-1">{t.title}</p>
                        <p className="text-muted-foreground mt-0.5 line-clamp-2 text-[11px]">{t.prompt}</p>
                      </button>
                    ))
                  }
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Prompt */}
      <textarea
        value={prompt}
        onChange={e => setPrompt(e.target.value)}
        rows={4}
        placeholder={"Describe what you want to post about…\ne.g. Our new weekend brunch menu launching this Saturday"}
        className="w-full px-4 py-3 text-sm rounded-2xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
        onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && prompt.trim() && !isGenerating) handleGenerate(); }}
      />

      {/* Platform + Tone — compact inline row */}
      <div className="flex flex-wrap gap-x-5 gap-y-2 items-center">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs text-muted-foreground font-medium">Platform:</span>
          {PLATFORMS.map(p => (
            <button
              key={p.key}
              onClick={() => setPlatform(p.key)}
              className={cn("px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors",
                platform === p.key ? "bg-primary text-white border-primary" : "border-border text-muted-foreground hover:border-primary/50"
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs text-muted-foreground font-medium">Tone:</span>
          {(["friendly","professional","fun","informative"] as ToneType[]).map(t => (
            <button
              key={t}
              onClick={() => setTone(t)}
              className={cn("px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors capitalize",
                tone === t ? "bg-primary text-white border-primary" : "border-border text-muted-foreground hover:border-primary/50"
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Brand style indicator */}
      {activeBrandStyle && (
        <div className="flex items-center gap-1.5 text-xs text-primary/80">
          <Palette className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="truncate">Brand style active: <span className="font-medium">{activeBrandStyle.slice(0, 60)}{activeBrandStyle.length > 60 ? "…" : ""}</span></span>
        </div>
      )}

      {/* Single Generate Post button */}
      <button
        onClick={handleGenerate}
        disabled={!prompt.trim() || isGenerating}
        className="w-full flex items-center justify-center gap-2 py-3 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary/90 disabled:opacity-50 transition-colors"
      >
        {isGenerating
          ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating post…</>
          : <><Sparkles className="w-4 h-4" /> Generate Post</>
        }
      </button>

      {/* Result card — caption + image side by side */}
      <AnimatePresence>
        {hasResult && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="bg-card rounded-2xl border border-border overflow-hidden"
          >
            <div className="flex flex-col sm:flex-row">

              {/* Image pane */}
              <div className="sm:w-52 aspect-square sm:aspect-auto bg-muted flex items-center justify-center flex-shrink-0">
                {generateImage.isPending ? (
                  <div className="flex flex-col items-center gap-2 text-muted-foreground p-6">
                    <Loader2 className="w-6 h-6 animate-spin" />
                    <span className="text-xs">Creating image…</span>
                  </div>
                ) : imageResult ? (
                  <img src={imageResult} alt="AI Generated" className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-muted-foreground p-6">
                    <Image className="w-10 h-10 opacity-20" />
                    <span className="text-xs">No image</span>
                  </div>
                )}
              </div>

              {/* Caption pane */}
              <div className="flex-1 p-5 flex flex-col gap-3 min-w-0">
                {generateCaption.isPending ? (
                  <div className="flex-1 flex items-center justify-center text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm">Writing caption…</span>
                    </div>
                  </div>
                ) : captionResult ? (
                  <>
                    <p className="text-sm text-foreground leading-relaxed flex-1">{captionResult.caption}</p>
                    {captionResult.hashtags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {captionResult.hashtags.map(tag => (
                          <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">{tag}</span>
                        ))}
                      </div>
                    )}
                  </>
                ) : null}

                <div className="flex gap-2 pt-2 border-t border-border mt-auto">
                  <button
                    onClick={() => captionResult && onAddToQueue(
                      captionResult.caption + "\n\n" + captionResult.hashtags.join(" "),
                      platform,
                      imageResult ?? undefined
                    )}
                    disabled={!captionResult}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-primary text-white text-sm font-medium rounded-xl hover:bg-primary/90 disabled:opacity-40 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add to Queue
                  </button>
                  <button
                    onClick={handleReset}
                    title="Clear result"
                    className="p-2 text-muted-foreground hover:text-foreground rounded-xl hover:bg-muted transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

type Tab = "queue" | "calendar" | "generate";

export default function Content() {
  const { user } = useAuth();
  const businessName = user?.businessName ?? "My Business";
  const { data: posts = [], isLoading } = useScheduledPosts();
  const createPost = useCreatePost();
  const updatePost = useUpdatePost();
  const deletePost = useDeletePost();

  const [activeTab, setActiveTab]         = useState<Tab>("queue");
  const [dialogOpen, setDialogOpen]       = useState(false);
  const [editPost, setEditPost]           = useState<ScheduledPost | null>(null);
  const [prefillContent, setPrefillContent]   = useState("");
  const [prefillPlatform, setPrefillPlatform] = useState<Platform | null>(null);
  const [prefillDate, setPrefillDate]     = useState<string | undefined>();
  const [prefillMediaUrl, setPrefillMediaUrl] = useState<string | undefined>();

  const openNew = (date?: string) => {
    setEditPost(null);
    setPrefillContent("");
    setPrefillPlatform(null);
    setPrefillDate(date);
    setPrefillMediaUrl(undefined);
    setDialogOpen(true);
  };

  const openEdit = (p: ScheduledPost) => {
    setEditPost(p);
    setPrefillContent("");
    setPrefillPlatform(null);
    setPrefillDate(undefined);
    setPrefillMediaUrl(undefined);
    setDialogOpen(true);
  };

  const openFromGenerate = (content: string, platform: Platform, mediaUrl?: string) => {
    setEditPost(null);
    setPrefillContent(content);
    setPrefillPlatform(platform);
    setPrefillDate(undefined);
    setPrefillMediaUrl(mediaUrl);
    setDialogOpen(true);
  };

  const handleSave = (data: Omit<ScheduledPost, "id" | "createdAt">) => {
    if (editPost) {
      updatePost.mutate({ id: editPost.id, ...data }, { onSuccess: () => setDialogOpen(false) });
    } else {
      createPost.mutate(data, { onSuccess: () => setDialogOpen(false) });
    }
  };

  const TABS: { key: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { key: "queue",    label: "Queue",       icon: List },
    { key: "calendar", label: "Calendar",    icon: CalendarDays },
    { key: "generate", label: "AI Generate", icon: Sparkles },
  ];

  return (
    <AppLayout role="client" businessName={businessName}>
      <div className="space-y-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Content</h1>
            <p className="text-sm text-muted-foreground mt-1">Schedule and generate posts for your social channels</p>
          </div>
          <button
            onClick={() => openNew()}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-xl hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" /> New Post
          </button>
        </motion.div>

        {/* Tabs */}
        <div className="flex bg-muted p-1 rounded-xl w-fit gap-1">
          {TABS.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                  activeTab === tab.key
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {activeTab === "queue" && (
              <QueueTab
                posts={posts}
                onEdit={openEdit}
                onDelete={id => deletePost.mutate(id)}
                onNew={() => openNew()}
                businessName={businessName}
              />
            )}
            {activeTab === "calendar" && (
              <CalendarTab posts={posts} onNew={openNew} onEdit={openEdit} businessName={businessName} />
            )}
            {activeTab === "generate" && (
              <GenerateTab onAddToQueue={openFromGenerate} />
            )}
          </>
        )}
      </div>

      {/* New/Edit Post Dialog */}
      <AnimatePresence>
        {dialogOpen && (
          <PostDialog
            initial={editPost ?? {
              content:    prefillContent,
              platforms:  prefillPlatform ? [prefillPlatform] : ["instagram"],
              scheduledAt: prefillDate,
              mediaUrl:   prefillMediaUrl,
            }}
            onSave={handleSave}
            onClose={() => setDialogOpen(false)}
            saving={createPost.isPending || updatePost.isPending}
          />
        )}
      </AnimatePresence>
    </AppLayout>
  );
}
