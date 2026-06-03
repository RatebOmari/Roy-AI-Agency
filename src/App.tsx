import React, { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import Login from "./pages/Login";
import AcceptInvite from "./pages/AcceptInvite";
import TeamLogin from "./pages/TeamLogin";
import { useAuth } from "@/contexts/AuthContext";
import { AgencyClientProvider, useAgencyClient } from "@/contexts/AgencyClientContext";
import { homeRoute } from "@/lib/routing";

// ── Lazy-loaded page chunks ───────────────────────────────────────────────────
// Login/AcceptInvite/TeamLogin are kept eager (tiny + entry-point critical path).
// Every other page is split into its own chunk — only downloaded on first visit.

const Dashboard        = lazy(() => import("./pages/client/Dashboard"));
const Inbox            = lazy(() => import("./pages/client/Inbox"));
const Comments         = lazy(() => import("./pages/client/Comments"));
const ToneSettings     = lazy(() => import("./pages/client/ToneSettings"));
const Analytics        = lazy(() => import("./pages/client/Analytics"));
const Contacts         = lazy(() => import("./pages/client/Contacts"));
const Content          = lazy(() => import("./pages/client/Content"));
const Resources        = lazy(() => import("./pages/client/Resources"));
const Templates        = lazy(() => import("./pages/client/Templates"));
const Outreach         = lazy(() => import("./pages/client/Outreach"));
const Flows            = lazy(() => import("./pages/client/Flows"));
const Team             = lazy(() => import("./pages/client/Team"));
const Listening        = lazy(() => import("./pages/client/Listening"));
const Phone            = lazy(() => import("./pages/client/Phone"));
const Automation       = lazy(() => import("./pages/client/Automation"));

const AgencyDashboard      = lazy(() => import("./pages/agency/Dashboard"));
const AgencyClients        = lazy(() => import("./pages/agency/Clients"));
const AgencyAnalytics      = lazy(() => import("./pages/agency/Analytics"));
const AgencySettings       = lazy(() => import("./pages/agency/Settings"));
const AgencyCommandCenter  = lazy(() => import("./pages/agency/CommandCenter"));
const AgencyContent        = lazy(() => import("./pages/agency/Content"));
const AgencyOutreach       = lazy(() => import("./pages/agency/Outreach"));
const ClientOnboarding     = lazy(() => import("./pages/agency/ClientOnboarding"));

// ── Query client ──────────────────────────────────────────────────────────────

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      // Refetch on window focus is redundant for queries that already use
      // refetchInterval. Disabling globally cuts unnecessary network requests
      // on every tab/window switch. Mutations still trigger invalidation.
      refetchOnWindowFocus: false,
    },
  },
});

// ── Suspense fallback ─────────────────────────────────────────────────────────

function PageSkeleton() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
    </div>
  );
}

// ── Route guards ──────────────────────────────────────────────────────────────

function ProtectedRoute({ children, requiredRole }: { children: React.ReactNode; requiredRole?: "client" | "agency" }) {
  const { isAuthenticated, user } = useAuth();
  const { selectedClient } = useAgencyClient();
  const location = useLocation();
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  // Team role enforcement — agents see only /inbox, viewers see only /analytics
  if (user?.teamRole === "agent" && !location.pathname.startsWith("/inbox")) {
    return <Navigate to="/inbox" replace />;
  }
  if (user?.teamRole === "viewer" && !location.pathname.startsWith("/analytics")) {
    return <Navigate to="/analytics" replace />;
  }

  if (requiredRole && user?.role !== requiredRole) {
    // Agency user with a selected client may access client routes
    if (requiredRole === "client" && user?.role === "agency" && selectedClient) {
      return <>{children}</>;
    }
    return <Navigate to={homeRoute(user!)} replace />;
  }
  return <>{children}</>;
}

// Authenticated users hitting an unknown URL land on their own dashboard.
// Unauthenticated users go to login.
function SmartFallback() {
  const { isAuthenticated, user } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Navigate to={homeRoute(user!)} replace />;
}

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-6">
          <div className="max-w-md text-center space-y-4">
            <p className="text-foreground font-semibold">Something went wrong</p>
            <p className="text-muted-foreground text-sm">{this.state.error.message}</p>
            <button
              onClick={() => { this.setState({ error: null }); window.location.replace("/?reset=1"); }}
              className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium"
            >
              Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AgencyClientProvider>
      <BrowserRouter>
        <ErrorBoundary>
          <Suspense fallback={<PageSkeleton />}>
            <Routes>
              <Route path="/"                    element={<Navigate to="/login" replace />} />
              <Route path="/login"               element={<Login />} />
              <Route path="/accept-invite/:token" element={<AcceptInvite />} />
              <Route path="/team-login/:token"      element={<TeamLogin />} />

              {/* Client */}
              <Route path="/dashboard"           element={<ProtectedRoute requiredRole="client"><Dashboard /></ProtectedRoute>} />
              <Route path="/inbox"               element={<ProtectedRoute requiredRole="client"><Inbox /></ProtectedRoute>} />
              <Route path="/comments"            element={<ProtectedRoute requiredRole="client"><Comments /></ProtectedRoute>} />
              <Route path="/contacts"            element={<ProtectedRoute requiredRole="client"><Contacts /></ProtectedRoute>} />
              <Route path="/analytics"           element={<ProtectedRoute requiredRole="client"><Analytics /></ProtectedRoute>} />
              <Route path="/automation"          element={<ProtectedRoute requiredRole="client"><Automation /></ProtectedRoute>} />
              <Route path="/content"             element={<ProtectedRoute requiredRole="client"><Content /></ProtectedRoute>} />
              <Route path="/resources"           element={<ProtectedRoute requiredRole="client"><Resources /></ProtectedRoute>} />
              <Route path="/templates"           element={<ProtectedRoute requiredRole="client"><Templates /></ProtectedRoute>} />
              <Route path="/campaigns"           element={<Navigate to="/outreach" replace />} />
              <Route path="/outreach"            element={<ProtectedRoute requiredRole="client"><Outreach /></ProtectedRoute>} />
              <Route path="/flows"               element={<ProtectedRoute requiredRole="client"><Flows /></ProtectedRoute>} />
              <Route path="/team"                element={<ProtectedRoute requiredRole="client"><Team /></ProtectedRoute>} />
              <Route path="/listening"           element={<ProtectedRoute requiredRole="client"><Listening /></ProtectedRoute>} />
              <Route path="/calls"               element={<Navigate to="/phone" replace />} />
              <Route path="/phone"               element={<ProtectedRoute requiredRole="client"><Phone /></ProtectedRoute>} />
              <Route path="/settings"            element={<ProtectedRoute requiredRole="client"><ToneSettings /></ProtectedRoute>} />

              {/* Agency */}
              <Route path="/agency"              element={<ProtectedRoute requiredRole="agency"><Navigate to="/agency/dashboard" replace /></ProtectedRoute>} />
              <Route path="/agency/dashboard"    element={<ProtectedRoute requiredRole="agency"><AgencyDashboard /></ProtectedRoute>} />
              <Route path="/agency/clients/new"  element={<ProtectedRoute requiredRole="agency"><ClientOnboarding /></ProtectedRoute>} />
              <Route path="/agency/clients"      element={<ProtectedRoute requiredRole="agency"><AgencyClients /></ProtectedRoute>} />
              <Route path="/agency/analytics"    element={<ProtectedRoute requiredRole="agency"><AgencyAnalytics /></ProtectedRoute>} />
              <Route path="/agency/settings"     element={<ProtectedRoute requiredRole="agency"><AgencySettings /></ProtectedRoute>} />
              <Route path="/agency/command"      element={<ProtectedRoute requiredRole="agency"><AgencyCommandCenter /></ProtectedRoute>} />
              <Route path="/agency/content"      element={<ProtectedRoute requiredRole="agency"><AgencyContent /></ProtectedRoute>} />
              <Route path="/agency/outreach"     element={<ProtectedRoute requiredRole="agency"><AgencyOutreach /></ProtectedRoute>} />

              <Route path="*"                    element={<SmartFallback />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </BrowserRouter>
      </AgencyClientProvider>
    </QueryClientProvider>
  );
}
