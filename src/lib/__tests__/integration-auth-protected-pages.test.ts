import { describe, it, expect, beforeAll } from "vitest";
import {
  ensureSignedIn,
  getCookieHeader,
  BASE_URL,
} from "./integration-helpers";

// ═══════════════════════════════════════════════════════════════════════════════
// Protected Page Routing Integration Tests
//
// Tests: redirect logic for protected pages, auth page redirect when logged in,
//         redirect-loop prevention, and persistence through refresh.
//
// Uses the shared session from integration-helpers to avoid rate-limit issues.
// Does NOT sign out — leaves the session for other test files to reuse.
//
// Prerequisites:
//   1. `npm run dev` running on http://localhost:3000
//   2. .env.local with E2E_TEST_EMAIL / E2E_TEST_PASSWORD
//
// Route mapping (app uses /signin, not /login):
//   - Protected pages: /dashboard, /dashboard/invoices, /dashboard/settings
//   - Auth entry pages: /signin
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Fetch a page without following redirects. */
async function fetchPage(
  path: string,
  cookies?: string,
): Promise<{ status: number; location: string | null }> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: cookies ? { Cookie: cookies } : {},
    redirect: "manual",
  });
  return {
    status: res.status,
    location: res.headers.get("location"),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Setup: ensure we have a shared session (0 extra sign-ins if another file
// already signed in). We do NOT sign out — other files need the session.
// ═══════════════════════════════════════════════════════════════════════════════

beforeAll(async () => {
  await ensureSignedIn();
});

// ═══════════════════════════════════════════════════════════════════════════════
// 1-3. Logged-out user visiting protected pages redirects to /signin
// ═══════════════════════════════════════════════════════════════════════════════

describe("Logged-out user: protected page redirects to /signin", () => {
  const protectedPages = [
    { name: "/dashboard", path: "/dashboard" },
    { name: "/dashboard/invoices (contracts)", path: "/dashboard/invoices" },
    { name: "/dashboard/settings", path: "/dashboard/settings" },
  ];

  for (const page of protectedPages) {
    describe(`Visiting ${page.name}`, () => {
      let result: { status: number; location: string | null };

      beforeAll(async () => {
        // No Cookie header = logged-out user
        result = await fetchPage(page.path);
      });

      it("redirects with 307 status", () => {
        expect(result.status).toBe(307);
      });

      it("redirects to /signin", () => {
        expect(result.location).not.toBeNull();
        expect(result.location!).toMatch(/^\/signin/);
      });

      it("includes a 'next' query param with the original path", () => {
        expect(result.location).not.toBeNull();
        const url = new URL(result.location!, BASE_URL);
        expect(url.searchParams.get("next")).toBe(page.path);
      });
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// 4. Logged-in user visiting /signin redirects to /dashboard
// ═══════════════════════════════════════════════════════════════════════════════

describe("Logged-in user: /signin redirects to /dashboard", () => {
  let result: { status: number; location: string | null };

  beforeAll(async () => {
    result = await fetchPage("/signin", getCookieHeader());
  });

  it("redirects with 307 status", () => {
    expect(result.status).toBe(307);
  });

  it("redirects to /dashboard", () => {
    expect(result.location).not.toBeNull();
    const url = new URL(result.location!, BASE_URL);
    expect(url.pathname).toBe("/dashboard");
    expect(url.search).toBe("");
  });

  it("does NOT redirect back to /signin (no loop)", () => {
    expect(result.location).not.toBeNull();
    expect(result.location).not.toMatch(/\/signin/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 5. No redirect loop: /signin?next=/dashboard after login goes to /dashboard
// ═══════════════════════════════════════════════════════════════════════════════

describe("No redirect loop: logged-in user at /signin?next=/dashboard", () => {
  let result: { status: number; location: string | null };

  beforeAll(async () => {
    result = await fetchPage("/signin?next=/dashboard", getCookieHeader());
  });

  it("redirects to /dashboard (not back to /signin)", () => {
    expect(result.status).toBe(307);
    expect(result.location).not.toBeNull();
    const url = new URL(result.location!, BASE_URL);
    expect(url.pathname).toBe("/dashboard");
  });

  it("does not create /signin?redirect=%2Fdashboard loop", () => {
    expect(result.location).not.toBeNull();
    const location = result.location!;
    expect(location).not.toContain("/signin");
    expect(location).not.toContain("redirect=");
    expect(location).not.toContain("login");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 6. Protected page still works after browser refresh
// ═══════════════════════════════════════════════════════════════════════════════

describe("Protected page survives browser refresh", () => {
  it("first visit returns 200", async () => {
    const result = await fetchPage("/dashboard", getCookieHeader());
    expect(result.status).toBe(200);
  });

  it("second visit (refresh) also returns 200", async () => {
    // First request
    await fetchPage("/dashboard", getCookieHeader());
    // Second request (simulates refresh)
    const result = await fetchPage("/dashboard", getCookieHeader());
    expect(result.status).toBe(200);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 7. Protected page still works after hard refresh (full page load)
// ═══════════════════════════════════════════════════════════════════════════════

describe("Protected page survives hard refresh (Ctrl+Shift+R simulation)", () => {
  it("multiple sequential full page loads all return 200", async () => {
    for (let i = 0; i < 3; i++) {
      const result = await fetchPage("/dashboard", getCookieHeader());
      expect(result.status).toBe(200);
    }
  });

  it("session API still confirms authenticated after multiple refreshes", async () => {
    const res = await fetch(`${BASE_URL}/api/auth/session`, {
      headers: { Cookie: getCookieHeader() },
    });
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.authenticated).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 8. Full end-to-end: login → dashboard, NO return to signin
// ═══════════════════════════════════════════════════════════════════════════════

describe("E2E: login then visit dashboard — no redirect back to signin", () => {
  let dashboardResult: { status: number; location: string | null };
  let signinPageResult: { status: number; location: string | null };

  beforeAll(async () => {
    // Already signed in via shared session — just visit the pages
    dashboardResult = await fetchPage("/dashboard", getCookieHeader());
    signinPageResult = await fetchPage("/signin", getCookieHeader());
  });

  it("/dashboard returns 200 (not a redirect)", () => {
    expect(dashboardResult.status).toBe(200);
  });

  it("/dashboard does NOT redirect to /signin", () => {
    expect(dashboardResult.status).not.toBe(307);
    expect(dashboardResult.location).toBeNull();
  });

  it("visiting /signin redirects to /dashboard (not back to signin)", () => {
    expect(signinPageResult.status).toBe(307);
    expect(signinPageResult.location).not.toBeNull();
    const url = new URL(signinPageResult.location!, BASE_URL);
    expect(url.pathname).toBe("/dashboard");
  });

  it("no /signin?redirect= loop in the final redirect target", () => {
    expect(signinPageResult.location).not.toBeNull();
    const location = signinPageResult.location!;
    expect(location).not.toContain("/signin");
    expect(location).not.toContain("redirect=");
  });
});
