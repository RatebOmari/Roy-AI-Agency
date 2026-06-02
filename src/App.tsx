import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/client/Dashboard";
import Inbox from "./pages/client/Inbox";
import Comments from "./pages/client/Comments";
import ToneSettings from "./pages/client/ToneSettings";
import Analytics from "./pages/client/Analytics";
import Contacts from "./pages/client/Contacts";
import Content from "./pages/client/Content";
import Resources from "./pages/client/Resources";
import Templates from "./pages/client/Templates";
import Campaigns from "./pages/client/Campaigns";
import Flows from "./pages/client/Flows";
import Team from "./pages/client/Team";
import Listening from "./pages/client/Listening";
import Phone from "./pages/client/Phone";
import Automation from "./pages/client/Automation";
import AgencyDashboard from "./pages/agency/Dashboard";
import AgencyClients from "./pages/agency/Clients";
import AgencyAnalytics from "./pages/agency/Analytics";
import AgencySettings from "./pages/agency/Settings";
import AgencyCommandCenter from "./pages/agency/CommandCenter";
import ClientOnboarding from "./pages/agency/ClientOnboarding";
import AcceptInvite from "./pages/AcceptInvite";
import TeamLogin from "./pages/TeamLogin";
import { useAuth } from "@/contexts/AuthContext";
import { AgencyClientProvider, useAgencyClient } from "@/contexts/AgencyClientContext";
import { homeRoute } from "@/lib/routing";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1 } },
});


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
              onClick={() => { this.setState({ error: null }); window.location.reload(); }}
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
            <Route path="/campaigns"           element={<ProtectedRoute requiredRole="client"><Campaigns /></ProtectedRoute>} />
            <Route path="/flows"               element={<ProtectedRoute requiredRole="client"><Flows /></ProtectedRoute>} />
            <Route path="/team"                element={<ProtectedRoute requiredRole="client"><Team /></ProtectedRoute>} />
            <Route path="/listening"           element={<ProtectedRoute requiredRole="client"><Listening /></ProtectedRoute>} />
            <Route path="/calls"               element={<Navigate to="/phone" replace />} />
            <Route path="/phone"               element={<ProtectedRoute requiredRole="client"><Phone /></ProtectedRoute>} />
            <Route path="/settings"            element={<ProtectedRoute requiredRole="client"><ToneSettings /></ProtectedRoute>} />

            {/* Agency — exactly 6 routes for the single-agency platform */}
            <Route path="/agency"              element={<ProtectedRoute requiredRole="agency"><Navigate to="/agency/dashboard" replace /></ProtectedRoute>} />
            <Route path="/agency/dashboard"    element={<ProtectedRoute requiredRole="agency"><AgencyDashboard /></ProtectedRoute>} />
            <Route path="/agency/clients/new"  element={<ProtectedRoute requiredRole="agency"><ClientOnboarding /></ProtectedRoute>} />
            <Route path="/agency/clients"      element={<ProtectedRoute requiredRole="agency"><AgencyClients /></ProtectedRoute>} />
            <Route path="/agency/analytics"    element={<ProtectedRoute requiredRole="agency"><AgencyAnalytics /></ProtectedRoute>} />
            <Route path="/agency/settings"     element={<ProtectedRoute requiredRole="agency"><AgencySettings /></ProtectedRoute>} />
            <Route path="/agency/command"      element={<ProtectedRoute requiredRole="agency"><AgencyCommandCenter /></ProtectedRoute>} />

            <Route path="*"                    element={<SmartFallback />} />
          </Routes>
        </ErrorBoundary>
      </BrowserRouter>
      </AgencyClientProvider>
    </QueryClientProvider>
  );
}
