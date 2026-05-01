"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff, Lock, ShieldCheck } from "lucide-react";
import { getSafeNextPath } from "@/lib/security/paths";

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Could not update password. Please request a new reset link.";
}

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [nextPath] = useState(() => {
    if (typeof window === "undefined") {
      return "/dashboard";
    }
    const params = new URLSearchParams(window.location.search);
    return getSafeNextPath(params.get("next"));
  });

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const initializeSession = async () => {
      const response = await fetch("/api/auth/session", { method: "GET" });
      const result = (await response.json().catch(() => null)) as
        | { authenticated?: boolean }
        | null;

      if (!active) {
        return;
      }

      setSessionReady(Boolean(result?.authenticated));
      setCheckingSession(false);
    };

    void initializeSession();

    return () => {
      active = false;
    };
  }, []);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!sessionReady) {
      setErrorMessage("Your reset session is missing or expired. Request a new reset link.");
      return;
    }

    if (!password) {
      setErrorMessage("Password is required.");
      return;
    }

    if (password.length < 8) {
      setErrorMessage("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/update-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password }),
      });

      const result = (await response.json().catch(() => null)) as
        | { ok: boolean; message?: string }
        | null;
      if (!response.ok || !result?.ok) {
        setErrorMessage(result?.message ?? "Could not update password. Please try again.");
        return;
      }

      setSuccessMessage("Password updated. Redirecting to sign in...");
      const signinUrl = new URL("/signin", window.location.origin);
      if (nextPath !== "/dashboard") {
        signinUrl.searchParams.set("next", nextPath);
      }
      signinUrl.searchParams.set(
        "message",
        "Password updated. Sign in with your new password.",
      );
      router.replace(`${signinUrl.pathname}${signinUrl.search}`);
      router.refresh();
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
          <div className="text-center mb-8">
            <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 mb-1">Set a new password</h1>
            <p className="text-sm text-slate-500">
              Choose a secure password to complete account recovery.
            </p>
          </div>

          {checkingSession && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600 mb-5">
              Verifying recovery session...
            </div>
          )}

          {!checkingSession && !sessionReady && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 mb-5">
              This reset link is invalid or expired. Request a new one.
            </div>
          )}

          <form onSubmit={handleUpdatePassword} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                New password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  autoComplete="new-password"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Confirm new password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  autoComplete="new-password"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {errorMessage && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {errorMessage}
              </p>
            )}

            {successMessage && (
              <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                {successMessage}
              </p>
            )}

            <button
              type="submit"
              disabled={isLoading || checkingSession || !sessionReady}
              className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl font-semibold text-sm transition-all hover:shadow-lg hover:shadow-emerald-200 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Update password
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            <Link href="/forgot-password" className="text-emerald-600 hover:text-emerald-700 font-medium">
              Request another reset link
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
