import { NextResponse, type NextRequest } from "next/server";
import { createRouteClient } from "@/lib/supabase/route";
import { getClientIp, hasAllowedOrigin } from "@/lib/security/request";
import { logAuthSessionEvent } from "@/lib/security/auth-events";

export async function POST(request: NextRequest) {
  if (!hasAllowedOrigin(request)) {
    return NextResponse.json({ ok: false, message: "Forbidden." }, { status: 403 });
  }

  const { supabase, withCookies } = createRouteClient(request);
  const {
    data: { session },
  } = await supabase.auth.getSession();

  await supabase.auth.signOut({ scope: "local" });

  if (session) {
    await logAuthSessionEvent(
      supabase,
      session,
      "sign_out",
      getClientIp(request),
      request.headers.get("user-agent"),
    );
  }

  return withCookies(NextResponse.json({ ok: true }));
}
