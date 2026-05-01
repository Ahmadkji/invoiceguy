import { describe, it, expect } from "vitest";
import { getClientIp, hasAllowedOrigin } from "@/lib/security/request";

// We construct real NextRequest objects for integration-style testing
// of the CSRF and IP extraction logic.
// Note: The module-level TRUST_PROXY/IS_VERCEL constants are evaluated
// from process.env at import time. The tests below validate the default
// (untrusted) path which is the common local-dev case.

// ─── Helper ──────────────────────────────────────────────────────────────────

function req(opts: { method?: string; headers?: Record<string, string> } = {}) {
  // Use a minimal object that satisfies the NextRequest interface used by
  // getClientIp and hasAllowedOrigin. They only access .headers and .method.
  return {
    method: opts.method ?? "POST",
    headers: new Map(Object.entries(opts.headers ?? {})),
  } as unknown as import("next/server").NextRequest;
}

// ─── getClientIp ─────────────────────────────────────────────────────────────

describe("getClientIp", () => {
  it("returns x-real-ip when present", () => {
    const r = req({
      headers: {
        "x-real-ip": "10.0.0.1",
      },
    });
    expect(getClientIp(r)).toBe("10.0.0.1");
  });

  it('returns "unknown" when no IP headers are present', () => {
    const r = req({ headers: {} });
    expect(getClientIp(r)).toBe("unknown");
  });

  it("returns x-real-ip over x-forwarded-for in untrusted mode", () => {
    const r = req({
      headers: {
        "x-forwarded-for": "1.2.3.4",
        "x-real-ip": "10.0.0.1",
      },
    });
    // In default (untrusted) mode, x-real-ip is preferred
    expect(getClientIp(r)).toBe("10.0.0.1");
  });
});

// ─── hasAllowedOrigin ────────────────────────────────────────────────────────

describe("hasAllowedOrigin", () => {
  it("allows GET, HEAD, and OPTIONS without origin check", () => {
    expect(hasAllowedOrigin(req({ method: "GET" }))).toBe(true);
    expect(hasAllowedOrigin(req({ method: "HEAD" }))).toBe(true);
    expect(hasAllowedOrigin(req({ method: "OPTIONS" }))).toBe(true);
  });

  it("rejects POST without origin or referer", () => {
    // POST with host only — no origin, no referer
    const r = req({
      method: "POST",
      headers: { host: "app.example.com" },
    });
    expect(hasAllowedOrigin(r)).toBe(false);
  });
});
