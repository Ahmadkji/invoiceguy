"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff, Lock, Mail, UserPlus } from "lucide-react";
import { getSafeNextPath } from "@/lib/security/paths";

function getSignupErrorMessage(error: unknown) {
  if (!(error instanceof Error)) {
    return "Could not create account. Please try again.";
  }

  const message = error.message.toLowerCase();

  if (message.includes("already registered") || message.includes("already exists")) {
    return "If this email already has an account, sign in or reset your password.";
  }

  return error.message;
}

export default function SignupPage() {
  const router = useRouter();
  const [nextPath] = useState(() => {
    if (typeof window === "undefined") {
      return "/dashboard";
    }
    const params = new URLSearchParams(window.location.search);
    return getSafeNextPath(params.get("next"));
  });

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [resendLoading, setResendLoading] = useState(false);
  const [lastSignupEmail, setLastSignupEmail] = useState<string | null>(null);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      setErrorMessage("Email is required.");
      return;
    }

    if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) {
      setErrorMessage("Enter a valid email address.");
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
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: cleanEmail,
          password,
          nextPath,
        }),
      });

      const result = (await response.json().catch(() => null)) as
        | { ok: boolean; message?: string; requiresEmailConfirmation?: boolean }
        | null;

      if (!response.ok || !result?.ok) {
        setErrorMessage(result?.message ?? "Could not create account. Please try again.");
        return;
      }

      setLastSignupEmail(cleanEmail);

      if (!result.requiresEmailConfirmation) {
        setSuccessMessage("Account created. Redirecting to your dashboard...");
        router.push(nextPath);
        router.refresh();
        return;
      }

      setSuccessMessage("Check your email to confirm your account before signing in.");
    } catch (error) {
      setErrorMessage(getSignupErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  const signinHref =
    nextPath === "/dashboard" ? "/signin" : `/signin?next=${encodeURIComponent(nextPath)}`;

  const handleResendConfirmation = async () => {
    const targetEmail = lastSignupEmail ?? email.trim().toLowerCase();
    if (!targetEmail) {
      setErrorMessage("Enter your email first.");
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(null);
    setResendLoading(true);

    try {
      const response = await fetch("/api/auth/resend-confirmation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: targetEmail,
        }),
      });

      const result = (await response.json().catch(() => null)) as
        | { ok: boolean; message?: string }
        | null;
      if (!response.ok || !result?.ok) {
        setErrorMessage(
          result?.message ?? "Could not resend confirmation right now. Try again later.",
        );
        return;
      }

      setSuccessMessage("Confirmation email resent. Check your inbox and spam folder.");
    } catch (error) {
      setErrorMessage(getSignupErrorMessage(error));
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
          <div className="text-center mb-8">
            <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <UserPlus className="w-5 h-5 text-emerald-600" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 mb-1">Create your account</h1>
            <p className="text-sm text-slate-500">
              Set up your TimeProof account and start tracking billable work.
            </p>
          </div>

          <form onSubmit={handleSignup} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Email address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Password
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
                Confirm password
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
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl font-semibold text-sm transition-all hover:shadow-lg hover:shadow-emerald-200 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Create account
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            Already have an account?{" "}
            <Link href={signinHref} className="text-emerald-600 hover:text-emerald-700 font-medium">
              Sign in
            </Link>
          </p>

          <div className="mt-3 text-center">
            <button
              type="button"
              onClick={handleResendConfirmation}
              disabled={resendLoading || isLoading}
              className="text-xs text-slate-500 hover:text-slate-700 underline underline-offset-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {resendLoading ? "Resending..." : "Didn’t get the email? Resend confirmation"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
