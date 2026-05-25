import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/client/Dashboard";
import Comments from "./pages/client/Comments";
import ToneSettings from "./pages/client/ToneSettings";
import AgencyClients from "./pages/agency/Clients";

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/"                element={<Navigate to="/login" replace />} />
          <Route path="/login"           element={<Login />} />
          <Route path="/dashboard"       element={<Dashboard />} />
          <Route path="/comments"        element={<Comments />} />
          <Route path="/settings"        element={<ToneSettings />} />
          <Route path="/agency/clients"  element={<AgencyClients />} />
          <Route path="*"                element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
