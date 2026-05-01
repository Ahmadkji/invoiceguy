import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

const MAX_BODY_BYTES = 100_000; // 100 KB — reject oversized payloads at the edge

export async function proxy(request: NextRequest) {
  const isProduction = process.env.NODE_ENV === "production";
  const forwardedProto = request.headers.get("x-forwarded-proto");
  if (isProduction && forwardedProto && forwardedProto !== "https") {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.protocol = "https:";
    return NextResponse.redirect(redirectUrl);
  }

  // Reject oversized mutation payloads before they reach route handlers
  if (["POST", "PUT", "PATCH"].includes(request.method)) {
    const contentLength = parseInt(request.headers.get("content-length") || "0", 10);
    if (contentLength > MAX_BODY_BYTES) {
      return NextResponse.json(
        { ok: false, code: "PAYLOAD_TOO_LARGE", message: "Request body exceeds size limit." },
        { status: 413 },
      );
    }
  }

  return updateSession(request);
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/signin",
    "/signup",
    "/forgot-password",
    "/update-password",
    "/auth/:path*",
    "/api/me/:path*",
  ],
};
