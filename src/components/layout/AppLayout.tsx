import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { useAgencyClient } from "@/contexts/AgencyClientContext";
import { useClients } from "@/hooks/useClients";
import { ArrowLeft, Eye, ChevronDown, Check } from "lucide-react";

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
  const showBanner = user?.role === "agency" && !!selectedClient;

  // Only fetched while actually acting as a client, to power the switcher.
  const { data: clients = [] } = useClients({ enabled: showBanner });
  const [switcherOpen, setSwitcherOpen] = useState(false);

  const exitClientView = () => {
    selectClient(null);
    navigate("/agency/clients");
  };

  return (
    <div className="flex min-h-screen bg-muted/30">
      <Sidebar role={role} businessName={businessName} />
      <main className="flex-1 pt-14 lg:pt-0 overflow-auto">
        {showBanner && (
          <div className="sticky top-0 z-30 flex items-center justify-between gap-3 px-6 py-2 bg-primary text-white text-sm font-medium shadow-sm">
            <div className="flex items-center gap-2 min-w-0">
              <Eye className="w-4 h-4 shrink-0" />
              <span className="shrink-0">Viewing as client:</span>

              {/* Switch clients without exiting and re-selecting */}
              <div className="relative">
                <button
                  onClick={() => setSwitcherOpen(o => !o)}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white/20 hover:bg-white/30 transition-colors font-bold max-w-[45vw] truncate"
                >
                  <span className="truncate">{selectedClient.name}</span>
                  <ChevronDown className="w-3.5 h-3.5 shrink-0" />
                </button>

                {switcherOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setSwitcherOpen(false)} />
                    <div className="absolute left-0 mt-1 z-20 w-64 max-h-72 overflow-auto bg-card text-foreground border border-border rounded-xl shadow-lg py-1">
                      {clients.map(c => (
                        <button
                          key={c.id}
                          onClick={() => { selectClient(c); setSwitcherOpen(false); }}
                          className="flex items-center justify-between gap-2 w-full px-3 py-2 text-sm hover:bg-muted text-left"
                        >
                          <span className="truncate">{c.name}</span>
                          {c.id === selectedClient.id && <Check className="w-4 h-4 text-primary shrink-0" />}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            <button
              onClick={exitClientView}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/20 hover:bg-white/30 transition-colors text-xs font-semibold shrink-0"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Exit
            </button>
          </div>
        )}
        <div className="p-4 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
