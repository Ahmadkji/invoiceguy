"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Check,
  FileText,
  Zap,
  TrendingUp,
  Shield,
  Clock,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/billing-rules";
import { getSafeNextPath } from "@/lib/security/paths";

const recentActivity = [
  {
    id: "inv-1",
    number: "INV-1024",
    client: "Acme Co.",
    amount: 2350.0,
    status: "Paid",
    statusColor: "bg-emerald-50 text-emerald-600",
    time: "2h ago",
  },
  {
    id: "inv-2",
    number: "INV-1023",
    client: "Bright Studios",
    amount: 1275.0,
    status: "Sent",
    statusColor: "bg-blue-50 text-blue-600",
    time: "1d ago",
  },
  {
    id: "inv-3",
    number: "INV-1022",
    client: "Northwind Labs",
    amount: 950.0,
    status: "Overdue",
    statusColor: "bg-amber-50 text-amber-600",
    time: "2d ago",
  },
];

const features = [
  { icon: Zap, label: "Fast invoice creation" },
  { icon: TrendingUp, label: "Payment tracking" },
  { icon: FileText, label: "Client-ready PDFs" },
];

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Authentication failed. Please try again.";
}

function decodeAuthMessage(value: string | null) {
  if (!value) {
    return null;
  }

  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export default function SignInPage() {
  const router = useRouter();
  const [nextPath] = useState(() => {
    if (typeof window === "undefined") {
      return "/dashboard";
    }
    const params = new URLSearchParams(window.location.search);
    return getSafeNextPath(params.get("next"));
  });
  const [callbackError] = useState<string | null>(() => {
    if (typeof window === "undefined") {
      return null;
    }
    const params = new URLSearchParams(window.location.search);
    return decodeAuthMessage(params.get("error"));
  });
  const [callbackMessage] = useState<string | null>(() => {
    if (typeof window === "undefined") {
      return null;
    }
    const params = new URLSearchParams(window.location.search);
    return decodeAuthMessage(params.get("message"));
  });

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/signin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
        }),
      });

      const result = (await response.json().catch(() => null)) as
        | { ok: boolean; message?: string }
        | null;
      if (!response.ok || !result?.ok) {
        setErrorMessage(result?.message ?? "Invalid credentials.");
        return;
      }

      router.push(nextPath);
      router.refresh();
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMessage(null);
    setIsLoading(true);

    try {
      window.location.assign(`/api/auth/oauth/google?next=${encodeURIComponent(nextPath)}`);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-[55%] flex-col justify-between p-12 relative overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none">
          <svg width="100%" height="100%">
            <defs>
              <pattern id="signin-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#signin-grid)" />
          </svg>
        </div>

        <div className="relative z-10">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-16">
            <div className="w-9 h-9 bg-emerald-600 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-slate-900 text-xl">TimeProof</span>
            <span className="text-slate-300">|</span>
            <span className="text-slate-500 text-sm">Smart invoicing for freelancers</span>
          </div>

          {/* Headline */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-4xl xl:text-5xl font-bold text-slate-900 leading-[1.15] mb-6">
              Sign in and keep
              <br />
              invoices{" "}
              <span className="text-emerald-600 relative">
                moving
                <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 160 8" fill="none">
                  <path d="M2 6C40 2 120 2 158 6" stroke="#10B981" strokeWidth="3" strokeLinecap="round" />
                </svg>
              </span>
            </h1>
            <p className="text-slate-500 text-lg max-w-md leading-relaxed mb-8">
              Create professional invoices in minutes, track payments in real time, and stay
              organized—so you can focus on your work.
            </p>
          </motion.div>

          {/* Feature tags */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="flex flex-wrap gap-3 mb-12"
          >
            {features.map((feature) => (
              <div
                key={feature.label}
                className="inline-flex items-center gap-2 bg-white border border-slate-200 px-4 py-2 rounded-xl text-sm text-slate-600 shadow-sm"
              >
                <feature.icon className="w-4 h-4 text-emerald-500" />
                {feature.label}
              </div>
            ))}
          </motion.div>

          {/* Recent activity card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 max-w-md"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900">Recent activity</h3>
              <span className="text-sm text-emerald-600 font-medium">View all</span>
            </div>
            <div className="space-y-3">
              {recentActivity.map((item) => (
                <div key={item.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center">
                      <FileText className="w-4 h-4 text-slate-400" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-slate-900">
                        Invoice #{item.number}
                      </div>
                      <div className="text-xs text-slate-400">{item.client}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-slate-700 font-mono-nums">
                      {formatCurrency(item.amount)}
                    </span>
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${item.statusColor}`}
                    >
                      {item.status}
                    </span>
                    <span className="text-xs text-slate-400">{item.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Security notice */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="relative z-10 flex items-center gap-2 text-sm text-slate-400"
        >
          <Shield className="w-4 h-4" />
          Your data is secure and encrypted
        </motion.div>
      </div>

      {/* Right side - Form */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-md"
        >
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <div className="w-9 h-9 bg-emerald-600 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-slate-900 text-xl">TimeProof</span>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Lock className="w-5 h-5 text-emerald-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-1">Welcome back</h2>
              <p className="text-sm text-slate-500">
                Sign in to your TimeProof account to continue
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Email address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Remember me + Forgot password */}
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="sr-only"
                    />
                    <div
                      className={`w-4 h-4 rounded border transition-all flex items-center justify-center ${
                        rememberMe
                          ? "bg-emerald-600 border-emerald-600"
                          : "border-slate-300 bg-white"
                      }`}
                    >
                      {rememberMe && <Check className="w-3 h-3 text-white" />}
                    </div>
                  </div>
                  <span className="text-sm text-slate-600">Remember me</span>
                </label>
                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      nextPath === "/dashboard"
                        ? "/forgot-password"
                        : `/forgot-password?next=${encodeURIComponent(nextPath)}`,
                    )
                  }
                  className="text-sm text-emerald-600 hover:text-emerald-700 font-medium transition-colors"
                >
                  Forgot password?
                </button>
              </div>

              {callbackError && (
                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {callbackError}
                </p>
              )}

              {callbackMessage && (
                <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                  {callbackMessage}
                </p>
              )}

              {errorMessage && (
                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {errorMessage}
                </p>
              )}

              {/* Sign in button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl font-semibold text-sm transition-all hover:shadow-lg hover:shadow-emerald-200 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    Sign in
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-3 my-6">
              <div className="flex-1 h-px bg-slate-100" />
              <span className="text-xs text-slate-400 font-medium">or</span>
              <div className="flex-1 h-px bg-slate-100" />
            </div>

            {/* Google button */}
            <button
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 py-2.5 rounded-xl font-medium text-sm transition-all hover:shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continue with Google
            </button>

            {/* Create account */}
            <p className="text-center text-sm text-slate-500 mt-6">
              New here?{" "}
              <Link
                href={nextPath === "/dashboard" ? "/signup" : `/signup?next=${encodeURIComponent(nextPath)}`}
                className="text-emerald-600 hover:text-emerald-700 font-medium transition-colors"
              >
                Create account
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
