"use client";

import { useCallback, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Download,
  Eye,
  Send,
  CheckCircle,
  Wallet,
  Clock,
  AlertTriangle,
  Receipt,
  Plus,
  TrendingUp,
  TrendingDown,
  ChevronRight,
  Inbox,
  Calendar,
} from "lucide-react";
import Link from "next/link";
import { formatCurrency } from "@/lib/billing-rules";
import { downloadInvoicePdf } from "@/lib/invoices/download-pdf";
import { Invoice, InvoiceStatus } from "@/lib/types";
import { StatusBadge } from "@/components/invoices/status-badge";
import { useAppStore } from "@/lib/store/use-app-store";
import { useNow } from "@/lib/hooks/use-now";

type InvoiceStatusResponse = {
  ok?: boolean;
  code?: string;
  message?: string;
  invoice?: Invoice;
};

export default function InvoicesPage() {
  const invoices = useAppStore((s) => s.invoices);
  const clients = useAppStore((s) => s.clients);
  const isDataLoading = useAppStore((s) => s.isDataLoading);
  const dataError = useAppStore((s) => s.dataError);
  const paidBilledMinutes = useAppStore((s) => s.paidBilledMinutes);
  const updateInvoiceInStore = useAppStore((s) => s.updateInvoice);
  const invalidateData = useAppStore((s) => s.invalidateData);
  const now = useNow();
  const [error, setError] = useState<string | null>(null);
  const [pendingInvoiceId, setPendingInvoiceId] = useState<string | null>(null);
  const [pendingPdfInvoiceId, setPendingPdfInvoiceId] = useState<string | null>(null);
  const [filter, setFilter] = useState<InvoiceStatus | "all">("all");

  const updateInvoiceStatus = useCallback(async (invoiceId: string, status: InvoiceStatus) => {
    setPendingInvoiceId(invoiceId);
    setError(null);

    try {
      const response = await fetch(`/api/me/invoices/${invoiceId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      });

      const result = (await response.json().catch(() => null)) as InvoiceStatusResponse | null;

      if (!response.ok || !result?.ok || !result.invoice) {
        setError(result?.message ?? "Unable to update invoice status.");
        setPendingInvoiceId(null);
        return;
      }

      updateInvoiceInStore(result.invoice);
      invalidateData();
      setPendingInvoiceId(null);
    } catch {
      setError("Network error while updating invoice status.");
      setPendingInvoiceId(null);
    }
  }, [updateInvoiceInStore, invalidateData]);

  const handleDownloadPdf = useCallback(async (invoiceId: string, invoiceNumber: string) => {
    setPendingPdfInvoiceId(invoiceId);
    setError(null);

    try {
      await downloadInvoicePdf({ invoiceId, invoiceNumber });
      setPendingPdfInvoiceId(null);
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : "Unable to download invoice PDF.");
      setPendingPdfInvoiceId(null);
    }
  }, []);

  const clientById = useMemo(() => {
    return new Map(clients.map((client) => [client.id, client]));
  }, [clients]);

  const filteredInvoices = useMemo(
    () => (filter === "all" ? invoices : invoices.filter((invoice) => invoice.status === filter)),
    [filter, invoices],
  );

  const stats = useMemo(() => {
    const outstanding = invoices
      .filter((invoice) => invoice.status === "draft" || invoice.status === "sent")
      .reduce((sum, invoice) => sum + invoice.totalAmount, 0);
    const currentDate = new Date(now);
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    const paidThisMonth = invoices
      .filter((invoice) => {
        if (invoice.status !== "paid") {
          return false;
        }

        const updatedAt = new Date(invoice.updatedAt);
        return updatedAt.getMonth() === currentMonth && updatedAt.getFullYear() === currentYear;
      })
      .reduce((sum, invoice) => sum + invoice.totalAmount, 0);

    const overdue = invoices.filter((invoice) => {
      if (!invoice.dueDate || invoice.status === "paid" || invoice.status === "void") {
        return false;
      }

      return new Date(invoice.dueDate).getTime() < now;
    }).length;

    return {
      outstanding,
      paid: paidThisMonth,
      overdue,
      total: invoices.length,
      totalHours: paidBilledMinutes / 60,
    };
  }, [invoices, paidBilledMinutes, now]);

  const statusFilters: { key: InvoiceStatus | "all"; label: string; count: number }[] = [
    { key: "all", label: "All", count: invoices.length },
    { key: "draft", label: "Draft", count: invoices.filter((invoice) => invoice.status === "draft").length },
    { key: "sent", label: "Sent", count: invoices.filter((invoice) => invoice.status === "sent").length },
    { key: "paid", label: "Paid", count: invoices.filter((invoice) => invoice.status === "paid").length },
    { key: "void", label: "Void", count: invoices.filter((invoice) => invoice.status === "void").length },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Invoices</h1>
          <p className="text-slate-500 mt-1">Manage and track your invoices</p>
        </div>
        <Link
          href="/dashboard/invoices/new"
          className="inline-flex items-center justify-center gap-2 bg-slate-900 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-800 transition-all hover:shadow-lg active:scale-[0.98] self-start"
        >
          <Plus className="w-4 h-4" />
          New Invoice
        </Link>
      </div>

      {isDataLoading && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
          Loading invoices...
        </div>
      )}

      {(error || dataError) && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error ?? dataError}
        </div>
      )}

      {!isDataLoading && !error && !dataError && (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0 }}
              className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center">
                  <Receipt className="w-5 h-5 text-slate-500" />
                </div>
              </div>
              <div className="text-2xl font-bold text-slate-900 font-mono-nums">{stats.total}</div>
              <div className="text-sm text-slate-500 mt-0.5">Total Invoices</div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center">
                  <Wallet className="w-5 h-5 text-amber-600" />
                </div>
                <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  Pending
                </span>
              </div>
              <div className="text-2xl font-bold text-slate-900 font-mono-nums">
                {formatCurrency(stats.outstanding)}
              </div>
              <div className="text-sm text-slate-500 mt-0.5">Outstanding</div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-emerald-600" />
                </div>
                <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  This month
                </span>
              </div>
              <div className="text-2xl font-bold text-emerald-600 font-mono-nums">
                {formatCurrency(stats.paid)}
              </div>
              <div className="text-sm text-slate-500 mt-0.5">Paid This Month</div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                </div>
                {stats.overdue > 0 && (
                  <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <TrendingDown className="w-3 h-3" />
                    Action
                  </span>
                )}
              </div>
              <div
                className={`text-2xl font-bold font-mono-nums ${
                  stats.overdue > 0 ? "text-red-600" : "text-slate-900"
                }`}
              >
                {stats.overdue}
              </div>
              <div className="text-sm text-slate-500 mt-0.5">
                Overdue · {stats.totalHours.toFixed(2)} paid hrs
              </div>
            </motion.div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {statusFilters.map((status) => (
              <button
                key={status.key}
                onClick={() => setFilter(status.key)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
                  filter === status.key
                    ? "bg-slate-900 text-white shadow-sm"
                    : "bg-white text-slate-500 hover:text-slate-700 hover:bg-slate-50 border border-slate-200"
                }`}
              >
                {status.label}
                <span
                  className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${
                    filter === status.key ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {status.count}
                </span>
              </button>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-xl border border-slate-200 overflow-hidden"
          >
            {filteredInvoices.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-4">
                  <Inbox className="w-8 h-8 text-slate-300" />
                </div>
                <p className="text-sm font-semibold text-slate-500">No invoices found</p>
                <p className="text-xs text-slate-400 mt-1 max-w-xs text-center">
                  {filter !== "all"
                    ? "Try changing your filter selection."
                    : "Create your first invoice to get started."}
                </p>
              </div>
            ) : (
              <>
                <div className="divide-y divide-slate-100 md:hidden">
                  {filteredInvoices.map((invoice, index) => {
                    const client = clientById.get(invoice.clientId);
                    const isOverdue =
                      invoice.dueDate &&
                      new Date(invoice.dueDate).getTime() < now &&
                      invoice.status !== "paid";
                    const isMutating = pendingInvoiceId === invoice.id;
                    const isDownloadingPdf = pendingPdfInvoiceId === invoice.id;

                    return (
                      <motion.div
                        key={invoice.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.03 }}
                        className="p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <Link
                            href={`/dashboard/invoices/${invoice.id}`}
                            prefetch={false}
                            className="font-mono-nums font-bold text-sm text-slate-900 hover:text-emerald-600 transition-colors"
                          >
                            {invoice.invoiceNumber}
                          </Link>
                          <StatusBadge status={invoice.status} overdue={Boolean(isOverdue)} size="sm" />
                        </div>

                        <div className="mt-3 flex items-center gap-2.5">
                          <div
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0"
                            style={{ backgroundColor: client?.color || "#64748B" }}
                          >
                            {client?.name?.charAt(0) || "?"}
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-slate-900 truncate">{client?.name ?? "Unknown client"}</div>
                            {client?.companyName && (
                              <div className="text-xs text-slate-400 truncate">{client.companyName}</div>
                            )}
                          </div>
                        </div>

                        <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-slate-500">
                          <div>
                            <div className="uppercase tracking-wider text-[10px] text-slate-400">Invoice date</div>
                            <div className="mt-1 text-sm text-slate-700">
                              {new Date(invoice.invoiceDate).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </div>
                          </div>
                          <div>
                            <div className="uppercase tracking-wider text-[10px] text-slate-400">Due</div>
                            <div className={`mt-1 text-sm ${isOverdue ? "text-red-600 font-semibold" : "text-slate-700"}`}>
                              {invoice.dueDate
                                ? new Date(invoice.dueDate).toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                  })
                                : "—"}
                            </div>
                          </div>
                        </div>

                        <div className="mt-3 flex items-center justify-between gap-3">
                          <div className="text-sm font-bold text-slate-900 font-mono-nums">
                            {formatCurrency(invoice.totalAmount)}
                          </div>
                          <div className="flex flex-wrap items-center justify-end gap-1">
                            <Link
                              href={`/dashboard/invoices/${invoice.id}`}
                              prefetch={false}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-colors"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              View
                            </Link>
                            <button
                              onClick={() => void handleDownloadPdf(invoice.id, invoice.invoiceNumber)}
                              disabled={isDownloadingPdf}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                              <Download className="w-3.5 h-3.5" />
                              {isDownloadingPdf ? "Downloading..." : "PDF"}
                            </button>
                            {invoice.status === "draft" && (
                              <button
                                onClick={() => void updateInvoiceStatus(invoice.id, "sent")}
                                disabled={isMutating}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                              >
                                <Send className="w-3.5 h-3.5" />
                                {isMutating ? "Saving..." : "Send"}
                              </button>
                            )}
                            {invoice.status === "sent" && (
                              <button
                                onClick={() => void updateInvoiceStatus(invoice.id, "paid")}
                                disabled={isMutating}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                              >
                                <CheckCircle className="w-3.5 h-3.5" />
                                {isMutating ? "Saving..." : "Paid"}
                              </button>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>

                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full min-w-[700px]">
                    <thead>
                      <tr className="border-b border-slate-100">
                        <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 py-3 px-5">Invoice</th>
                        <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 py-3 px-5">Client</th>
                        <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 py-3 px-5">Date</th>
                        <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 py-3 px-5">Due</th>
                        <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 py-3 px-5">Status</th>
                        <th className="text-right text-[11px] font-semibold uppercase tracking-wider text-slate-400 py-3 px-5">Amount</th>
                        <th className="text-right text-[11px] font-semibold uppercase tracking-wider text-slate-400 py-3 px-5">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredInvoices.map((invoice, index) => {
                        const client = clientById.get(invoice.clientId);
                        const isOverdue =
                          invoice.dueDate &&
                          new Date(invoice.dueDate).getTime() < now &&
                          invoice.status !== "paid";
                        const isMutating = pendingInvoiceId === invoice.id;
                        const isDownloadingPdf = pendingPdfInvoiceId === invoice.id;

                        return (
                          <motion.tr
                            key={invoice.id}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.03 }}
                            className="border-b border-slate-50 last:border-b-0 hover:bg-slate-50/80 transition-colors group"
                          >
                            <td className="py-4 px-5">
                              <Link
                                href={`/dashboard/invoices/${invoice.id}`}
                                prefetch={false}
                                className="font-mono-nums font-bold text-sm text-slate-900 hover:text-emerald-600 transition-colors flex items-center gap-2"
                              >
                                {invoice.invoiceNumber}
                                <ChevronRight className="w-3.5 h-3.5 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                              </Link>
                            </td>

                            <td className="py-4 px-5">
                              <div className="flex items-center gap-2.5">
                                <div
                                  className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0"
                                  style={{ backgroundColor: client?.color || "#64748B" }}
                                >
                                  {client?.name?.charAt(0) || "?"}
                                </div>
                                <div>
                                  <div className="text-sm font-medium text-slate-900">{client?.name}</div>
                                  {client?.companyName && (
                                    <div className="text-xs text-slate-400">{client.companyName}</div>
                                  )}
                                </div>
                              </div>
                            </td>

                            <td className="py-4 px-5">
                              <div className="flex items-center gap-1.5 text-sm text-slate-600">
                                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                {new Date(invoice.invoiceDate).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })}
                              </div>
                            </td>

                            <td className="py-4 px-5">
                              {invoice.dueDate ? (
                                <div className="flex items-center gap-1.5 text-sm">
                                  <Clock className={`w-3.5 h-3.5 ${isOverdue ? "text-red-400" : "text-slate-400"}`} />
                                  <span className={isOverdue ? "text-red-600 font-semibold" : "text-slate-600"}>
                                    {new Date(invoice.dueDate).toLocaleDateString("en-US", {
                                      month: "short",
                                      day: "numeric",
                                    })}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-sm text-slate-400">—</span>
                              )}
                            </td>

                            <td className="py-4 px-5">
                              <StatusBadge status={invoice.status} overdue={Boolean(isOverdue)} size="sm" />
                            </td>

                            <td className="py-4 px-5 text-right">
                              <div className="text-sm font-bold text-slate-900 font-mono-nums">
                                {formatCurrency(invoice.totalAmount)}
                              </div>
                            </td>

                            <td className="py-4 px-5">
                              <div className="flex items-center justify-end gap-0.5 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                <Link
                                  href={`/dashboard/invoices/${invoice.id}`}
                                  prefetch={false}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-slate-600 hover:text-slate-900 hover:bg-white rounded-lg transition-colors border border-transparent hover:border-slate-200"
                                  title="View invoice"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  View
                                </Link>
                                <button
                                  onClick={() => void handleDownloadPdf(invoice.id, invoice.invoiceNumber)}
                                  disabled={isDownloadingPdf}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-slate-600 hover:text-slate-900 hover:bg-white rounded-lg transition-colors border border-transparent hover:border-slate-200"
                                  title="Download PDF"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                  {isDownloadingPdf ? "Downloading..." : "PDF"}
                                </button>
                                {invoice.status === "draft" && (
                                  <button
                                    onClick={() => void updateInvoiceStatus(invoice.id, "sent")}
                                    disabled={isMutating}
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-200 disabled:opacity-60 disabled:cursor-not-allowed"
                                    title="Mark as sent"
                                  >
                                    <Send className="w-3.5 h-3.5" />
                                    {isMutating ? "Saving..." : "Send"}
                                  </button>
                                )}
                                {invoice.status === "sent" && (
                                  <button
                                    onClick={() => void updateInvoiceStatus(invoice.id, "paid")}
                                    disabled={isMutating}
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors border border-transparent hover:border-emerald-200 disabled:opacity-60 disabled:cursor-not-allowed"
                                    title="Mark as paid"
                                  >
                                    <CheckCircle className="w-3.5 h-3.5" />
                                    {isMutating ? "Saving..." : "Paid"}
                                  </button>
                                )}
                              </div>
                            </td>
                          </motion.tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </motion.div>
        </>
      )}
    </div>
  );
}
