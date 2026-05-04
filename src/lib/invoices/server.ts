import type { SupabaseClient, User } from "@supabase/supabase-js";
import {
  BILLING_RULES,
  DbRecord,
  asRecord,
  toNumber,
  toInteger,
  toStringValue,
  toNullableString,
  isUuid,
  isIsoDate,
  isValidCurrency,
  toCurrencyCents,
  fromCurrencyCents,
  calculateLineAmountCents,
} from "@/lib/validation";
import {
  BillingRule,
  Client,
  Invoice,
  InvoiceDetailLevel,
  InvoiceItem,
  InvoiceStatus,
  Project,
  TimeEntry,
  UserProfile,
} from "@/lib/types";

export type InvoiceEditorProject = Pick<Project, "id" | "name">;
export type InvoiceDetailData = {
  invoice: Invoice;
  invoiceItems: InvoiceItem[];
  timeEntries: TimeEntry[];
  client: Client | null;
  profile: UserProfile;
  projects: InvoiceEditorProject[];
};

type InvalidResult = {
  ok: false;
  status: number;
  code: string;
  message: string;
  fieldErrors?: Record<string, string>;
};

type InvoiceDetailLoadResult =
  | {
      ok: true;
      value: InvoiceDetailData;
    }
  | {
      ok: false;
      status: number;
      code: string;
      message: string;
    };

export type ValidResult<T> = {
  ok: true;
  value: T;
};

const INVOICE_DETAIL_LEVELS: string[] = ["simple", "standard", "audit", "detailed"];
const INVOICE_STATUSES: InvoiceStatus[] = ["draft", "sent", "paid", "void"];
const DEFAULT_MAX_PROJECT_OPTIONS = 500;

// Invoice-specific helpers kept local

function hasOwn<T extends string>(value: DbRecord, key: T): value is DbRecord & { [K in T]: unknown } {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function toIsoString(value: unknown) {
  const stringValue = toStringValue(value);
  const parsed = new Date(stringValue);
  if (Number.isNaN(parsed.getTime())) {
    return new Date(0).toISOString();
  }

  return parsed.toISOString();
}

function invalid(
  status: number,
  code: string,
  message: string,
  fieldErrors?: Record<string, string>,
): InvalidResult {
  return {
    ok: false,
    status,
    code,
    message,
    fieldErrors,
  };
}

function isBillingRule(value: string): value is BillingRule {
  return BILLING_RULES.includes(value as BillingRule);
}

function isInvoiceDetailLevel(value: string): value is InvoiceDetailLevel {
  return INVOICE_DETAIL_LEVELS.includes(value);
}

function isInvoiceStatus(value: string): value is InvoiceStatus {
  return INVOICE_STATUSES.includes(value as InvoiceStatus);
}

function mapBillingRuleSnapshot(raw: unknown): TimeEntry["billingRuleSnapshot"] {
  const record = asRecord(raw);
  const ruleValue = toStringValue(record.rule, "exact");
  const rule = isBillingRule(ruleValue) ? ruleValue : "exact";
  const incrementMinutesValue =
    record.incrementMinutes ?? record.increment_minutes ?? null;
  const minimumMinutesValue =
    record.minimumMinutes ?? record.minimum_minutes ?? null;
  const entryKindValue = toNullableString(record.entryKind ?? record.entry_kind);
  const entryKind = entryKindValue === "tiny_task" ? "tiny_task" : null;

  return {
    rule,
    incrementMinutes:
      incrementMinutesValue === null || incrementMinutesValue === undefined
        ? null
        : toInteger(incrementMinutesValue, 0),
    minimumMinutes:
      minimumMinutesValue === null || minimumMinutesValue === undefined
        ? null
        : toInteger(minimumMinutesValue, 0),
    ...(entryKind ? { entryKind } : {}),
  };
}

function defaultProfileFromUser(user: User): UserProfile {
  const fullName =
    (typeof user.user_metadata?.full_name === "string" && user.user_metadata.full_name) ||
    (typeof user.user_metadata?.name === "string" && user.user_metadata.name) ||
    user.email?.split("@")[0] ||
    "New User";

  return {
    id: "",
    userId: user.id,
    businessName: "My Business",
    fullName,
    email: user.email ?? "",
    phone: null,
    address: null,
    logoUrl: null,
    defaultCurrency: "$",
    defaultHourlyRate: 0,
    defaultBillingIncrement: "exact",
    defaultMinimumBillableMinutes: null,
    defaultInvoiceDetailLevel: "detailed",
    defaultInvoiceNotes: null,
    invoiceNumberPrefix: "INV",
    nextInvoiceNumber: 1,
    defaultDueDays: 14,
    taxLabel: null,
    taxPercentage: null,
    paymentInstructions: null,
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
  };
}

export function mapProfileRow(row: unknown, user: User): UserProfile {
  if (!row) {
    return defaultProfileFromUser(user);
  }

  const record = asRecord(row);
  const defaultBillingIncrementValue = toStringValue(record.default_billing_increment, "exact");
  const defaultBillingIncrement = isBillingRule(defaultBillingIncrementValue)
    ? defaultBillingIncrementValue
    : "exact";

  const defaultInvoiceDetailLevelValue = toStringValue(
    record.default_invoice_detail_level,
    "detailed",
  );
  const defaultInvoiceDetailLevel = isInvoiceDetailLevel(defaultInvoiceDetailLevelValue)
    ? "detailed"
    : "detailed";

  return {
    id: toStringValue(record.id),
    userId: toStringValue(record.user_id, user.id),
    businessName: toStringValue(record.business_name, "My Business"),
    fullName: toStringValue(record.full_name, defaultProfileFromUser(user).fullName),
    email: toStringValue(record.email, user.email ?? ""),
    phone: toNullableString(record.phone),
    address: toNullableString(record.address),
    logoUrl: toNullableString(record.logo_url),
    defaultCurrency: toStringValue(record.default_currency, "$"),
    defaultHourlyRate: toNumber(record.default_hourly_rate, 0),
    defaultBillingIncrement,
    defaultMinimumBillableMinutes:
      record.default_minimum_billable_minutes === null ||
      record.default_minimum_billable_minutes === undefined
        ? null
        : toInteger(record.default_minimum_billable_minutes, 0),
    defaultInvoiceDetailLevel,
    defaultInvoiceNotes: toNullableString(record.default_invoice_notes),
    invoiceNumberPrefix: toStringValue(record.invoice_number_prefix, "INV"),
    nextInvoiceNumber: Math.max(1, toInteger(record.next_invoice_number, 1)),
    defaultDueDays: Math.max(1, toInteger(record.default_due_days, 14)),
    taxLabel: toNullableString(record.tax_label),
    taxPercentage:
      record.tax_percentage === null || record.tax_percentage === undefined
        ? null
        : toNumber(record.tax_percentage, 0),
    paymentInstructions: toNullableString(record.payment_instructions),
    createdAt: toIsoString(record.created_at),
    updatedAt: toIsoString(record.updated_at),
  };
}

export function mapClientRow(row: unknown): Client {
  const record = asRecord(row);

  return {
    id: toStringValue(record.id),
    userId: toStringValue(record.user_id),
    name: toStringValue(record.name),
    companyName: toNullableString(record.company_name),
    email: toNullableString(record.email),
    phone: toNullableString(record.phone),
    billingAddress: toNullableString(record.billing_address),
    notes: toNullableString(record.notes),
    color: toStringValue(record.color, "#10B981"),
    createdAt: toIsoString(record.created_at),
    updatedAt: toIsoString(record.updated_at),
  };
}

export function mapProjectSummaryRow(row: unknown): InvoiceEditorProject {
  const record = asRecord(row);

  return {
    id: toStringValue(record.id),
    name: toStringValue(record.name),
  };
}

export function mapProjectRow(row: unknown): Project {
  const record = asRecord(row);

  const billingRuleValue = toStringValue(record.billing_increment, "exact");
  const billingIncrement = isBillingRule(billingRuleValue) ? billingRuleValue : "exact";

  const status = toStringValue(record.status, "active");
  const safeStatus: Project["status"] = ["active", "paused", "completed", "archived"].includes(status)
    ? (status as Project["status"])
    : "active";

  return {
    id: toStringValue(record.id),
    userId: toStringValue(record.user_id),
    clientId: toStringValue(record.client_id),
    name: toStringValue(record.name),
    description: toNullableString(record.description),
    hourlyRate: toNumber(record.hourly_rate, 0),
    billingIncrement,
    minimumBillableMinutes:
      record.minimum_billable_minutes === null || record.minimum_billable_minutes === undefined
        ? null
        : toInteger(record.minimum_billable_minutes, 0),
    status: safeStatus,
    createdAt: toIsoString(record.created_at),
    updatedAt: toIsoString(record.updated_at),
  };
}

export function mapTimeEntryRow(row: unknown): TimeEntry {
  const record = asRecord(row);
  const invoiceId = toNullableString(record.invoice_id);
  const statusValue = toStringValue(record.status, invoiceId ? "invoiced" : "uninvoiced");
  const status: TimeEntry["status"] = ["uninvoiced", "invoiced"].includes(statusValue)
    ? (statusValue as TimeEntry["status"])
    : invoiceId
      ? "invoiced"
      : "uninvoiced";

  return {
    id: toStringValue(record.id),
    userId: toStringValue(record.user_id),
    clientId: toStringValue(record.client_id),
    projectId: toStringValue(record.project_id),
    invoiceId,
    entryDate: toStringValue(record.entry_date),
    startTime: toNullableString(record.start_time),
    endTime: toNullableString(record.end_time),
    actualMinutes: Math.max(0, toInteger(record.actual_minutes, 0)),
    billedMinutes: Math.max(0, toInteger(record.billed_minutes, 0)),
    hourlyRate: Math.max(0, toNumber(record.hourly_rate, 0)),
    amount: Math.max(0, toNumber(record.amount, 0)),
    taskNote: toStringValue(record.task_note),
    internalNote: toNullableString(record.internal_note),
    billingRuleSnapshot: mapBillingRuleSnapshot(record.billing_rule_snapshot),
    status,
    createdAt: toIsoString(record.created_at),
    updatedAt: toIsoString(record.updated_at),
  };
}

export function mapInvoiceRow(row: unknown): Invoice {
  const record = asRecord(row);
  const detailLevelValue = toStringValue(record.detail_level, "detailed");
  const detailLevel = isInvoiceDetailLevel(detailLevelValue) ? "detailed" : "detailed";

  const statusValue = toStringValue(record.status, "draft");
  const status = isInvoiceStatus(statusValue) ? statusValue : "draft";

  return {
    id: toStringValue(record.id),
    userId: toStringValue(record.user_id),
    clientId: toStringValue(record.client_id),
    invoiceNumber: toStringValue(record.invoice_number),
    invoiceDate: toStringValue(record.invoice_date),
    dueDate: toNullableString(record.due_date),
    detailLevel,
    subtotal: Math.max(0, toNumber(record.subtotal, 0)),
    taxAmount: Math.max(0, toNumber(record.tax_amount, 0)),
    discountAmount: Math.max(0, toNumber(record.discount_amount, 0)),
    totalAmount: Math.max(0, toNumber(record.total_amount, 0)),
    status,
    notes: toNullableString(record.notes),
    paymentInstructions: toNullableString(record.payment_instructions),
    clientNameSnapshot: toNullableString(record.client_name_snapshot),
    clientEmailSnapshot: toNullableString(record.client_email_snapshot),
    clientCompanySnapshot: toNullableString(record.client_company_snapshot),
    clientAddressSnapshot: toNullableString(record.client_address_snapshot),
    clientPhoneSnapshot: toNullableString(record.client_phone_snapshot),
    createdAt: toIsoString(record.created_at),
    updatedAt: toIsoString(record.updated_at),
  };
}

export function mapInvoiceItemRow(row: unknown): InvoiceItem {
  const record = asRecord(row);

  return {
    id: toStringValue(record.id),
    invoiceId: toStringValue(record.invoice_id),
    timeEntryId: toNullableString(record.time_entry_id),
    description: toStringValue(record.description),
    actualMinutes: Math.max(0, toInteger(record.actual_minutes, 0)),
    billedMinutes: Math.max(0, toInteger(record.billed_minutes, 0)),
    hourlyRate: Math.max(0, toNumber(record.hourly_rate, 0)),
    amount: Math.max(0, toNumber(record.amount, 0)),
    sortOrder: Math.max(1, toInteger(record.sort_order, 1)),
    projectNameSnapshot: toNullableString(record.project_name_snapshot),
  };
}

export async function loadInvoiceDetailData({
  supabase,
  user,
  invoiceId,
  maxProjectOptions = DEFAULT_MAX_PROJECT_OPTIONS,
}: {
  supabase: SupabaseClient;
  user: User;
  invoiceId: string;
  maxProjectOptions?: number;
}): Promise<InvoiceDetailLoadResult> {
  const { data: invoiceData, error: invoiceError } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", invoiceId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (invoiceError) {
    console.error("[invoices:detail-load] failed to load invoice", {
      code: invoiceError.code,
      message: invoiceError.message,
      details: invoiceError.details,
      invoiceId,
    });

    return {
      ok: false,
      status: 500,
      code: "LOAD_FAILED",
      message: "Unable to load this invoice.",
    };
  }

  if (!invoiceData) {
    return {
      ok: false,
      status: 404,
      code: "NOT_FOUND",
      message: "Invoice not found.",
    };
  }

  const [itemsResult, clientResult, profileResult, projectsResult] = await Promise.all([
    supabase.from("invoice_items").select("*").eq("invoice_id", invoiceId).order("sort_order", { ascending: true }),
    supabase.from("clients").select("*").eq("id", invoiceData.client_id).eq("user_id", user.id).maybeSingle(),
    supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle(),
    supabase.from("projects").select("id,name").eq("user_id", user.id).order("name", { ascending: true }).limit(maxProjectOptions),
  ]);

  const firstError = itemsResult.error ?? clientResult.error ?? profileResult.error ?? projectsResult.error;
  if (firstError) {
    console.error("[invoices:detail-load] related data load failed", {
      code: firstError.code,
      message: firstError.message,
      details: firstError.details,
      invoiceId,
    });

    return {
      ok: false,
      status: 500,
      code: "LOAD_FAILED",
      message: "Unable to load invoice details.",
    };
  }

  const invoiceItems = (itemsResult.data ?? []).map((row) => mapInvoiceItemRow(row));
  const linkedTimeEntryIds = invoiceItems
    .map((item) => item.timeEntryId)
    .filter((value): value is string => Boolean(value));

  let timeEntries: ReturnType<typeof mapTimeEntryRow>[] = [];
  if (linkedTimeEntryIds.length > 0) {
    const { data: timeEntriesData, error: timeEntriesError } = await supabase
      .from("time_entries")
      .select("*")
      .in("id", linkedTimeEntryIds)
      .eq("user_id", user.id);

    if (timeEntriesError) {
      console.error("[invoices:detail-load] failed to load linked time entries", {
        code: timeEntriesError.code,
        message: timeEntriesError.message,
        details: timeEntriesError.details,
        invoiceId,
      });
    } else {
      timeEntries = (timeEntriesData ?? []).map((row) => mapTimeEntryRow(row));
    }
  }

  return {
    ok: true,
    value: {
      invoice: mapInvoiceRow(invoiceData),
      invoiceItems,
      timeEntries,
      client: clientResult.data ? mapClientRow(clientResult.data) : null,
      profile: mapProfileRow(profileResult.data, user),
      projects: (projectsResult.data ?? []).map((row) => mapProjectSummaryRow(row)),
    },
  };
}

export type CreateInvoicePayload = {
  clientId?: unknown;
  invoiceDate?: unknown;
  dueDate?: unknown;
  detailLevel?: unknown;
  status?: unknown;
  notes?: unknown;
  paymentInstructions?: unknown;
  taxPercentage?: unknown;
  discountAmount?: unknown;
  invoiceNumber?: unknown;
  idempotencyKey?: unknown;
  currency?: unknown;
  lineItems?: unknown;
  clientTotals?: {
    subtotal?: unknown;
    taxAmount?: unknown;
    totalAmount?: unknown;
  };
};

export type ValidatedCreateInvoiceLineItem = {
  timeEntryId: string | null;
  description: string;
  quantity: number;
  hourlyRate: number;
  minutes: number;
  amount: number;
};

export type ValidatedCreateInvoice = {
  clientId: string;
  invoiceDate: string;
  dueDate: string | null;
  detailLevel: InvoiceDetailLevel;
  status: InvoiceStatus;
  notes: string | null;
  paymentInstructions: string | null;
  taxPercentage: number;
  discountAmount: number;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  invoiceNumber: string | null;
  idempotencyKey: string | null;
  lineItems: ValidatedCreateInvoiceLineItem[];
};

export function validateCreateInvoicePayload(payload: unknown): InvalidResult | ValidResult<ValidatedCreateInvoice> {
  const body = asRecord(payload);

  const fieldErrors: Record<string, string> = {};

  const clientId = toStringValue(body.clientId).trim();
  if (!clientId) {
    fieldErrors.clientId = "Client is required.";
  } else if (!isUuid(clientId)) {
    fieldErrors.clientId = "Client reference is invalid.";
  }

  const invoiceDate = toStringValue(body.invoiceDate).trim();
  if (!invoiceDate) {
    fieldErrors.invoiceDate = "Issue date is required.";
  } else if (!isIsoDate(invoiceDate)) {
    fieldErrors.invoiceDate = "Issue date must be a valid date.";
  }

  const dueDateRaw = body.dueDate;
  let dueDate: string | null = null;
  if (dueDateRaw !== null && dueDateRaw !== undefined && toStringValue(dueDateRaw).trim() !== "") {
    dueDate = toStringValue(dueDateRaw).trim();
    if (!isIsoDate(dueDate)) {
      fieldErrors.dueDate = "Due date must be a valid date.";
    }
  }

  if (invoiceDate && dueDate && isIsoDate(invoiceDate) && isIsoDate(dueDate)) {
    const invoiceDateTs = new Date(`${invoiceDate}T00:00:00.000Z`).getTime();
    const dueDateTs = new Date(`${dueDate}T00:00:00.000Z`).getTime();
    if (dueDateTs < invoiceDateTs) {
      fieldErrors.dueDate = "Due date cannot be before issue date.";
    }
  }

  const detailLevelRaw = toStringValue(body.detailLevel, "detailed");
  const detailLevel = isInvoiceDetailLevel(detailLevelRaw) ? detailLevelRaw : "detailed";

  const statusRaw = toStringValue(body.status, "draft");
  if (!isInvoiceStatus(statusRaw)) {
    fieldErrors.status = "Invalid invoice status.";
  }
  const status = isInvoiceStatus(statusRaw) ? statusRaw : "draft";

  const notes = toNullableString(body.notes);
  if (notes && notes.length > 5000) {
    fieldErrors.notes = "Notes cannot exceed 5000 characters.";
  }

  const paymentInstructions = toNullableString(body.paymentInstructions);
  if (paymentInstructions && paymentInstructions.length > 5000) {
    fieldErrors.paymentInstructions = "Payment instructions cannot exceed 5000 characters.";
  }

  const currency = toNullableString(body.currency);
  if (currency && !isValidCurrency(currency)) {
    fieldErrors.currency = "Currency format is invalid.";
  }

  const taxPercentage = toNumber(body.taxPercentage, 0);
  if (!Number.isFinite(taxPercentage) || taxPercentage < 0 || taxPercentage > 100) {
    fieldErrors.taxPercentage = "Tax percentage must be between 0 and 100.";
  }

  const discountAmount = toNumber(body.discountAmount, 0);
  if (!Number.isFinite(discountAmount) || discountAmount < 0) {
    fieldErrors.discountAmount = "Discount must be zero or a positive amount.";
  }

  const invoiceNumberRaw = toNullableString(body.invoiceNumber);
  const invoiceNumber = invoiceNumberRaw ? invoiceNumberRaw.trim() : null;
  if (invoiceNumber && invoiceNumber.length > 64) {
    fieldErrors.invoiceNumber = "Invoice number is too long.";
  }

  if (invoiceNumber && !/^[A-Za-z0-9\-_./]+$/.test(invoiceNumber)) {
    fieldErrors.invoiceNumber = "Invoice number contains unsupported characters.";
  }

  const idempotencyKeyRaw = toNullableString(body.idempotencyKey);
  const idempotencyKey = idempotencyKeyRaw ? idempotencyKeyRaw.trim() : null;
  if (idempotencyKey && idempotencyKey.length > 128) {
    fieldErrors.idempotencyKey = "Request key is invalid.";
  }

  const lineItemsRaw = Array.isArray(body.lineItems) ? body.lineItems : null;
  if (!lineItemsRaw || lineItemsRaw.length === 0) {
    fieldErrors.lineItems = "At least one line item is required.";
  }

  const normalizedItems: ValidatedCreateInvoiceLineItem[] = [];
  let subtotalCents = 0;

  if (lineItemsRaw) {
    lineItemsRaw.forEach((item, index) => {
      const itemRecord = asRecord(item);
      const description = toStringValue(itemRecord.description).trim();
      const quantity = toNumber(itemRecord.quantity, Number.NaN);
      const rate = toNumber(itemRecord.rate, Number.NaN);

      const itemPrefix = `lineItems.${index}`;

      if (!description) {
        fieldErrors[`${itemPrefix}.description`] = "Description is required.";
      } else if (description.length > 500) {
        fieldErrors[`${itemPrefix}.description`] = "Description cannot exceed 500 characters.";
      }

      if (!Number.isFinite(quantity) || quantity <= 0) {
        fieldErrors[`${itemPrefix}.quantity`] = "Quantity must be greater than 0.";
      } else if (quantity > 100000) {
        fieldErrors[`${itemPrefix}.quantity`] = "Quantity is too large.";
      }

      if (!Number.isFinite(rate) || rate < 0) {
        fieldErrors[`${itemPrefix}.rate`] = "Rate must be zero or a positive amount.";
      } else if (rate > 1000000) {
        fieldErrors[`${itemPrefix}.rate`] = "Rate is too large.";
      }

      const timeEntryRaw = toNullableString(itemRecord.timeEntryId);
      if (timeEntryRaw && !isUuid(timeEntryRaw)) {
        fieldErrors[`${itemPrefix}.timeEntryId`] = "Time entry reference is invalid.";
      }

      if (!Number.isFinite(quantity) || !Number.isFinite(rate) || quantity <= 0 || rate < 0) {
        return;
      }

      const normalizedQuantity = Number(quantity.toFixed(3));
      const normalizedRate = Number(rate.toFixed(2));
      const amountCents = calculateLineAmountCents(normalizedQuantity, normalizedRate);
      const amount = fromCurrencyCents(amountCents);

      const defaultMinutes = Math.max(0, Math.round(normalizedQuantity * 60));
      const manualMinutes = toInteger(
        itemRecord.minutes,
        toInteger(
          itemRecord.billedMinutes,
          toInteger(itemRecord.actualMinutes, defaultMinutes),
        ),
      );
      const minutes = Math.max(0, manualMinutes);

      normalizedItems.push({
        timeEntryId: timeEntryRaw,
        description,
        quantity: normalizedQuantity,
        hourlyRate: normalizedRate,
        minutes,
        amount,
      });

      subtotalCents += amountCents;
    });
  }

  // Validate discount does not exceed subtotal
  if (discountAmount > 0 && subtotalCents > 0) {
    const discountCentsCheck = toCurrencyCents(discountAmount);
    if (discountCentsCheck > subtotalCents) {
      fieldErrors.discountAmount = "Discount cannot exceed the invoice subtotal.";
    }
  }

  if (Object.keys(fieldErrors).length > 0) {
    return invalid(400, "VALIDATION_ERROR", "Please fix the highlighted fields and try again.", fieldErrors);
  }

  const taxBasisPoints = Math.round(taxPercentage * 100);
  const taxAmountCents = Math.round((subtotalCents * taxBasisPoints) / 10000);
  const discountCents = Math.max(0, toCurrencyCents(discountAmount));
  const totalAmountCents = Math.max(0, subtotalCents + taxAmountCents - discountCents);

  const subtotal = fromCurrencyCents(subtotalCents);
  const taxAmount = fromCurrencyCents(taxAmountCents);
  const safeDiscountAmount = fromCurrencyCents(discountCents);
  const totalAmount = fromCurrencyCents(totalAmountCents);

  if (hasOwn(body, "clientTotals")) {
    const clientTotals = asRecord(body.clientTotals);
    const clientSubtotal = toNumber(clientTotals.subtotal, subtotal);
    const clientTaxAmount = toNumber(clientTotals.taxAmount, taxAmount);
    const clientTotalAmount = toNumber(clientTotals.totalAmount, totalAmount);

    if (
      Math.abs(toCurrencyCents(clientSubtotal) - subtotalCents) > 1 ||
      Math.abs(toCurrencyCents(clientTaxAmount) - taxAmountCents) > 1 ||
      Math.abs(toCurrencyCents(clientTotalAmount) - totalAmountCents) > 1
    ) {
      return invalid(
        409,
        "TOTAL_MISMATCH",
        "Invoice totals changed while saving. Please review and try again.",
      );
    }
  }

  return {
    ok: true,
    value: {
      clientId,
      invoiceDate,
      dueDate,
      detailLevel,
      status,
      notes,
      paymentInstructions,
      taxPercentage: Number(taxPercentage.toFixed(2)),
      discountAmount: safeDiscountAmount,
      subtotal,
      taxAmount,
      totalAmount,
      invoiceNumber,
      idempotencyKey,
      lineItems: normalizedItems,
    },
  };
}

export function toRpcLineItems(lineItems: ValidatedCreateInvoiceLineItem[]) {
  return lineItems.map((lineItem, index) => ({
    description: lineItem.description,
    timeEntryId: lineItem.timeEntryId,
    actualMinutes: lineItem.minutes,
    billedMinutes: lineItem.minutes,
    hourlyRate: lineItem.hourlyRate,
    amount: lineItem.amount,
    sortOrder: index + 1,
  }));
}
