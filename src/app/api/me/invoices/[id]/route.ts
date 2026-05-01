import { NextResponse, type NextRequest } from "next/server";
import { createRouteClient } from "@/lib/supabase/route";
import { hasAllowedOrigin } from "@/lib/security/request";
import { checkRateLimit } from "@/lib/security/rate-limit";
import {
  mapClientRow,
  mapInvoiceItemRow,
  mapInvoiceRow,
  mapProfileRow,
  mapProjectSummaryRow,
  mapTimeEntryRow,
} from "@/lib/invoices/server";

const ALLOWED_STATUS_VALUES = new Set(["draft", "sent", "paid", "void"]);
const MAX_PROJECT_OPTIONS = 500;

const VALID_TRANSITIONS: Record<string, Set<string>> = {
  draft: new Set(["sent", "void"]),
  sent: new Set(["paid", "void"]),
  paid: new Set(),
  void: new Set(),
};

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const { supabase, withCookies } = createRouteClient(request);

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ ok: false, code: "UNAUTHORIZED", message: "Please sign in again." }, { status: 401 });
  }

  const { data: invoiceData, error: invoiceError } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (invoiceError) {
    console.error("[invoices:detail] failed to load invoice", {
      code: invoiceError.code,
      message: invoiceError.message,
      details: invoiceError.details,
      invoiceId: id,
    });

    return NextResponse.json(
      { ok: false, code: "LOAD_FAILED", message: "Unable to load this invoice." },
      { status: 500 },
    );
  }

  if (!invoiceData) {
    return NextResponse.json(
      { ok: false, code: "NOT_FOUND", message: "Invoice not found." },
      { status: 404 },
    );
  }

  const [itemsResult, clientResult, profileResult, projectsResult] = await Promise.all([
    supabase.from("invoice_items").select("*").eq("invoice_id", id).order("sort_order", { ascending: true }),
    supabase.from("clients").select("*").eq("id", invoiceData.client_id).eq("user_id", user.id).maybeSingle(),
    supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle(),
    supabase.from("projects").select("id,name").eq("user_id", user.id).order("name", { ascending: true }).limit(MAX_PROJECT_OPTIONS),
  ]);

  const firstError = itemsResult.error ?? clientResult.error ?? profileResult.error ?? projectsResult.error;
  if (firstError) {
    console.error("[invoices:detail] related data load failed", {
      code: firstError.code,
      message: firstError.message,
      details: firstError.details,
      invoiceId: id,
    });

    return NextResponse.json(
      { ok: false, code: "LOAD_FAILED", message: "Unable to load invoice details." },
      { status: 500 },
    );
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
      console.error("[invoices:detail] failed to load linked time entries", {
        code: timeEntriesError.code,
        message: timeEntriesError.message,
        details: timeEntriesError.details,
        invoiceId: id,
      });
    } else {
      timeEntries = (timeEntriesData ?? []).map((row) => mapTimeEntryRow(row));
    }
  }

  return withCookies(
    NextResponse.json({
      ok: true,
      invoice: mapInvoiceRow(invoiceData),
      invoiceItems,
      timeEntries,
      client: clientResult.data ? mapClientRow(clientResult.data) : null,
      profile: mapProfileRow(profileResult.data, user),
      projects: (projectsResult.data ?? []).map((row) => mapProjectSummaryRow(row)),
    }),
  );
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  if (!hasAllowedOrigin(request)) {
    return NextResponse.json({ ok: false, code: "FORBIDDEN", message: "Forbidden." }, { status: 403 });
  }

  const { id } = await context.params;
  const { supabase, withCookies } = createRouteClient(request);

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json(
      { ok: false, code: "UNAUTHORIZED", message: "Please sign in again to continue." },
      { status: 401 },
    );
  }

  const rl = checkRateLimit(`mutate:${user.id}:invoice-update`, 30, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ ok: false, code: "RATE_LIMITED", message: "Too many requests. Try again later." }, { status: 429 });
  }

  const body = (await request.json().catch(() => null)) as { status?: unknown } | null;
  const status = typeof body?.status === "string" ? body.status.trim() : "";

  if (!ALLOWED_STATUS_VALUES.has(status)) {
    return NextResponse.json(
      { ok: false, code: "INVALID_STATUS", message: "Invoice status is invalid." },
      { status: 400 },
    );
  }

  // Enforce state-machine transitions (e.g. draft→sent, sent→paid, etc.)
  const { data: currentInvoice, error: lookupError } = await supabase
    .from("invoices")
    .select("status")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (lookupError) {
    console.error("[invoices:update-status] lookup failed", {
      code: lookupError.code,
      message: lookupError.message,
      invoiceId: id,
    });
    return NextResponse.json(
      { ok: false, code: "LOAD_FAILED", message: "Unable to verify invoice status." },
      { status: 500 },
    );
  }

  if (!currentInvoice) {
    return NextResponse.json(
      { ok: false, code: "NOT_FOUND", message: "Invoice not found." },
      { status: 404 },
    );
  }

  const allowedNextStatuses = VALID_TRANSITIONS[currentInvoice.status] ?? new Set();
  if (!allowedNextStatuses.has(status)) {
    return NextResponse.json(
      {
        ok: false,
        code: "INVALID_TRANSITION",
        message: `Cannot transition invoice from "${currentInvoice.status}" to "${status}".`,
      },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("invoices")
    .update({ status })
    .eq("id", id)
    .eq("user_id", user.id)
    .select("*")
    .maybeSingle();

  if (error) {
    console.error("[invoices:update-status] failed", {
      code: error.code,
      message: error.message,
      details: error.details,
      invoiceId: id,
      status,
    });

    return NextResponse.json(
      { ok: false, code: "UPDATE_FAILED", message: "Unable to update invoice status." },
      { status: 500 },
    );
  }

  if (!data) {
    return NextResponse.json(
      { ok: false, code: "NOT_FOUND", message: "Invoice not found." },
      { status: 404 },
    );
  }

  return withCookies(
    NextResponse.json({
      ok: true,
      invoice: mapInvoiceRow(data),
    }),
  );
}
