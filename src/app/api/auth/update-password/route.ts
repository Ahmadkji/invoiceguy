import { NextResponse, type NextRequest } from "next/server";
import { createRouteClient } from "@/lib/supabase/route";
import { getClientIp, hasAllowedOrigin } from "@/lib/security/request";
import { logAuthSessionEvent } from "@/lib/security/auth-events";

type UpdatePasswordBody = {
  password?: string;
};

export async function POST(request: NextRequest) {
  if (!hasAllowedOrigin(request)) {
    return NextResponse.json({ ok: false, message: "Forbidden." }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as UpdatePasswordBody | null;
  const password = body?.password ?? "";
  if (password.length < 8) {
    return NextResponse.json(
      { ok: false, message: "Password must be at least 8 characters." },
      { status: 400 },
    );
  }

  const { supabase, withCookies } = createRouteClient(request);
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json(
      { ok: false, message: "Your reset session is missing or expired. Request a new reset link." },
      { status: 401 },
    );
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return NextResponse.json(
      { ok: false, message: "Could not update password. Request a new reset link." },
      { status: 400 },
    );
  }

  // Fetch session only for audit logging (not for auth decisions)
  const {
    data: { session },
  } = await supabase.auth.getSession();

  await logAuthSessionEvent(
    supabase,
    session,
    "password_update",
    getClientIp(request),
    request.headers.get("user-agent"),
  );

  await supabase.auth.signOut();

  return withCookies(NextResponse.json({ ok: true }));
}
