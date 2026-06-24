import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Zap, Users, Loader2, AlertCircle, ArrowRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { homeRoute } from "@/lib/routing";

export default function TeamLogin() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { teamLogin, isLoading } = useAuth();

  const [error, setError] = useState("");
  const [name, setName]   = useState("");

  useEffect(() => {
    if (!token) { setError("Invalid invite link — no token found."); return; }
    teamLogin(token)
      .then(user => { setName(user.name); setTimeout(() => navigate(homeRoute(user)), 1200); })
      .catch(() => setError("This invite link is invalid, expired, or has been disabled."));
  }, [token, teamLogin, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-muted flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm text-center"
      >
        <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-6 shadow-lg">
          <Zap className="w-7 h-7 text-white" />
        </div>

        <div className="bg-card rounded-2xl border border-border shadow-sm p-8 space-y-5">
          {error ? (
            <>
              <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center mx-auto">
                <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Invite Invalid</p>
                <p className="text-sm text-muted-foreground mt-1">{error}</p>
              </div>
              <button
                onClick={() => navigate("/login")}
                className="flex items-center justify-center gap-2 w-full py-2.5 border border-border rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                Back to Login
              </button>
            </>
          ) : isLoading || !name ? (
            <>
              <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
              <p className="text-sm text-muted-foreground">Verifying your invite…</p>
            </>
          ) : (
            <>
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Welcome, {name}!</p>
                <p className="text-sm text-muted-foreground mt-1">Signing you in…</p>
              </div>
              <div className="flex items-center justify-center gap-2 text-sm text-primary font-medium">
                <ArrowRight className="w-4 h-4 animate-pulse" />
                Redirecting
              </div>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
