"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Mail,
  Phone,
  Building2,
  MapPin,
  FolderKanban,
  Clock,
} from "lucide-react";
import { useAppStore } from "@/lib/store/use-app-store";
import { formatCurrency, formatMinutes, formatTimeRange } from "@/lib/billing-rules";

export default function ClientDetailPage() {
  const params = useParams();
  const clientId = params.id as string;

  const clients = useAppStore((s) => s.clients);
  const projects = useAppStore((s) => s.projects);
  const timeEntries = useAppStore((s) => s.timeEntries);
  const invoices = useAppStore((s) => s.invoices);

  const client = clients.find((c) => c.id === clientId);

  const clientProjects = useMemo(
    () => projects.filter((p) => p.clientId === clientId),
    [projects, clientId],
  );

  const clientEntries = useMemo(
    () => timeEntries.filter((e) => e.clientId === clientId),
    [timeEntries, clientId],
  );

  const clientInvoices = useMemo(
    () => invoices.filter((i) => i.clientId === clientId),
    [invoices, clientId],
  );

  const stats = useMemo(() => {
    const totalMinutes = clientEntries.reduce((sum, e) => sum + e.billedMinutes, 0);
    const totalAmount = clientEntries.reduce((sum, e) => sum + e.amount, 0);
    const uninvoicedEntries = clientEntries.filter((e) => e.invoiceId === null);
    const uninvoicedAmount = uninvoicedEntries.reduce((sum, e) => sum + e.amount, 0);
    const invoicedAmount = totalAmount - uninvoicedAmount;
    return { totalMinutes, totalAmount, uninvoicedAmount, invoicedAmount, entryCount: clientEntries.length };
  }, [clientEntries]);

  if (!client) {
    return (
      <div className="space-y-6">
        <Link
          href="/dashboard/clients"
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Clients
        </Link>
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          Client not found. It may have been deleted.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard/clients"
        className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Clients
      </Link>

      {/* Client header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl border border-slate-100 p-6"
      >
        <div className="flex items-start gap-4">
          <div
            className="w-14 h-14 rounded-xl flex items-center justify-center text-white font-bold text-xl shrink-0"
            style={{ backgroundColor: client.color }}
          >
            {client.name.split(" ").map((n) => n[0]).join("")}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold text-slate-900">{client.name}</h1>
            {client.companyName && (
              <p className="text-slate-500 mt-0.5">{client.companyName}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6">
          {client.email && (
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Mail className="w-4 h-4 text-slate-400" />
              <a href={`mailto:${client.email}`} className="hover:text-emerald-600 transition-colors">
                {client.email}
              </a>
            </div>
          )}
          {client.phone && (
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Phone className="w-4 h-4 text-slate-400" />
              {client.phone}
            </div>
          )}
          {client.billingAddress && (
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <MapPin className="w-4 h-4 text-slate-400" />
              {client.billingAddress}
            </div>
          )}
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Building2 className="w-4 h-4 text-slate-400" />
            {clientProjects.length} project{clientProjects.length !== 1 ? "s" : ""}
          </div>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Time", value: formatMinutes(stats.totalMinutes), color: "text-blue-600" },
          { label: "Total Billed", value: formatCurrency(stats.invoicedAmount), color: "text-slate-900" },
          { label: "Uninvoiced", value: formatCurrency(stats.uninvoicedAmount), color: "text-emerald-600" },
          { label: "Invoices", value: String(clientInvoices.length), color: "text-violet-600" },
        ].map((metric) => (
          <div key={metric.label} className="bg-white rounded-xl border border-slate-100 p-4">
            <div className="text-xs text-slate-400 mb-1">{metric.label}</div>
            <div className={`text-lg font-bold font-mono-nums ${metric.color}`}>{metric.value}</div>
          </div>
        ))}
      </div>

      {/* Projects */}
      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-50">
          <h3 className="font-bold text-slate-900">Projects</h3>
        </div>
        {clientProjects.length === 0 ? (
          <div className="px-6 py-6 text-sm text-slate-500">
            No projects yet for this client.
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {clientProjects.map((project) => {
              const projectEntries = clientEntries.filter((e) => e.projectId === project.id);
              const projectMinutes = projectEntries.reduce((sum, e) => sum + e.billedMinutes, 0);
              return (
                <Link
                  key={project.id}
                  href={`/dashboard/projects/${project.id}`}
                  className="px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${client.color}15` }}
                    >
                      <FolderKanban className="w-4 h-4" style={{ color: client.color }} />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-slate-900">{project.name}</div>
                      <div className="text-xs text-slate-400">{projectEntries.length} entries</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-mono-nums font-semibold text-slate-700">
                      {formatCurrency(project.hourlyRate)}/hr
                    </div>
                    <div className="text-xs text-slate-400">{formatMinutes(projectMinutes)}</div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent time entries */}
      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-50">
          <h3 className="font-bold text-slate-900">Recent Time Entries</h3>
        </div>
        {clientEntries.length === 0 ? (
          <div className="px-6 py-6 text-sm text-slate-500">
            No time entries yet for this client.
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {clientEntries.slice(0, 10).map((entry) => {
              const project = projects.find((p) => p.id === entry.projectId);
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
                      style={{ backgroundColor: client.color }}
                    />
                    <div className="min-w-0">
                      <span className="text-sm font-medium truncate text-slate-900">{entry.taskNote}</span>
                      <div className="text-xs text-slate-400 truncate">
                        {project?.name} &middot; {entry.entryDate}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 pl-5 sm:pl-0">
                    <div className="text-right">
                      <div className="text-xs text-slate-400">Time</div>
                      <div className="text-sm font-mono-nums font-semibold text-emerald-600">
                        {formatMinutes(entry.actualMinutes)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-slate-400">Amount</div>
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

      {/* Notes */}
      {client.notes && (
        <div className="bg-white rounded-xl border border-slate-100 p-6">
          <h3 className="font-bold text-slate-900 mb-2">Notes</h3>
          <p className="text-sm text-slate-600 whitespace-pre-wrap">{client.notes}</p>
        </div>
      )}
    </div>
  );
}
