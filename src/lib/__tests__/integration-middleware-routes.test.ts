import { describe, expect, it } from "vitest";
import { BASE_URL } from "./integration-helpers";

type RouteCheck = {
  path: string;
  label: string;
};

async function fetchNoAuth(path: string) {
  return fetch(`${BASE_URL}${path}`, {
    redirect: "manual",
  });
}

describe("Middleware route protections and public exclusions", () => {
  describe("logged-out protected page redirects", () => {
    const protectedRoutes: RouteCheck[] = [
      { path: "/dashboard", label: "/dashboard" },
      // This app uses invoices as the protected business page equivalent.
      { path: "/dashboard/invoices", label: "/contracts equivalent (/dashboard/invoices)" },
      { path: "/dashboard/settings", label: "/dashboard/settings" },
    ];

    for (const route of protectedRoutes) {
      it(`${route.label} redirects to /signin when logged out`, async () => {
        const res = await fetchNoAuth(route.path);
        expect([302, 307, 308]).toContain(res.status);

        const location = res.headers.get("location") ?? "";
        expect(location).toContain("/signin");
        expect(location).toContain("next=");
      });
    }
  });

  it("/api/me/* protected routes are not skipped by middleware/auth guards", async () => {
    const res = await fetchNoAuth("/api/me/profile");
    expect(res.status).toBe(401);

    const body = (await res.json()) as { ok?: boolean };
    expect(body.ok).toBe(false);
  });

  it("static assets are not blocked by auth middleware", async () => {
    const res = await fetchNoAuth("/favicon.ico");
    expect([200, 304]).toContain(res.status);

    const location = res.headers.get("location") ?? "";
    expect(location).not.toContain("/signin");
  });

  it("/signin is accessible when logged out", async () => {
    const res = await fetchNoAuth("/signin");
    expect(res.status).toBe(200);
  });

  it("/signup is accessible when logged out", async () => {
    const res = await fetchNoAuth("/signup");
    expect(res.status).toBe(200);
  }, 20_000);

  it("/auth/callback is not blocked by middleware", async () => {
    const res = await fetchNoAuth("/auth/callback?next=%2Fdashboard");
    expect([302, 307, 308]).toContain(res.status);

    const location = res.headers.get("location") ?? "";
    // Route can redirect to next path or a sanitized signin error path.
    expect(location.length).toBeGreaterThan(0);
    expect(location).not.toContain("/signin?next=");
  });

  it("password reset entry routes are not blocked", async () => {
    const forgot = await fetchNoAuth("/forgot-password");
    expect(forgot.status).toBe(200);

    const update = await fetchNoAuth("/update-password");
    expect([200, 400]).toContain(update.status);

    // Compatibility check for apps that use /reset-password naming.
    const resetLegacy = await fetchNoAuth("/reset-password");
    const location = resetLegacy.headers.get("location") ?? "";
    expect(location).not.toContain("/signin");
    expect([200, 404]).toContain(resetLegacy.status);
  }, 60_000);
});
