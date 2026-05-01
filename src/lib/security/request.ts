import { type NextRequest } from "next/server";

const TRUST_PROXY = process.env.TRUST_PROXY === "true";
const IS_VERCEL = process.env.VERCEL === "1";

export function getClientIp(request: NextRequest): string {
  // Only trust X-Forwarded-For when explicitly behind a known trusted proxy.
  // On Vercel, the edge network sanitizes this header (real client IP is leftmost).
  // In self-hosted environments without a trusted proxy, this header is trivially spoofable.
  if (TRUST_PROXY || IS_VERCEL) {
    const forwardedFor = request.headers.get("x-forwarded-for");
    if (forwardedFor) {
      const first = forwardedFor.split(",")[0]?.trim();
      if (first) {
        return first;
      }
    }
  }

  return request.headers.get("x-real-ip") ?? "unknown";
}

function isSameOrigin(originOrReferer: string, request: NextRequest): boolean {
  let url: URL;
  try {
    url = new URL(originOrReferer);
  } catch {
    return false;
  }

  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!host) {
    return false;
  }

  return url.host === host;
}

export function hasAllowedOrigin(request: NextRequest) {
  if (request.method === "GET" || request.method === "HEAD" || request.method === "OPTIONS") {
    return true;
  }

  const originHeader = request.headers.get("origin");
  if (originHeader) {
    return isSameOrigin(originHeader, request);
  }

  // Some browsers omit the Origin header on same-origin POST requests.
  // Fall back to Referer to avoid falsely rejecting legitimate traffic.
  const refererHeader = request.headers.get("referer");
  if (refererHeader) {
    return isSameOrigin(refererHeader, request);
  }

  return false;
}
