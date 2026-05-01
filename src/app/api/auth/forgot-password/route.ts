import { NextResponse, type NextRequest } from "next/server";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { createRouteClient } from "@/lib/supabase/route";
import { getClientIp, hasAllowedOrigin } from "@/lib/security/request";
import { getSafeNextPath } from "@/lib/security/paths";

type ForgotPasswordBody = {
  email?: string;
  nextPath?: string;
};

function isValidEmail(email: string) {
  return /^\S+@\S+\.\S+$/.test(email);
}

export async function POST(request: NextRequest) {
  if (!hasAllowedOrigin(request)) {
    return NextResponse.json({ ok: false, message: "Forbidden." }, { status: 403 });
  }

  const ip = getClientIp(request);
  const ipLimit = checkRateLimit(`auth:forgot:ip:${ip}`, 10, 60_000);
  if (!ipLimit.allowed) {
    return NextResponse.json(
      { ok: false, message: "Too many requests. Try again shortly." },
      {
        status: 429,
        headers: {
          "Retry-After": String(ipLimit.retryAfterSeconds),
        },
      },
    );
  }

  const body = (await request.json().catch(() => null)) as ForgotPasswordBody | null;
  const email = body?.email?.trim().toLowerCase() ?? "";
  if (!isValidEmail(email)) {
    return NextResponse.json(
      { ok: false, message: "Enter a valid email address." },
      { status: 400 },
    );
  }

  const nextPath = getSafeNextPath(body?.nextPath ?? null);
  const callbackUrl = new URL("/auth/callback", request.nextUrl.origin);
  const updatePath =
    nextPath === "/dashboard"
      ? "/update-password"
      : `/update-password?next=${encodeURIComponent(nextPath)}`;
  callbackUrl.searchParams.set("next", updatePath);

  const { supabase, withCookies } = createRouteClient(request);
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: callbackUrl.toString(),
  });

  // Always return generic success to prevent account enumeration.
  return withCookies(
    NextResponse.json({
      ok: true,
      message: "If this email exists, a password reset link has been sent.",
    }),
  );
}
