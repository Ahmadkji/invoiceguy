"use client";

import { Mail, MapPin, Phone } from "lucide-react";
import { formatDecimalHours } from "@/lib/billing-rules";
import {
  Client,
  Invoice,
  InvoiceItem,
  TimeEntry,
  UserProfile,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { LineItemsTable } from "./line-items-table";
import { InvoiceTotals } from "./invoice-totals";
import { StatusBadge } from "./status-badge";

interface InvoiceCanvasProps {
  invoice: Invoice;
  invoiceItems: InvoiceItem[];
  timeEntries: TimeEntry[];
  client: Client | undefined;
  profile: UserProfile;
  projects: { id: string; name: string }[];
  isOverdue: boolean;
}

function formatLongDate(value: string | null | undefined) {
  if (!value) {
    return "—";
  }

  return new Date(value).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatServicePeriod(entries: TimeEntry[]) {
  const dates = entries
    .map((entry) => entry.entryDate)
    .filter(Boolean)
    .sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

  if (dates.length === 0) {
    return null;
  }

  const start = new Date(dates[0]);
  const end = new Date(dates[dates.length - 1]);

  if (start.toDateString() === end.toDateString()) {
    return formatLongDate(dates[0]);
  }

  return `${formatLongDate(dates[0])} - ${formatLongDate(dates[dates.length - 1])}`;
}

export function InvoiceCanvas({
  invoice,
  invoiceItems,
  timeEntries,
  client,
  profile,
  projects,
  isOverdue,
}: InvoiceCanvasProps) {
  // Prefer snapshot data over live client data for historical accuracy
  const displayClientName = invoice.clientNameSnapshot || client?.name || "Client";
  const displayClientCompany = invoice.clientCompanySnapshot || client?.companyName || null;
  const displayClientEmail = invoice.clientEmailSnapshot || client?.email || null;
  const displayClientAddress = invoice.clientAddressSnapshot || client?.billingAddress || null;
  const displayClientPhone = invoice.clientPhoneSnapshot || client?.phone || null;

  const linkedEntries = invoiceItems
    .map((item) => timeEntries.find((entry) => entry.id === item.timeEntryId))
    .filter((entry): entry is TimeEntry => Boolean(entry));

  const formattedInvoiceDate = formatLongDate(invoice.invoiceDate);
  const formattedDueDate = invoice.dueDate ? formatLongDate(invoice.dueDate) : null;
  const formattedServicePeriod = formatServicePeriod(linkedEntries);
  const totalBilledMinutes = invoiceItems.reduce(
    (sum, item) => sum + item.billedMinutes,
    0
  );
  const noteText =
    invoice.notes ||
    "Generated from tracked work entries and the saved billing settings.";
  const paymentInstructions =
    invoice.paymentInstructions ||
    profile.paymentInstructions ||
    "Please include the invoice number with your payment.";

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm print:rounded-none print:border-0 print:shadow-none">
      <div className="mx-auto max-w-4xl px-5 py-6 sm:px-7 md:px-8 print:max-w-none">
        <div className="flex flex-col gap-8 border-b border-slate-300 pb-8 md:flex-row md:items-start md:justify-between">
          <div className="space-y-3">
            <div>
              <h2 className="text-[28px] font-bold tracking-tight text-slate-900">
                {profile.businessName}
              </h2>
              <p className="mt-1 text-sm font-medium text-slate-600">
                {profile.fullName}
              </p>
            </div>

            <div className="space-y-2 text-sm text-slate-600">
              {profile.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                  <span>{profile.phone}</span>
                </div>
              )}
              {profile.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                  <span>{profile.email}</span>
                </div>
              )}
              {profile.address && (
                <div className="flex items-start gap-2">
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                  <span className="whitespace-pre-line">{profile.address}</span>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-3 text-left md:text-right">
            <div>
              <p className="text-4xl font-bold uppercase tracking-[0.08em] text-slate-900 md:text-5xl">
                Invoice
              </p>
            </div>
            <div className="flex md:justify-end">
              <StatusBadge status={invoice.status} overdue={isOverdue} size="md" />
            </div>
          </div>
        </div>

        <div className="grid gap-8 py-8 md:grid-cols-[minmax(0,1fr)_300px]">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Bill To
            </p>
            <p className="text-xl font-semibold text-slate-900">
              {displayClientName}
            </p>
            {displayClientCompany && (
              <p className="text-sm text-slate-500">{displayClientCompany}</p>
            )}
            <div className="space-y-1.5 text-sm text-slate-600">
              {displayClientPhone && <p>{displayClientPhone}</p>}
              {displayClientEmail && <p>{displayClientEmail}</p>}
              {displayClientAddress && (
                <p className="whitespace-pre-line">{displayClientAddress}</p>
              )}
            </div>
          </div>

          <div className="space-y-0 text-sm">
            <div className="grid grid-cols-[120px_1fr] gap-3 border-b border-slate-300 py-2.5">
              <span className="font-semibold uppercase tracking-[0.12em] text-slate-500">
                Invoice #
              </span>
              <span className="text-slate-900">{invoice.invoiceNumber}</span>
            </div>

            <div className="grid grid-cols-[120px_1fr] gap-3 border-b border-slate-300 py-2.5">
              <span className="font-semibold uppercase tracking-[0.12em] text-slate-500">
                Date
              </span>
              <span className="text-slate-800">{formattedInvoiceDate}</span>
            </div>

            {formattedDueDate && (
              <div className="grid grid-cols-[120px_1fr] gap-3 border-b border-slate-300 py-2.5">
                <span className="font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Due
                </span>
                <span
                  className={cn(
                    isOverdue ? "font-medium text-red-600" : "text-slate-800"
                  )}
                >
                  {formattedDueDate}
                </span>
              </div>
            )}

            {formattedServicePeriod && (
              <div className="grid grid-cols-[120px_1fr] gap-3 border-b border-slate-300 py-2.5">
                <span className="font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Service
                </span>
                <span className="text-slate-800">{formattedServicePeriod}</span>
              </div>
            )}

          </div>
        </div>

        <LineItemsTable
          invoiceItems={invoiceItems}
          timeEntries={timeEntries}
          projects={projects}
        />

        <div className="mt-8 grid gap-8 border-t border-slate-300 pt-8 md:grid-cols-[minmax(0,1fr)_280px] md:items-start">
          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Summary
              </p>
              <div className="mt-2 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                <div>{formatDecimalHours(totalBilledMinutes)} tracked hrs</div>
                <div>{invoiceItems.length} line items</div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Payment Terms
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {formattedDueDate
                    ? `Payment is due by ${formattedDueDate}.`
                    : "Payment is due upon receipt."}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {paymentInstructions}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Notes
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {noteText}
                </p>
              </div>
            </div>
          </div>

          <InvoiceTotals invoice={invoice} profile={profile} />
        </div>
      </div>
    </div>
  );
}
