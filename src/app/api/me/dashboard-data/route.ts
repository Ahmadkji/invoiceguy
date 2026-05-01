import { NextResponse, type NextRequest } from "next/server";
import { createRouteClient } from "@/lib/supabase/route";
import {
  mapClientRow,
  mapInvoiceRow,
  mapProfileRow,
  mapProjectRow,
  mapTimeEntryRow,
} from "@/lib/invoices/server";
import { toNumber } from "@/lib/validation";

const DEFAULT_PAGE_SIZE = 100;
const MAX_PAGE_SIZE = 500;

function parsePageSize(request: NextRequest) {
  const raw = Number.parseInt(request.nextUrl.searchParams.get("pageSize") ?? "", 10);
  if (!Number.isFinite(raw) || raw <= 0) {
    return DEFAULT_PAGE_SIZE;
  }

  return Math.min(raw, MAX_PAGE_SIZE);
}

export async function GET(request: NextRequest) {
  const { supabase, withCookies } = createRouteClient(request);
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  const pageSize = parsePageSize(request);

  if (userError || !user) {
    return NextResponse.json({ ok: false, code: "UNAUTHORIZED", message: "Please sign in again." }, { status: 401 });
  }

  const [profileResult, clientsResult, projectsResult, timeEntriesResult, invoicesResult] = await Promise.all([
    supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle(),
    supabase.from("clients").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(pageSize),
    supabase.from("projects").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(pageSize),
    supabase.from("time_entries").select("*").eq("user_id", user.id).order("entry_date", { ascending: false }).limit(pageSize),
    supabase.from("invoices").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(pageSize),
  ]);

  const firstError =
    profileResult.error ??
    clientsResult.error ??
    projectsResult.error ??
    timeEntriesResult.error ??
    invoicesResult.error;

  if (firstError) {
    console.error("[dashboard-data] load failed", {
      code: firstError.code,
      message: firstError.message,
    });
    return NextResponse.json(
      { ok: false, code: "LOAD_FAILED", message: "Unable to load dashboard data." },
      { status: 500 },
    );
  }

  // Compute paid invoice stats
  const invoicesData = invoicesResult.data ?? [];
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const paidThisMonth = invoicesData
    .filter((row) => {
      if (row.status !== "paid") return false;
      const updatedAt = new Date(row.updated_at);
      return updatedAt.getMonth() === currentMonth && updatedAt.getFullYear() === currentYear;
    })
    .reduce((sum, row) => sum + toNumber(row.total_amount, 0), 0);

  const paidInvoiceIds = invoicesData
    .filter((row) => row.status === "paid")
    .map((row) => row.id);

  let paidBilledMinutes = 0;
  if (paidInvoiceIds.length > 0) {
    const { data: paidItems } = await supabase
      .from("invoice_items")
      .select("billed_minutes")
      .in("invoice_id", paidInvoiceIds);

    if (paidItems) {
      paidBilledMinutes = paidItems.reduce((sum, item) => {
        const billed = Number(item.billed_minutes ?? 0);
        return Number.isFinite(billed) ? sum + billed : sum;
      }, 0);
    }
  }

  return withCookies(
    NextResponse.json({
      ok: true,
      profile: mapProfileRow(profileResult.data, user),
      clients: (clientsResult.data ?? []).map((row) => mapClientRow(row)),
      projects: (projectsResult.data ?? []).map((row) => mapProjectRow(row)),
      timeEntries: (timeEntriesResult.data ?? []).map((row) => mapTimeEntryRow(row)),
      invoices: (invoicesResult.data ?? []).map((row) => mapInvoiceRow(row)),
      paidThisMonth,
      paidBilledMinutes,
    }),
  );
}
