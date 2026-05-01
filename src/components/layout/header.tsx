"use client";

import { motion } from "framer-motion";
import { Timer, DollarSign, Bell, Menu, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store/use-app-store";
import { formatCurrency } from "@/lib/billing-rules";

function HeaderTimer() {
  const isRunning = useAppStore((s) => s.timer.isRunning);
  const elapsedSeconds = useAppStore((s) => s.timer.elapsedSeconds);

  if (!isRunning) return null;

  const timerMinutes = Math.floor(elapsedSeconds / 60);
  const timerHours = Math.floor(timerMinutes / 60);
  const timerMins = timerMinutes % 60;
  const timerSecs = elapsedSeconds % 60;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-lg"
    >
      <motion.div
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 1.5, repeat: Infinity }}
        className="w-2 h-2 rounded-full bg-emerald-500"
      />
      <Timer className="w-4 h-4" />
      <span className="text-sm font-mono-nums font-medium">
        {timerHours > 0 ? `${timerHours}:` : ""}
        {String(timerMins).padStart(2, "0")}:{String(timerSecs).padStart(2, "0")}
      </span>
    </motion.div>
  );
}

export function PulseHeader() {
  const router = useRouter();
  const timeEntries = useAppStore((s) => s.timeEntries);
  const profile = useAppStore((s) => s.profile);
  const setSidebarOpen = useAppStore((s) => s.setSidebarOpen);

  const uninvoicedEntries = timeEntries.filter((e) => e.status === "uninvoiced" && e.isBillable);
  const totalUninvoicedMinutes = uninvoicedEntries.reduce((sum, e) => sum + e.billedMinutes, 0);
  const totalUninvoicedAmount = uninvoicedEntries.reduce((sum, e) => sum + e.amount, 0);

  const avatarLabel =
    profile?.fullName
      ?.split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() ||
    profile?.email?.slice(0, 2).toUpperCase() ||
    "U";

  return (
    <header className="h-16 bg-white border-b border-slate-100 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-40">
      {/* Left: Mobile menu + Context info */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => setSidebarOpen(true)}
          className="md:hidden p-2 -ml-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <HeaderTimer />
      </div>

      {/* Right: Metrics & actions */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Uninvoiced amount */}
        <div className="hidden sm:flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg">
          <DollarSign className="w-4 h-4 text-slate-400" />
          <div>
            <div className="text-xs text-slate-400">Uninvoiced</div>
            <div className="text-sm font-semibold text-slate-700 font-mono-nums">
              {formatCurrency(totalUninvoicedAmount)}
            </div>
          </div>
        </div>

        {/* Hours */}
        <div className="hidden md:flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg">
          <Timer className="w-4 h-4 text-slate-400" />
          <div>
            <div className="text-xs text-slate-400">Hours</div>
            <div className="text-sm font-semibold text-slate-700 font-mono-nums">
              {(totalUninvoicedMinutes / 60).toFixed(1)}h
            </div>
          </div>
        </div>

        {/* Notification bell */}
        <button className="relative p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-emerald-500 rounded-full" />
        </button>

        {/* Logout */}
        <button
          onClick={async () => {
            await fetch("/api/auth/signout", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
            });
            router.push("/signin");
            router.refresh();
          }}
          className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
          title="Sign out"
        >
          <LogOut className="w-5 h-5" />
        </button>

        {/* Avatar */}
        <div className="w-9 h-9 bg-emerald-100 rounded-full flex items-center justify-center">
          <span className="text-sm font-bold text-emerald-700">{avatarLabel}</span>
        </div>
      </div>
    </header>
  );
}
