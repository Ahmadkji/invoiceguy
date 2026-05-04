import { NextResponse, type NextRequest } from "next/server";
import { createRouteClient } from "@/lib/supabase/route";
import { hasAllowedOrigin } from "@/lib/security/request";
import { checkRateLimitWithProvider } from "@/lib/security/rate-limit";
import {
  loadInvoiceDetailData,
  mapInvoiceRow,
} from "@/lib/invoices/server";

const ALLOWED_STATUS_VALUES = new Set(["draft", "sent", "paid", "void"]);

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

  const detailResult = await loadInvoiceDetailData({
    supabase,
    user,
    invoiceId: id,
  });

  if (!detailResult.ok) {
    return NextResponse.json(
      { ok: false, code: detailResult.code, message: detailResult.message },
      { status: detailResult.status },
    );
  }

  return withCookies(
    NextResponse.json({
      ok: true,
      ...detailResult.value,
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

  const rl = await checkRateLimitWithProvider(`mutate:${user.id}:invoice-update`, 30, 60_000, { supabase });
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
    .eq("status", currentInvoice.status)
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
      { ok: false, code: "CONCURRENT_MODIFICATION", message: "Invoice status changed concurrently. Please refresh and try again." },
      { status: 409 },
    );
  }

  return withCookies(
    NextResponse.json({
      ok: true,
      invoice: mapInvoiceRow(data),
    }),
  );
}
