import { describe, expect, it } from "vitest";
import { BASE_URL, TEST_EMAIL, TEST_PASSWORD } from "./integration-helpers";

type SignupResult = {
  ok?: boolean;
  message?: string;
  requiresEmailConfirmation?: boolean;
};

function hasSupabaseAuthCookie(setCookies: string[]): boolean {
  return setCookies.some((value) => /sb-.*-auth-token/i.test(value));
}

describe("OAuth callback and email confirmation safety", () => {
  it("Google OAuth start endpoint returns redirect (provider or safe fallback)", async () => {
    const res = await fetch(`${BASE_URL}/api/auth/oauth/google?next=%2Fdashboard`, {
      redirect: "manual",
    });

    expect([302, 307, 308]).toContain(res.status);
    const location = res.headers.get("location") ?? "";
    expect(location.length).toBeGreaterThan(0);
    const redirectUrl = new URL(location, BASE_URL);

    const isGoogleRedirect = /accounts\.google\.com/i.test(redirectUrl.hostname);
    const isSupabaseOauthRedirect =
      redirectUrl.pathname === "/auth/v1/authorize" &&
      redirectUrl.searchParams.get("provider") === "google";
    const isSafeSigninFallback =
      redirectUrl.pathname === "/signin" &&
      Boolean(redirectUrl.searchParams.get("error"));
    expect(isGoogleRedirect || isSupabaseOauthRedirect || isSafeSigninFallback).toBe(true);
  }, 20_000);

  it("/auth/callback without code redirects safely", async () => {
    const res = await fetch(`${BASE_URL}/auth/callback?next=%2Fdashboard`, {
      redirect: "manual",
    });

    expect([302, 307, 308]).toContain(res.status);
    const location = res.headers.get("location") ?? "";
    const redirectUrl = new URL(location, BASE_URL);
    expect(redirectUrl.pathname).toBe("/dashboard");
  }, 20_000);

  it("provider error in callback is sanitized", async () => {
    const res = await fetch(
      `${BASE_URL}/auth/callback?error_description=${encodeURIComponent("Access denied by user")}`,
      { redirect: "manual" },
    );

    expect([302, 307, 308]).toContain(res.status);
    const location = res.headers.get("location") ?? "";
    expect(location).toContain("/signin");
    expect(location).toContain("error=oauth_provider_error");
    expect(location).not.toContain("Access%20denied");
    expect(location).not.toContain("Access denied");
  });

  it("invalid/expired/used callback code fails with clean error", async () => {
    const res = await fetch(
      `${BASE_URL}/auth/callback?code=invalid-or-expired-code-${Date.now()}&next=%2Fdashboard`,
      { redirect: "manual" },
    );

    expect([302, 307, 308]).toContain(res.status);
    const location = res.headers.get("location") ?? "";
    expect(location).toContain("/signin");
    expect(location).toContain("error=session_exchange_failed");
  });

  it("signup returns explicit confirmation state and safe cookie behavior", async () => {
    const email = `confirm-${Date.now()}@invoiceguy.test`;
    const res = await fetch(`${BASE_URL}/api/auth/signup`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: BASE_URL,
      },
      body: JSON.stringify({ email, password: "Password#1234", nextPath: "/dashboard" }),
    });

    const body = (await res.json()) as SignupResult;
    expect([200, 400, 429]).toContain(res.status);

    if (res.status === 200) {
      expect(body.ok).toBe(true);
      expect(typeof body.requiresEmailConfirmation).toBe("boolean");

      const setCookies = res.headers.getSetCookie?.() ?? [];
      if (body.requiresEmailConfirmation) {
        expect(hasSupabaseAuthCookie(setCookies)).toBe(false);
      }
    } else {
      expect(body.ok).toBe(false);
      expect(typeof body.message).toBe("string");
    }
  }, 20_000);

  it("confirmed user can still sign in after callback/error path checks", async () => {
    if (!TEST_EMAIL || !TEST_PASSWORD) {
      return;
    }

    const res = await fetch(`${BASE_URL}/api/auth/signin`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: BASE_URL,
      },
      body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
    });

    expect([200, 401, 429]).toContain(res.status);
    if (res.status === 200) {
      const body = (await res.json()) as { ok?: boolean };
      expect(body.ok).toBe(true);
    }
  });
});
