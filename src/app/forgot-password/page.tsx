"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, KeyRound, Mail } from "lucide-react";
import { getSafeNextPath } from "@/lib/security/paths";

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Could not send reset link. Please try again.";
}

export default function ForgotPasswordPage() {
  const [nextPath] = useState(() => {
    if (typeof window === "undefined") {
      return "/dashboard";
    }
    const params = new URLSearchParams(window.location.search);
    return getSafeNextPath(params.get("next"));
  });
  const signinHref =
    nextPath === "/dashboard" ? "/signin" : `/signin?next=${encodeURIComponent(nextPath)}`;

  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleResetRequest = async (e: React.FormEvent) => {
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

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: cleanEmail,
          nextPath,
        }),
      });

      const result = (await response.json().catch(() => null)) as
        | { ok: boolean; message?: string }
        | null;

      if (!response.ok || !result?.ok) {
        setErrorMessage(result?.message ?? "Could not send reset link. Please try again.");
        return;
      }

      setSuccessMessage(
        "If this email exists, a password reset link has been sent. Check your inbox and spam folder.",
      );
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
              <KeyRound className="w-5 h-5 text-emerald-600" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 mb-1">Reset your password</h1>
            <p className="text-sm text-slate-500">
              We&apos;ll send a secure link so you can set a new password.
            </p>
          </div>

          <form onSubmit={handleResetRequest} className="space-y-5">
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
                  Send reset link
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            Remembered your password?{" "}
            <Link href={signinHref} className="text-emerald-600 hover:text-emerald-700 font-medium">
              Back to sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
