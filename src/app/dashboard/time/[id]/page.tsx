"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Clock,
  Calendar,
  FileText,
  DollarSign,
  Tag,
} from "lucide-react";
import { useAppStore } from "@/lib/store/use-app-store";
import { formatCurrency, formatMinutes, formatTimeRange } from "@/lib/billing-rules";
import { getRuleLabel } from "@/lib/billing-rules";

export default function TimeEntryDetailPage() {
  const params = useParams();
  const entryId = params.id as string;

  const timeEntries = useAppStore((s) => s.timeEntries);
  const clients = useAppStore((s) => s.clients);
  const projects = useAppStore((s) => s.projects);
  const invoices = useAppStore((s) => s.invoices);

  const entry = timeEntries.find((e) => e.id === entryId);

  if (!entry) {
    return (
      <div className="space-y-6">
        <Link
          href="/dashboard/time"
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Time Tracking
        </Link>
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          Time entry not found. It may have been deleted.
        </div>
      </div>
    );
  }

  const client = clients.find((c) => c.id === entry.clientId);
  const project = projects.find((p) => p.id === entry.projectId);
  const invoice = entry.invoiceId ? invoices.find((i) => i.id === entry.invoiceId) : null;
  const isInvoiced = entry.invoiceId !== null || entry.status === "invoiced";
  const billingRule = entry.billingRuleSnapshot?.rule;

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard/time"
        className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Time Tracking
      </Link>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl border border-slate-100 p-6"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ backgroundColor: client ? `${client.color}15` : "#F1F5F9" }}
            >
              <FileText className="w-5 h-5" style={{ color: client?.color || "#94A3B8" }} />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-slate-900 truncate">{entry.taskNote}</h1>
              <div className="flex items-center gap-2 mt-0.5 text-sm text-slate-500">
                {client && (
                  <Link
                    href={`/dashboard/clients/${client.id}`}
                    className="hover:text-emerald-600 transition-colors"
                  >
                    {client.name}
                  </Link>
                )}
                {client && project && <span>&middot;</span>}
                {project && (
                  <Link
                    href={`/dashboard/projects/${project.id}`}
                    className="hover:text-emerald-600 transition-colors"
                  >
                    {project.name}
                  </Link>
                )}
              </div>
            </div>
          </div>
          <span
            className={`text-xs font-medium px-3 py-1 rounded-full shrink-0 ${
              isInvoiced ? "bg-slate-100 text-slate-500" : "bg-emerald-50 text-emerald-700"
            }`}
          >
            {isInvoiced ? "Invoiced" : "Uninvoiced"}
          </span>
        </div>
      </motion.div>

      {/* Key metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-100 p-4">
          <div className="text-xs text-slate-400 mb-1">Actual Time</div>
          <div className="text-lg font-bold font-mono-nums text-blue-600">
            {formatMinutes(entry.actualMinutes)}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 p-4">
          <div className="text-xs text-slate-400 mb-1">Billed Time</div>
          <div className="text-lg font-bold font-mono-nums text-slate-900">
            {formatMinutes(entry.billedMinutes)}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 p-4">
          <div className="text-xs text-slate-400 mb-1">Hourly Rate</div>
          <div className="text-lg font-bold font-mono-nums text-slate-900">
            {formatCurrency(entry.hourlyRate)}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 p-4">
          <div className="text-xs text-slate-400 mb-1">Amount</div>
          <div className="text-lg font-bold font-mono-nums text-emerald-600">
            {formatCurrency(entry.amount)}
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-50">
          <h3 className="font-bold text-slate-900">Session Details</h3>
        </div>
        <div className="divide-y divide-slate-50">
          <div className="px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3 text-sm text-slate-600">
              <Calendar className="w-4 h-4 text-slate-400" />
              Date
            </div>
            <div className="text-sm font-medium text-slate-900">{entry.entryDate}</div>
          </div>

          {entry.startTime && (
            <div className="px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3 text-sm text-slate-600">
                <Clock className="w-4 h-4 text-slate-400" />
                Work Session
              </div>
              <div className="text-sm font-mono-nums font-medium text-slate-900">
                {formatTimeRange(entry.startTime, entry.endTime) || "\u2014"}
              </div>
            </div>
          )}

          {billingRule && (
            <div className="px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3 text-sm text-slate-600">
                <DollarSign className="w-4 h-4 text-slate-400" />
                Billing Rule
              </div>
              <div className="text-sm font-medium text-slate-900">
                {getRuleLabel(billingRule)}
              </div>
            </div>
          )}

          {entry.internalNote && (
            <div className="px-6 py-4">
              <div className="flex items-center gap-3 text-sm text-slate-600 mb-2">
                <Tag className="w-4 h-4 text-slate-400" />
                Internal Note
              </div>
              <p className="text-sm text-slate-700 whitespace-pre-wrap ml-7">{entry.internalNote}</p>
            </div>
          )}
        </div>
      </div>

      {/* Related entities */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Client card */}
        {client && (
          <Link
            href={`/dashboard/clients/${client.id}`}
            className="bg-white rounded-xl border border-slate-100 p-4 hover:shadow-md transition-shadow group"
          >
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm shrink-0"
                style={{ backgroundColor: client.color }}
              >
                {client.name.split(" ").map((n) => n[0]).join("")}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium text-slate-900 group-hover:text-emerald-600 transition-colors">
                  {client.name}
                </div>
                <div className="text-xs text-slate-400">Client</div>
              </div>
            </div>
          </Link>
        )}

        {/* Project card */}
        {project && (
          <Link
            href={`/dashboard/projects/${project.id}`}
            className="bg-white rounded-xl border border-slate-100 p-4 hover:shadow-md transition-shadow group"
          >
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                style={{ backgroundColor: client ? `${client.color}15` : "#F1F5F9" }}
              >
                <FileText className="w-5 h-5" style={{ color: client?.color || "#94A3B8" }} />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium text-slate-900 group-hover:text-emerald-600 transition-colors">
                  {project.name}
                </div>
                <div className="text-xs text-slate-400">
                  Project &middot; {formatCurrency(project.hourlyRate)}/hr
                </div>
              </div>
            </div>
          </Link>
        )}

        {/* Invoice card */}
        {invoice && (
          <Link
            href={`/dashboard/invoices/${invoice.id}`}
            className="bg-white rounded-xl border border-slate-100 p-4 hover:shadow-md transition-shadow group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-violet-50 shrink-0">
                <FileText className="w-5 h-5 text-violet-600" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium text-slate-900 group-hover:text-emerald-600 transition-colors">
                  {invoice.invoiceNumber}
                </div>
                <div className="text-xs text-slate-400">
                  Invoice &middot; {formatCurrency(invoice.totalAmount)}
                </div>
              </div>
            </div>
          </Link>
        )}
      </div>

      {/* Metadata */}
      <div className="text-xs text-slate-400 text-right">
        Created {new Date(entry.createdAt).toLocaleString()} &middot; Updated {new Date(entry.updatedAt).toLocaleString()}
      </div>
    </div>
  );
}
