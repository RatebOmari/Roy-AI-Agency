import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Zap, Lock, CheckCircle2, AlertCircle, Loader2, ArrowRight } from "lucide-react";
import { api } from "@/lib/api";

export default function AcceptInvite() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const mismatch = confirm.length > 0 && password !== confirm;
  const weak = password.length > 0 && password.length < 8;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm || password.length < 8) return;
    setError("");
    setLoading(true);
    try {
      await api.post("/auth/accept-invite", { token, password });
      setDone(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Invalid or expired invite link");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-muted flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Zap className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Set Your Password</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Your account is ready — create a password to get started.
          </p>
        </div>

        <div className="bg-card rounded-2xl border border-border shadow-sm p-6 space-y-5">
          {done ? (
            <div className="text-center space-y-4 py-4">
              <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Password set!</p>
                <p className="text-sm text-muted-foreground mt-1">You can now sign in with your email and new password.</p>
              </div>
              <button
                onClick={() => navigate("/login")}
                className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-sm font-medium rounded-xl hover:bg-primary/90 transition-colors mx-auto"
              >
                Go to Login
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <>
              {error && (
                <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 dark:bg-red-900/20 rounded-xl px-3 py-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">New Password</label>
                  <div className="relative">
                    <Lock className="absolute top-1/2 -translate-y-1/2 left-3 w-4 h-4 text-muted-foreground" />
                    <input
                      type="password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="At least 8 characters"
                      required
                      className="w-full pl-10 pr-4 py-2.5 border border-border rounded-xl text-base md:text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-background"
                    />
                  </div>
                  {weak && <p className="text-xs text-amber-600">Password must be at least 8 characters</p>}
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Confirm Password</label>
                  <div className="relative">
                    <Lock className="absolute top-1/2 -translate-y-1/2 left-3 w-4 h-4 text-muted-foreground" />
                    <input
                      type="password"
                      value={confirm}
                      onChange={e => setConfirm(e.target.value)}
                      placeholder="Repeat your password"
                      required
                      className="w-full pl-10 pr-4 py-2.5 border border-border rounded-xl text-base md:text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-background"
                    />
                  </div>
                  {mismatch && <p className="text-xs text-red-500">Passwords don't match</p>}
                </div>

                <button
                  type="submit"
                  disabled={loading || weak || mismatch || !password || !confirm}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-primary text-white rounded-xl font-medium hover:bg-primary/90 transition-colors disabled:opacity-60"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Set Password <ArrowRight className="w-4 h-4" /></>}
                </button>
              </form>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
