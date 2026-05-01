import { NextResponse, type NextRequest } from "next/server";
import { createRouteClient } from "@/lib/supabase/route";
import { hasAllowedOrigin } from "@/lib/security/request";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { mapTimeEntryRow } from "@/lib/invoices/server";
import { calculateBilledMinutes, calculateAmount } from "@/lib/billing-rules";
import { BILLING_RULES, asRecord, isIsoDate, toInteger, toNullableString, toNumber, toStringValue } from "@/lib/validation";
import type { BillingRule, NonBillableCategory, TimeEntryStatus } from "@/lib/types";

type CreateTimeEntryPayload = {
  clientId?: unknown;
  projectId?: unknown;
  entryDate?: unknown;
  startTime?: unknown;
  endTime?: unknown;
  actualMinutes?: unknown;
  billedMinutes?: unknown;
  hourlyRate?: unknown;
  amount?: unknown;
  taskNote?: unknown;
  internalNote?: unknown;
  isBillable?: unknown;
  nonBillableCategory?: unknown;
  billingRuleSnapshot?: unknown;
  status?: unknown;
};

const NON_BILLABLE_CATEGORIES: NonBillableCategory[] = [
  "admin",
  "client_communication",
  "internal",
  "learning",
  "other",
];

const TIME_ENTRY_STATUSES: TimeEntryStatus[] = ["uninvoiced", "invoiced", "non_billable"];
const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 100;
const MAX_PAGE_SIZE = 500;

function parsePagination(request: NextRequest) {
  const rawPage = Number.parseInt(request.nextUrl.searchParams.get("page") ?? "", 10);
  const rawPageSize = Number.parseInt(request.nextUrl.searchParams.get("pageSize") ?? "", 10);

  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : DEFAULT_PAGE;
  const pageSize =
    Number.isFinite(rawPageSize) && rawPageSize > 0
      ? Math.min(rawPageSize, MAX_PAGE_SIZE)
      : DEFAULT_PAGE_SIZE;

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  return { from, to };
}

export async function GET(request: NextRequest) {
  const { supabase, withCookies } = createRouteClient(request);
  const { from, to } = parsePagination(request);

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json(
      { ok: false, code: "UNAUTHORIZED", message: "Please sign in again." },
      { status: 401 },
    );
  }

  const { data, error } = await supabase
    .from("time_entries")
    .select("*")
    .eq("user_id", user.id)
    .order("entry_date", { ascending: false })
    .range(from, to);

  if (error) {
    console.error("[time-entries:list] load failed", {
      code: error.code,
      message: error.message,
    });
    return NextResponse.json(
      { ok: false, code: "LOAD_FAILED", message: "Unable to load time entries." },
      { status: 500 },
    );
  }

  return withCookies(
    NextResponse.json({
      ok: true,
      timeEntries: (data ?? []).map((row) => mapTimeEntryRow(row)),
    }),
  );
}

export async function POST(request: NextRequest) {
  if (!hasAllowedOrigin(request)) {
    return NextResponse.json(
      { ok: false, code: "FORBIDDEN", message: "Forbidden." },
      { status: 403 },
    );
  }

  const { supabase, withCookies } = createRouteClient(request);
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ ok: false, code: "UNAUTHORIZED", message: "Please sign in again." }, { status: 401 });
  }

  const rl = checkRateLimit(`mutate:${user.id}:time-entry-create`, 60, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ ok: false, code: "RATE_LIMITED", message: "Too many requests. Try again later." }, { status: 429 });
  }

  const body = (await request.json().catch(() => null)) as CreateTimeEntryPayload | null;
  if (!body) {
    return NextResponse.json({ ok: false, code: "INVALID_JSON", message: "Invalid request body." }, { status: 400 });
  }

  const clientId = toStringValue(body.clientId).trim();
  const projectId = toStringValue(body.projectId).trim();
  const taskNote = toStringValue(body.taskNote).trim();
  const entryDate = toStringValue(body.entryDate).trim();
  const isBillable = Boolean(body.isBillable);
  const internalNote = toNullableString(body.internalNote);

  // Convert startTime / endTime to valid timestamptz (ISO 8601).
  // The UI may send "HH:MM" (from <input type="time">) or a full ISO string (from the timer).
  // "HH:MM" values are combined with entryDate to produce a proper timestamp.
  function toTimestampOrNull(raw: unknown): string | null {
    const str = toNullableString(raw);
    if (!str) return null;
    // Already a full ISO string (e.g. from timer: "2026-04-30T10:00:00.000Z")
    if (str.includes("T")) {
      const d = new Date(str);
      return Number.isNaN(d.getTime()) ? null : d.toISOString();
    }
    // "HH:MM" format – combine with entryDate
    const timeMatch = /^(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(str);
    if (timeMatch && entryDate) {
      const d = new Date(`${entryDate}T${timeMatch[1]}:${timeMatch[2]}:${timeMatch[3] ?? "00"}`);
      return Number.isNaN(d.getTime()) ? null : d.toISOString();
    }
    return null;
  }

  const startTime = toTimestampOrNull(body.startTime);
  const endTime = toTimestampOrNull(body.endTime);

  if (!clientId || !projectId || !taskNote || !entryDate) {
    return NextResponse.json(
      { ok: false, code: "VALIDATION_ERROR", message: "Client, project, task note, and entry date are required." },
      { status: 400 },
    );
  }

  // Validate client and project ownership (RLS enforces this too, but explicit checks give clearer errors)
  const { data: clientData, error: clientLookupError } = await supabase
    .from("clients")
    .select("id")
    .eq("id", clientId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (clientLookupError || !clientData) {
    return NextResponse.json(
      { ok: false, code: "CLIENT_NOT_FOUND", message: "Selected client could not be found." },
      { status: 400 },
    );
  }

  const { data: projectData, error: projectLookupError } = await supabase
    .from("projects")
    .select("id, client_id")
    .eq("id", projectId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (projectLookupError || !projectData) {
    return NextResponse.json(
      { ok: false, code: "PROJECT_NOT_FOUND", message: "Selected project could not be found." },
      { status: 400 },
    );
  }

  if (projectData.client_id !== clientId) {
    return NextResponse.json(
      { ok: false, code: "PROJECT_CLIENT_MISMATCH", message: "Selected project does not belong to the selected client." },
      { status: 400 },
    );
  }

  if (!isIsoDate(entryDate)) {
    return NextResponse.json(
      { ok: false, code: "VALIDATION_ERROR", message: "Entry date must use YYYY-MM-DD format." },
      { status: 400 },
    );
  }

  const rawActualMinutes = Math.max(0, toInteger(body.actualMinutes, 0));
  const rawHourlyRate = Math.max(0, toNumber(body.hourlyRate, 0));

  const nonBillableCategoryCandidate = toNullableString(body.nonBillableCategory);
  const safeNonBillableCategory =
    nonBillableCategoryCandidate && NON_BILLABLE_CATEGORIES.includes(nonBillableCategoryCandidate as NonBillableCategory)
      ? (nonBillableCategoryCandidate as NonBillableCategory)
      : null;

  const statusCandidate = toStringValue(body.status, isBillable ? "uninvoiced" : "non_billable");
  const safeStatus =
    TIME_ENTRY_STATUSES.includes(statusCandidate as TimeEntryStatus)
      ? (statusCandidate as TimeEntryStatus)
      : isBillable
        ? "uninvoiced"
        : "non_billable";

  const billingRulePayload = asRecord(body.billingRuleSnapshot);
  const ruleCandidate = toStringValue(billingRulePayload.rule, "exact");
  const safeRule = BILLING_RULES.includes(ruleCandidate as BillingRule) ? (ruleCandidate as BillingRule) : "exact";

  // Recalculate financials server-side; do not trust client-supplied billedMinutes / amount.
  const minimumMinutes = toNumber(billingRulePayload.minimumMinutes, 0);
  const serverBilledMinutes = isBillable
    ? calculateBilledMinutes(rawActualMinutes, safeRule, minimumMinutes > 0 ? minimumMinutes : null)
    : 0;
  const serverAmount = isBillable ? calculateAmount(serverBilledMinutes, rawHourlyRate) : 0;

  const insertPayload = {
    user_id: user.id,
    client_id: clientId,
    project_id: projectId,
    invoice_id: null,
    entry_date: entryDate,
    start_time: startTime,
    end_time: endTime,
    actual_minutes: rawActualMinutes,
    billed_minutes: serverBilledMinutes,
    hourly_rate: isBillable ? rawHourlyRate : 0,
    amount: serverAmount,
    task_note: taskNote,
    internal_note: internalNote,
    is_billable: isBillable,
    non_billable_category: isBillable ? null : safeNonBillableCategory ?? "other",
    billing_rule_snapshot: {
      rule: safeRule,
      incrementMinutes: billingRulePayload.incrementMinutes ?? null,
      minimumMinutes: billingRulePayload.minimumMinutes ?? null,
    },
    status: isBillable ? (safeStatus === "invoiced" ? "uninvoiced" : safeStatus) : "non_billable",
  };

  const { data, error } = await supabase.from("time_entries").insert(insertPayload).select("*").single();

  if (error || !data) {
    console.error("[time-entries:create] insert failed", {
      code: error?.code,
      message: error?.message,
    });
    return NextResponse.json(
      { ok: false, code: "INSERT_FAILED", message: "Unable to save this time entry." },
      { status: 500 },
    );
  }

  return withCookies(
    NextResponse.json({
      ok: true,
      timeEntry: mapTimeEntryRow(data),
    }),
  );
}
