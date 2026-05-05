"use client";

import { Mail, MapPin, NotebookPen, Phone, WalletCards } from "lucide-react";
import { Client, Invoice, InvoiceItem, TimeEntry, UserProfile } from "@/lib/types";
import { buildInvoicePresentation } from "@/lib/invoices/presentation";
import { cn } from "@/lib/utils";
import { LineItemsTable } from "./line-items-table";
import { InvoiceTotals } from "./invoice-totals";

interface InvoiceCanvasProps {
  invoice: Invoice;
  invoiceItems: InvoiceItem[];
  timeEntries: TimeEntry[];
  client: Client | undefined;
  profile: UserProfile;
  projects: { id: string; name: string }[];
  isOverdue: boolean;
}

function DetailRow({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-[minmax(0,150px)_1fr] gap-4 border-b border-[#d9c3a1]/45 py-4 text-sm sm:grid-cols-[160px_1fr]",
        className
      )}
    >
      <span className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#9f7d4f]">
        {label}
      </span>
      <span className="text-base text-[#2c241b]">{value}</span>
    </div>
  );
}

function InfoRow({
  icon: Icon,
  text,
}: {
  icon: typeof Mail;
  text: string;
}) {
  return (
    <div className="flex items-start gap-3 text-sm text-[#4c4033]">
      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#f5eee4] text-[#b99158]">
        <Icon className="h-4 w-4" />
      </div>
      <span className="whitespace-pre-line">{text}</span>
    </div>
  );
}

function InvoiceStatusPill({
  label,
  overdue,
}: {
  label: string;
  overdue: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="inline-flex items-center rounded-full bg-[#f2e5d0] px-4 py-1.5 text-sm font-medium text-[#7a5d35]">
        {label}
      </span>
      {overdue ? (
        <span className="inline-flex items-center rounded-full border border-[#dfb0aa] bg-[#fff1ef] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#b24f41]">
          Overdue
        </span>
      ) : null}
    </div>
  );
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
  const presentation = buildInvoicePresentation({
    invoice,
    invoiceItems,
    timeEntries,
    client,
    profile,
    projects,
  });

  return (
    <div className="overflow-hidden rounded-[28px] border border-[#e2cfb2] bg-[#fffdf8] shadow-[0_28px_90px_rgba(188,151,98,0.14)] print:rounded-none print:border-0 print:shadow-none">
      <div className="relative overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(245,233,214,0.7),_transparent_38%),radial-gradient(circle_at_bottom_right,_rgba(245,233,214,0.9),_transparent_28%),linear-gradient(180deg,_#fffefb_0%,_#fffaf2_100%)] px-5 py-6 sm:px-8 sm:py-8 md:px-12 md:py-10 print:bg-none">
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-[linear-gradient(90deg,rgba(232,211,180,0.75),rgba(255,251,244,0.95),rgba(232,211,180,0.75))] print:hidden" />
        <div className="pointer-events-none absolute bottom-6 left-4 hidden h-44 w-44 rounded-full border border-[#ead8bf] opacity-60 md:block print:hidden" />
        <div className="pointer-events-none absolute bottom-4 left-8 hidden h-32 w-28 rotate-[-16deg] rounded-[100%_0_100%_0] border border-[#e8d7be] opacity-60 md:block print:hidden" />

        <div className="relative z-10">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_1.15fr] lg:items-start">
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="flex h-28 w-28 items-center justify-center rounded-full border border-[#c8a873] bg-[#fffefb] text-[4.7rem] leading-none text-[#111111] shadow-[0_10px_35px_rgba(201,167,114,0.12)]">
                  <span className="font-serif">{presentation.monogram}</span>
                </div>
                <div>
                  <h2 className="font-serif text-4xl text-[#16120f] sm:text-[3.35rem]">
                    {presentation.businessName}
                  </h2>
                  {presentation.contactName ? (
                    <p className="mt-1 text-base text-[#776250]">{presentation.contactName}</p>
                  ) : null}
                </div>
                <div className="h-px w-14 bg-[#c8a873]" />
              </div>

              <div className="space-y-4">
                {presentation.contactEmail ? (
                  <InfoRow icon={Mail} text={presentation.contactEmail} />
                ) : null}
                {presentation.contactPhone ? (
                  <InfoRow icon={Phone} text={presentation.contactPhone} />
                ) : null}
                {presentation.contactAddress ? (
                  <InfoRow icon={MapPin} text={presentation.contactAddress} />
                ) : null}
              </div>

              <div className="rounded-[24px] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.85),rgba(250,242,230,0.78))] p-6 shadow-[0_18px_50px_rgba(188,151,98,0.1)]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-[#b28a52]">
                  Bill To
                </p>
                <div className="mt-4 h-px w-full bg-[#ddc6a5]" />
                <div className="mt-4 space-y-3">
                  <h3 className="font-serif text-3xl text-[#17120d]">{presentation.clientName}</h3>
                  {presentation.clientCompany ? (
                    <p className="text-sm text-[#7a6654]">{presentation.clientCompany}</p>
                  ) : null}
                  <div className="space-y-2 text-sm text-[#4f4337]">
                    {presentation.clientEmail ? <InfoRow icon={Mail} text={presentation.clientEmail} /> : null}
                    {presentation.clientPhone ? <InfoRow icon={Phone} text={presentation.clientPhone} /> : null}
                    {presentation.clientAddress ? <InfoRow icon={MapPin} text={presentation.clientAddress} /> : null}
                  </div>
                </div>
              </div>
            </div>

            <div>
              <div className="pb-6">
                <h1 className="font-serif text-[4.8rem] uppercase leading-none tracking-[0.02em] text-[#111111] sm:text-[6.5rem]">
                  Invoice
                </h1>
                <div className="mt-4 flex items-center gap-3 text-[#c29a62]">
                  <div className="h-px flex-1 bg-[#d8bf9a]" />
                  <span className="text-lg">*</span>
                  <div className="h-px flex-1 bg-[#d8bf9a]" />
                </div>
              </div>

              <div className="grid gap-8 lg:grid-cols-[1px_minmax(0,1fr)]">
                <div className="hidden bg-[#ddc6a5] lg:block" />
                <div>
                  <DetailRow label="Invoice #" value={presentation.invoiceNumber} className="pt-0" />
                  <div className="grid grid-cols-[minmax(0,150px)_1fr] gap-4 border-b border-[#d9c3a1]/45 py-4 text-sm sm:grid-cols-[160px_1fr]">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#9f7d4f]">
                      Status
                    </span>
                    <InvoiceStatusPill label={presentation.statusLabel} overdue={isOverdue} />
                  </div>
                  <DetailRow label="Issue Date" value={presentation.issueDate} />
                  {presentation.dueDate ? <DetailRow label="Due Date" value={presentation.dueDate} /> : null}
                  {presentation.servicePeriod ? (
                    <DetailRow label="Service Period" value={presentation.servicePeriod} />
                  ) : null}
                  <DetailRow label="Tracked Hours" value={presentation.trackedHours} className="border-b-0 pb-0" />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-10">
            <LineItemsTable lineItems={presentation.lineItems} />
          </div>

          <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_1px_420px]">
            <div className="space-y-8">
              <div className="flex items-start gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[#f5eee4] text-[#b28a52]">
                  <WalletCards className="h-7 w-7" />
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-[#b28a52]">
                    Payment Terms
                  </p>
                  <p className="mt-2 text-2xl font-medium leading-tight text-[#231a12]">
                    {presentation.paymentTerms}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[#675645]">
                    {invoice.paymentInstructions ||
                      profile.paymentInstructions ||
                      "Please include the invoice number with your payment."}
                  </p>
                </div>
              </div>

              <div className="h-px w-full bg-[#ddc6a5]" />

              <div className="flex items-start gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[#f5eee4] text-[#b28a52]">
                  <NotebookPen className="h-7 w-7" />
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-[#b28a52]">
                    Notes
                  </p>
                  <p className="mt-2 text-xl font-medium leading-tight text-[#231a12]">
                    {presentation.notes}
                  </p>
                </div>
              </div>
            </div>

            <div className="hidden bg-[#ddc6a5] lg:block" />

            <InvoiceTotals
              subtotal={presentation.subtotal}
              tax={presentation.tax}
              discount={presentation.discount}
              amountDue={presentation.amountDue}
              taxLabel={presentation.taxLabel}
              showTax={presentation.showTax}
              showDiscount={presentation.showDiscount}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
