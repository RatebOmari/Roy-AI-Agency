import { createContext, useContext, useState, useCallback, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { AgencyClient } from "@/types";
import { setClientId } from "@/lib/api";

interface AgencyClientContextValue {
  selectedClient: AgencyClient | null;
  selectClient: (client: AgencyClient | null) => void;
}

const AgencyClientContext = createContext<AgencyClientContextValue | null>(null);

// Which client an agency user is currently acting as. Stored per-tab in
// sessionStorage: it must survive a page refresh (otherwise the agency silently
// loses client scoping while still sitting on the client's screens), but it
// should NOT outlive the tab — impersonation shouldn't quietly resume later.
const STORAGE_KEY = "royto-acting-client";

function readStoredClient(): AgencyClient | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AgencyClient) : null;
  } catch {
    return null;
  }
}

export function AgencyClientProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();

  const [selectedClient, setSelectedClient] = useState<AgencyClient | null>(() => {
    const stored = readStoredClient();
    // Restore the x-client-id header synchronously, before any query runs, so
    // the first requests after a refresh are still scoped to this client.
    setClientId(stored?.id ?? null);
    return stored;
  });

  const selectClient = useCallback((client: AgencyClient | null) => {
    setSelectedClient((prev) => {
      // Switching who we act as invalidates every cached response — otherwise
      // the previous client's data renders under the new client's name.
      if (prev?.id !== client?.id) queryClient.clear();
      return client;
    });

    setClientId(client?.id ?? null);

    try {
      if (client) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(client));
      else sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // Storage unavailable (private mode) — in-memory scoping still applies.
    }
  }, [queryClient]);

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
