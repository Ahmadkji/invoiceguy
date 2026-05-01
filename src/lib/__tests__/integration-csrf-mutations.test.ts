import { beforeAll, describe, expect, it } from "vitest";
import { BASE_URL, TEST_EMAIL, TEST_PASSWORD } from "./integration-helpers";

function parseCookiePairs(setCookies: string[]): string {
  return setCookies
    .map((cookie) => cookie.split(";")[0]?.trim())
    .filter(Boolean)
    .join("; ");
}

describe("CSRF protection for cookie-auth API mutations", () => {
  let authCookie: string | null = null;

  beforeAll(async () => {
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
      redirect: "manual",
    });

    if (res.status !== 200) {
      return;
    }

    const cookieHeader = parseCookiePairs(res.headers.getSetCookie?.() ?? []);
    authCookie = cookieHeader || null;
  });

  it("POST /api/me/clients without Origin fails", async () => {
    const res = await fetch(`${BASE_URL}/api/me/clients`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: authCookie ?? "",
      },
      body: JSON.stringify({ name: "NoOrigin" }),
      redirect: "manual",
    });

    expect(res.status).toBe(403);
    const body = (await res.json()) as { ok?: boolean; message?: string };
    expect(body.ok).toBe(false);
    expect(typeof body.message).toBe("string");
  });

  it("POST /api/me/clients with invalid Origin fails", async () => {
    const res = await fetch(`${BASE_URL}/api/me/clients`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "https://evil.example",
        Cookie: authCookie ?? "",
      },
      body: JSON.stringify({ name: "BadOrigin" }),
      redirect: "manual",
    });

    expect(res.status).toBe(403);
    const body = (await res.json()) as { ok?: boolean; message?: string };
    expect(body.ok).toBe(false);
    expect(typeof body.message).toBe("string");
  });

  it("POST /api/me/clients with same-origin header is accepted by CSRF layer", async () => {
    if (!authCookie) {
      // Credential-gated assertion: skip behavior check when auth creds are unavailable.
      return;
    }

    const res = await fetch(`${BASE_URL}/api/me/clients`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: BASE_URL,
        Cookie: authCookie,
      },
      // Intentionally invalid payload so this does not create test data.
      body: JSON.stringify({}),
      redirect: "manual",
    });

    expect(res.status).toBe(400);

    const contentType = res.headers.get("content-type") ?? "";
    expect(contentType.toLowerCase()).toContain("application/json");

    const body = (await res.json()) as {
      ok?: boolean;
      fieldErrors?: Record<string, string>;
      message?: string;
    };

    expect(body.ok).toBe(false);
    expect(typeof body.message).toBe("string");
    expect(Boolean(body.fieldErrors?.name)).toBe(true);
  });

  it("GET routes do not require Origin header", async () => {
    if (!authCookie) {
      return;
    }

    const res = await fetch(`${BASE_URL}/api/me/clients`, {
      headers: {
        Cookie: authCookie,
      },
      redirect: "manual",
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok?: boolean; clients?: unknown[] };
    expect(body.ok).toBe(true);
    expect(Array.isArray(body.clients)).toBe(true);
  });
});
