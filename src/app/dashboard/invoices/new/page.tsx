"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Calculator,
  CircleAlert,
  FileSpreadsheet,
  Plus,
  Save,
  Trash2,
  WandSparkles,
} from "lucide-react";
import {
  calculateAmount,
  calculateBilledMinutes,
  formatCurrency,
  formatMinutes,
  formatTimeRange,
  getRuleLabel,
} from "@/lib/billing-rules";
import { useAppStore } from "@/lib/store/use-app-store";
import {
  InvoiceDraft,
  InvoiceDraftLineItem,
  InvoiceStatus,
  Client,
  TimeEntry,
  UserProfile,
} from "@/lib/types";
import { calculateLineAmountCents, fromCurrencyCents, toCurrencyCents } from "@/lib/validation";

type DraftErrors = {
  form: string | null;
  clientId: string | null;
  invoiceDate: string | null;
  dueDate: string | null;
  lineItems: string | null;
  lineItemsById: Record<string, string>;
};

type ProjectSummary = {
  id: string;
  name: string;
};

type InvoiceEditorDataResponse = {
  ok?: boolean;
  code?: string;
  message?: string;
  profile?: UserProfile;
  clients?: Client[];
  projects?: ProjectSummary[];
  timeEntries?: TimeEntry[];
};

type CreateInvoiceResponse = {
  ok?: boolean;
  code?: string;
  message?: string;
  fieldErrors?: Record<string, string>;
  invoiceId?: string;
};

function getTodayInputValue() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(dateValue: string, days: number) {
  const date = new Date(`${dateValue}T00:00:00`);
  date.setDate(date.getDate() + days);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function createId(prefix: string) {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function roundMoney(value: number) {
  return Number(value.toFixed(2));
}

function createDefaultInvoiceDraft(profile: UserProfile): InvoiceDraft {
  const today = getTodayInputValue();
  return {
    clientId: "",
    invoiceDate: today,
    dueDate: addDays(today, profile.defaultDueDays),
    detailLevel: "detailed" as const,
    notes: profile.defaultInvoiceNotes ?? "",
    paymentInstructions: profile.paymentInstructions ?? "",
    taxPercentage: profile.taxPercentage ?? 0,
    discountAmount: 0,
    lineItems: [],
  };
}

function createManualLineItem(defaultRate: number): InvoiceDraftLineItem {
  return {
    id: createId("draft-item"),
    source: "manual",
    timeEntryId: null,
    description: "",
    quantity: 1,
    rate: defaultRate,
    amount: roundMoney(defaultRate),
    minutes: 60,
    billingRule: null,
  };
}

function isSameOrAfter(firstDate: string, secondDate: string) {
  if (!firstDate || !secondDate) {
    return true;
  }

  return new Date(secondDate).getTime() >= new Date(firstDate).getTime();
}

function emptyErrors(): DraftErrors {
  return {
    form: null,
    clientId: null,
    invoiceDate: null,
    dueDate: null,
    lineItems: null,
    lineItemsById: {},
  };
}

function sanitizeNumber(value: number, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}

export default function NewInvoicePage() {
  const router = useRouter();

  const invoiceDraft = useAppStore((state) => state.invoiceDraft);
  const setInvoiceDraft = useAppStore((state) => state.setInvoiceDraft);
  const clearInvoiceDraft = useAppStore((state) => state.clearInvoiceDraft);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [isSavingInvoice, setIsSavingInvoice] = useState(false);
  const savingInvoiceRef = useRef(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const invalidateData = useAppStore((state) => state.invalidateData);

  const [errors, setErrors] = useState<DraftErrors>(emptyErrors);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    const loadEditorData = async () => {
      setIsBootstrapping(true);
      setLoadError(null);
      try {
        const response = await fetch("/api/me/invoices/editor-data", {
          method: "GET",
          cache: "no-store",
        });

        const result = (await response.json().catch(() => null)) as InvoiceEditorDataResponse | null;
        if (ignore) {
          return;
        }

        if (!response.ok || !result?.ok || !result.profile) {
          setLoadError(result?.message ?? "Unable to load invoice editor data. Please sign in again.");
          setIsBootstrapping(false);
          return;
        }

        setProfile(result.profile);
        setClients(result.clients ?? []);
        setProjects(result.projects ?? []);
        setTimeEntries(result.timeEntries ?? []);
        setIsBootstrapping(false);
      } catch {
        if (ignore) {
          return;
        }

        setLoadError("Network error while loading invoice editor data.");
        setIsBootstrapping(false);
      }
    };

    void loadEditorData();

    return () => {
      ignore = true;
    };
  }, []);

  const defaultDraft = useMemo(() => {
    if (!profile) {
      return null;
    }

    return createDefaultInvoiceDraft(profile);
  }, [profile]);

  useEffect(() => {
    if (!defaultDraft) {
      return;
    }

    if (!invoiceDraft) {
      setInvoiceDraft(defaultDraft);
    }
  }, [invoiceDraft, defaultDraft, setInvoiceDraft]);

  const emptyDraft = useMemo<InvoiceDraft>(
    () => ({
      clientId: "",
      invoiceDate: getTodayInputValue(),
      dueDate: getTodayInputValue(),
      detailLevel: "detailed",
      notes: "",
      paymentInstructions: "",
      taxPercentage: 0,
      discountAmount: 0,
      lineItems: [],
    }),
    []
  );

  const draft = invoiceDraft ?? defaultDraft ?? emptyDraft;

  const projectById = useMemo(() => {
    return new Map(projects.map((project) => [project.id, project]));
  }, [projects]);

  const selectedClient = useMemo(
    () => clients.find((client) => client.id === draft.clientId),
    [clients, draft.clientId]
  );

  const uninvoicedEntriesForClient = useMemo(() => {
    return timeEntries
      .filter(
        (entry) =>
          entry.clientId === draft.clientId &&
          entry.invoiceId === null
      )
      .sort((a, b) => new Date(b.entryDate).getTime() - new Date(a.entryDate).getTime());
  }, [timeEntries, draft.clientId]);

  const addedTimeEntryIds = useMemo(() => {
    const ids = new Set<string>();
    draft.lineItems.forEach((lineItem) => {
      if (lineItem.timeEntryId) {
        ids.add(lineItem.timeEntryId);
      }
    });
    return ids;
  }, [draft.lineItems]);

  const subtotal = useMemo(() => {
    const subtotalCents = draft.lineItems.reduce(
      (sum, lineItem) => sum + toCurrencyCents(sanitizeNumber(lineItem.amount, 0)),
      0
    );
    return fromCurrencyCents(subtotalCents);
  }, [draft.lineItems]);

  const taxRate = Math.max(0, sanitizeNumber(draft.taxPercentage, 0));
  const taxAmountCents = Math.round((toCurrencyCents(subtotal) * Math.round(taxRate * 100)) / 10000);
  const taxAmount = fromCurrencyCents(taxAmountCents);
  const discountAmount = Math.max(0, sanitizeNumber(draft.discountAmount, 0));
  const total = fromCurrencyCents(Math.max(0, toCurrencyCents(subtotal) + taxAmountCents - toCurrencyCents(discountAmount)));

  const updateDraft = useCallback(
    (updater: (current: InvoiceDraft) => InvoiceDraft) => {
      const currentDraft = invoiceDraft ?? defaultDraft;
      if (!currentDraft) {
        return;
      }

      setInvoiceDraft(updater(currentDraft));
    },
    [invoiceDraft, defaultDraft, setInvoiceDraft]
  );

  const updateLineItem = useCallback(
    (lineItemId: string, updates: Partial<InvoiceDraftLineItem>) => {
      updateDraft((currentDraft) => {
        const lineItems = currentDraft.lineItems.map((lineItem) => {
          if (lineItem.id !== lineItemId) {
            return lineItem;
          }

          const quantity = Math.max(0, sanitizeNumber(updates.quantity ?? lineItem.quantity, 0));
          const rate = Math.max(0, sanitizeNumber(updates.rate ?? lineItem.rate, 0));
          const amount = fromCurrencyCents(calculateLineAmountCents(quantity, rate));
          const minutes = Math.max(0, Math.round(quantity * 60));

          return {
            ...lineItem,
            ...updates,
            quantity,
            rate,
            amount,
            minutes: lineItem.source === "manual" ? minutes : lineItem.minutes,
          };
        });

        return {
          ...currentDraft,
          lineItems,
        };
      });

      setErrors((currentErrors) => {
        if (!currentErrors.lineItemsById[lineItemId]) {
          return currentErrors;
        }

        const nextLineItemErrors = { ...currentErrors.lineItemsById };
        delete nextLineItemErrors[lineItemId];
        return { ...currentErrors, lineItemsById: nextLineItemErrors };
      });
    },
    [updateDraft]
  );

  const addManualLineItem = () => {
    updateDraft((currentDraft) => ({
      ...currentDraft,
      lineItems: [
        ...currentDraft.lineItems,
        createManualLineItem(profile?.defaultHourlyRate ?? 0),
      ],
    }));

    setStatusMessage(null);
    setErrors((currentErrors) => ({ ...currentErrors, lineItems: null }));
  };

  const removeLineItem = (lineItemId: string) => {
    updateDraft((currentDraft) => ({
      ...currentDraft,
      lineItems: currentDraft.lineItems.filter((lineItem) => lineItem.id !== lineItemId),
    }));

    setErrors((currentErrors) => {
      const nextLineItemErrors = { ...currentErrors.lineItemsById };
      delete nextLineItemErrors[lineItemId];
      return {
        ...currentErrors,
        lineItemsById: nextLineItemErrors,
      };
    });
  };

  const addTimeEntryLineItem = (entry: TimeEntry) => {
    if (addedTimeEntryIds.has(entry.id)) {
      return;
    }

    const minutes = calculateBilledMinutes(
      entry.actualMinutes,
      entry.billingRuleSnapshot.rule,
      entry.billingRuleSnapshot.minimumMinutes
    );
    const quantity = Number((minutes / 60).toFixed(3));
    const amount = fromCurrencyCents(calculateLineAmountCents(quantity, entry.hourlyRate));
    const projectName = projectById.get(entry.projectId)?.name;

    const lineItem: InvoiceDraftLineItem = {
      id: createId("draft-item"),
      source: "time_entry",
      timeEntryId: entry.id,
      description: projectName
        ? `${projectName}: ${entry.taskNote}`
        : entry.taskNote,
      quantity,
      rate: entry.hourlyRate,
      amount,
      minutes,
      billingRule: entry.billingRuleSnapshot.rule,
    };

    updateDraft((currentDraft) => ({
      ...currentDraft,
      lineItems: [...currentDraft.lineItems, lineItem],
    }));

    setStatusMessage(null);
    setErrors((currentErrors) => ({
      ...currentErrors,
      lineItems: null,
      lineItemsById: {},
    }));
  };

  const validateLineItemOnBlur = useCallback(
    (lineItemId: string) => {
      const lineItem = draft.lineItems.find((item) => item.id === lineItemId);
      if (!lineItem) return;

      const lineErrors: string[] = [];
      if (!lineItem.description.trim()) {
        lineErrors.push("Description required");
      }
      if (sanitizeNumber(lineItem.quantity, 0) <= 0) {
        lineErrors.push("Quantity must be greater than 0");
      }
      if (sanitizeNumber(lineItem.rate, 0) < 0) {
        lineErrors.push("Rate cannot be negative");
      }

      setErrors((currentErrors) => {
        const nextLineItemErrors = { ...currentErrors.lineItemsById };
        if (lineErrors.length > 0) {
          nextLineItemErrors[lineItemId] = lineErrors.join(". ");
        } else {
          delete nextLineItemErrors[lineItemId];
        }
        return { ...currentErrors, lineItemsById: nextLineItemErrors };
      });
    },
    [draft.lineItems],
  );

  const resetDraft = () => {
    if (!profile) {
      return;
    }

    setInvoiceDraft(createDefaultInvoiceDraft(profile));
    setStatusMessage("Draft reset.");
    setErrors(emptyErrors());
  };

  const saveDraftProgress = () => {
    setInvoiceDraft({ ...draft });
    setStatusMessage(`Draft saved locally at ${new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}.`);
  };

  const validateDraft = (currentDraft: InvoiceDraft) => {
    const nextErrors = emptyErrors();

    if (!currentDraft.clientId) {
      nextErrors.clientId = "Select a client before saving the invoice.";
    }

    if (!currentDraft.invoiceDate) {
      nextErrors.invoiceDate = "Invoice date is required.";
    }

    if (currentDraft.dueDate && currentDraft.invoiceDate && !isSameOrAfter(currentDraft.invoiceDate, currentDraft.dueDate)) {
      nextErrors.dueDate = "Due date must be the same day or after the invoice date.";
    }

    if (currentDraft.lineItems.length === 0) {
      nextErrors.lineItems = "Add at least one line item.";
    }

    const normalizedLineItems = currentDraft.lineItems.map((lineItem) => {
      const description = lineItem.description.trim();
      const quantity = sanitizeNumber(lineItem.quantity, 0);
      const rate = sanitizeNumber(lineItem.rate, 0);

      const lineErrors: string[] = [];
      if (!description) {
        lineErrors.push("Description required");
      }
      if (quantity <= 0) {
        lineErrors.push("Quantity must be greater than 0");
      }
      if (rate < 0) {
        lineErrors.push("Rate cannot be negative");
      }

      if (lineErrors.length > 0) {
        nextErrors.lineItemsById[lineItem.id] = lineErrors.join(". ");
      }

      const amount = fromCurrencyCents(calculateLineAmountCents(Math.max(0, quantity), Math.max(0, rate)));
      const roundedMinutes = Math.max(0, Math.round(quantity * 60));

      return {
        ...lineItem,
        description,
        quantity,
        rate,
        amount,
        minutes: lineItem.source === "manual" ? roundedMinutes : lineItem.minutes,
      };
    });

    const hasFieldErrors =
      Boolean(nextErrors.clientId) ||
      Boolean(nextErrors.invoiceDate) ||
      Boolean(nextErrors.dueDate) ||
      Boolean(nextErrors.lineItems) ||
      Object.keys(nextErrors.lineItemsById).length > 0;

    return {
      nextErrors,
      normalizedLineItems,
      isValid: !hasFieldErrors,
    };
  };

  const createInvoiceFromDraft = async (options: { previewAfterCreate: boolean; status?: InvoiceStatus }) => {
    if (!profile || !defaultDraft) {
      return;
    }

    if (savingInvoiceRef.current) return;

    const currentDraft = invoiceDraft ?? defaultDraft;
    const { nextErrors, normalizedLineItems, isValid } = validateDraft(currentDraft);

    if (!isValid) {
      nextErrors.form = "Fix the highlighted fields before generating the invoice.";
      setErrors(nextErrors);
      setStatusMessage(null);
      return;
    }

    const nextSubtotal = fromCurrencyCents(
      normalizedLineItems.reduce(
        (sum, lineItem) => sum + toCurrencyCents(lineItem.amount),
        0
      )
    );
    const nextTaxRate = Math.max(0, sanitizeNumber(currentDraft.taxPercentage, 0));
    const nextTaxAmountCents = Math.round((toCurrencyCents(nextSubtotal) * Math.round(nextTaxRate * 100)) / 10000);
    const nextTaxAmount = fromCurrencyCents(nextTaxAmountCents);
    const nextDiscount = Math.max(0, sanitizeNumber(currentDraft.discountAmount, 0));
    const nextTotal = fromCurrencyCents(Math.max(0, toCurrencyCents(nextSubtotal) + nextTaxAmountCents - toCurrencyCents(nextDiscount)));

    const idempotencyKey =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : createId("invoice-save");

    setIsSavingInvoice(true);
    savingInvoiceRef.current = true;
    setStatusMessage(null);

    let response: Response;
    try {
      response = await fetch("/api/me/invoices", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clientId: currentDraft.clientId,
          invoiceDate: currentDraft.invoiceDate,
          dueDate: currentDraft.dueDate ? currentDraft.dueDate : null,
          detailLevel: currentDraft.detailLevel,
          status: options.status ?? "draft",
          notes: currentDraft.notes.trim(),
          paymentInstructions: currentDraft.paymentInstructions.trim(),
          taxPercentage: nextTaxRate,
          discountAmount: nextDiscount,
          currency: profile.defaultCurrency,
          idempotencyKey,
          lineItems: normalizedLineItems.map((lineItem) => ({
            timeEntryId: lineItem.timeEntryId,
            description: lineItem.description,
            quantity: lineItem.quantity,
            rate: lineItem.rate,
            minutes: lineItem.minutes,
          })),
          clientTotals: {
            subtotal: nextSubtotal,
            taxAmount: nextTaxAmount,
            totalAmount: nextTotal,
          },
        }),
      });
    } catch {
      setErrors({
        ...emptyErrors(),
        form: "Network error while saving invoice. Your draft is still available.",
      });
      setStatusMessage(null);
      setIsSavingInvoice(false);
      savingInvoiceRef.current = false;
      return;
    }

    const result = (await response.json().catch(() => null)) as CreateInvoiceResponse | null;

    if (!response.ok || !result?.ok || !result.invoiceId) {
      const serverErrors = emptyErrors();
      if (result?.fieldErrors) {
        Object.entries(result.fieldErrors).forEach(([key, message]) => {
          if (key === "clientId") {
            serverErrors.clientId = message;
            return;
          }

          if (key === "invoiceDate") {
            serverErrors.invoiceDate = message;
            return;
          }

          if (key === "dueDate") {
            serverErrors.dueDate = message;
            return;
          }

          if (key === "lineItems") {
            serverErrors.lineItems = message;
            return;
          }

          if (key.startsWith("lineItems.")) {
            const [, indexValue] = key.split(".");
            const index = Number(indexValue);
            if (Number.isFinite(index)) {
              const lineItemId = normalizedLineItems[index]?.id;
              if (lineItemId) {
                serverErrors.lineItemsById[lineItemId] = message;
              }
            }
          }
        });
      }

      serverErrors.form = result?.message ?? "Unable to save this invoice right now.";
      setErrors(serverErrors);
      setStatusMessage(null);
      setIsSavingInvoice(false);
      savingInvoiceRef.current = false;
      return;
    }

    clearInvoiceDraft();
    setErrors(emptyErrors());
    setIsSavingInvoice(false);
    savingInvoiceRef.current = false;

    invalidateData();

    if (options.previewAfterCreate) {
      router.push(`/dashboard/invoices/${result.invoiceId}`);
      return;
    }

    router.push("/dashboard/invoices");
  };

  if (isBootstrapping || !draft) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
        Loading invoice editor...
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {loadError}
        </div>
        <Link
          href="/dashboard/invoices"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to invoices
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-28 xl:pb-0">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="space-y-1">
          <Link
            href="/dashboard/invoices"
            className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to invoices
          </Link>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Create Invoice</h1>
          <p className="text-slate-500 text-sm">
            Build from tracked time or manual line items. Draft progress is saved locally.
          </p>
        </div>
      </div>

      {errors.form && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-start gap-2">
          <CircleAlert className="w-4 h-4 mt-0.5" />
          {errors.form}
        </div>
      )}

      {statusMessage && !errors.form && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {statusMessage}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <section className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">Invoice Details</h2>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1.5">Client</label>
                <select
                  value={draft.clientId}
                  onChange={(event) => {
                    const nextClientId = event.target.value;
                    updateDraft((currentDraft) => ({
                      ...currentDraft,
                      clientId: nextClientId,
                      lineItems: currentDraft.lineItems.filter(
                        (lineItem) => lineItem.source !== "time_entry"
                      ),
                    }));
                    setErrors((currentErrors) => ({
                      ...currentErrors,
                      clientId: null,
                    }));
                    setStatusMessage(null);
                  }}
                  className={`w-full px-3 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 ${
                    errors.clientId ? "border-red-300" : "border-slate-200"
                  }`}
                >
                  <option value="">Select a client...</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                      {client.companyName ? ` (${client.companyName})` : ""}
                    </option>
                  ))}
                </select>
                {errors.clientId && (
                  <p className="text-xs text-red-600 mt-1">{errors.clientId}</p>
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1.5">Invoice Date</label>
                <input
                  type="date"
                  value={draft.invoiceDate}
                  onChange={(event) => {
                    const nextDate = event.target.value;
                    updateDraft((currentDraft) => ({
                      ...currentDraft,
                      invoiceDate: nextDate,
                      dueDate: currentDraft.dueDate || addDays(nextDate, profile?.defaultDueDays ?? 14),
                    }));
                    setErrors((currentErrors) => ({
                      ...currentErrors,
                      invoiceDate: null,
                      dueDate: null,
                    }));
                  }}
                  className={`w-full px-3 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 ${
                    errors.invoiceDate ? "border-red-300" : "border-slate-200"
                  }`}
                />
                {errors.invoiceDate && (
                  <p className="text-xs text-red-600 mt-1">{errors.invoiceDate}</p>
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1.5">Due Date</label>
                <input
                  type="date"
                  value={draft.dueDate}
                  onChange={(event) => {
                    updateDraft((currentDraft) => ({
                      ...currentDraft,
                      dueDate: event.target.value,
                    }));
                    setErrors((currentErrors) => ({ ...currentErrors, dueDate: null }));
                  }}
                  className={`w-full px-3 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 ${
                    errors.dueDate ? "border-red-300" : "border-slate-200"
                  }`}
                />
                {errors.dueDate && (
                  <p className="text-xs text-red-600 mt-1">{errors.dueDate}</p>
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1.5">Tax Rate (%)</label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={draft.taxPercentage}
                  onChange={(event) => {
                    const value = Number(event.target.value);
                    updateDraft((currentDraft) => ({
                      ...currentDraft,
                      taxPercentage: Number.isFinite(value) ? value : 0,
                    }));
                  }}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1.5">Discount</label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={draft.discountAmount}
                  onChange={(event) => {
                    const value = Number(event.target.value);
                    updateDraft((currentDraft) => ({
                      ...currentDraft,
                      discountAmount: Number.isFinite(value) ? value : 0,
                    }));
                  }}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1.5">Notes</label>
                <textarea
                  rows={4}
                  value={draft.notes}
                  onChange={(event) => {
                    updateDraft((currentDraft) => ({
                      ...currentDraft,
                      notes: event.target.value,
                    }));
                  }}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 resize-none"
                  placeholder="Optional notes shown on the invoice"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1.5">Payment Instructions</label>
                <textarea
                  rows={4}
                  value={draft.paymentInstructions}
                  onChange={(event) => {
                    updateDraft((currentDraft) => ({
                      ...currentDraft,
                      paymentInstructions: event.target.value,
                    }));
                  }}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 resize-none"
                  placeholder="Bank details, transfer instructions, etc."
                />
              </div>
            </div>
          </section>

          <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">Line Items</h2>
                <p className="text-xs text-slate-400 mt-1">Description, quantity, rate, and amount</p>
              </div>
              <button
                onClick={addManualLineItem}
                disabled={isSavingInvoice}
                className="inline-flex items-center gap-1.5 bg-slate-900 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <Plus className="w-4 h-4" />
                Add Item
              </button>
            </div>

            {errors.lineItems && (
              <div className="px-5 pt-3 text-sm text-red-600">{errors.lineItems}</div>
            )}

            {draft.lineItems.length === 0 ? (
              <div className="px-5 py-10 text-sm text-slate-500 text-center">
                No line items yet. Add a manual item or import tracked time entries below.
              </div>
            ) : (
              <>
                <div className="divide-y divide-slate-100 md:hidden">
                  {draft.lineItems.map((lineItem) => (
                    <div key={lineItem.id} className="p-4 space-y-3">
                      <input
                        type="text"
                        value={lineItem.description}
                        onChange={(event) => {
                          updateLineItem(lineItem.id, { description: event.target.value });
                        }}
                        onBlur={() => {
                          validateLineItemOnBlur(lineItem.id);
                        }}
                        className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 ${
                          errors.lineItemsById[lineItem.id] ? "border-red-300" : "border-slate-200"
                        }`}
                        placeholder="Describe the work or service"
                      />

                      <div className="flex items-center gap-2 flex-wrap text-xs text-slate-500">
                        <span className={`px-2 py-0.5 rounded-full ${lineItem.source === "time_entry" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                          {lineItem.source === "time_entry" ? "Tracked time" : "Manual"}
                        </span>
                        {lineItem.source === "time_entry" && (() => {
                          const sourceEntry = lineItem.timeEntryId
                            ? timeEntries.find((entry) => entry.id === lineItem.timeEntryId)
                            : null;
                          const session = sourceEntry
                            ? formatTimeRange(sourceEntry.startTime, sourceEntry.endTime)
                            : "";

                          return (
                            <span className="text-slate-500">
                              {getRuleLabel(lineItem.billingRule ?? "exact")} · Time {formatMinutes(lineItem.minutes)}
                              {session ? ` · ${session}` : ""}
                            </span>
                          );
                        })()}
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 block mb-1">Qty</label>
                          <input
                            type="number"
                            min={0}
                            step="0.01"
                            value={lineItem.quantity}
                            onChange={(event) => {
                              const value = Number(event.target.value);
                              updateLineItem(lineItem.id, {
                                quantity: Number.isFinite(value) ? value : 0,
                              });
                            }}
                            onBlur={() => {
                              validateLineItemOnBlur(lineItem.id);
                            }}
                            disabled={lineItem.source === "time_entry"}
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-right focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 disabled:bg-slate-50 disabled:text-slate-500"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 block mb-1">Rate</label>
                          <input
                            type="number"
                            min={0}
                            step="0.01"
                            value={lineItem.rate}
                            onChange={(event) => {
                              const value = Number(event.target.value);
                              updateLineItem(lineItem.id, {
                                rate: Number.isFinite(value) ? value : 0,
                              });
                            }}
                            onBlur={() => {
                              validateLineItemOnBlur(lineItem.id);
                            }}
                            disabled={lineItem.source === "time_entry"}
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-right focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 disabled:bg-slate-50 disabled:text-slate-500"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="text-sm font-semibold text-slate-900 font-mono-nums">
                          {formatCurrency(lineItem.amount, profile?.defaultCurrency ?? "$")}
                        </div>
                        <button
                          onClick={() => removeLineItem(lineItem.id)}
                          disabled={isSavingInvoice}
                          className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                          title="Remove line item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {errors.lineItemsById[lineItem.id] && (
                        <p className="text-xs text-red-600">{errors.lineItemsById[lineItem.id]}</p>
                      )}
                    </div>
                  ))}
                </div>

                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full min-w-[760px]">
                    <thead>
                      <tr className="border-b border-slate-100 text-left">
                        <th className="py-3 px-5 text-xs font-semibold uppercase tracking-wider text-slate-400">Description</th>
                        <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-slate-400 text-right">Qty</th>
                        <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-slate-400 text-right">Rate</th>
                        <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-slate-400 text-right">Amount</th>
                        <th className="py-3 px-5" />
                      </tr>
                    </thead>
                    <tbody>
                      {draft.lineItems.map((lineItem) => (
                        <tr key={lineItem.id} className="border-b border-slate-50 last:border-b-0 align-top">
                          <td className="py-3 px-5">
                            <input
                              type="text"
                              value={lineItem.description}
                              onChange={(event) => {
                                updateLineItem(lineItem.id, { description: event.target.value });
                              }}
                              onBlur={() => {
                                validateLineItemOnBlur(lineItem.id);
                              }}
                              className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 ${
                                errors.lineItemsById[lineItem.id] ? "border-red-300" : "border-slate-200"
                              }`}
                              placeholder="Describe the work or service"
                            />
                            <div className="mt-1.5 flex items-center gap-2 flex-wrap text-xs text-slate-500">
                              <span className={`px-2 py-0.5 rounded-full ${lineItem.source === "time_entry" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                                {lineItem.source === "time_entry" ? "Tracked time" : "Manual"}
                              </span>
                              {lineItem.source === "time_entry" && (() => {
                                const sourceEntry = lineItem.timeEntryId
                                  ? timeEntries.find((entry) => entry.id === lineItem.timeEntryId)
                                  : null;
                                const session = sourceEntry
                                  ? formatTimeRange(sourceEntry.startTime, sourceEntry.endTime)
                                  : "";

                                return (
                                  <span className="text-slate-500">
                                    {getRuleLabel(lineItem.billingRule ?? "exact")} · Time {formatMinutes(lineItem.minutes)}
                                    {session ? ` · ${session}` : ""}
                                  </span>
                                );
                              })()}
                            </div>
                            {errors.lineItemsById[lineItem.id] && (
                              <p className="text-xs text-red-600 mt-1">{errors.lineItemsById[lineItem.id]}</p>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <input
                              type="number"
                              min={0}
                              step="0.01"
                              value={lineItem.quantity}
                              onChange={(event) => {
                                const value = Number(event.target.value);
                                updateLineItem(lineItem.id, {
                                  quantity: Number.isFinite(value) ? value : 0,
                                });
                              }}
                              onBlur={() => {
                                validateLineItemOnBlur(lineItem.id);
                              }}
                              disabled={lineItem.source === "time_entry"}
                              className="w-24 ml-auto block px-3 py-2 rounded-lg border border-slate-200 text-sm text-right focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 disabled:bg-slate-50 disabled:text-slate-500"
                            />
                          </td>
                          <td className="py-3 px-4">
                            <input
                              type="number"
                              min={0}
                              step="0.01"
                              value={lineItem.rate}
                              onChange={(event) => {
                                const value = Number(event.target.value);
                                updateLineItem(lineItem.id, {
                                  rate: Number.isFinite(value) ? value : 0,
                                });
                              }}
                              onBlur={() => {
                                validateLineItemOnBlur(lineItem.id);
                              }}
                              disabled={lineItem.source === "time_entry"}
                              className="w-28 ml-auto block px-3 py-2 rounded-lg border border-slate-200 text-sm text-right focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 disabled:bg-slate-50 disabled:text-slate-500"
                            />
                          </td>
                          <td className="py-3 px-4 text-right text-sm font-semibold text-slate-900 font-mono-nums">
                            {formatCurrency(lineItem.amount, profile?.defaultCurrency ?? "$")}
                          </td>
                          <td className="py-3 px-5 text-right">
                            <button
                              onClick={() => removeLineItem(lineItem.id)}
                              disabled={isSavingInvoice}
                              className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                              title="Remove line item"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </section>

          <section className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">Import Tracked Time</h2>
                <p className="text-xs text-slate-400 mt-1">
                  Billing rules are applied automatically before line items are added.
                </p>
              </div>
            </div>

            {!draft.clientId && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                Select a client first to see uninvoiced entries.
              </div>
            )}

            {draft.clientId && uninvoicedEntriesForClient.length === 0 && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                No uninvoiced entries found for this client.
              </div>
            )}

            {draft.clientId && uninvoicedEntriesForClient.length > 0 && (
              <div className="space-y-2">
                {uninvoicedEntriesForClient.map((entry) => {
                  const minutes = calculateBilledMinutes(
                    entry.actualMinutes,
                    entry.billingRuleSnapshot.rule,
                    entry.billingRuleSnapshot.minimumMinutes
                  );
                  const wouldAmount = calculateAmount(minutes, entry.hourlyRate);
                  const isAdded = addedTimeEntryIds.has(entry.id);
                  const projectName = projectById.get(entry.projectId)?.name;
                  const isTinyTask = entry.billingRuleSnapshot.entryKind === "tiny_task";

                  return (
                    <div
                      key={entry.id}
                      className="rounded-lg border border-slate-200 px-3 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-800 flex items-center gap-2 min-w-0">
                          <span className="truncate">{projectName ? `${projectName}: ${entry.taskNote}` : entry.taskNote}</span>
                          {isTinyTask && (
                            <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                              Tiny Task
                            </span>
                          )}
                        </p>
                        <div className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-2">
                          <span>{entry.entryDate}</span>
                          <span>•</span>
                          <span>Time {formatMinutes(minutes)}</span>
                          {formatTimeRange(entry.startTime, entry.endTime) && (
                            <>
                              <span>•</span>
                              <span>{formatTimeRange(entry.startTime, entry.endTime)}</span>
                            </>
                          )}
                          <span>•</span>
                          <span>{getRuleLabel(entry.billingRuleSnapshot.rule)}</span>
                          <span>•</span>
                          <span>{formatCurrency(wouldAmount, profile?.defaultCurrency ?? "$")}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => addTimeEntryLineItem(entry)}
                        disabled={isAdded || isSavingInvoice}
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border transition-colors disabled:opacity-60 disabled:cursor-not-allowed border-emerald-200 text-emerald-700 hover:bg-emerald-50 w-full sm:w-auto"
                      >
                        <FileSpreadsheet className="w-4 h-4" />
                        {isSavingInvoice ? "Saving..." : isAdded ? "Added" : "Add to Invoice"}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4 xl:sticky xl:top-20">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-2">
              <Calculator className="w-4 h-4" />
              Invoice Summary
            </h2>

            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between text-slate-600">
                <span>Client</span>
                <span className="font-medium text-slate-800">
                  {selectedClient?.name ?? "Not selected"}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span>Line items</span>
                <span className="font-mono-nums text-slate-800">{draft.lineItems.length}</span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span>Subtotal</span>
                <span className="font-mono-nums text-slate-800">
                  {formatCurrency(subtotal, profile?.defaultCurrency ?? "$")}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span>Tax ({taxRate.toFixed(2)}%)</span>
                <span className="font-mono-nums text-slate-800">
                  {formatCurrency(taxAmount, profile?.defaultCurrency ?? "$")}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span>Discount</span>
                <span className="font-mono-nums text-slate-800">
                  -{formatCurrency(discountAmount, profile?.defaultCurrency ?? "$")}
                </span>
              </div>
              <div className="border-t border-slate-200 pt-2 flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-800">Total</span>
                <span className="text-xl font-bold text-emerald-600 font-mono-nums">
                  {formatCurrency(total, profile?.defaultCurrency ?? "$")}
                </span>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <button
                onClick={() => void createInvoiceFromDraft({ previewAfterCreate: true, status: "sent" })}
                disabled={isSavingInvoice}
                className="w-full inline-flex items-center justify-center gap-2 bg-emerald-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <WandSparkles className="w-4 h-4" />
                {isSavingInvoice ? "Saving..." : "Generate & Preview"}
              </button>

              <button
                onClick={() => void createInvoiceFromDraft({ previewAfterCreate: false, status: "draft" })}
                disabled={isSavingInvoice}
                className="w-full inline-flex items-center justify-center gap-2 bg-slate-900 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-slate-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <Save className="w-4 h-4" />
                {isSavingInvoice ? "Saving..." : "Save Draft Invoice"}
              </button>

              <button
                onClick={saveDraftProgress}
                disabled={isSavingInvoice}
                className="w-full inline-flex items-center justify-center gap-2 border border-slate-200 text-slate-700 px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Save Draft Progress
              </button>

              <button
                onClick={resetDraft}
                disabled={isSavingInvoice}
                className="w-full inline-flex items-center justify-center gap-2 border border-slate-200 text-slate-500 px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Reset Draft
              </button>
            </div>
          </div>
        </aside>
      </div>

      {/* Sticky mobile action bar - visible only below xl breakpoint */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-slate-200 p-4 xl:hidden">
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <div className="text-xs text-slate-400">Total</div>
            <div className="text-lg font-bold text-emerald-600 font-mono-nums truncate">
              {formatCurrency(total, profile?.defaultCurrency ?? "$")}
            </div>
          </div>
          <button
            onClick={() => void createInvoiceFromDraft({ previewAfterCreate: true, status: "sent" })}
            disabled={isSavingInvoice}
            className="inline-flex items-center justify-center gap-2 bg-emerald-600 text-white px-4 py-3 rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <WandSparkles className="w-4 h-4" />
            {isSavingInvoice ? "Saving..." : "Generate"}
          </button>
          <button
            onClick={() => void createInvoiceFromDraft({ previewAfterCreate: false, status: "draft" })}
            disabled={isSavingInvoice}
            className="inline-flex items-center justify-center gap-2 bg-slate-900 text-white px-4 py-3 rounded-xl text-sm font-semibold hover:bg-slate-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4" />
            Draft
          </button>
        </div>
      </div>
    </div>
  );
}
