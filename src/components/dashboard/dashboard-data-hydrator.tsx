"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useAppStore } from "@/lib/store/use-app-store";
import type { Client, Invoice, Project, TimeEntry, UserProfile } from "@/lib/types";

type DashboardDataResponse = {
  ok?: boolean;
  code?: string;
  message?: string;
  profile?: UserProfile;
  clients?: Client[];
  projects?: Project[];
  timeEntries?: TimeEntry[];
  invoices?: Invoice[];
  paidThisMonth?: number;
  paidBilledMinutes?: number;
};

const STALE_MS = 60_000; // 1 minute before considering data stale

export function DashboardDataHydrator() {
  const pathname = usePathname();
  const setDashboardSnapshot = useAppStore((state) => state.setDashboardSnapshot);
  const clearDashboardSnapshot = useAppStore((state) => state.clearDashboardSnapshot);
  const setDataLoading = useAppStore((state) => state.setDataLoading);
  const setDataError = useAppStore((state) => state.setDataError);
  const hasLoadedData = useAppStore((state) => state.hasLoadedData);
  const lastLoadedAt = useAppStore((state) => state.lastLoadedAt);

  useEffect(() => {
    // Skip refetch if data was loaded recently
    if (hasLoadedData && lastLoadedAt !== null && Date.now() - lastLoadedAt < STALE_MS) {
      return;
    }

    const controller = new AbortController();
    let ignore = false;

    const loadDashboardData = async () => {
      setDataLoading(true);
      setDataError(null);

      try {
        const response = await fetch("/api/me/dashboard-data", {
          method: "GET",
          cache: "no-store",
          signal: controller.signal,
        });

        const result = (await response.json().catch(() => null)) as DashboardDataResponse | null;

        if (ignore) {
          return;
        }

        if (!response.ok || !result?.ok) {
          if (response.status === 401) {
            clearDashboardSnapshot();
          }
          setDataError(result?.message ?? "Unable to load dashboard data.");
          return;
        }

        setDashboardSnapshot({
          profile: result.profile ?? null,
          clients: result.clients ?? [],
          projects: result.projects ?? [],
          timeEntries: result.timeEntries ?? [],
          invoices: result.invoices ?? [],
          paidThisMonth: result.paidThisMonth ?? 0,
          paidBilledMinutes: result.paidBilledMinutes ?? 0,
        });
      } catch {
        if (!ignore) {
          setDataError("Network error while loading dashboard data.");
        }
      } finally {
        if (!ignore) {
          setDataLoading(false);
        }
      }
    };

    void loadDashboardData();

    return () => {
      ignore = true;
      controller.abort();
    };
  }, [pathname, hasLoadedData, lastLoadedAt, clearDashboardSnapshot, setDashboardSnapshot, setDataError, setDataLoading]);

  return null;
}
