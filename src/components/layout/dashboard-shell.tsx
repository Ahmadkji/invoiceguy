"use client";

import { useMemo } from "react";
import { CommandDock } from "@/components/layout/sidebar";
import { PulseHeader } from "@/components/layout/header";
import { DashboardDataHydrator } from "@/components/dashboard/dashboard-data-hydrator";
import { useAppStore } from "@/lib/store/use-app-store";

export function DashboardShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const sidebarCollapsed = useAppStore((s) => s.sidebarCollapsed);
  const desktopOffsetClass = useMemo(
    () => (sidebarCollapsed ? "md:ml-[72px]" : "md:ml-[240px]"),
    [sidebarCollapsed]
  );

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      <DashboardDataHydrator />
      <CommandDock />
      <div
        className={`flex-1 flex flex-col min-h-screen transition-[margin] duration-300 ease-in-out ${desktopOffsetClass}`}
      >
        <PulseHeader />
        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
