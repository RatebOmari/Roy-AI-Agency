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
import AgencyClients from "./pages/agency/Clients";
import { useAuth } from "@/contexts/AuthContext";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1 },
  },
});

function ProtectedRoute({ children, requiredRole }: { children: React.ReactNode; requiredRole?: "client" | "agency" }) {
  const { isAuthenticated, user } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (requiredRole && user?.role !== requiredRole) {
    return <Navigate to={user?.role === "agency" ? "/agency/clients" : "/dashboard"} replace />;
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/"                  element={<Navigate to="/login" replace />} />
          <Route path="/login"             element={<Login />} />

          {/* Client routes */}
          <Route path="/dashboard"         element={<ProtectedRoute requiredRole="client"><Dashboard /></ProtectedRoute>} />
          <Route path="/inbox"             element={<ProtectedRoute requiredRole="client"><Inbox /></ProtectedRoute>} />
          <Route path="/comments"          element={<ProtectedRoute requiredRole="client"><Comments /></ProtectedRoute>} />
          <Route path="/contacts"          element={<ProtectedRoute requiredRole="client"><Contacts /></ProtectedRoute>} />
          <Route path="/analytics"         element={<ProtectedRoute requiredRole="client"><Analytics /></ProtectedRoute>} />
          <Route path="/automation"        element={<ProtectedRoute requiredRole="client"><Automation /></ProtectedRoute>} />
          <Route path="/settings"          element={<ProtectedRoute requiredRole="client"><ToneSettings /></ProtectedRoute>} />

          {/* Agency routes */}
          <Route path="/agency/clients"    element={<ProtectedRoute requiredRole="agency"><AgencyClients /></ProtectedRoute>} />

          <Route path="*"                  element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
