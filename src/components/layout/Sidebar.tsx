import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  LayoutDashboard, Inbox, Users, BarChart2, Zap,
  Settings, LogOut, ChevronLeft, Menu, X, UserCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { useAuth } from "@/contexts/AuthContext";
import { useConversations } from "@/hooks/useConversations";

type Role = "agency" | "client";

interface SidebarProps {
  role: Role;
  businessName?: string;
}

function UnreadBadge() {
  const { data = [] } = useConversations();
  const count = data.reduce((s, c) => s + c.unreadCount, 0);
  if (count === 0) return null;
  return (
    <span className="ml-auto w-5 h-5 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">
      {count > 9 ? "9+" : count}
    </span>
  );
}

export function Sidebar({ role, businessName }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const isRtl = i18n.language === "ar";

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const clientNav = [
    { label: "Dashboard",   href: "/dashboard",    icon: LayoutDashboard },
    { label: "Inbox",       href: "/inbox",         icon: Inbox,           badge: <UnreadBadge /> },
    { label: "Contacts",    href: "/contacts",      icon: UserCircle },
    { label: "Analytics",   href: "/analytics",     icon: BarChart2 },
    { label: "Automation",  href: "/automation",    icon: Zap },
    { label: "Settings",    href: "/settings",      icon: Settings },
  ];

  const agencyNav = [
    { label: t("nav.dashboard"), href: "/agency/dashboard", icon: LayoutDashboard },
    { label: t("nav.clients"),   href: "/agency/clients",   icon: Users },
    { label: "Analytics",        href: "/agency/analytics", icon: BarChart2 },
    { label: "Settings",         href: "/agency/settings",  icon: Settings },
  ];

  const navItems = role === "client" ? clientNav : agencyNav;

  const NavLinks = ({ onClick }: { onClick?: () => void }) => (
    <>
      {navItems.map((item) => {
        const isActive = location.pathname === item.href;
        return (
          <Link
            key={item.href}
            to={item.href}
            onClick={onClick}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
              isActive
                ? "bg-primary text-white shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            <item.icon className="w-5 h-5 flex-shrink-0" />
            {!collapsed && (
              <>
                <span className="flex-1">{item.label}</span>
                {"badge" in item && item.badge}
              </>
            )}
          </Link>
        );
      })}
    </>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "hidden lg:flex flex-col bg-card border-border transition-all duration-300 h-screen sticky top-0",
          isRtl ? "border-l" : "border-r",
          collapsed ? "w-20" : "w-64"
        )}
      >
        <div className="h-16 flex items-center justify-between px-4 border-b border-border">
          {!collapsed && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-foreground text-lg">SocialPilot</span>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={cn("p-1.5 rounded-lg hover:bg-muted transition-colors", collapsed && "mx-auto")}
          >
            <ChevronLeft className={cn("w-5 h-5 text-muted-foreground transition-transform",
              collapsed && "rotate-180",
              isRtl && !collapsed && "rotate-180",
              isRtl && collapsed && "rotate-0"
            )} />
          </button>
        </div>

        {!collapsed && businessName && (
          <div className="px-4 py-3 border-b border-border">
            <p className="text-xs text-muted-foreground">{t("nav.account")}</p>
            <p className="text-sm font-medium text-foreground truncate">{businessName}</p>
          </div>
        )}

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <NavLinks />
        </nav>

        {!collapsed && (
          <div className="px-4 pb-3">
            <LanguageSwitcher />
          </div>
        )}

        <div className="p-4 border-t border-border">
          <button
            onClick={handleLogout}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted w-full transition-colors",
              collapsed && "justify-center"
            )}
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {!collapsed && <span>{t("nav.signOut")}</span>}
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 right-0 left-0 h-16 bg-card border-b border-border z-50 flex items-center justify-between px-4">
        <button onClick={() => setMobileOpen(!mobileOpen)} className="p-2 rounded-lg hover:bg-muted">
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
            <Zap className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-bold text-foreground">SocialPilot</span>
        </div>
        <LanguageSwitcher />
      </div>

      {mobileOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="lg:hidden fixed inset-0 z-40 bg-black/50"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {mobileOpen && (
        <motion.aside
          initial={isRtl ? { x: 280 } : { x: -280 }}
          animate={{ x: 0 }}
          className={cn(
            "lg:hidden fixed top-16 bottom-0 w-64 bg-card border-border z-50 flex flex-col",
            isRtl ? "right-0 border-l" : "left-0 border-r"
          )}
        >
          {businessName && (
            <div className="px-4 py-3 border-b border-border">
              <p className="text-xs text-muted-foreground">{t("nav.account")}</p>
              <p className="text-sm font-medium text-foreground">{businessName}</p>
            </div>
          )}
          <nav className="flex-1 p-4 space-y-1">
            <NavLinks onClick={() => setMobileOpen(false)} />
          </nav>
          <div className="p-4 border-t border-border">
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted w-full"
            >
              <LogOut className="w-5 h-5" />
              <span>{t("nav.signOut")}</span>
            </button>
          </div>
        </motion.aside>
      )}
    </>
  );
}
