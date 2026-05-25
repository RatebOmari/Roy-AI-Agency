import { Sidebar } from "./Sidebar";

type Role = "agency" | "client";

interface AppLayoutProps {
  children: React.ReactNode;
  role: Role;
  businessName?: string;
}

export function AppLayout({ children, role, businessName }: AppLayoutProps) {
  return (
    <div className="flex min-h-screen bg-muted/30" dir="rtl">
      <Sidebar role={role} businessName={businessName} />
      <main className="flex-1 pt-16 lg:pt-0 overflow-auto">
        <div className="p-6 lg:p-8 max-w-7xl">{children}</div>
      </main>
    </div>
  );
}
