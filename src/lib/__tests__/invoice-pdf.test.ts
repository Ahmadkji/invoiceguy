import { describe, expect, it } from "vitest";
import { buildInvoicePdfBuffer } from "@/lib/invoices/pdf";
import { Client, Invoice, InvoiceItem, TimeEntry, UserProfile } from "@/lib/types";

const profile: UserProfile = {
  id: "profile-1",
  userId: "user-1",
  businessName: "Cafe Renome",
  fullName: "Jose Alvarez",
  email: "owner@example.com",
  phone: "+1 555 111 2222",
  address: "123 Market Street\nSan Francisco, CA",
  logoUrl: null,
  defaultCurrency: "$",
  defaultHourlyRate: 120,
  defaultBillingIncrement: "exact",
  defaultMinimumBillableMinutes: null,
  defaultInvoiceDetailLevel: "detailed",
  defaultInvoiceNotes: null,
  invoiceNumberPrefix: "INV",
  nextInvoiceNumber: 2,
  defaultDueDays: 14,
  taxLabel: "VAT",
  taxPercentage: 10,
  paymentInstructions: "Bank transfer within 14 days.",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const client: Client = {
  id: "client-1",
  userId: "user-1",
  name: "Andre Muller",
  companyName: "Studio Nino",
  email: "client@example.com",
  phone: "+1 555 333 4444",
  billingAddress: "500 Howard St\nSan Francisco, CA",
  notes: null,
  color: "#10B981",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const invoice: Invoice = {
  id: "invoice-1",
  userId: "user-1",
  clientId: "client-1",
  invoiceNumber: "INV-2026-0001",
  invoiceDate: "2026-05-01",
  dueDate: "2026-05-15",
  detailLevel: "detailed",
  subtotal: 240,
  taxAmount: 24,
  discountAmount: 0,
  totalAmount: 264,
  status: "sent",
  notes: "Danke for the redesign sprint.",
  paymentInstructions: "Wire transfer is preferred.",
  clientNameSnapshot: null,
  clientEmailSnapshot: null,
  clientCompanySnapshot: null,
  clientAddressSnapshot: null,
  clientPhoneSnapshot: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const invoiceItems: InvoiceItem[] = [
  {
    id: "item-1",
    invoiceId: "invoice-1",
    timeEntryId: "entry-1",
    description: "Homepage redesign and invoice layout cleanup",
    actualMinutes: 120,
    billedMinutes: 120,
    hourlyRate: 120,
    amount: 240,
    sortOrder: 1,
    projectNameSnapshot: "Website refresh",
  },
];

const timeEntries: TimeEntry[] = [
  {
    id: "entry-1",
    userId: "user-1",
    clientId: "client-1",
    projectId: "project-1",
    invoiceId: "invoice-1",
    entryDate: "2026-04-29",
    startTime: "2026-04-29T09:00:00.000Z",
    endTime: "2026-04-29T11:00:00.000Z",
    actualMinutes: 120,
    billedMinutes: 120,
    hourlyRate: 120,
    amount: 240,
    taskNote: "Design work",
    internalNote: null,
    billingRuleSnapshot: {
      rule: "exact",
      incrementMinutes: null,
      minimumMinutes: null,
    },
    status: "invoiced",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

describe("buildInvoicePdfBuffer", () => {
  it("builds a non-empty PDF buffer for invoice downloads", async () => {
    const pdfBytes = await buildInvoicePdfBuffer({
      invoice,
      invoiceItems,
      timeEntries,
      client,
      profile,
      projects: [{ id: "project-1", name: "Website refresh" }],
    });

    expect(pdfBytes).toBeInstanceOf(Uint8Array);
    expect(pdfBytes.byteLength).toBeGreaterThan(1000);
  });
});

