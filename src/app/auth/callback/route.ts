import { NextResponse, type NextRequest } from "next/server";
import { createRouteClient } from "@/lib/supabase/route";
import { getSafeNextPath } from "@/lib/security/paths";

export async function GET(request: NextRequest) {
  const requestUrl = request.nextUrl;
  const code = requestUrl.searchParams.get("code");
  const nextPath = getSafeNextPath(requestUrl.searchParams.get("next"));
  const providerError = requestUrl.searchParams.get("error_description");

  if (providerError) {
    const redirectUrl = new URL("/signin", requestUrl.origin);
    // Sanitize: never reflect raw provider error strings into the URL.
    redirectUrl.searchParams.set("error", "oauth_provider_error");
    return NextResponse.redirect(redirectUrl);
  }

  if (code) {
    const { supabase, withCookies } = createRouteClient(request);
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      const redirectUrl = new URL("/signin", requestUrl.origin);
      // Sanitize: use a safe error key instead of the raw Supabase message.
      redirectUrl.searchParams.set("error", "session_exchange_failed");
      return NextResponse.redirect(redirectUrl);
    }

    const redirectUrl = new URL(nextPath, requestUrl.origin);
    return withCookies(NextResponse.redirect(redirectUrl));
  }

  const redirectUrl = new URL(nextPath, requestUrl.origin);
  return NextResponse.redirect(redirectUrl);
}
