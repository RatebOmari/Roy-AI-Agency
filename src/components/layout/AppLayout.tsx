import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Sidebar } from "./Sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { useAgencyClient } from "@/contexts/AgencyClientContext";
import { ArrowLeft, Eye } from "lucide-react";

type Role = "agency" | "client";

interface AppLayoutProps {
  children: React.ReactNode;
  role: Role;
  businessName?: string;
}

export function AppLayout({ children, role, businessName }: AppLayoutProps) {
  const { user } = useAuth();
  const { selectedClient, selectClient } = useAgencyClient();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const showBanner = user?.role === "agency" && !!selectedClient;

  const exitClientView = () => {
    selectClient(null);
    queryClient.clear();
    navigate("/agency/clients");
  };

  return (
    <div className="flex min-h-screen bg-muted/30">
      <Sidebar role={role} businessName={businessName} />
      <main className="flex-1 pt-14 lg:pt-0 overflow-auto">
        {showBanner && (
          <div className="sticky top-0 z-30 flex items-center justify-between gap-3 px-6 py-2 bg-primary text-white text-sm font-medium shadow-sm">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 shrink-0" />
              <span>Viewing as client: <span className="font-bold">{selectedClient.name}</span></span>
            </div>
            <button
              onClick={exitClientView}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/20 hover:bg-white/30 transition-colors text-xs font-semibold"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Exit
            </button>
          </div>
        )}
        <div className="p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
