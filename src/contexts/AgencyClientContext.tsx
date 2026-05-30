import { createContext, useContext, useState } from "react";
import type { AgencyClient } from "@/types";
import { setClientId } from "@/lib/api";

interface AgencyClientContextValue {
  selectedClient: AgencyClient | null;
  selectClient: (client: AgencyClient | null) => void;
}

const AgencyClientContext = createContext<AgencyClientContextValue | null>(null);

export function AgencyClientProvider({ children }: { children: React.ReactNode }) {
  const [selectedClient, setSelectedClient] = useState<AgencyClient | null>(null);

  const selectClient = (client: AgencyClient | null) => {
    setSelectedClient(client);
    setClientId(client?.id ?? null);
  };

  return (
    <AgencyClientContext.Provider value={{ selectedClient, selectClient }}>
      {children}
    </AgencyClientContext.Provider>
  );
}

export function useAgencyClient() {
  const ctx = useContext(AgencyClientContext);
  if (!ctx) throw new Error("useAgencyClient must be used inside AgencyClientProvider");
  return ctx;
}
