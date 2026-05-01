"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { CommandDock } from "@/components/layout/sidebar";
import { PulseHeader } from "@/components/layout/header";
import { DashboardDataHydrator } from "@/components/dashboard/dashboard-data-hydrator";
import { useAppStore } from "@/lib/store/use-app-store";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sidebarCollapsed = useAppStore((s) => s.sidebarCollapsed);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // On mobile, no left margin; on desktop, respect collapsed state
  const marginLeft = isMobile ? 0 : sidebarCollapsed ? 72 : 240;

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      <DashboardDataHydrator />
      <CommandDock />
      <motion.div
        className="flex-1 flex flex-col min-h-screen"
        animate={{ marginLeft }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
      >
        <PulseHeader />
        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </motion.div>
    </div>
  );
}
