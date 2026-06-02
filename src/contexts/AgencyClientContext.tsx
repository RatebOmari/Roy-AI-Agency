import { createContext, useContext, useState, useCallback, useMemo } from "react";
import type { AgencyClient } from "@/types";
import { setClientId } from "@/lib/api";

interface AgencyClientContextValue {
  selectedClient: AgencyClient | null;
  selectClient: (client: AgencyClient | null) => void;
}

const AgencyClientContext = createContext<AgencyClientContextValue | null>(null);

export function AgencyClientProvider({ children }: { children: React.ReactNode }) {
  const [selectedClient, setSelectedClient] = useState<AgencyClient | null>(null);

  const selectClient = useCallback((client: AgencyClient | null) => {
    setSelectedClient(client);
    setClientId(client?.id ?? null);
  }, []);

  const value = useMemo(
    () => ({ selectedClient, selectClient }),
    [selectedClient, selectClient]
  );

  return (
    <AgencyClientContext.Provider value={value}>
      {children}
    </AgencyClientContext.Provider>
  );
}

export function useAgencyClient() {
  const ctx = useContext(AgencyClientContext);
  if (!ctx) throw new Error("useAgencyClient must be used inside AgencyClientProvider");
  return ctx;
}
