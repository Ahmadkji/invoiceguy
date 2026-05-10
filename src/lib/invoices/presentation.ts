import {
  formatCurrency,
  formatDecimalHours,
  formatTimeRange,
  getRuleLabel,
} from "@/lib/billing-rules";
import { BillingRule, Client, Invoice, InvoiceItem, TimeEntry, UserProfile } from "@/lib/types";

type ProjectSummary = { id: string; name: string };

export type PresentedInvoiceLineItem = {
  id: string;
  date: string;
  session: string;
  description: string;
  meta: string;
  hours: string;
  rate: string;
  amount: string;
};

export type InvoicePresentation = {
  businessName: string;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  contactAddress: string | null;
  monogram: string;
  clientName: string;
  clientCompany: string | null;
  clientEmail: string | null;
  clientPhone: string | null;
  clientAddress: string | null;
  invoiceNumber: string;
  statusLabel: string;
  issueDate: string;
  dueDate: string | null;
  servicePeriod: string | null;
  trackedHours: string;
  paymentTerms: string;
  notes: string;
  subtotal: string;
  tax: string;
  discount: string;
  amountDue: string;
  taxLabel: string;
  showTax: boolean;
  showDiscount: boolean;
  lineItems: PresentedInvoiceLineItem[];
};

const VALID_BILLING_RULES: BillingRule[] = [
  "exact",
  "round_up_5",
  "round_up_10",
  "round_up_15",
  "round_up_30",
  "round_up_60",
  "min_15",
  "min_30",
];

function isBillingRule(value: unknown): value is BillingRule {
  return typeof value === "string" && VALID_BILLING_RULES.includes(value as BillingRule);
}

function parseDateOnly(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (dateOnlyMatch) {
    const [, year, month, day] = dateOnlyMatch;
    return new Date(Number(year), Number(month) - 1, Number(day));
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatLongDate(value: string | null | undefined) {
  const date = parseDateOnly(value);
  if (!date) {
    return null;
  }

  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatTableDate(value: string | null | undefined) {
  const date = parseDateOnly(value);
  if (!date) {
    return "-";
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function toDateOnlyTime(value: string | null | undefined) {
  const date = parseDateOnly(value);
  if (!date) {
    return null;
  }

  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function formatServicePeriod(entries: TimeEntry[]) {
  const dates = entries
    .map((entry) => entry.entryDate)
    .filter(Boolean)
    .sort((a, b) => (toDateOnlyTime(a) ?? 0) - (toDateOnlyTime(b) ?? 0));

  if (dates.length === 0) {
    return null;
  }

  if (dates[0] === dates[dates.length - 1]) {
    return formatLongDate(dates[0]);
  }

  return `${formatLongDate(dates[0])} - ${formatLongDate(dates[dates.length - 1])}`;
}

function formatPaymentTerms(invoiceDate: string, dueDate: string | null) {
  if (!dueDate) {
    return "Payment due upon receipt";
  }

  const startTime = toDateOnlyTime(invoiceDate);
  const endTime = toDateOnlyTime(dueDate);

  if (startTime === null || endTime === null) {
    return "Payment due upon receipt";
  }

  const diffDays = Math.max(0, Math.round((endTime - startTime) / 86400000));

  if (diffDays > 0) {
    return `Pay within ${diffDays} days`;
  }

  return "Payment due upon receipt";
}

function getStatusLabel(status: Invoice["status"]) {
  const labels: Record<Invoice["status"], string> = {
    draft: "Draft",
    sent: "Sent",
    paid: "Paid",
    void: "Void",
  };

  return labels[status] ?? "Draft";
}

type BuildInvoicePresentationInput = {
  invoice: Invoice;
  invoiceItems: InvoiceItem[];
  timeEntries: TimeEntry[];
  client: Client | null | undefined;
  profile: UserProfile;
  projects: ProjectSummary[];
};

export function buildInvoicePresentation({
  invoice,
  invoiceItems,
  timeEntries,
  client,
  profile,
  projects,
}: BuildInvoicePresentationInput): InvoicePresentation {
  const displayClientName = invoice.clientNameSnapshot || client?.name || "Client";
  const displayClientCompany = invoice.clientCompanySnapshot || client?.companyName || null;
  const displayClientEmail = invoice.clientEmailSnapshot || client?.email || null;
  const displayClientAddress = invoice.clientAddressSnapshot || client?.billingAddress || null;
  const displayClientPhone = invoice.clientPhoneSnapshot || client?.phone || null;

  const linkedEntries = invoiceItems
    .map((item) => timeEntries.find((entry) => entry.id === item.timeEntryId))
    .filter((entry): entry is TimeEntry => Boolean(entry));

  const sortedLineItems = [...invoiceItems]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((item) => {
      const entry = timeEntries.find((candidate) => candidate.id === item.timeEntryId);
      const project = projects.find((candidate) => candidate.id === entry?.projectId);
      const projectDisplayName = item.projectNameSnapshot || project?.name || "Hourly work";
      const billingRule = entry?.billingRuleSnapshot?.rule;
      const billingLabel = isBillingRule(billingRule) ? getRuleLabel(billingRule) : "Manual entry";

      return {
        id: item.id,
        date: formatTableDate(entry?.entryDate),
        session: entry ? formatTimeRange(entry.startTime, entry.endTime) || "-" : "-",
        description: item.description,
        meta: `${billingLabel} - ${projectDisplayName}`,
        hours: `${formatDecimalHours(item.billedMinutes)} hrs`,
        rate: `${formatCurrency(item.hourlyRate, profile.defaultCurrency)}/hr`,
        amount: formatCurrency(item.amount, profile.defaultCurrency),
      };
    });

  const businessName = profile.businessName || profile.fullName || "My Business";
  const monogramSource = businessName.replace(/[^A-Za-z0-9]/g, "").charAt(0) || "I";

  return {
    businessName,
    contactName: profile.fullName || null,
    contactEmail: profile.email || null,
    contactPhone: profile.phone || null,
    contactAddress: profile.address || null,
    monogram: monogramSource.toUpperCase(),
    clientName: displayClientName,
    clientCompany: displayClientCompany,
    clientEmail: displayClientEmail,
    clientPhone: displayClientPhone,
    clientAddress: displayClientAddress,
    invoiceNumber: invoice.invoiceNumber,
    statusLabel: getStatusLabel(invoice.status),
    issueDate: formatLongDate(invoice.invoiceDate) || "-",
    dueDate: formatLongDate(invoice.dueDate),
    servicePeriod: formatServicePeriod(linkedEntries),
    trackedHours: `${formatDecimalHours(invoiceItems.reduce((sum, item) => sum + item.billedMinutes, 0))} hrs`,
    paymentTerms: formatPaymentTerms(invoice.invoiceDate, invoice.dueDate),
    notes: invoice.notes || "Thank you for your business",
    subtotal: formatCurrency(invoice.subtotal, profile.defaultCurrency),
    tax: formatCurrency(invoice.taxAmount, profile.defaultCurrency),
    discount: formatCurrency(invoice.discountAmount, profile.defaultCurrency),
    amountDue: formatCurrency(invoice.totalAmount, profile.defaultCurrency),
    taxLabel: profile.taxLabel || "Tax",
    showTax: invoice.taxAmount > 0,
    showDiscount: invoice.discountAmount > 0,
    lineItems: sortedLineItems,
  };
}
