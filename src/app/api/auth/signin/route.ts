import { NextResponse, type NextRequest } from "next/server";
import { checkRateLimitWithProvider } from "@/lib/security/rate-limit";
import { createRouteClient } from "@/lib/supabase/route";
import { getClientIp, hasAllowedOrigin } from "@/lib/security/request";
import { logAuthSessionEvent } from "@/lib/security/auth-events";

type SignInBody = {
  email?: string;
  password?: string;
};

function invalidCredentialsResponse() {
  return NextResponse.json(
    { ok: false, message: "Invalid credentials." },
    { status: 401 },
  );
}

export async function POST(request: NextRequest) {
  if (!hasAllowedOrigin(request)) {
    return NextResponse.json({ ok: false, message: "Forbidden." }, { status: 403 });
  }

  const { supabase, withCookies } = createRouteClient(request);
  const ip = getClientIp(request);
  const ipLimit = await checkRateLimitWithProvider(`auth:signin:ip:${ip}`, 20, 60_000, { supabase });
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

  const body = (await request.json().catch(() => null)) as SignInBody | null;
  const email = body?.email?.trim().toLowerCase() ?? "";
  const password = body?.password ?? "";

  if (!email || !password) {
    return invalidCredentialsResponse();
  }

  // 30 per email per 15 min — enough headroom for integration test suites
  // while still protecting against brute-force in production.
  const emailLimit = await checkRateLimitWithProvider(`auth:signin:email:${email}`, 30, 15 * 60_000, { supabase });
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

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.session) {
    return invalidCredentialsResponse();
  }

  await logAuthSessionEvent(
    supabase,
    data.session,
    "sign_in",
    ip === "unknown" ? null : ip,
    request.headers.get("user-agent"),
  );

  return withCookies(NextResponse.json({ ok: true }));
}
