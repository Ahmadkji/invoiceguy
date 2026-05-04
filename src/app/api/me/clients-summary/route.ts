import { NextResponse, type NextRequest } from "next/server";
import { createRouteClient } from "@/lib/supabase/route";

const DEFAULT_PAGE_SIZE = 500;
const MAX_PAGE_SIZE = 1000;

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
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }

  const [clientsResult, projectsResult, timeEntriesResult] = await Promise.all([
    supabase
      .from("clients")
      .select("id,name,company_name,email,color")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(pageSize),
    supabase.from("projects").select("id,client_id").eq("user_id", user.id).limit(pageSize),
    supabase
      .from("time_entries")
      .select("client_id,status,invoice_id,amount")
      .eq("user_id", user.id)
      .limit(pageSize),
  ]);

  const firstError = clientsResult.error ?? projectsResult.error ?? timeEntriesResult.error;
  if (firstError) {
    return NextResponse.json({ ok: false, message: firstError.message }, { status: 400 });
  }

  return withCookies(
    NextResponse.json({
      ok: true,
      clients: clientsResult.data ?? [],
      projects: projectsResult.data ?? [],
      timeEntries: timeEntriesResult.data ?? [],
    }),
  );
}
