"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  FolderKanban,
  Clock,
  DollarSign,
} from "lucide-react";
import { useAppStore } from "@/lib/store/use-app-store";
import { formatCurrency, formatMinutes, formatTimeRange } from "@/lib/billing-rules";

const BILLING_LABELS: Record<string, string> = {
  exact: "Standard",
  round_up_5: "Round up 5m",
  round_up_10: "Round up 10m",
  round_up_15: "Round up 15m",
  round_up_30: "Round up 30m",
  round_up_60: "Round up 60m",
  min_15: "Min 15m",
  min_30: "Min 30m",
};

const statusColors: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-600",
  paused: "bg-amber-50 text-amber-600",
  completed: "bg-blue-50 text-blue-600",
  archived: "bg-slate-50 text-slate-500",
};

export default function ProjectDetailPage() {
  const params = useParams();
  const projectId = params.id as string;

  const projects = useAppStore((s) => s.projects);
  const clients = useAppStore((s) => s.clients);
  const timeEntries = useAppStore((s) => s.timeEntries);

  const project = projects.find((p) => p.id === projectId);
  const client = project ? clients.find((c) => c.id === project.clientId) : undefined;

  const projectEntries = useMemo(
    () => timeEntries.filter((e) => e.projectId === projectId),
    [timeEntries, projectId],
  );

  const stats = useMemo(() => {
    const totalMinutes = projectEntries.reduce((sum, e) => sum + e.billedMinutes, 0);
    const actualMinutes = projectEntries.reduce((sum, e) => sum + e.actualMinutes, 0);
    const totalAmount = projectEntries.reduce((sum, e) => sum + e.amount, 0);
    const uninvoicedEntries = projectEntries.filter((e) => e.invoiceId === null);
    const uninvoicedAmount = uninvoicedEntries.reduce((sum, e) => sum + e.amount, 0);
    return { totalMinutes, actualMinutes, totalAmount, uninvoicedAmount, entryCount: projectEntries.length };
  }, [projectEntries]);

  if (!project) {
    return (
      <div className="space-y-6">
        <Link
          href="/dashboard/projects"
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Projects
        </Link>
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          Project not found. It may have been deleted.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard/projects"
        className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Projects
      </Link>

      {/* Project header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl border border-slate-100 p-6"
      >
        <div className="flex items-start gap-4">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: `${client?.color}15` }}
          >
            <FolderKanban className="w-6 h-6" style={{ color: client?.color }} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900">{project.name}</h1>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColors[project.status]}`}>
                {project.status}
              </span>
            </div>
            {client && (
              <Link
                href={`/dashboard/clients/${client.id}`}
                className="text-sm text-slate-500 hover:text-emerald-600 transition-colors mt-0.5 inline-block"
              >
                {client.name}
              </Link>
            )}
          </div>
          <div className="text-right shrink-0">
            <div className="text-2xl font-bold text-slate-900 font-mono-nums">{formatCurrency(project.hourlyRate)}</div>
            <div className="text-xs text-slate-400">/ hour</div>
          </div>
        </div>

        {project.description && (
          <p className="mt-4 text-sm text-slate-600">{project.description}</p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 pt-4 border-t border-slate-50">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Clock className="w-4 h-4 text-slate-400" />
            Billing: {BILLING_LABELS[project.billingIncrement] || project.billingIncrement}
          </div>
          {project.minimumBillableMinutes && (
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <DollarSign className="w-4 h-4 text-slate-400" />
              Min: {project.minimumBillableMinutes}m per session
            </div>
          )}
          <div className="text-sm text-slate-400">
            Created {new Date(project.createdAt).toLocaleDateString()}
          </div>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Tracked Time", value: formatMinutes(stats.actualMinutes), color: "text-blue-600" },
          { label: "Billed Time", value: formatMinutes(stats.totalMinutes), color: "text-slate-900" },
          { label: "Uninvoiced", value: formatCurrency(stats.uninvoicedAmount), color: "text-emerald-600" },
          { label: "Total Entries", value: String(stats.entryCount), color: "text-violet-600" },
        ].map((metric) => (
          <div key={metric.label} className="bg-white rounded-xl border border-slate-100 p-4">
            <div className="text-xs text-slate-400 mb-1">{metric.label}</div>
            <div className={`text-lg font-bold font-mono-nums ${metric.color}`}>{metric.value}</div>
          </div>
        ))}
      </div>

      {/* Time entries */}
      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-50">
          <h3 className="font-bold text-slate-900">Time Entries</h3>
        </div>
        {projectEntries.length === 0 ? (
          <div className="px-6 py-6 text-sm text-slate-500">
            No time entries yet for this project.
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {projectEntries.slice(0, 20).map((entry) => {
              const isInvoiced = entry.invoiceId !== null || entry.status === "invoiced";
              return (
                <Link
                  key={entry.id}
                  href={`/dashboard/time/${entry.id}`}
                  className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-slate-50 transition-colors gap-2"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: client?.color || "#94A3B8" }}
                    />
                    <div className="min-w-0">
                      <span className="text-sm font-medium truncate text-slate-900">{entry.taskNote}</span>
                      <div className="text-xs text-slate-400">
                        {entry.entryDate}
                        {entry.startTime ? ` \u00B7 ${formatTimeRange(entry.startTime, entry.endTime)}` : ""}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 pl-5 sm:pl-0">
                    <div className="text-right">
                      <div className="text-sm font-mono-nums font-semibold text-emerald-600">
                        {formatMinutes(entry.actualMinutes)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-mono-nums font-semibold text-slate-900">
                        {formatCurrency(entry.amount)}
                      </div>
                    </div>
                    <span
                      className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                        isInvoiced ? "bg-slate-100 text-slate-500" : "bg-emerald-50 text-emerald-700"
                      }`}
                    >
                      {isInvoiced ? "Invoiced" : "Uninvoiced"}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
