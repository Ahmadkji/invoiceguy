import { NextResponse, type NextRequest } from "next/server";
import { createRouteClient } from "@/lib/supabase/route";
import { hasAllowedOrigin } from "@/lib/security/request";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { mapClientRow } from "@/lib/invoices/server";

const CLIENT_COLORS = [
  "#10B981",
  "#3B82F6",
  "#8B5CF6",
  "#F59E0B",
  "#EF4444",
  "#EC4899",
  "#14B8A6",
  "#F97316",
];

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 100;
const MAX_PAGE_SIZE = 500;

function pickColor(index: number): string {
  return CLIENT_COLORS[index % CLIENT_COLORS.length];
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

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

  return { page, pageSize, from, to };
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
    .from("clients")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    console.error("[clients:list] load failed", {
      code: error.code,
      message: error.message,
    });
    return NextResponse.json(
      { ok: false, code: "LOAD_FAILED", message: "Unable to load clients." },
      { status: 500 },
    );
  }

  return withCookies(
    NextResponse.json({
      ok: true,
      clients: (data ?? []).map((row) => mapClientRow(row)),
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

  const rl = checkRateLimit(`mutate:${user.id}:client-create`, 30, 60_000);
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

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) {
    fieldErrors.name = "Client name is required.";
  } else if (name.length > 200) {
    fieldErrors.name = "Client name cannot exceed 200 characters.";
  }

  const emailRaw = typeof body.email === "string" ? body.email.trim() : "";
  if (emailRaw && !isValidEmail(emailRaw)) {
    fieldErrors.email = "Please enter a valid email address.";
  }

  const companyName = typeof body.company_name === "string" ? body.company_name.trim() : "";
  const phone = typeof body.phone === "string" ? body.phone.trim() : "";
  const billingAddress = typeof body.billing_address === "string" ? body.billing_address.trim() : "";
  const notes = typeof body.notes === "string" ? body.notes.trim() : "";

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

  // Pick a color based on how many clients the user already has
  const { count } = await supabase
    .from("clients")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);

  const color = pickColor(count ?? 0);

  const insertPayload = {
    user_id: user.id,
    name,
    email: emailRaw || null,
    company_name: companyName || null,
    phone: phone || null,
    billing_address: billingAddress || null,
    notes: notes || null,
    color,
  };

  const { data, error } = await supabase
    .from("clients")
    .insert(insertPayload)
    .select("*")
    .single();

  if (error || !data) {
    console.error("[clients:create] insert failed", {
      code: error?.code,
      message: error?.message,
    });
    return NextResponse.json(
      { ok: false, code: "INSERT_FAILED", message: "Unable to create client." },
      { status: 500 },
    );
  }

  return withCookies(
    NextResponse.json({
      ok: true,
      client: mapClientRow(data),
    }),
  );
}
