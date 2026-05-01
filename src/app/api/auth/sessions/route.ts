import { NextResponse, type NextRequest } from "next/server";
import { createRouteClient } from "@/lib/supabase/route";

export async function GET(request: NextRequest) {
  const { supabase, withCookies } = createRouteClient(request);
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("auth_session_events")
    .select("id,session_id,event,ip_address,user_agent,created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(25);

  if (error) {
    return NextResponse.json({ ok: false, message: error.message }, { status: 400 });
  }

  return withCookies(NextResponse.json({ ok: true, sessions: data ?? [] }));
}
