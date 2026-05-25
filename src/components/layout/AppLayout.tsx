import { useTranslation } from "react-i18next";
import { Sidebar } from "./Sidebar";

type Role = "agency" | "client";

interface AppLayoutProps {
  children: React.ReactNode;
  role: Role;
  businessName?: string;
}

export function AppLayout({ children, role, businessName }: AppLayoutProps) {
  const { i18n } = useTranslation();
  const contentDir = i18n.language === "ar" ? "rtl" : "ltr";

  return (
    <div className="flex min-h-screen bg-muted/30">
      {/* Sidebar always on the left — flex default (ltr) */}
      <Sidebar role={role} businessName={businessName} />
      <main className="flex-1 pt-16 lg:pt-0 overflow-auto" dir={contentDir}>
        <div className="p-6 lg:p-8 max-w-7xl mx-0">{children}</div>
      </main>
    </div>
  );
}
