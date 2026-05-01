import { describe, expect, it } from "vitest";
import { BASE_URL, TEST_EMAIL, TEST_PASSWORD } from "./integration-helpers";

function parseCookiePairs(setCookies: string[]): string {
  return setCookies
    .map((cookie) => cookie.split(";")[0]?.trim())
    .filter(Boolean)
    .join("; ");
}

async function signInWithOwnJar() {
  if (!TEST_EMAIL || !TEST_PASSWORD) {
    return null;
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
    return null;
  }

  const setCookies = res.headers.getSetCookie?.() ?? [];
  const cookieHeader = parseCookiePairs(setCookies);
  if (!cookieHeader) {
    return null;
  }

  return { cookieHeader };
}

describe("Multi-tab session behavior", () => {
  it("logout in tab 1 invalidates protected calls in tab 2", async () => {
    const login = await signInWithOwnJar();
    if (!login) {
      return;
    }
    const { cookieHeader } = login;

    const tab1Cookie = cookieHeader;
    const tab2Cookie = cookieHeader;

    const tab2Before = await fetch(`${BASE_URL}/api/me/profile`, {
      headers: { Cookie: tab2Cookie },
      redirect: "manual",
    });
    expect(tab2Before.status).toBe(200);

    const signoutRes = await fetch(`${BASE_URL}/api/auth/signout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: BASE_URL,
        Cookie: tab1Cookie,
      },
      redirect: "manual",
    });
    expect(signoutRes.status).toBe(200);

    const tab2AfterApi = await fetch(`${BASE_URL}/api/me/profile`, {
      headers: { Cookie: tab2Cookie },
      redirect: "manual",
    });
    expect(tab2AfterApi.status).toBe(401);

    const tab2AfterPage = await fetch(`${BASE_URL}/dashboard`, {
      headers: { Cookie: tab2Cookie },
      redirect: "manual",
    });
    expect([302, 307, 308]).toContain(tab2AfterPage.status);
    expect(tab2AfterPage.headers.get("location") ?? "").toContain("/signin");
  });

  it("new login refreshes session, and shared cookie jar regains access", async () => {
    const firstLogin = await signInWithOwnJar();
    if (!firstLogin) {
      return;
    }

    const signoutRes = await fetch(`${BASE_URL}/api/auth/signout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: BASE_URL,
        Cookie: firstLogin.cookieHeader,
      },
      redirect: "manual",
    });
    expect(signoutRes.status).toBe(200);

    const secondLogin = await signInWithOwnJar();
    if (!secondLogin) {
      return;
    }

    const pageRes = await fetch(`${BASE_URL}/dashboard`, {
      headers: { Cookie: secondLogin.cookieHeader },
      redirect: "manual",
    });
    expect(pageRes.status).toBe(200);

    const loopCheck = await fetch(`${BASE_URL}/signin`, {
      headers: { Cookie: secondLogin.cookieHeader },
      redirect: "manual",
    });
    expect([302, 307, 308]).toContain(loopCheck.status);

    const location = loopCheck.headers.get("location") ?? "";
    expect(location).toContain("/dashboard");
    expect(location).not.toContain("/signin");
  });
});
