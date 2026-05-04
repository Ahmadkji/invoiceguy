import type { Metadata } from "next";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { buildNoIndexMetadata } from "@/lib/seo";

export const metadata: Metadata = buildNoIndexMetadata(
  "Dashboard",
  "Private TimeProof application workspace for tracked time, clients, projects, and invoices.",
  "/dashboard",
);

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardShell>{children}</DashboardShell>;
}
