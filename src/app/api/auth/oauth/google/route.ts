import { NextResponse, type NextRequest } from "next/server";
import { createRouteClient } from "@/lib/supabase/route";
import { getSafeNextPath } from "@/lib/security/paths";

export async function GET(request: NextRequest) {
  const nextPath = getSafeNextPath(request.nextUrl.searchParams.get("next"));
  const callbackUrl = new URL("/auth/callback", request.nextUrl.origin);
  callbackUrl.searchParams.set("next", nextPath);

  const { supabase, withCookies } = createRouteClient(request);
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: callbackUrl.toString(),
    },
  });

  if (error || !data.url) {
    const signinUrl = new URL("/signin", request.nextUrl.origin);
    signinUrl.searchParams.set("error", "Could not start Google sign-in.");
    return NextResponse.redirect(signinUrl);
  }

  return withCookies(NextResponse.redirect(data.url));
}
