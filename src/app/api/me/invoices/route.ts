import { NextResponse, type NextRequest } from "next/server";
import { createRouteClient } from "@/lib/supabase/route";
import { hasAllowedOrigin } from "@/lib/security/request";
import { checkRateLimitWithProvider } from "@/lib/security/rate-limit";
import {
  mapInvoiceRow,
  validateCreateInvoicePayload,
  mapClientRow,
  toRpcLineItems,
} from "@/lib/invoices/server";

function extractInvoiceId(data: unknown): string | null {
  if (typeof data === "string") {
    return data;
  }

  if (Array.isArray(data) && typeof data[0] === "string") {
    return data[0];
  }

  if (data && typeof data === "object") {
    const record = data as Record<string, unknown>;
    if (typeof record.id === "string") {
      return record.id;
    }

    if (typeof record.create_invoice_with_items === "string") {
      return record.create_invoice_with_items;
    }
  }

  return null;
}

function mapCreateError(error: { code?: string; message?: string; details?: string } | null) {
  if (!error) {
    return {
      status: 500,
      code: "UNKNOWN_ERROR",
      message: "We could not save the invoice. Please try again.",
    };
  }

  if (error.code === "23505") {
    return {
      status: 409,
      code: "DUPLICATE_INVOICE_NUMBER",
      message: "Invoice number already exists.",
    };
  }

  const message = (error.message ?? "").toUpperCase();

  if (message.includes("AUTH_REQUIRED")) {
    return {
      status: 401,
      code: "UNAUTHORIZED",
      message: "Please sign in again to save this invoice.",
    };
  }

  if (message.includes("CLIENT_NOT_FOUND")) {
    return {
      status: 404,
      code: "CLIENT_NOT_FOUND",
      message: "Selected client could not be found.",
    };
  }

  if (message.includes("LINE_ITEMS_REQUIRED")) {
    return {
      status: 400,
      code: "LINE_ITEMS_REQUIRED",
      message: "Add at least one line item before saving.",
    };
  }

  if (message.includes("INVALID_DUE_DATE")) {
    return {
      status: 400,
      code: "INVALID_DUE_DATE",
      message: "Due date must be on or after issue date.",
    };
  }

  if (message.includes("INVALID_TIME_ENTRY_REFERENCE")) {
    return {
      status: 400,
      code: "INVALID_TIME_ENTRY_REFERENCE",
      message: "One or more selected time entries are no longer available.",
    };
  }

  if (message.includes("INVALID_DETAIL_LEVEL")) {
    return {
      status: 400,
      code: "INVALID_DETAIL_LEVEL",
      message: "Invalid invoice detail level.",
    };
  }

  if (message.includes("SUBTOTAL_MISMATCH")) {
    return {
      status: 409,
      code: "TOTAL_MISMATCH",
      message: "Invoice totals changed while saving. Please review and try again.",
    };
  }

  return {
    status: 500,
    code: "SAVE_FAILED",
    message: "We could not save the invoice. Please try again.",
  };
}

export async function GET(request: NextRequest) {
  const { supabase, withCookies } = createRouteClient(request);
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ ok: false, code: "UNAUTHORIZED", message: "Please sign in again." }, { status: 401 });
  }

  const [invoicesResult, clientsResult] = await Promise.all([
    supabase.from("invoices").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(200),
    supabase
      .from("clients")
      .select("id,user_id,name,company_name,email,phone,billing_address,notes,color,created_at,updated_at")
      .eq("user_id", user.id),
  ]);

  const firstError = invoicesResult.error ?? clientsResult.error;

  if (firstError) {
    console.error("[invoices:list] load failed", {
      code: firstError.code,
      message: firstError.message,
      details: firstError.details,
    });

    return NextResponse.json(
      { ok: false, code: "LOAD_FAILED", message: "Unable to load invoices right now." },
      { status: 500 },
    );
  }

  const invoices = (invoicesResult.data ?? []).map((row) => mapInvoiceRow(row));
  const clients = (clientsResult.data ?? []).map((row) => mapClientRow(row));

  const paidInvoiceIds = invoices.filter((invoice) => invoice.status === "paid").map((invoice) => invoice.id);

  let paidBilledMinutes = 0;
  if (paidInvoiceIds.length > 0) {
    const { data: paidItems, error: paidItemsError } = await supabase
      .from("invoice_items")
      .select("invoice_id,billed_minutes")
      .in("invoice_id", paidInvoiceIds);

    if (paidItemsError) {
      console.error("[invoices:list] paid hours load failed", {
        code: paidItemsError.code,
        message: paidItemsError.message,
        details: paidItemsError.details,
      });
    } else {
      paidBilledMinutes = (paidItems ?? []).reduce((sum, item) => {
        const billed = Number(item.billed_minutes ?? 0);
        if (!Number.isFinite(billed)) {
          return sum;
        }

        return sum + billed;
      }, 0);
    }
  }

  return withCookies(
    NextResponse.json({
      ok: true,
      invoices,
      clients,
      paidBilledMinutes,
    }),
  );
}

export async function POST(request: NextRequest) {
  if (!hasAllowedOrigin(request)) {
    return NextResponse.json({ ok: false, code: "FORBIDDEN", message: "Forbidden." }, { status: 403 });
  }

  const { supabase, withCookies } = createRouteClient(request);
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json(
      { ok: false, code: "UNAUTHORIZED", message: "Please sign in again to save this invoice." },
      { status: 401 },
    );
  }

  const rl = await checkRateLimitWithProvider(`mutate:${user.id}:invoice-create`, 20, 60_000, { supabase });
  if (!rl.allowed) {
    return NextResponse.json({ ok: false, code: "RATE_LIMITED", message: "Too many requests. Try again later." }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const validation = validateCreateInvoicePayload(body);

  if (!validation.ok) {
    return NextResponse.json(
      {
        ok: false,
        code: validation.code,
        message: validation.message,
        fieldErrors: validation.fieldErrors,
      },
      { status: validation.status },
    );
  }

  const payload = validation.value;

  const { data: rpcData, error: rpcError } = await supabase.rpc("create_invoice_with_items", {
    p_client_id: payload.clientId,
    p_invoice_date: payload.invoiceDate,
    p_due_date: payload.dueDate,
    p_detail_level: payload.detailLevel,
    p_status: payload.status,
    p_notes: payload.notes,
    p_payment_instructions: payload.paymentInstructions,
    p_subtotal: payload.subtotal,
    p_tax_amount: payload.taxAmount,
    p_discount_amount: payload.discountAmount,
    p_total_amount: payload.totalAmount,
    p_line_items: toRpcLineItems(payload.lineItems),
    p_invoice_number: payload.invoiceNumber,
    p_idempotency_key: payload.idempotencyKey,
  });

  if (rpcError) {
    const mappedError = mapCreateError({
      code: rpcError.code,
      message: rpcError.message,
      details: rpcError.details,
    });

    console.error("[invoices:create] rpc failed", {
      code: rpcError.code,
      message: rpcError.message,
      details: rpcError.details,
      hint: rpcError.hint,
      mappedCode: mappedError.code,
    });

    return NextResponse.json(
      {
        ok: false,
        code: mappedError.code,
        message: mappedError.message,
      },
      { status: mappedError.status },
    );
  }

  const invoiceId = extractInvoiceId(rpcData);
  if (!invoiceId) {
    console.error("[invoices:create] rpc returned unexpected payload", { rpcData });

    return NextResponse.json(
      {
        ok: false,
        code: "SAVE_FAILED",
        message: "Invoice was saved but response was incomplete. Please refresh and check your invoices.",
      },
      { status: 500 },
    );
  }

  return withCookies(NextResponse.json({ ok: true, invoiceId }));
}
