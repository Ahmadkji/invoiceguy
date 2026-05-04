export type BillingRule =
  | "exact"
  | "round_up_5"
  | "round_up_10"
  | "round_up_15"
  | "round_up_30"
  | "round_up_60"
  | "min_15"
  | "min_30";

export interface Client {
  id: string;
  userId: string;
  name: string;
  companyName: string | null;
  email: string | null;
  phone: string | null;
  billingAddress: string | null;
  notes: string | null;
  color: string;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  userId: string;
  clientId: string;
  name: string;
  description: string | null;
  hourlyRate: number;
  billingIncrement: BillingRule;
  minimumBillableMinutes: number | null;
  status: "active" | "paused" | "completed" | "archived";
  createdAt: string;
  updatedAt: string;
}

export type TimeEntryStatus = "uninvoiced" | "invoiced";

export interface TimeEntry {
  id: string;
  userId: string;
  clientId: string;
  projectId: string;
  invoiceId: string | null;
  entryDate: string;
  startTime: string | null;
  endTime: string | null;
  actualMinutes: number;
  billedMinutes: number;
  hourlyRate: number;
  amount: number;
  taskNote: string;
  internalNote: string | null;
  billingRuleSnapshot: {
    rule: BillingRule;
    incrementMinutes: number | null;
    minimumMinutes: number | null;
    entryKind?: "tiny_task";
  };
  status: TimeEntryStatus;
  createdAt: string;
  updatedAt: string;
}

export type InvoiceStatus = "draft" | "sent" | "paid" | "void";
export type InvoiceDetailLevel = "detailed";

export interface Invoice {
  id: string;
  userId: string;
  clientId: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string | null;
  detailLevel: InvoiceDetailLevel;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  status: InvoiceStatus;
  notes: string | null;
  paymentInstructions: string | null;
  clientNameSnapshot: string | null;
  clientEmailSnapshot: string | null;
  clientCompanySnapshot: string | null;
  clientAddressSnapshot: string | null;
  clientPhoneSnapshot: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceItem {
  id: string;
  invoiceId: string;
  timeEntryId: string | null;
  description: string;
  actualMinutes: number;
  billedMinutes: number;
  hourlyRate: number;
  amount: number;
  sortOrder: number;
  projectNameSnapshot: string | null;
}

export type InvoiceDraftLineItemSource = "manual" | "time_entry";

export interface InvoiceDraftLineItem {
  id: string;
  source: InvoiceDraftLineItemSource;
  timeEntryId: string | null;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
  minutes: number;
  billingRule: BillingRule | null;
}

export interface InvoiceDraft {
  clientId: string;
  invoiceDate: string;
  dueDate: string;
  detailLevel: InvoiceDetailLevel;
  notes: string;
  paymentInstructions: string;
  taxPercentage: number;
  discountAmount: number;
  lineItems: InvoiceDraftLineItem[];
}

export interface UserProfile {
  id: string;
  userId: string;
  businessName: string;
  fullName: string;
  email: string;
  phone: string | null;
  address: string | null;
  logoUrl: string | null;
  defaultCurrency: string;
  defaultHourlyRate: number;
  defaultBillingIncrement: BillingRule;
  defaultMinimumBillableMinutes: number | null;
  defaultInvoiceDetailLevel: InvoiceDetailLevel;
  defaultInvoiceNotes: string | null;
  invoiceNumberPrefix: string;
  nextInvoiceNumber: number;
  defaultDueDays: number;
  taxLabel: string | null;
  taxPercentage: number | null;
  paymentInstructions: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TimerState {
  isRunning: boolean;
  startTime: string | null;
  elapsedSeconds: number;
  clientId: string | null;
  projectId: string | null;
  taskNote: string;
}
