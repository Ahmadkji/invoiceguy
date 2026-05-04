"use client";

import { motion } from "framer-motion";
import { Clock, DollarSign, FileText, CheckCircle, Timer, Plus, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useAppStore } from "@/lib/store/use-app-store";
import { formatMinutes, formatCurrency, formatDecimalHours, formatTimeRange } from "@/lib/billing-rules";

export default function DashboardPage() {
  const timeEntries = useAppStore((s) => s.timeEntries);
  const invoices = useAppStore((s) => s.invoices);
  const clients = useAppStore((s) => s.clients);
  const isDataLoading = useAppStore((s) => s.isDataLoading);
  const dataError = useAppStore((s) => s.dataError);

  const uninvoicedEntries = timeEntries.filter((e) => e.invoiceId === null);
  const totalUninvoicedMinutes = uninvoicedEntries.reduce((sum, e) => sum + e.billedMinutes, 0);
  const totalUninvoicedAmount = uninvoicedEntries.reduce((sum, e) => sum + e.amount, 0);

  const draftInvoices = invoices.filter((i) => i.status === "draft");
  const paidInvoices = invoices.filter((i) => i.status === "paid");
  const paidThisMonth = paidInvoices.reduce((sum, i) => sum + i.totalAmount, 0);

  const recentEntries = timeEntries.slice(0, 5);
  const recentInvoices = invoices.slice(0, 5);

  const metrics = [
    {
      label: "Uninvoiced Hours",
      value: formatDecimalHours(totalUninvoicedMinutes),
      subtext: `${uninvoicedEntries.length} entries`,
      icon: Clock,
      color: "bg-blue-50 text-blue-600",
    },
    {
      label: "Uninvoiced Amount",
      value: formatCurrency(totalUninvoicedAmount),
      subtext: "Ready to bill",
      icon: DollarSign,
      color: "bg-emerald-50 text-emerald-600",
    },
    {
      label: "Draft Invoices",
      value: String(draftInvoices.length),
      subtext: "Awaiting send",
      icon: FileText,
      color: "bg-amber-50 text-amber-600",
    },
    {
      label: "Paid This Month",
      value: formatCurrency(paidThisMonth),
      subtext: `${paidInvoices.length} invoices`,
      icon: CheckCircle,
      color: "bg-violet-50 text-violet-600",
    },
  ];

  return (
    <div className="space-y-6">
      {isDataLoading && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
          Loading dashboard data...
        </div>
      )}

      {dataError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {dataError}
        </div>
      )}

      {/* Metrics */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric, index) => {
          const Icon = metric.icon;
          return (
            <motion.div
              key={metric.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white rounded-xl p-5 border border-slate-100 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 rounded-lg ${metric.color} flex items-center justify-center`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
              <div className="text-2xl font-bold text-slate-900 font-mono-nums">{metric.value}</div>
              <div className="text-sm text-slate-500 mt-0.5">{metric.label}</div>
              <div className="text-xs text-slate-400 mt-1">{metric.subtext}</div>
            </motion.div>
          );
        })}
      </div>

      {/* Action cards */}
      <div className="grid sm:grid-cols-2 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-emerald-600 rounded-xl p-6 text-white"
        >
          <h3 className="text-lg font-bold mb-2">What are you working on?</h3>
          <p className="text-emerald-100 text-sm mb-4">Track your time and turn it into a clean invoice.</p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/dashboard/time"
              className="inline-flex items-center gap-2 bg-white text-emerald-700 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-emerald-50 transition-colors"
            >
              <Timer className="w-4 h-4" />
              Start Timer
            </Link>
            <Link
              href="/dashboard/time"
              className="inline-flex items-center gap-2 bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-emerald-800 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Log Time
            </Link>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white rounded-xl p-6 border border-slate-100"
        >
          <h3 className="text-lg font-bold text-slate-900 mb-2">Create an invoice</h3>
          <p className="text-slate-500 text-sm mb-4">
            {uninvoicedEntries.length} uninvoiced entries ready to bill
          </p>
          <Link
            href="/dashboard/invoices/new"
            className="inline-flex items-center gap-2 text-emerald-600 font-semibold text-sm hover:text-emerald-700 transition-colors"
          >
            Build invoice
            <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>
      </div>

      {/* Recent entries */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="bg-white rounded-xl border border-slate-100 overflow-hidden"
      >
        <div className="px-4 sm:px-6 py-4 border-b border-slate-50 flex items-center justify-between">
          <h3 className="font-bold text-slate-900">Recent Time Entries</h3>
          <Link href="/dashboard/time" className="text-sm text-emerald-600 font-medium hover:text-emerald-700">
            View all
          </Link>
        </div>
        <div className="divide-y divide-slate-50">
          {recentEntries.length === 0 && (
            <div className="px-4 sm:px-6 py-6 text-sm text-slate-500">
              No time entries yet.
            </div>
          )}
          {recentEntries.map((entry) => {
            const client = clients.find((c) => c.id === entry.clientId);
            return (
              <div key={entry.id} className="px-4 sm:px-6 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: client?.color || "#94A3B8" }}
                  />
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-slate-900 truncate">{entry.taskNote}</div>
                    <div className="text-xs text-slate-400 truncate">
                      {client?.name} • {entry.entryDate}
                    </div>
                  </div>
                </div>
                <div className="text-left sm:text-right flex-shrink-0 sm:ml-3 pl-5 sm:pl-0">
                  <div className="text-sm font-mono-nums font-medium text-slate-700">
                    {formatTimeRange(entry.startTime, entry.endTime) || formatMinutes(entry.actualMinutes)}
                  </div>
                  <div className={`text-xs ${entry.status === "invoiced" ? "text-slate-400" : "text-emerald-600"}`}>
                    {entry.status === "invoiced" ? "Invoiced" : "Uninvoiced"}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Recent invoices */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="bg-white rounded-xl border border-slate-100 overflow-hidden"
      >
        <div className="px-4 sm:px-6 py-4 border-b border-slate-50 flex items-center justify-between">
          <h3 className="font-bold text-slate-900">Recent Invoices</h3>
          <Link href="/dashboard/invoices" className="text-sm text-emerald-600 font-medium hover:text-emerald-700">
            View all
          </Link>
        </div>
        <div className="divide-y divide-slate-50">
          {recentInvoices.length === 0 && (
            <div className="px-4 sm:px-6 py-6 text-sm text-slate-500">
              No invoices yet.
            </div>
          )}
          {recentInvoices.map((invoice) => {
            const client = clients.find((c) => c.id === invoice.clientId);
            const statusColors: Record<string, string> = {
              draft: "bg-slate-100 text-slate-600",
              sent: "bg-blue-50 text-blue-600",
              paid: "bg-emerald-50 text-emerald-600",
              void: "bg-red-50 text-red-600",
            };
            return (
              <div key={invoice.id} className="px-4 sm:px-6 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="text-sm font-mono-nums font-medium text-slate-500 w-16 sm:w-20 flex-shrink-0">
                    {invoice.invoiceNumber}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-slate-900 truncate">{client?.name}</div>
                    <div className="text-xs text-slate-400">{invoice.invoiceDate}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0 sm:ml-3 pl-5 sm:pl-0">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColors[invoice.status]}`}>
                    {invoice.status}
                  </span>
                  <div className="text-sm font-mono-nums font-semibold text-slate-900 w-16 sm:w-20 text-right">
                    {formatCurrency(invoice.totalAmount)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}
