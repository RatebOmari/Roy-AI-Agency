import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  LayoutDashboard, Inbox, Users, BarChart2, Zap,
  Settings, LogOut, ChevronRight, Menu, X, UserCircle,
  CalendarDays, BookOpen, FileText, Megaphone, GitBranch, Radio, MessageSquare, Phone,
  Siren,
} from "lucide-react";
import { useAgencyContent } from "@/hooks/useContent";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { useConversations } from "@/hooks/useConversations";
import { AGENCY_NAME } from "@/lib/constants";

type Role = "agency" | "client";

interface SidebarProps {
  role: Role;
  businessName?: string;
}

function UnreadBadge() {
  const { data = [] } = useConversations();
  // Only count social channels — SMS/calls have their own Phone page
  const count = data
    .filter(c => c.channel !== "sms" && c.channel !== "phone_call")
    .reduce((s, c) => s + c.unreadCount, 0);
  if (count === 0) return null;
  return (
    <span className="ml-auto w-5 h-5 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">
      {count > 9 ? "9+" : count}
    </span>
  );
}

function PendingApprovalBadge() {
  const { data = [] } = useAgencyContent();
  const count = data.filter(p => p.status === "pending_approval").length;
  if (count === 0) return null;
  return (
    <span className="ml-auto min-w-[20px] h-5 px-1 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">
      {count > 9 ? "9+" : count}
    </span>
  );
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: boolean;
}

interface NavGroup {
  label?: string;
  items: NavItem[];
}

const CLIENT_NAV_GROUPS: NavGroup[] = [
  {
    items: [
      { label: "Dashboard",  href: "/dashboard",  icon: LayoutDashboard },
      { label: "Inbox",      href: "/inbox",       icon: Inbox, badge: true },
      { label: "Comments",   href: "/comments",   icon: MessageSquare },
      { label: "Phone",      href: "/phone",      icon: Phone },
      { label: "Listening",  href: "/listening",  icon: Radio },
    ],
  },
  {
    label: "PUBLISH",
    items: [
      { label: "Content",    href: "/content",    icon: CalendarDays },
      { label: "Campaigns",  href: "/campaigns",  icon: Megaphone },
    ],
  },
  {
    label: "INSIGHTS",
    items: [
      { label: "Analytics",  href: "/analytics",  icon: BarChart2 },
      { label: "Contacts",   href: "/contacts",   icon: UserCircle },
    ],
  },
  {
    label: "AUTOMATE",
    items: [
      { label: "Flows",      href: "/flows",      icon: GitBranch },
      { label: "Templates",  href: "/templates",  icon: FileText },
    ],
  },
  {
    label: "SETUP",
    items: [
      { label: "Resources",  href: "/resources",  icon: BookOpen },
      { label: "Team",       href: "/team",       icon: Users },
      { label: "Settings",   href: "/settings",   icon: Settings },
    ],
  },
];

const AGENCY_NAV_GROUPS: NavGroup[] = [
  {
    items: [
      { label: "Dashboard",       href: "/agency/dashboard", icon: LayoutDashboard },
      { label: "Command Center",  href: "/agency/command",   icon: Siren },
      { label: "Clients",         href: "/agency/clients",   icon: Users },
    ],
  },
  {
    label: "MANAGE",
    items: [
      { label: "Content",   href: "/agency/content",   icon: CalendarDays, badge: true },
      { label: "Analytics", href: "/agency/analytics", icon: BarChart2 },
    ],
  },
  {
    label: "CONFIG",
    items: [
      { label: "Settings", href: "/agency/settings", icon: Settings },
    ],
  },
];

export function Sidebar({ role, businessName }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  useTranslation(); // ensures i18n is initialized for child components
  const { logout } = useAuth();
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem("sp-sidebar-collapsed") === "true");
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const navGroups = role === "client" ? CLIENT_NAV_GROUPS : AGENCY_NAV_GROUPS;

  const NavLinks = ({ onClick }: { onClick?: () => void }) => (
    <>
      {navGroups.map((group, gi) => (
        <div key={gi}>
          {group.label && !collapsed && (
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground/50 px-3 pt-3 pb-1 font-medium select-none">
              {group.label}
            </p>
          )}
          {group.label && collapsed && gi > 0 && (
            <div className="border-t border-border/40 my-2 mx-2" />
          )}
          {group.items.map((item) => {
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
                    {"badge" in item && item.badge && (
                      item.href === "/agency/content"
                        ? <PendingApprovalBadge />
                        : <UnreadBadge />
                    )}
                  </>
                )}
              </Link>
            );
          })}
        </div>
      ))}
    </>
  );

  return (
    <>
      {/* Desktop Sidebar — always LEFT */}
      <aside
        className={cn(
          "hidden lg:flex flex-col bg-card border-r border-border transition-all duration-300 h-screen sticky top-0 flex-shrink-0",
          collapsed ? "w-[68px]" : "w-60"
        )}
      >
        {/* Logo */}
        <div className="h-14 flex items-center justify-between px-4 border-b border-border">
          {!collapsed && (
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
                <Zap className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="font-bold text-foreground">
                {role === "agency" ? AGENCY_NAME : "SocialPilot"}
              </span>
            </div>
          )}
          <button
            onClick={() => { const next = !collapsed; setCollapsed(next); localStorage.setItem("sp-sidebar-collapsed", String(next)); }}
            className={cn("p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground", collapsed && "mx-auto")}
          >
            <ChevronRight className={cn("w-4 h-4 transition-transform", collapsed ? "" : "rotate-180")} />
          </button>
        </div>

        {/* Business name */}
        {!collapsed && businessName && (
          <div className="px-4 py-3 border-b border-border">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-0.5">Account</p>
            <p className="text-sm font-semibold text-foreground truncate">{businessName}</p>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          <NavLinks />
        </nav>

        {/* Sign out only */}
        <div className="p-3 border-t border-border">
          <button
            onClick={handleLogout}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted w-full transition-colors",
              collapsed && "justify-center"
            )}
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            {!collapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-card border-b border-border z-50 flex items-center justify-between px-4">
        <button onClick={() => setMobileOpen(!mobileOpen)} className="p-2 rounded-lg hover:bg-muted">
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center">
            <Zap className="w-3 h-3 text-white" />
          </div>
          <span className="font-bold text-foreground text-sm">
            {role === "agency" ? AGENCY_NAME : "SocialPilot"}
          </span>
        </div>
        <div className="w-9" /> {/* spacer to center logo */}
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="lg:hidden fixed inset-0 z-40 bg-black/50"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile drawer — always from LEFT */}
      {mobileOpen && (
        <motion.aside
          initial={{ x: -260 }}
          animate={{ x: 0 }}
          className="lg:hidden fixed top-14 bottom-0 left-0 w-60 bg-card border-r border-border z-50 flex flex-col"
          dir="ltr"
        >
          {businessName && (
            <div className="px-4 py-3 border-b border-border">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-0.5">Account</p>
              <p className="text-sm font-semibold text-foreground">{businessName}</p>
            </div>
          )}
          <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
            <NavLinks onClick={() => setMobileOpen(false)} />
          </nav>
          <div className="p-3 border-t border-border">
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted w-full"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </motion.aside>
      )}
    </>
  );
}
