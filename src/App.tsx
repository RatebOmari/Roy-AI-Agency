import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/client/Dashboard";
import Comments from "./pages/client/Comments";
import ToneSettings from "./pages/client/ToneSettings";
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
          <Route path="/"               element={<Navigate to="/login" replace />} />
          <Route path="/login"          element={<Login />} />
          <Route path="/dashboard"      element={<ProtectedRoute requiredRole="client"><Dashboard /></ProtectedRoute>} />
          <Route path="/comments"       element={<ProtectedRoute requiredRole="client"><Comments /></ProtectedRoute>} />
          <Route path="/settings"       element={<ProtectedRoute requiredRole="client"><ToneSettings /></ProtectedRoute>} />
          <Route path="/agency/clients" element={<ProtectedRoute requiredRole="agency"><AgencyClients /></ProtectedRoute>} />
          <Route path="*"               element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
