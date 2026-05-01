import { describe, it, expect } from "vitest";
import {
  validateCreateInvoicePayload,
  mapClientRow,
  mapProjectRow,
  mapTimeEntryRow,
  mapInvoiceRow,
  mapInvoiceItemRow,
  mapProfileRow,
  toRpcLineItems,
  type ValidatedCreateInvoiceLineItem,
} from "@/lib/invoices/server";

// ─── validateCreateInvoicePayload ────────────────────────────────────────────

describe("validateCreateInvoicePayload", () => {
  const validPayload = {
    clientId: "550e8400-e29b-41d4-a716-446655440000",
    invoiceDate: "2024-06-15",
    detailLevel: "standard",
    status: "draft",
    lineItems: [
      {
        description: "Web development",
        quantity: 5,
        rate: 100,
      },
    ],
  };

  it("validates a correct minimal payload", () => {
    const result = validateCreateInvoicePayload(validPayload);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.clientId).toBe("550e8400-e29b-41d4-a716-446655440000");
      expect(result.value.invoiceDate).toBe("2024-06-15");
      expect(result.value.detailLevel).toBe("standard");
      expect(result.value.status).toBe("draft");
      expect(result.value.lineItems).toHaveLength(1);
      expect(result.value.lineItems[0].amount).toBe(500.0);
    }
  });

  it("rejects missing clientId", () => {
    const result = validateCreateInvoicePayload({ ...validPayload, clientId: "" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("VALIDATION_ERROR");
      expect(result.fieldErrors?.clientId).toBeDefined();
    }
  });

  it("rejects invalid clientId UUID", () => {
    const result = validateCreateInvoicePayload({ ...validPayload, clientId: "not-a-uuid" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.fieldErrors?.clientId).toBe("Client reference is invalid.");
    }
  });

  it("rejects missing invoiceDate", () => {
    const result = validateCreateInvoicePayload({ ...validPayload, invoiceDate: "" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.fieldErrors?.invoiceDate).toBeDefined();
    }
  });

  it("rejects invalid invoiceDate format", () => {
    const result = validateCreateInvoicePayload({ ...validPayload, invoiceDate: "06/15/2024" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.fieldErrors?.invoiceDate).toBe("Issue date must be a valid date.");
    }
  });

  it("rejects dueDate before invoiceDate", () => {
    const result = validateCreateInvoicePayload({
      ...validPayload,
      invoiceDate: "2024-06-15",
      dueDate: "2024-06-10",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.fieldErrors?.dueDate).toBe("Due date cannot be before issue date.");
    }
  });

  it("accepts dueDate on or after invoiceDate", () => {
    const result = validateCreateInvoicePayload({
      ...validPayload,
      invoiceDate: "2024-06-15",
      dueDate: "2024-06-15",
    });
    expect(result.ok).toBe(true);
  });

  it("defaults detailLevel to standard when invalid", () => {
    const result = validateCreateInvoicePayload({ ...validPayload, detailLevel: "ultra" });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.detailLevel).toBe("standard");
    }
  });

  it("rejects invalid status", () => {
    const result = validateCreateInvoicePayload({ ...validPayload, status: "archived" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.fieldErrors?.status).toBe("Invalid invoice status.");
    }
  });

  it("rejects tax percentage out of range", () => {
    const result = validateCreateInvoicePayload({ ...validPayload, taxPercentage: 101 });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.fieldErrors?.taxPercentage).toBeDefined();
    }
  });

  it("rejects negative tax percentage", () => {
    const result = validateCreateInvoicePayload({ ...validPayload, taxPercentage: -5 });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.fieldErrors?.taxPercentage).toBeDefined();
    }
  });

  it("rejects negative discount", () => {
    const result = validateCreateInvoicePayload({ ...validPayload, discountAmount: -10 });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.fieldErrors?.discountAmount).toBeDefined();
    }
  });

  it("rejects missing line items", () => {
    const result = validateCreateInvoicePayload({ ...validPayload, lineItems: [] });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.fieldErrors?.lineItems).toBe("At least one line item is required.");
    }
  });

  it("rejects line items with empty description", () => {
    const result = validateCreateInvoicePayload({
      ...validPayload,
      lineItems: [{ description: "", quantity: 5, rate: 100 }],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.fieldErrors?.["lineItems.0.description"]).toBeDefined();
    }
  });

  it("rejects line items with zero quantity", () => {
    const result = validateCreateInvoicePayload({
      ...validPayload,
      lineItems: [{ description: "Test", quantity: 0, rate: 100 }],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.fieldErrors?.["lineItems.0.quantity"]).toBeDefined();
    }
  });

  it("rejects line items with negative rate", () => {
    const result = validateCreateInvoicePayload({
      ...validPayload,
      lineItems: [{ description: "Test", quantity: 1, rate: -50 }],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.fieldErrors?.["lineItems.0.rate"]).toBeDefined();
    }
  });

  it("rejects invalid timeEntryId UUID in line item", () => {
    const result = validateCreateInvoicePayload({
      ...validPayload,
      lineItems: [{ description: "Test", quantity: 1, rate: 100, timeEntryId: "bad" }],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.fieldErrors?.["lineItems.0.timeEntryId"]).toBeDefined();
    }
  });

  it("accepts valid statuses: draft, sent, paid, void", () => {
    const statuses = ["draft", "sent", "paid", "void"];
    for (const status of statuses) {
      const result = validateCreateInvoicePayload({ ...validPayload, status });
      expect(result.ok).toBe(true);
    }
  });

  it("accepts all valid detail levels", () => {
    const levels = ["simple", "standard", "audit"];
    for (const level of levels) {
      const result = validateCreateInvoicePayload({ ...validPayload, detailLevel: level });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.detailLevel).toBe(level);
      }
    }
  });

  it("sets defaults for optional fields", () => {
    const result = validateCreateInvoicePayload(validPayload);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.taxPercentage).toBe(0);
      expect(result.value.discountAmount).toBe(0);
      expect(result.value.notes).toBeNull();
      expect(result.value.paymentInstructions).toBeNull();
      expect(result.value.invoiceNumber).toBeNull();
      expect(result.value.idempotencyKey).toBeNull();
      expect(result.value.dueDate).toBeNull();
    }
  });

  it("rejects notes exceeding 5000 characters", () => {
    const result = validateCreateInvoicePayload({
      ...validPayload,
      notes: "x".repeat(5001),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.fieldErrors?.notes).toBe("Notes cannot exceed 5000 characters.");
    }
  });

  it("rejects invoice number with unsupported characters", () => {
    const result = validateCreateInvoicePayload({
      ...validPayload,
      invoiceNumber: "INV #123",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.fieldErrors?.invoiceNumber).toBeDefined();
    }
  });

  it("accepts valid invoice number formats", () => {
    const result = validateCreateInvoicePayload({
      ...validPayload,
      invoiceNumber: "INV-2024-001",
    });
    expect(result.ok).toBe(true);
  });

  it("detects client total mismatch", () => {
    const result = validateCreateInvoicePayload({
      ...validPayload,
      lineItems: [{ description: "Dev work", quantity: 5, rate: 100 }],
      clientTotals: { subtotal: 999, taxAmount: 0, totalAmount: 999 },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("TOTAL_MISMATCH");
    }
  });

  it("accepts matching client totals", () => {
    const result = validateCreateInvoicePayload({
      ...validPayload,
      lineItems: [{ description: "Dev work", quantity: 5, rate: 100 }],
      clientTotals: { subtotal: 500, taxAmount: 0, totalAmount: 500 },
    });
    expect(result.ok).toBe(true);
  });

  it("correctly computes totals with multiple line items", () => {
    const result = validateCreateInvoicePayload({
      ...validPayload,
      lineItems: [
        { description: "Item A", quantity: 2, rate: 50 },
        { description: "Item B", quantity: 3, rate: 100 },
      ],
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.lineItems).toHaveLength(2);
      // 2*50 = 100, 3*100 = 300, total = 400
      expect(result.value.subtotal).toBe(400);
      expect(result.value.totalAmount).toBe(400);
    }
  });

  it("correctly computes totals with tax", () => {
    const result = validateCreateInvoicePayload({
      ...validPayload,
      taxPercentage: 10,
      lineItems: [{ description: "Dev work", quantity: 1, rate: 100 }],
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.subtotal).toBe(100);
      expect(result.value.taxAmount).toBe(10);
      expect(result.value.totalAmount).toBe(110);
    }
  });

  it("correctly computes totals with discount", () => {
    const result = validateCreateInvoicePayload({
      ...validPayload,
      discountAmount: 20,
      lineItems: [{ description: "Dev work", quantity: 1, rate: 100 }],
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.subtotal).toBe(100);
      expect(result.value.discountAmount).toBe(20);
      expect(result.value.totalAmount).toBe(80);
    }
  });

  it("rejects discount exceeding subtotal", () => {
    const result = validateCreateInvoicePayload({
      ...validPayload,
      discountAmount: 200,
      lineItems: [{ description: "Dev work", quantity: 1, rate: 100 }],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.fieldErrors?.discountAmount).toBe("Discount cannot exceed the invoice subtotal.");
    }
  });
});

// ─── mapClientRow ────────────────────────────────────────────────────────────

describe("mapClientRow", () => {
  it("maps a complete client row", () => {
    const row = {
      id: "uuid-1",
      user_id: "user-1",
      name: "Acme Corp",
      company_name: "Acme Inc",
      email: "acme@test.com",
      phone: "555-0100",
      billing_address: "123 Main St",
      notes: "VIP client",
      color: "#FF0000",
      created_at: "2024-01-01T00:00:00.000Z",
      updated_at: "2024-06-01T00:00:00.000Z",
    };
    const client = mapClientRow(row);
    expect(client.id).toBe("uuid-1");
    expect(client.userId).toBe("user-1");
    expect(client.name).toBe("Acme Corp");
    expect(client.companyName).toBe("Acme Inc");
    expect(client.email).toBe("acme@test.com");
    expect(client.color).toBe("#FF0000");
  });

  it("handles missing optional fields", () => {
    const row = {
      id: "uuid-1",
      user_id: "user-1",
      name: "Jane Doe",
    };
    const client = mapClientRow(row);
    expect(client.companyName).toBeNull();
    expect(client.email).toBeNull();
    expect(client.phone).toBeNull();
    expect(client.billingAddress).toBeNull();
    expect(client.notes).toBeNull();
  });

  it("uses default color when missing", () => {
    const row = { id: "uuid-1", user_id: "user-1", name: "Test" };
    const client = mapClientRow(row);
    expect(client.color).toBe("#10B981");
  });
});

// ─── mapProjectRow ───────────────────────────────────────────────────────────

describe("mapProjectRow", () => {
  it("maps a complete project row", () => {
    const row = {
      id: "proj-1",
      user_id: "user-1",
      client_id: "client-1",
      name: "Website Redesign",
      description: "Full redesign",
      hourly_rate: 150,
      billing_increment: "round_up_15",
      minimum_billable_minutes: 30,
      status: "active",
      created_at: "2024-01-01T00:00:00.000Z",
      updated_at: "2024-06-01T00:00:00.000Z",
    };
    const project = mapProjectRow(row);
    expect(project.id).toBe("proj-1");
    expect(project.name).toBe("Website Redesign");
    expect(project.hourlyRate).toBe(150);
    expect(project.billingIncrement).toBe("round_up_15");
    expect(project.minimumBillableMinutes).toBe(30);
    expect(project.status).toBe("active");
  });

  it("defaults billing increment to exact for invalid values", () => {
    const row = {
      id: "proj-1",
      user_id: "user-1",
      client_id: "client-1",
      name: "Test",
      billing_increment: "invalid",
    };
    const project = mapProjectRow(row);
    expect(project.billingIncrement).toBe("exact");
  });

  it("defaults status to active for invalid values", () => {
    const row = {
      id: "proj-1",
      user_id: "user-1",
      client_id: "client-1",
      name: "Test",
      status: "unknown",
    };
    const project = mapProjectRow(row);
    expect(project.status).toBe("active");
  });

  it("handles null minimumBillableMinutes", () => {
    const row = {
      id: "proj-1",
      user_id: "user-1",
      client_id: "client-1",
      name: "Test",
      minimum_billable_minutes: null,
    };
    const project = mapProjectRow(row);
    expect(project.minimumBillableMinutes).toBeNull();
  });
});

// ─── mapTimeEntryRow ─────────────────────────────────────────────────────────

describe("mapTimeEntryRow", () => {
  it("maps a complete billable time entry", () => {
    const row = {
      id: "te-1",
      user_id: "user-1",
      client_id: "client-1",
      project_id: "proj-1",
      invoice_id: "inv-1",
      entry_date: "2024-06-15",
      start_time: "2024-06-15T09:00:00Z",
      end_time: "2024-06-15T10:30:00Z",
      actual_minutes: 90,
      billed_minutes: 90,
      hourly_rate: 100,
      amount: 150,
      task_note: "Built login page",
      internal_note: null,
      is_billable: true,
      non_billable_category: null,
      billing_rule_snapshot: { rule: "exact", increment_minutes: null, minimum_minutes: null },
      status: "invoiced",
      created_at: "2024-06-15T00:00:00.000Z",
      updated_at: "2024-06-15T00:00:00.000Z",
    };
    const entry = mapTimeEntryRow(row);
    expect(entry.id).toBe("te-1");
    expect(entry.actualMinutes).toBe(90);
    expect(entry.billedMinutes).toBe(90);
    expect(entry.hourlyRate).toBe(100);
    expect(entry.amount).toBe(150);
    expect(entry.isBillable).toBe(true);
    expect(entry.status).toBe("invoiced");
    expect(entry.billingRuleSnapshot.rule).toBe("exact");
  });

  it("defaults status to uninvoiced for invalid values", () => {
    const row = {
      id: "te-1",
      user_id: "user-1",
      client_id: "client-1",
      project_id: "proj-1",
      entry_date: "2024-06-15",
      actual_minutes: 30,
      billed_minutes: 30,
      hourly_rate: 100,
      amount: 50,
      task_note: "Test",
      is_billable: true,
      billing_rule_snapshot: { rule: "exact" },
      status: "unknown",
    };
    const entry = mapTimeEntryRow(row);
    expect(entry.status).toBe("uninvoiced");
  });

  it("clamps negative minutes to 0", () => {
    const row = {
      id: "te-1",
      user_id: "user-1",
      client_id: "client-1",
      project_id: "proj-1",
      entry_date: "2024-06-15",
      actual_minutes: -10,
      billed_minutes: -5,
      hourly_rate: -50,
      amount: -20,
      task_note: "Test",
      is_billable: true,
      billing_rule_snapshot: { rule: "exact" },
      status: "uninvoiced",
    };
    const entry = mapTimeEntryRow(row);
    expect(entry.actualMinutes).toBe(0);
    expect(entry.billedMinutes).toBe(0);
    expect(entry.hourlyRate).toBe(0);
    expect(entry.amount).toBe(0);
  });
});

// ─── mapInvoiceRow ───────────────────────────────────────────────────────────

describe("mapInvoiceRow", () => {
  it("maps a complete invoice row", () => {
    const row = {
      id: "inv-1",
      user_id: "user-1",
      client_id: "client-1",
      invoice_number: "INV-001",
      invoice_date: "2024-06-15",
      due_date: "2024-07-15",
      detail_level: "standard",
      subtotal: 1000,
      tax_amount: 100,
      discount_amount: 0,
      total_amount: 1100,
      status: "sent",
      notes: "Thank you",
      payment_instructions: "Bank transfer",
      client_name_snapshot: "Acme Corp",
      client_email_snapshot: "acme@test.com",
      client_company_snapshot: "Acme Inc",
      client_address_snapshot: "123 Main St",
      client_phone_snapshot: "555-0100",
      created_at: "2024-06-15T00:00:00.000Z",
      updated_at: "2024-06-15T00:00:00.000Z",
    };
    const invoice = mapInvoiceRow(row);
    expect(invoice.id).toBe("inv-1");
    expect(invoice.invoiceNumber).toBe("INV-001");
    expect(invoice.subtotal).toBe(1000);
    expect(invoice.taxAmount).toBe(100);
    expect(invoice.totalAmount).toBe(1100);
    expect(invoice.status).toBe("sent");
    expect(invoice.detailLevel).toBe("standard");
  });

  it("defaults status to draft for invalid values", () => {
    const row = {
      id: "inv-1",
      user_id: "user-1",
      client_id: "client-1",
      invoice_number: "INV-001",
      invoice_date: "2024-06-15",
      status: "unknown",
    };
    const invoice = mapInvoiceRow(row);
    expect(invoice.status).toBe("draft");
  });

  it("clamps negative amounts to 0", () => {
    const row = {
      id: "inv-1",
      user_id: "user-1",
      client_id: "client-1",
      invoice_number: "INV-001",
      invoice_date: "2024-06-15",
      subtotal: -100,
      tax_amount: -10,
      discount_amount: -5,
      total_amount: -115,
    };
    const invoice = mapInvoiceRow(row);
    expect(invoice.subtotal).toBe(0);
    expect(invoice.taxAmount).toBe(0);
    expect(invoice.discountAmount).toBe(0);
    expect(invoice.totalAmount).toBe(0);
  });
});

// ─── mapInvoiceItemRow ───────────────────────────────────────────────────────

describe("mapInvoiceItemRow", () => {
  it("maps a complete invoice item row", () => {
    const row = {
      id: "ii-1",
      invoice_id: "inv-1",
      time_entry_id: "te-1",
      description: "Web development",
      actual_minutes: 120,
      billed_minutes: 120,
      hourly_rate: 100,
      amount: 200,
      sort_order: 1,
      project_name_snapshot: "Website",
    };
    const item = mapInvoiceItemRow(row);
    expect(item.id).toBe("ii-1");
    expect(item.invoiceId).toBe("inv-1");
    expect(item.timeEntryId).toBe("te-1");
    expect(item.description).toBe("Web development");
    expect(item.actualMinutes).toBe(120);
    expect(item.billedMinutes).toBe(120);
    expect(item.hourlyRate).toBe(100);
    expect(item.amount).toBe(200);
    expect(item.sortOrder).toBe(1);
  });

  it("defaults sortOrder to 1 when missing or invalid", () => {
    const row = {
      id: "ii-1",
      invoice_id: "inv-1",
      description: "Test",
      sort_order: 0,
    };
    const item = mapInvoiceItemRow(row);
    expect(item.sortOrder).toBe(1);
  });

  it("handles null timeEntryId", () => {
    const row = {
      id: "ii-1",
      invoice_id: "inv-1",
      description: "Test",
      time_entry_id: null,
    };
    const item = mapInvoiceItemRow(row);
    expect(item.timeEntryId).toBeNull();
  });
});

// ─── toRpcLineItems ──────────────────────────────────────────────────────────

describe("toRpcLineItems", () => {
  it("converts validated line items to RPC format", () => {
    const items: ValidatedCreateInvoiceLineItem[] = [
      {
        timeEntryId: "te-1",
        description: "Dev work",
        quantity: 5,
        hourlyRate: 100,
        actualMinutes: 300,
        billedMinutes: 300,
        amount: 500,
      },
      {
        timeEntryId: null,
        description: "Design",
        quantity: 2,
        hourlyRate: 80,
        actualMinutes: 120,
        billedMinutes: 120,
        amount: 160,
      },
    ];
    const rpcItems = toRpcLineItems(items);
    expect(rpcItems).toHaveLength(2);
    expect(rpcItems[0].sortOrder).toBe(1);
    expect(rpcItems[1].sortOrder).toBe(2);
    expect(rpcItems[0].description).toBe("Dev work");
    expect(rpcItems[0].timeEntryId).toBe("te-1");
    expect(rpcItems[1].timeEntryId).toBeNull();
  });
});
