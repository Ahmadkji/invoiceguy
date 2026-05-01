import { describe, it, expect, beforeAll } from "vitest";
import {
  ensureSignedIn,
  signOut,
  apiGet,
  apiPost,
  getCookieHeader,
  BASE_URL,
} from "./integration-helpers";

// ═══════════════════════════════════════════════════════════════════════════════
// Logout & Session Invalidation Integration Tests
//
// Tests: logout flow, session removal, cookie clearing, redirect behavior,
//        back-button protection, refresh after logout, protected API after logout
//
// Prerequisites:
//   1. `npm run dev` running on http://localhost:3000
//   2. .env.local with E2E_TEST_EMAIL / E2E_TEST_PASSWORD
// ═══════════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════════
// Setup: ensure signed in before testing logout
// ═══════════════════════════════════════════════════════════════════════════════

let sessionCookies: string[] = [];

beforeAll(async () => {
  await ensureSignedIn();
  sessionCookies = [...getCookieHeader().split("; ").filter(Boolean)];
});

// ═══════════════════════════════════════════════════════════════════════════════
// 1. User clicks logout → session is removed
// ═══════════════════════════════════════════════════════════════════════════════

describe("POST /api/auth/signout", () => {
  it("returns success status", async () => {
    const res = await fetch(`${BASE_URL}/api/auth/signout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: BASE_URL,
        Cookie: getCookieHeader(),
      },
      redirect: "manual",
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.ok).toBe(true);
  });

  it("clears auth cookies (sets empty/expired cookies)", async () => {
    const res = await fetch(`${BASE_URL}/api/auth/signout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: BASE_URL,
        Cookie: getCookieHeader(),
      },
      redirect: "manual",
    });
    const setCookies = res.headers.getSetCookie?.() ?? [];
    // Should set cookies to clear the session
    expect(setCookies.length).toBeGreaterThan(0);
    
    // Check that cookies are being cleared (either empty value or max-age=0)
    const hasClearCookie = setCookies.some(cookie => {
      const lower = cookie.toLowerCase();
      return lower.includes("max-age=0") || 
             lower.includes("expires=") ||
             cookie.split(";")[0]?.split("=")[1]?.trim() === "";
    });
    expect(hasClearCookie).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 2. User is redirected to /signin after logout
// ═══════════════════════════════════════════════════════════════════════════════

describe("Post-logout redirect behavior", () => {
  it("redirects unauthenticated user from /dashboard to /signin", async () => {
    // First ensure we're signed out
    await signOut();
    
    const res = await fetch(`${BASE_URL}/dashboard`, {
      headers: { Cookie: getCookieHeader() },
      redirect: "manual",
    });
    
    expect(res.status).toBe(307);
    const location = res.headers.get("location") ?? "";
    expect(location).toContain("/signin");
  });

  it("allows access to /signin page for unauthenticated user", async () => {
    const res = await fetch(`${BASE_URL}/signin`, {
      headers: { Cookie: getCookieHeader() },
      redirect: "manual",
    });
    expect(res.status).toBe(200);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 3. Back button does not show protected dashboard data
// ═══════════════════════════════════════════════════════════════════════════════

describe("Back button protection after logout", () => {
  it("protected API returns 401 after logout (simulates back button)", async () => {
    // Sign in first
    const { signIn, getCookieHeader: getCookies } = await import("./integration-helpers");
    await ensureSignedIn();
    
    // Sign out
    await signOut();
    
    // Try to access protected route (simulates pressing back button)
    const res = await fetch(`${BASE_URL}/api/me/profile`, {
      headers: { Cookie: getCookieHeader() },
    });
    
    expect(res.status).toBe(401);
  });

  it("dashboard page redirects to signin after logout", async () => {
    // Already signed out from previous test
    const res = await fetch(`${BASE_URL}/dashboard`, {
      headers: { Cookie: getCookieHeader() },
      redirect: "manual",
    });
    
    expect([307, 302]).toContain(res.status);
    const location = res.headers.get("location") ?? "";
    expect(location).toContain("/signin");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 4. Refreshing after logout keeps user logged out
// ═══════════════════════════════════════════════════════════════════════════════

describe("Session stays cleared after refresh", () => {
  it("multiple requests after logout all return 401", async () => {
    // Ensure signed out
    await signOut();
    
    // Simulate multiple page refreshes
    for (let i = 0; i < 3; i++) {
      const res = await fetch(`${BASE_URL}/api/auth/session`, {
        headers: { Cookie: getCookieHeader() },
      });
      const body = (await res.json()) as Record<string, unknown>;
      expect(body.authenticated).toBe(false);
    }
  });

  it("protected routes consistently reject after logout", async () => {
    await signOut();
    
    const protectedRoutes = [
      "/api/me/profile",
      "/api/me/clients",
      "/api/me/projects",
      "/api/me/invoices",
    ];
    
    for (const route of protectedRoutes) {
      const res = await fetch(`${BASE_URL}${route}`, {
        headers: { Cookie: getCookieHeader() },
      });
      expect(res.status).toBe(401);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 5. Protected API calls after logout return 401
// ═══════════════════════════════════════════════════════════════════════════════

describe("Protected API endpoints reject after logout", () => {
  it("GET /api/me/profile returns 401", async () => {
    await signOut();
    
    const res = await fetch(`${BASE_URL}/api/me/profile`, {
      headers: { Cookie: getCookieHeader() },
    });
    expect(res.status).toBe(401);
  });

  it("POST operations return 401 after logout", async () => {
    await signOut();
    
    // Try to create a client (should fail with 401)
    const res = await fetch(`${BASE_URL}/api/me/clients`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: BASE_URL,
        Cookie: getCookieHeader(),
      },
      body: JSON.stringify({
        name: "Test Client",
        email: "test@example.com",
      }),
    });
    
    expect(res.status).toBe(401);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 6. Browser back button test: Login → dashboard → logout → back
// ═══════════════════════════════════════════════════════════════════════════════

describe("Critical browser back button flow", () => {
  it("complete flow: login → dashboard → logout → back should not expose data", async () => {
    // Step 1: Login
    await ensureSignedIn();
    const dashboardRes1 = await fetch(`${BASE_URL}/dashboard`, {
      headers: { Cookie: getCookieHeader() },
      redirect: "manual",
    });
    expect(dashboardRes1.status).toBe(200);
    
    // Step 2: Verify session is active
    const sessionRes = await fetch(`${BASE_URL}/api/auth/session`, {
      headers: { Cookie: getCookieHeader() },
    });
    const sessionBody = (await sessionRes.json()) as Record<string, unknown>;
    expect(sessionBody.authenticated).toBe(true);
    
    // Step 3: Logout
    await signOut();
    
    // Step 4: Simulate back button (trying to access dashboard with old cookies)
    const dashboardRes2 = await fetch(`${BASE_URL}/dashboard`, {
      headers: { Cookie: getCookieHeader() },
      redirect: "manual",
    });
    
    // Should redirect to signin, NOT show dashboard
    expect([307, 302]).toContain(dashboardRes2.status);
    const location = dashboardRes2.headers.get("location") ?? "";
    expect(location).toContain("/signin");
    
    // Step 5: Verify API also rejects
    const apiRes = await fetch(`${BASE_URL}/api/me/profile`, {
      headers: { Cookie: getCookieHeader() },
    });
    expect(apiRes.status).toBe(401);
  });
});
