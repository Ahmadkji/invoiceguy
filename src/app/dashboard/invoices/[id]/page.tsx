"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Printer,
  FileText,
  Eye,
  Layers,
  Clock,
  Send,
  CheckCircle,
  Calendar,
} from "lucide-react";
import Link from "next/link";
import { Client, Invoice, InvoiceDetailLevel, InvoiceItem, TimeEntry, UserProfile } from "@/lib/types";
import { InvoiceCanvas } from "@/components/invoices/invoice-canvas";
import { StatusBadge } from "@/components/invoices/status-badge";
import { formatCurrency } from "@/lib/billing-rules";
import { useNow } from "@/lib/hooks/use-now";

type InvoiceDetailResponse = {
  ok?: boolean;
  code?: string;
  message?: string;
  invoice?: Invoice;
  invoiceItems?: InvoiceItem[];
  timeEntries?: TimeEntry[];
  client?: Client | null;
  profile?: UserProfile;
  projects?: Array<{ id: string; name: string }>;
};

type InvoiceStatusResponse = {
  ok?: boolean;
  code?: string;
  message?: string;
  invoice?: Invoice;
};

export default function InvoicePreviewPage() {
  const now = useNow();
  const params = useParams();
  const invoiceId = params.id as string;

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [client, setClient] = useState<Client | undefined>(undefined);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [projects, setProjects] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [detailLevel, setDetailLevel] = useState<InvoiceDetailLevel>("standard");
  const [showActualTime, setShowActualTime] = useState(true);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  useEffect(() => {
    let ignore = false;

    const loadInvoice = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/me/invoices/${invoiceId}`, {
          method: "GET",
          cache: "no-store",
        });

        const result = (await response.json().catch(() => null)) as InvoiceDetailResponse | null;
        if (ignore) {
          return;
        }

        if (!response.ok || !result?.ok || !result.invoice || !result.profile) {
          setError(result?.message ?? "Unable to load this invoice.");
          setInvoice(null);
          setProfile(null);
          setLoading(false);
          return;
        }

        setInvoice(result.invoice);
        setInvoiceItems(result.invoiceItems ?? []);
        setTimeEntries(result.timeEntries ?? []);
        setClient(result.client ?? undefined);
        setProfile(result.profile);
        setProjects(result.projects ?? []);
        setDetailLevel(result.invoice.detailLevel);
        setLoading(false);
      } catch {
        if (ignore) {
          return;
        }

        setError("Network error while loading invoice.");
        setInvoice(null);
        setProfile(null);
        setLoading(false);
      }
    };

    void loadInvoice();

    return () => {
      ignore = true;
    };
  }, [invoiceId]);

  const isOverdue = useMemo(() => {
    if (!invoice?.dueDate || invoice.status === "paid") {
      return false;
    }

    return new Date(invoice.dueDate).getTime() < now;
  }, [invoice, now]);

  const handlePrintPDF = () => {
    window.print();
  };

  const updateStatus = async (status: Invoice["status"]) => {
    if (!invoice) {
      return;
    }

    setIsUpdatingStatus(true);
    setError(null);

    try {
      const response = await fetch(`/api/me/invoices/${invoice.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      });

      const result = (await response.json().catch(() => null)) as InvoiceStatusResponse | null;

      if (!response.ok || !result?.ok || !result.invoice) {
        setError(result?.message ?? "Unable to update invoice status.");
        setIsUpdatingStatus(false);
        return;
      }

      setInvoice(result.invoice);
      setIsUpdatingStatus(false);
    } catch {
      setError("Network error while updating invoice status.");
      setIsUpdatingStatus(false);
    }
  };

  const detailLevels: { value: InvoiceDetailLevel; label: string; icon: React.ReactNode }[] = [
    { value: "simple", label: "Simple", icon: <Eye className="w-3.5 h-3.5" /> },
    { value: "standard", label: "Standard", icon: <Layers className="w-3.5 h-3.5" /> },
    { value: "audit", label: "Audit", icon: <Clock className="w-3.5 h-3.5" /> },
  ];

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
        Loading invoice...
      </div>
    );
  }

  if (!invoice || !profile) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-4">
          <FileText className="w-8 h-8 text-slate-300" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Invoice not found</h2>
        {error && <p className="mt-2 text-sm text-slate-500">{error}</p>}
        <Link
          href="/dashboard/invoices"
          className="mt-4 text-emerald-600 font-semibold hover:text-emerald-700 transition-colors"
        >
          Back to invoices
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      )}

      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/invoices"
            className="p-2.5 text-slate-400 hover:text-slate-600 hover:bg-white border border-slate-200 rounded-xl transition-all active:scale-95"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight font-mono-nums">
                {invoice.invoiceNumber}
              </h1>
              <StatusBadge status={invoice.status} overdue={Boolean(isOverdue)} size="sm" />
            </div>
            <div className="flex items-center gap-3 mt-1.5">
              <div className="flex items-center gap-1.5 text-sm text-slate-500">
                <div
                  className="w-4 h-4 rounded-md flex items-center justify-center text-white text-[9px] font-bold"
                  style={{ backgroundColor: client?.color || "#64748B" }}
                >
                  {client?.name?.charAt(0) || "?"}
                </div>
                {client?.name}
              </div>
              {client?.companyName && <span className="text-xs text-slate-400">· {client.companyName}</span>}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 print:hidden">
          {invoice.status === "draft" && (
            <button
              onClick={() => void updateStatus("sent")}
              disabled={isUpdatingStatus}
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-all hover:shadow-lg active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
              {isUpdatingStatus ? "Saving..." : "Mark as Sent"}
            </button>
          )}
          {invoice.status === "sent" && (
            <button
              onClick={() => void updateStatus("paid")}
              disabled={isUpdatingStatus}
              className="inline-flex items-center gap-2 bg-emerald-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-all hover:shadow-lg active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <CheckCircle className="w-4 h-4" />
              {isUpdatingStatus ? "Saving..." : "Mark as Paid"}
            </button>
          )}
          <button
            onClick={handlePrintPDF}
            className="inline-flex items-center gap-2 bg-slate-900 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-800 transition-all hover:shadow-lg active:scale-[0.98]"
          >
            <Printer className="w-4 h-4" />
            Export PDF
          </button>


        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-4 print:hidden">
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Date</span>
            <span className="text-sm font-semibold text-slate-700">
              {new Date(invoice.invoiceDate).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          </div>
          {invoice.dueDate && (
            <div className="flex items-center gap-2">
              <Clock className={`w-4 h-4 ${isOverdue ? "text-red-400" : "text-slate-400"}`} />
              <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Due</span>
              <span className={`text-sm font-semibold ${isOverdue ? "text-red-600" : "text-slate-700"}`}>
                {new Date(invoice.dueDate).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            </div>
          )}
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Total</span>
            <span className="text-lg font-bold text-emerald-600 font-mono-nums">
              {formatCurrency(invoice.totalAmount)}
            </span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-3 flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center gap-3 sm:gap-4 print:hidden">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Detail Level</span>
          <div className="flex bg-slate-100 rounded-xl p-1">
            {detailLevels.map((level) => (
              <button
                key={level.value}
                onClick={() => setDetailLevel(level.value)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  detailLevel === level.value
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {level.icon}
                {level.label}
              </button>
            ))}
          </div>
        </div>

        <div className="h-5 w-px bg-slate-200 hidden sm:block" />

        <button
          onClick={() => setShowActualTime(!showActualTime)}
          className={`inline-flex items-center gap-2 text-sm font-medium transition-colors ${
            showActualTime ? "text-slate-900" : "text-slate-400"
          }`}
        >
          <span
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
              showActualTime ? "bg-emerald-600" : "bg-slate-300"
            }`}
          >
            <span
              className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                showActualTime ? "translate-x-5" : "translate-x-0.5"
              }`}
            />
          </span>
          Show actual time
        </button>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={detailLevel + (showActualTime ? "-actual" : "")}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
        >
          <InvoiceCanvas
            invoice={invoice}
            invoiceItems={invoiceItems}
            timeEntries={timeEntries}
            client={client}
            profile={profile}
            projects={projects}
            detailLevel={detailLevel}
            showActualTime={showActualTime}
            isOverdue={Boolean(isOverdue)}
          />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
