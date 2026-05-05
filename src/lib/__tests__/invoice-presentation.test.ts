import { describe, expect, it } from "vitest";
import { buildInvoicePresentation } from "@/lib/invoices/presentation";
import { Client, Invoice, InvoiceItem, TimeEntry, UserProfile } from "@/lib/types";

const profile: UserProfile = {
  id: "profile-1",
  userId: "user-1",
  businessName: "E2E Tester",
  fullName: "Alex Doe",
  email: "owner@example.com",
  phone: "+1 555 111 2222",
  address: "123 Test St",
  logoUrl: null,
  defaultCurrency: "$",
  defaultHourlyRate: 100,
  defaultBillingIncrement: "exact",
  defaultMinimumBillableMinutes: null,
  defaultInvoiceDetailLevel: "detailed",
  defaultInvoiceNotes: null,
  invoiceNumberPrefix: "INV",
  nextInvoiceNumber: 8,
  defaultDueDays: 14,
  taxLabel: "Tax",
  taxPercentage: 10,
  paymentInstructions: "Bank transfer within 14 days.",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const client: Client = {
  id: "client-1",
  userId: "user-1",
  name: "E2E Test Client",
  companyName: "Acme Labs",
  email: "client@example.com",
  phone: null,
  billingAddress: "500 Howard St",
  notes: null,
  color: "#10B981",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const invoice: Invoice = {
  id: "invoice-1",
  userId: "user-1",
  clientId: "client-1",
  invoiceNumber: "INV-2026-0007",
  invoiceDate: "2026-05-02",
  dueDate: "2026-05-16",
  detailLevel: "detailed",
  subtotal: 316.7,
  taxAmount: 31.67,
  discountAmount: 0,
  totalAmount: 348.37,
  status: "draft",
  notes: null,
  paymentInstructions: null,
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
    description: "Browser test tiny task entry",
    actualMinutes: 10,
    billedMinutes: 10,
    hourlyRate: 100,
    amount: 16.7,
    sortOrder: 2,
    projectNameSnapshot: "E2E Test Project",
  },
  {
    id: "item-2",
    invoiceId: "invoice-1",
    timeEntryId: "entry-2",
    description: "Browser test manual entry",
    actualMinutes: 90,
    billedMinutes: 90,
    hourlyRate: 100,
    amount: 150,
    sortOrder: 1,
    projectNameSnapshot: "E2E Test Project",
  },
];

const timeEntries: TimeEntry[] = [
  {
    id: "entry-1",
    userId: "user-1",
    clientId: "client-1",
    projectId: "project-1",
    invoiceId: "invoice-1",
    entryDate: "2026-05-04",
    startTime: "2026-05-04T03:00:00.000Z",
    endTime: "2026-05-04T03:10:00.000Z",
    actualMinutes: 10,
    billedMinutes: 10,
    hourlyRate: 100,
    amount: 16.7,
    taskNote: "Tiny task",
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
  {
    id: "entry-2",
    userId: "user-1",
    clientId: "client-1",
    projectId: "project-1",
    invoiceId: "invoice-1",
    entryDate: "2026-05-03",
    startTime: "2026-05-03T03:00:00.000Z",
    endTime: "2026-05-03T04:30:00.000Z",
    actualMinutes: 90,
    billedMinutes: 90,
    hourlyRate: 100,
    amount: 150,
    taskNote: "Manual entry",
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

describe("buildInvoicePresentation", () => {
  it("maps invoice detail data into the shared presentation model", () => {
    const presentation = buildInvoicePresentation({
      invoice,
      invoiceItems,
      timeEntries,
      client,
      profile,
      projects: [{ id: "project-1", name: "E2E Test Project" }],
    });

    expect(presentation.businessName).toBe("E2E Tester");
    expect(presentation.clientName).toBe("E2E Test Client");
    expect(presentation.statusLabel).toBe("Draft");
    expect(presentation.paymentTerms).toBe("Pay within 14 days");
    expect(presentation.servicePeriod).toBe("May 3, 2026 - May 4, 2026");
    expect(presentation.trackedHours).toBe("1.67 hrs");
    expect(presentation.amountDue).toBe("$348.37");
    expect(presentation.notes).toBe("Thank you for your business");
    expect(presentation.lineItems[0].description).toBe("Browser test manual entry");
    expect(presentation.lineItems[0].hours).toBe("1.50 hrs");
    expect(presentation.lineItems[1].session).toMatch(/\d{1,2}:\d{2} [AP]M/);
  });
});
