import { NextResponse, type NextRequest } from "next/server";
import { checkRateLimitWithProvider } from "@/lib/security/rate-limit";
import { createRouteClient } from "@/lib/supabase/route";
import { getClientIp, hasAllowedOrigin } from "@/lib/security/request";
import { getSafeNextPath } from "@/lib/security/paths";
import { logAuthSessionEvent } from "@/lib/security/auth-events";

type SignupBody = {
  email?: string;
  password?: string;
  nextPath?: string;
};

function isValidEmail(email: string) {
  return /^\S+@\S+\.\S+$/.test(email);
}

export async function POST(request: NextRequest) {
  if (!hasAllowedOrigin(request)) {
    return NextResponse.json({ ok: false, message: "Forbidden." }, { status: 403 });
  }

  const { supabase, withCookies } = createRouteClient(request);
  const ip = getClientIp(request);
  const ipLimit = await checkRateLimitWithProvider(`auth:signup:ip:${ip}`, 10, 60_000, { supabase });
  if (!ipLimit.allowed) {
    return NextResponse.json(
      { ok: false, message: "Too many attempts. Try again shortly." },
      {
        status: 429,
        headers: {
          "Retry-After": String(ipLimit.retryAfterSeconds),
        },
      },
    );
  }

  const body = (await request.json().catch(() => null)) as SignupBody | null;
  const email = body?.email?.trim().toLowerCase() ?? "";
  const password = body?.password ?? "";
  const nextPath = getSafeNextPath(body?.nextPath ?? null);

  if (!isValidEmail(email)) {
    return NextResponse.json(
      { ok: false, message: "Enter a valid email address." },
      { status: 400 },
    );
  }

  if (password.length < 8) {
    return NextResponse.json(
      { ok: false, message: "Password must be at least 8 characters." },
      { status: 400 },
    );
  }

  const emailLimit = await checkRateLimitWithProvider(`auth:signup:email:${email}`, 5, 15 * 60_000, { supabase });
  if (!emailLimit.allowed) {
    return NextResponse.json(
      { ok: false, message: "Too many attempts. Try again later." },
      {
        status: 429,
        headers: {
          "Retry-After": String(emailLimit.retryAfterSeconds),
        },
      },
    );
  }

  const callbackUrl = new URL("/auth/callback", request.nextUrl.origin);
  callbackUrl.searchParams.set("next", nextPath);

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: callbackUrl.toString(),
    },
  });

  if (error) {
    const message = error.message.toLowerCase().includes("already")
      ? "If this email already has an account, sign in or reset your password."
      : "Could not create account. Please try again.";

    return NextResponse.json({ ok: false, message }, { status: 400 });
  }

  if (data.session) {
    await logAuthSessionEvent(
      supabase,
      data.session,
      "sign_up",
      ip === "unknown" ? null : ip,
      request.headers.get("user-agent"),
    );
  }

  return withCookies(
    NextResponse.json({
      ok: true,
      requiresEmailConfirmation: !Boolean(data.session),
    }),
  );
}
