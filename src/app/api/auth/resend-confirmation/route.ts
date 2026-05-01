import { NextResponse, type NextRequest } from "next/server";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { createRouteClient } from "@/lib/supabase/route";
import { getClientIp, hasAllowedOrigin } from "@/lib/security/request";

type ResendBody = {
  email?: string;
};

function isValidEmail(email: string) {
  return /^\S+@\S+\.\S+$/.test(email);
}

export async function POST(request: NextRequest) {
  if (!hasAllowedOrigin(request)) {
    return NextResponse.json({ ok: false, message: "Forbidden." }, { status: 403 });
  }

  const ip = getClientIp(request);
  const ipLimit = checkRateLimit(`auth:resend:ip:${ip}`, 8, 60_000);
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

  const body = (await request.json().catch(() => null)) as ResendBody | null;
  const email = body?.email?.trim().toLowerCase() ?? "";
  if (!isValidEmail(email)) {
    return NextResponse.json(
      { ok: false, message: "Enter a valid email address." },
      { status: 400 },
    );
  }

  const { supabase, withCookies } = createRouteClient(request);
  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
  });

  if (error) {
    return NextResponse.json(
      { ok: false, message: "Could not resend confirmation right now. Try again later." },
      { status: 400 },
    );
  }

  return withCookies(NextResponse.json({ ok: true }));
}
