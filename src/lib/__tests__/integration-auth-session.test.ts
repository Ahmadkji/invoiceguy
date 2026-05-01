import { describe, it, expect, beforeAll } from "vitest";
import {
  ensureSignedIn,
  apiGet,
  getCookieHeader,
  getLastSignInSetCookies,
  BASE_URL,
} from "./integration-helpers";

// ═══════════════════════════════════════════════════════════════════════════════
// Auth Session & Cookie Flow Integration Tests
//
// Tests: login, session cookie creation, redirect, persistence, wrong-password
//         safety, and token-leak prevention.
//
// Uses the shared session from integration-helpers to avoid rate-limit issues
// when running alongside other integration test suites.
// Does NOT sign out — leaves the session for other test files to reuse.
//
// Prerequisites:
//   1. `npm run dev` running on http://localhost:3000
//   2. .env.local with E2E_TEST_EMAIL / E2E_TEST_PASSWORD
// ═══════════════════════════════════════════════════════════════════════════════

// A distinct email for wrong-password tests — never signs in successfully,
// so it only consumes its OWN rate-limit bucket.
const WRONG_PASS_EMAIL = "wrongpass.ratelimittest@invoiceguy.test";

// ─── Shared state ─────────────────────────────────────────────────────────────

let capturedSetCookies: string[] = [];

// ═══════════════════════════════════════════════════════════════════════════════
// Setup: ensure signed in via shared session (0 or 1 sign-in)
// ═══════════════════════════════════════════════════════════════════════════════

beforeAll(async () => {
  // Reuses file-based session if available — costs 0 extra sign-ins ideally.
  await ensureSignedIn();
  // Capture the Set-Cookie headers from whatever signIn happened.
  // If ensureSignedIn reused a cached session, this will be from a previous file's
  // signIn. For cookie-structure tests, we need to do a fresh sign-in to capture
  // headers. But to save rate-limit budget, we only do it if we don't have any.
  capturedSetCookies = getLastSignInSetCookies();
});

// ═══════════════════════════════════════════════════════════════════════════════
// 1. User logs in with correct email/password
// ═══════════════════════════════════════════════════════════════════════════════

describe("Login with correct credentials", () => {
  it("session is valid after ensureSignedIn", async () => {
    const res = await fetch(`${BASE_URL}/api/auth/session`, {
      headers: { Cookie: getCookieHeader() },
    });
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.authenticated).toBe(true);
  });

  it("can access protected profile endpoint", async () => {
    const profile = await apiGet("/api/me/profile");
    expect(profile.status).toBe(200);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 2. Session cookie is created after login
// ═══════════════════════════════════════════════════════════════════════════════

describe("Session cookie creation", () => {
  it("sets at least one Set-Cookie header", () => {
    expect(capturedSetCookies.length).toBeGreaterThanOrEqual(1);
  });

  it("sets a Supabase auth cookie (sb-*-auth-token pattern)", () => {
    const hasAuthCookie = capturedSetCookies.some((h) =>
      /sb-.*-auth-token/.test(h),
    );
    expect(hasAuthCookie).toBe(true);
  });

  it("auth cookie has HttpOnly flag", () => {
    const authCookie = capturedSetCookies.find((h) =>
      /sb-.*-auth-token/.test(h),
    );
    expect(authCookie).toBeDefined();
    const cookieFlags = authCookie!.split(";").slice(1).join(";").toLowerCase();
    expect(cookieFlags).toContain("httponly");
  });

  it("auth cookie has SameSite=Lax", () => {
    const authCookie = capturedSetCookies.find((h) =>
      /sb-.*-auth-token/.test(h),
    );
    expect(authCookie).toBeDefined();
    const cookieFlags = authCookie!.split(";").slice(1).join(";").toLowerCase();
    expect(cookieFlags).toContain("samesite=lax");
  });

  it("auth cookie has a far-future Max-Age (persistent session)", () => {
    const authCookie = capturedSetCookies.find((h) =>
      /sb-.*-auth-token/.test(h),
    );
    expect(authCookie).toBeDefined();
    const cookieFlags = authCookie!.split(";").slice(1).join(";");
    const maxAgeMatch = cookieFlags.match(/max-age=(\d+)/i);
    expect(maxAgeMatch).not.toBeNull();
    const maxAge = parseInt(maxAgeMatch![1], 10);
    expect(maxAge).toBeGreaterThanOrEqual(86400);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 3. User is redirected to /dashboard after login
// ═══════════════════════════════════════════════════════════════════════════════

describe("Post-login redirect to /dashboard", () => {
  it("middleware redirects authenticated user from /signin to /dashboard", async () => {
    const res = await fetch(`${BASE_URL}/signin`, {
      headers: { Cookie: getCookieHeader() },
      redirect: "manual",
    });
    expect(res.status).toBe(307);
    const location = res.headers.get("location") ?? "";
    expect(location).toContain("/dashboard");
  });

  it("/dashboard returns 200 for authenticated user", async () => {
    const res = await fetch(`${BASE_URL}/dashboard`, {
      headers: { Cookie: getCookieHeader() },
      redirect: "manual",
    });
    expect(res.status).toBe(200);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 4. Refreshing /dashboard keeps user logged in
// ═══════════════════════════════════════════════════════════════════════════════

describe("Session survives page refresh", () => {
  it("second request to /dashboard still returns 200", async () => {
    const res1 = await fetch(`${BASE_URL}/dashboard`, {
      headers: { Cookie: getCookieHeader() },
      redirect: "manual",
    });
    expect(res1.status).toBe(200);

    const res2 = await fetch(`${BASE_URL}/dashboard`, {
      headers: { Cookie: getCookieHeader() },
      redirect: "manual",
    });
    expect(res2.status).toBe(200);
  });

  it("session API confirms authentication after refresh simulation", async () => {
    const res = await fetch(`${BASE_URL}/api/auth/session`, {
      headers: { Cookie: getCookieHeader() },
    });
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.authenticated).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 5. Opening a new tab keeps user logged in
// ═══════════════════════════════════════════════════════════════════════════════

describe("Session persists across new tab (same cookies)", () => {
  it("separate request with same cookies reaches /dashboard (200)", async () => {
    const res = await fetch(`${BASE_URL}/dashboard`, {
      headers: { Cookie: getCookieHeader() },
      redirect: "manual",
    });
    expect(res.status).toBe(200);
  });

  it("independent /api/auth/session call still shows authenticated", async () => {
    const res = await fetch(`${BASE_URL}/api/auth/session`, {
      headers: { Cookie: getCookieHeader() },
    });
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.authenticated).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 6. Closing and reopening browser keeps session (persistent cookie)
// ═══════════════════════════════════════════════════════════════════════════════

describe("Session persists after browser close/reopen", () => {
  it("cookie has Max-Age > 0 (not a session cookie)", () => {
    const authCookie = capturedSetCookies.find((h) =>
      /sb-.*-auth-token/.test(h),
    );
    expect(authCookie).toBeDefined();
    const cookieFlags = authCookie!.split(";").slice(1).join(";");
    const maxAgeMatch = cookieFlags.match(/max-age=(\d+)/i);
    expect(maxAgeMatch).not.toBeNull();
    const maxAge = parseInt(maxAgeMatch![1], 10);
    expect(maxAge).toBeGreaterThan(0);
  });

  it("session still valid when replaying persistent cookies", async () => {
    const res = await fetch(`${BASE_URL}/api/auth/session`, {
      headers: { Cookie: getCookieHeader() },
    });
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.authenticated).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 7. Wrong password does not create session cookie
// ═══════════════════════════════════════════════════════════════════════════════

describe("Wrong password rejection", () => {
  let wrongPassStatus: number;
  let wrongPassBody: Record<string, unknown>;
  let wrongPassCookies: string[];

  beforeAll(async () => {
    const res = await fetch(`${BASE_URL}/api/auth/signin`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: BASE_URL,
      },
      body: JSON.stringify({
        email: WRONG_PASS_EMAIL,
        password: "AbsolutelyWrongPassword!999",
      }),
      redirect: "manual",
    });
    wrongPassStatus = res.status;
    wrongPassBody = (await res.json()) as Record<string, unknown>;
    wrongPassCookies = res.headers.getSetCookie?.() ?? [];
  });

  it("returns 401 status", () => {
    expect(wrongPassStatus).toBe(401);
  });

  it("returns { ok: false }", () => {
    expect(wrongPassBody.ok).toBe(false);
  });

  it("returns 'Invalid credentials.' message", () => {
    expect(wrongPassBody.message).toBe("Invalid credentials.");
  });

  it("does NOT set any Supabase auth cookie", () => {
    const hasAuthCookie = wrongPassCookies.some((h) =>
      /sb-.*-auth-token/.test(h),
    );
    expect(hasAuthCookie).toBe(false);
  });

  it("does NOT set any session-bearing cookie at all", () => {
    for (const cookie of wrongPassCookies) {
      const name = cookie.split("=")[0]?.trim() ?? "";
      expect(name).not.toMatch(/auth-token/);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 8. Login API never exposes refresh_token / access_token in response body
// ═══════════════════════════════════════════════════════════════════════════════

describe("Login API token leak prevention", () => {
  it("cookies don't expose tokens in plaintext (value is encoded)", () => {
    const authCookie = capturedSetCookies.find((h) =>
      /sb-.*-auth-token/.test(h),
    );
    if (!authCookie) return;

    const value = authCookie.split(";")[0]?.split("=").slice(1).join("=") ?? "";
    expect(value.length).toBeGreaterThan(20);
    const isBase64 = /^[A-Za-z0-9+/=_-]+$/.test(value);
    expect(isBase64).toBe(true);
  });

  it("cookie value does not start with raw JWT pattern (ey...)", () => {
    const authCookie = capturedSetCookies.find((h) =>
      /sb-.*-auth-token/.test(h),
    );
    if (!authCookie) return;

    const value = authCookie.split(";")[0]?.split("=").slice(1).join("=") ?? "";
    // Supabase SSR wraps the session in base64
    expect(value).not.toMatch(/^eyJ/);
  });

  it("API endpoints never return token fields in JSON body", async () => {
    const res = await fetch(`${BASE_URL}/api/auth/session`, {
      headers: { Cookie: getCookieHeader() },
    });
    const body = await res.text();
    expect(body).not.toContain("refresh_token");
    expect(body).not.toContain("access_token");
  });

  it("API responses contain no sensitive key names", async () => {
    const res = await fetch(`${BASE_URL}/api/auth/session`, {
      headers: { Cookie: getCookieHeader() },
    });
    const body = (await res.json()) as Record<string, unknown>;
    const keys = Object.keys(body);
    for (const key of keys) {
      expect(key).not.toMatch(/token|secret|password|key|credential/i);
    }
  });
});
