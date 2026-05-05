"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Printer,
  FileText,
  Send,
  CheckCircle,
} from "lucide-react";
import Link from "next/link";
import { Client, Invoice, InvoiceItem, TimeEntry, UserProfile } from "@/lib/types";
import { InvoiceCanvas } from "@/components/invoices/invoice-canvas";
import { StatusBadge } from "@/components/invoices/status-badge";
import { useNow } from "@/lib/hooks/use-now";
import { downloadInvoicePdf } from "@/lib/invoices/download-pdf";
import { useAppStore } from "@/lib/store/use-app-store";

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
  const updateInvoiceInStore = useAppStore((s) => s.updateInvoice);
  const invalidateData = useAppStore((s) => s.invalidateData);

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [client, setClient] = useState<Client | undefined>(undefined);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [projects, setProjects] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

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

  const handleDownloadPdf = async () => {
    if (!invoice) {
      return;
    }

    setIsDownloadingPdf(true);
    setError(null);

    try {
      await downloadInvoicePdf({ invoiceId: invoice.id, invoiceNumber: invoice.invoiceNumber });
      setIsDownloadingPdf(false);
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : "Unable to download invoice PDF.");
      setIsDownloadingPdf(false);
    }
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
      updateInvoiceInStore(result.invoice);
      invalidateData();
      setIsUpdatingStatus(false);
    } catch {
      setError("Network error while updating invoice status.");
      setIsUpdatingStatus(false);
    }
  };

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
            prefetch={false}
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
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-1.5">
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

        <div className="flex flex-wrap items-center gap-2 print:hidden">
          {invoice.status === "draft" && (
            <button
              onClick={() => void updateStatus("sent")}
              disabled={isUpdatingStatus}
              className="inline-flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-all hover:shadow-lg active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
              {isUpdatingStatus ? "Saving..." : "Mark as Sent"}
            </button>
          )}
          {invoice.status === "sent" && (
            <button
              onClick={() => void updateStatus("paid")}
              disabled={isUpdatingStatus}
              className="inline-flex items-center justify-center gap-2 bg-emerald-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-all hover:shadow-lg active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <CheckCircle className="w-4 h-4" />
              {isUpdatingStatus ? "Saving..." : "Mark as Paid"}
            </button>
          )}
          <button
            onClick={() => void handleDownloadPdf()}
            disabled={isDownloadingPdf}
            className="inline-flex items-center justify-center gap-2 bg-slate-900 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-800 transition-all hover:shadow-lg active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <Printer className="w-4 h-4" />
            {isDownloadingPdf ? "Preparing PDF..." : "Download PDF"}
          </button>


        </div>
      </div>

      <InvoiceCanvas
        invoice={invoice}
        invoiceItems={invoiceItems}
        timeEntries={timeEntries}
        client={client}
        profile={profile}
        projects={projects}
        isOverdue={Boolean(isOverdue)}
      />
    </div>
  );
}
