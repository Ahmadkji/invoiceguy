import { NextResponse, type NextRequest } from "next/server";
import { createRouteClient } from "@/lib/supabase/route";
import { hasAllowedOrigin } from "@/lib/security/request";
import { checkRateLimitWithProvider } from "@/lib/security/rate-limit";
import { mapProjectRow } from "@/lib/invoices/server";
import { BILLING_RULES } from "@/lib/validation";
import type { BillingRule } from "@/lib/types";

const VALID_STATUSES = ["active", "paused", "completed", "archived"] as const;
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
    .from("projects")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    console.error("[projects:list] load failed", {
      code: error.code,
      message: error.message,
    });
    return NextResponse.json(
      { ok: false, code: "LOAD_FAILED", message: "Unable to load projects." },
      { status: 500 },
    );
  }

  return withCookies(
    NextResponse.json({
      ok: true,
      projects: (data ?? []).map((row) => mapProjectRow(row)),
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
    return NextResponse.json(
      { ok: false, code: "UNAUTHORIZED", message: "Please sign in again." },
      { status: 401 },
    );
  }

  const rl = await checkRateLimitWithProvider(`mutate:${user.id}:project-create`, 30, 60_000, { supabase });
  if (!rl.allowed) {
    return NextResponse.json({ ok: false, code: "RATE_LIMITED", message: "Too many requests. Try again later." }, { status: 429 });
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) {
    return NextResponse.json(
      { ok: false, code: "INVALID_JSON", message: "Invalid request body." },
      { status: 400 },
    );
  }

  const fieldErrors: Record<string, string> = {};

  const clientId = typeof body.client_id === "string" ? body.client_id.trim() : "";
  if (!clientId) {
    fieldErrors.client_id = "Client is required.";
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) {
    fieldErrors.name = "Project name is required.";
  } else if (name.length > 200) {
    fieldErrors.name = "Project name cannot exceed 200 characters.";
  }

  const hourlyRateRaw = typeof body.hourly_rate === "string" ? body.hourly_rate.trim() : typeof body.hourly_rate === "number" ? String(body.hourly_rate) : "0";
  const hourlyRate = Number(hourlyRateRaw);
  if (!Number.isFinite(hourlyRate) || hourlyRate < 0) {
    fieldErrors.hourly_rate = "Hourly rate must be zero or a positive number.";
  }

  const billingIncrement = typeof body.billing_increment === "string" ? body.billing_increment.trim() : "exact";
  if (!BILLING_RULES.includes(billingIncrement as BillingRule)) {
    fieldErrors.billing_increment = "Invalid billing increment.";
  }

  const status = typeof body.status === "string" ? body.status.trim() : "active";
  if (!VALID_STATUSES.includes(status as (typeof VALID_STATUSES)[number])) {
    fieldErrors.status = "Invalid project status.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return NextResponse.json(
      {
        ok: false,
        code: "VALIDATION_ERROR",
        message: "Please fix the highlighted fields.",
        fieldErrors,
      },
      { status: 400 },
    );
  }

  // Validate client belongs to user
  const { data: clientData, error: clientError } = await supabase
    .from("clients")
    .select("id")
    .eq("id", clientId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (clientError) {
    console.error("[projects:create] client lookup failed", {
      code: clientError.code,
      message: clientError.message,
    });
    return NextResponse.json(
      { ok: false, code: "LOAD_FAILED", message: "Unable to verify client." },
      { status: 500 },
    );
  }

  if (!clientData) {
    return NextResponse.json(
      { ok: false, code: "CLIENT_NOT_FOUND", message: "Selected client could not be found." },
      { status: 404 },
    );
  }

  const description = typeof body.description === "string" ? body.description.trim() : "";
  const minimumBillableMinutesRaw = body.minimum_billable_minutes;
  const minimumBillableMinutes =
    minimumBillableMinutesRaw === null || minimumBillableMinutesRaw === undefined || minimumBillableMinutesRaw === ""
      ? null
      : Math.max(0, Math.trunc(Number(minimumBillableMinutesRaw) || 0));

  const insertPayload = {
    user_id: user.id,
    client_id: clientId,
    name,
    description: description || null,
    hourly_rate: Math.round(hourlyRate * 100) / 100,
    billing_increment: billingIncrement,
    minimum_billable_minutes: minimumBillableMinutes,
    status,
  };

  const { data, error } = await supabase
    .from("projects")
    .insert(insertPayload)
    .select("*")
    .single();

  if (error || !data) {
    console.error("[projects:create] insert failed", {
      code: error?.code,
      message: error?.message,
    });
    return NextResponse.json(
      { ok: false, code: "INSERT_FAILED", message: "Unable to create project." },
      { status: 500 },
    );
  }

  return withCookies(
    NextResponse.json({
      ok: true,
      project: mapProjectRow(data),
    }),
  );
}
