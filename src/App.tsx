import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/client/Dashboard";
import Inbox from "./pages/client/Inbox";
import Comments from "./pages/client/Comments";
import ToneSettings from "./pages/client/ToneSettings";
import Analytics from "./pages/client/Analytics";
import Automation from "./pages/client/Automation";
import Contacts from "./pages/client/Contacts";
import Content from "./pages/client/Content";
import Resources from "./pages/client/Resources";
import Templates from "./pages/client/Templates";
import Campaigns from "./pages/client/Campaigns";
import Flows from "./pages/client/Flows";
import Team from "./pages/client/Team";
import Listening from "./pages/client/Listening";
import AgencyDashboard from "./pages/agency/Dashboard";
import AgencyClients from "./pages/agency/Clients";
import AgencyAnalytics from "./pages/agency/Analytics";
import AgencySettings from "./pages/agency/Settings";
import { useAuth } from "@/contexts/AuthContext";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1 } },
});

function ProtectedRoute({ children, requiredRole }: { children: React.ReactNode; requiredRole?: "client" | "agency" }) {
  const { isAuthenticated, user } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (requiredRole && user?.role !== requiredRole) {
    return <Navigate to={user?.role === "agency" ? "/agency/dashboard" : "/dashboard"} replace />;
  }
  return <>{children}</>;
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
      <BrowserRouter>
        <ErrorBoundary>
          <Routes>
            <Route path="/"                    element={<Navigate to="/login" replace />} />
            <Route path="/login"               element={<Login />} />

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
            <Route path="/settings"            element={<ProtectedRoute requiredRole="client"><ToneSettings /></ProtectedRoute>} />

            {/* Agency */}
            <Route path="/agency/dashboard"    element={<ProtectedRoute requiredRole="agency"><AgencyDashboard /></ProtectedRoute>} />
            <Route path="/agency/clients"      element={<ProtectedRoute requiredRole="agency"><AgencyClients /></ProtectedRoute>} />
            <Route path="/agency/analytics"    element={<ProtectedRoute requiredRole="agency"><AgencyAnalytics /></ProtectedRoute>} />
            <Route path="/agency/settings"     element={<ProtectedRoute requiredRole="agency"><AgencySettings /></ProtectedRoute>} />

            <Route path="*"                    element={<Navigate to="/login" replace />} />
          </Routes>
        </ErrorBoundary>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
