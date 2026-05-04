import { NextResponse, type NextRequest } from "next/server";
import { createRouteClient } from "@/lib/supabase/route";
import {
  mapClientRow,
  mapProfileRow,
  mapProjectSummaryRow,
  mapTimeEntryRow,
} from "@/lib/invoices/server";
import { isUuid } from "@/lib/validation";

const DEFAULT_PAGE_SIZE = 200;
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
  const pageSize = parsePageSize(request);
  const clientIdParam = request.nextUrl.searchParams.get("clientId");
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ ok: false, code: "UNAUTHORIZED", message: "Please sign in again." }, { status: 401 });
  }

  // Build time entries query with optional client filter
  let timeEntriesQuery = supabase
    .from("time_entries")
    .select("*")
    .eq("user_id", user.id)
    .is("invoice_id", null);

  if (clientIdParam && isUuid(clientIdParam)) {
    timeEntriesQuery = timeEntriesQuery.eq("client_id", clientIdParam);
  }

  timeEntriesQuery = timeEntriesQuery.order("entry_date", { ascending: false }).limit(pageSize);

  const [profileResult, clientsResult, projectsResult, timeEntriesResult] = await Promise.all([
    supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle(),
    supabase.from("clients").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(pageSize),
    supabase.from("projects").select("id,name").eq("user_id", user.id).order("name", { ascending: true }).limit(pageSize),
    timeEntriesQuery,
  ]);

  const firstError =
    profileResult.error ?? clientsResult.error ?? projectsResult.error ?? timeEntriesResult.error;

  if (firstError) {
    return NextResponse.json(
      { ok: false, code: "LOAD_FAILED", message: "Unable to load invoice editor data." },
      { status: 400 },
    );
  }

  return withCookies(
    NextResponse.json({
      ok: true,
      profile: mapProfileRow(profileResult.data, user),
      clients: (clientsResult.data ?? []).map((row) => mapClientRow(row)),
      projects: (projectsResult.data ?? []).map((row) => mapProjectSummaryRow(row)),
      timeEntries: (timeEntriesResult.data ?? []).map((row) => mapTimeEntryRow(row)),
    }),
  );
}
