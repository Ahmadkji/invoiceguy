import { NextResponse, type NextRequest } from "next/server";
import { createRouteClient } from "@/lib/supabase/route";

export async function GET(request: NextRequest) {
  const { supabase, withCookies } = createRouteClient(request);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return withCookies(
    NextResponse.json({
      ok: true,
      authenticated: Boolean(user),
    }),
  );
}
