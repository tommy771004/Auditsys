import React, { useRef, useState } from "react";
import { motion } from "framer-motion";
import { LogIn, AlertCircle, Eye, EyeOff } from "lucide-react";
import GlassContainer from "../components/ui/GlassContainer";
import GlowingButton from "../components/ui/GlowingButton";
import Logos3 from "../components/ui/Logos3";
import { Reveal } from "../components/ui/Reveal";
import type { NavigateTo } from "../types/home";

interface Props {
  onNavigate: NavigateTo;
}

export default function Login({ onNavigate }: Props) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const usernameRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const endpoint = isRegistering ? "/api/auth/register" : "/api/auth/login";

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || (isRegistering ? "Registration failed" : "Login failed"));
      }

      if (data.token) {
        localStorage.setItem("auth_token", data.token);
      }

      const hasIntakeData = !!localStorage.getItem("intake_submitted_data");
      const hasIntakeUrl = !!localStorage.getItem("intake_submitted_url");

      if (hasIntakeData || hasIntakeUrl) {
        onNavigate("console");
      } else {
        onNavigate(data.user.isAdmin ? "admin" : "home");
      }
    } catch (err: any) {
      setError(err.message);
      usernameRef.current?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-14 pt-24 pb-12 px-4 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <GlassContainer className="p-8">
          <div className="text-center mb-8">
            <LogIn className="mx-auto h-12 w-12 text-brand-purple mb-4" />
            <h2 className="text-3xl font-bold tracking-tight text-brand-text">
              {isRegistering ? "Create your account" : "Sign in to your account"}
            </h2>
          </div>

          {error && (
            <motion.div
              role="alert"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="mb-4 p-4 rounded-md bg-brand-danger/10 border border-brand-danger/20 flex items-start text-brand-danger"
            >
              <AlertCircle className="h-5 w-5 mr-3 shrink-0" />
              <p className="text-sm">{error}</p>
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-brand-muted mb-2">
                Username
              </label>
              <input
                ref={usernameRef}
                type="text"
                required
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-brand-surface/50 border border-white/10 rounded-lg px-4 py-3 text-brand-text placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-950 focus:ring-brand-purple/50 transition-all"
                placeholder="Enter your username"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-brand-muted mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete={isRegistering ? "new-password" : "current-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-brand-surface/50 border border-white/10 rounded-lg px-4 py-3 pr-12 text-brand-text placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-950 focus:ring-brand-purple/50 transition-all"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-9 w-9 items-center justify-center rounded-md text-brand-muted hover:text-white focus-visible:ring-2 focus-visible:ring-brand-purple/60 focus-visible:outline-none transition"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <GlowingButton
              type="submit"
              disabled={isLoading}
              loadingLabel={isRegistering ? "Creating account..." : "Signing in..."}
              className="w-full py-4 rounded-lg flex items-center justify-center font-medium bg-brand-blue/20 hover:bg-brand-blue/30 text-brand-text"
            >
              {isLoading ? (isRegistering ? "Creating account..." : "Signing in...") : (isRegistering ? "Create Account" : "Sign in")}
            </GlowingButton>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => {
                setIsRegistering(!isRegistering);
                setError(null);
                setUsername("");
                setPassword("");
              }}
              className="text-sm text-brand-cyan hover:underline transition-colors focus:outline-none"
            >
              {isRegistering ? "Already have an account? Sign in" : "Need an account? Register"}
            </button>
          </div>
        </GlassContainer>
      </motion.div>

      <Reveal className="w-full max-w-2xl">
        <Logos3 />
      </Reveal>
    </div>
  );
}
