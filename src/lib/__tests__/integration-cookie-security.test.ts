import { describe, it, expect, beforeAll } from "vitest";
import {
  ensureSignedIn,
  signIn,
  getCookieHeader,
  getLastSignInSetCookies,
  storeCookies,
  BASE_URL,
} from "./integration-helpers";

// ═══════════════════════════════════════════════════════════════════════════════
// Cookie Security Integration Tests
//
// Tests: HttpOnly, Secure, SameSite, Path, Expires/Max-Age, token leakage
//        Checks for bad signs: tokens in localStorage, service_role key exposure
//
// Prerequisites:
//   1. `npm run dev` running on http://localhost:3000
//   2. .env.local with E2E_TEST_EMAIL / E2E_TEST_PASSWORD
// ═══════════════════════════════════════════════════════════════════════════════

let capturedSetCookies: string[] = [];

beforeAll(async () => {
  await ensureSignedIn();
  
  // Try to get cookies from last sign-in
  capturedSetCookies = getLastSignInSetCookies();
  
  // If no cookies captured (session was reused), do a fresh sign-in
  // This is necessary to inspect the Set-Cookie headers
  if (capturedSetCookies.length === 0) {
    const result = await signIn();
    if (result.ok) {
      capturedSetCookies = result.setCookieHeaders;
    }
  }
});

// Helper to parse cookie string into components
function parseCookie(cookieStr: string): {
  name: string;
  value: string;
  flags: Record<string, string | boolean>;
} {
  const parts = cookieStr.split(";").map(p => p.trim());
  const [nameValue] = parts;
  const [name, ...valueParts] = nameValue.split("=");
  const value = valueParts.join("=");
  
  const flags: Record<string, string | boolean> = {};
  for (let i = 1; i < parts.length; i++) {
    const part = parts[i];
    const [flagName, flagValue] = part.split("=");
    if (flagValue !== undefined) {
      flags[flagName!.toLowerCase()] = flagValue;
    } else {
      flags[flagName!.toLowerCase()] = true;
    }
  }
  
  return { name: name!, value, flags };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1. HttpOnly flag verification
// ═══════════════════════════════════════════════════════════════════════════════

describe("Cookie HttpOnly security", () => {
  it("auth cookie has HttpOnly flag set to true", () => {
    const authCookie = capturedSetCookies.find(c => 
      /sb-.*-auth-token/.test(c)
    );
    expect(authCookie).toBeDefined();
    
    const parsed = parseCookie(authCookie!);
    expect(parsed.flags.httponly).toBe(true);
  });

  it("all Supabase cookies are HttpOnly", () => {
    const supabaseCookies = capturedSetCookies.filter(c => 
      /sb-/.test(c)
    );
    
    expect(supabaseCookies.length).toBeGreaterThan(0);
    
    for (const cookie of supabaseCookies) {
      const parsed = parseCookie(cookie);
      expect(parsed.flags.httponly).toBe(true);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 2. Secure flag verification
// ═══════════════════════════════════════════════════════════════════════════════

describe("Cookie Secure flag", () => {
  it("auth cookie Secure flag matches environment expectations", () => {
    const authCookie = capturedSetCookies.find(c => 
      /sb-.*-auth-token/.test(c)
    );
    expect(authCookie).toBeDefined();
    
    const parsed = parseCookie(authCookie!);
    const isProduction = process.env.NODE_ENV === "production";
    
    // In production, Secure MUST be true
    // In development, Secure may be false (localhost)
    if (isProduction) {
      expect(parsed.flags.secure).toBe(true);
    }
    // In dev, we don't enforce Secure flag since it's localhost
  });

  it("no sensitive cookies without Secure flag in production", () => {
    const isProduction = process.env.NODE_ENV === "production";
    if (!isProduction) return; // Skip in development
    
    for (const cookie of capturedSetCookies) {
      const parsed = parseCookie(cookie);
      // Any cookie containing auth/session data should be secure
      if (parsed.name.toLowerCase().includes("auth") || 
          parsed.name.toLowerCase().includes("session")) {
        expect(parsed.flags.secure).toBe(true);
      }
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 3. SameSite attribute verification
// ═══════════════════════════════════════════════════════════════════════════════

describe("Cookie SameSite attribute", () => {
  it("auth cookie has SameSite set to Lax or Strict", () => {
    const authCookie = capturedSetCookies.find(c => 
      /sb-.*-auth-token/.test(c)
    );
    expect(authCookie).toBeDefined();
    
    const parsed = parseCookie(authCookie!);
    const sameSite = (parsed.flags.samesite as string)?.toLowerCase();
    
    expect(["lax", "strict"]).toContain(sameSite);
  });

  it("all Supabase cookies have proper SameSite value", () => {
    const supabaseCookies = capturedSetCookies.filter(c => 
      /sb-/.test(c)
    );
    
    for (const cookie of supabaseCookies) {
      const parsed = parseCookie(cookie);
      const sameSite = (parsed.flags.samesite as string)?.toLowerCase();
      expect(["lax", "strict"]).toContain(sameSite);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 4. Path attribute verification
// ═══════════════════════════════════════════════════════════════════════════════

describe("Cookie Path attribute", () => {
  it("auth cookie has Path set to /", () => {
    const authCookie = capturedSetCookies.find(c => 
      /sb-.*-auth-token/.test(c)
    );
    expect(authCookie).toBeDefined();
    
    const parsed = parseCookie(authCookie!);
    expect(parsed.flags.path).toBe("/");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 5. Expires/Max-Age verification
// ═══════════════════════════════════════════════════════════════════════════════

describe("Cookie expiration (Expires/Max-Age)", () => {
  it("auth cookie has Max-Age or Expires set", () => {
    const authCookie = capturedSetCookies.find(c => 
      /sb-.*-auth-token/.test(c)
    );
    expect(authCookie).toBeDefined();
    
    const parsed = parseCookie(authCookie!);
    const hasMaxAge = "max-age" in parsed.flags;
    const hasExpires = "expires" in parsed.flags;
    
    expect(hasMaxAge || hasExpires).toBe(true);
  });

  it("auth cookie Max-Age is set correctly (long-lived session)", () => {
    const authCookie = capturedSetCookies.find(c => 
      /sb-.*-auth-token/.test(c)
    );
    expect(authCookie).toBeDefined();
    
    const parsed = parseCookie(authCookie!);
    if ("max-age" in parsed.flags) {
      const maxAge = parseInt(parsed.flags["max-age"] as string, 10);
      // Should be a reasonable session length (at least 1 day, at most 400 days)
      expect(maxAge).toBeGreaterThanOrEqual(86400); // 1 day
      expect(maxAge).toBeLessThanOrEqual(400 * 24 * 60 * 60); // 400 days
    }
  });

  it("cookie does not have both Max-Age=0 and no Expires (properly cleared)", () => {
    // This ensures we're not accidentally creating immediately-expired cookies
    const authCookie = capturedSetCookies.find(c => 
      /sb-.*-auth-token/.test(c)
    );
    expect(authCookie).toBeDefined();
    
    const parsed = parseCookie(authCookie!);
    const maxAge = parsed.flags["max-age"];
    
    if (maxAge !== undefined && maxAge !== true) {
      const maxAgeValue = parseInt(maxAge as string, 10);
      expect(maxAgeValue).not.toBe(0);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 6. Token leakage prevention
// ═══════════════════════════════════════════════════════════════════════════════

describe("Token leakage prevention", () => {
  it("cookie value does not contain raw JWT token (ey... pattern)", () => {
    const authCookie = capturedSetCookies.find(c => 
      /sb-.*-auth-token/.test(c)
    );
    expect(authCookie).toBeDefined();
    
    const parsed = parseCookie(authCookie!);
    // JWT tokens start with eyJ
    expect(parsed.value).not.toMatch(/^eyJ/);
  });

  it("API responses do not contain refresh_token", async () => {
    const res = await fetch(`${BASE_URL}/api/auth/session`, {
      headers: { Cookie: getCookieHeader() },
    });
    const body = await res.text();
    expect(body).not.toContain("refresh_token");
  });

  it("API responses do not contain access_token", async () => {
    const res = await fetch(`${BASE_URL}/api/auth/session`, {
      headers: { Cookie: getCookieHeader() },
    });
    const body = await res.text();
    expect(body).not.toContain("access_token");
  });

  it("API responses do not contain service_role key", async () => {
    const res = await fetch(`${BASE_URL}/api/auth/session`, {
      headers: { Cookie: getCookieHeader() },
    });
    const body = await res.text();
    expect(body).not.toContain("service_role");
  });

  it("no sensitive keys in session API response", async () => {
    const res = await fetch(`${BASE_URL}/api/auth/session`, {
      headers: { Cookie: getCookieHeader() },
    });
    const body = (await res.json()) as Record<string, unknown>;
    const keys = Object.keys(body);
    
    const sensitivePatterns = [
      /token/i,
      /secret/i,
      /password/i,
      /service_role/i,
      /key/i,
      /credential/i,
    ];
    
    for (const key of keys) {
      for (const pattern of sensitivePatterns) {
        expect(key).not.toMatch(pattern);
      }
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 7. Cookie domain verification
// ═══════════════════════════════════════════════════════════════════════════════

describe("Cookie domain security", () => {
  it("auth cookie does not expose overly broad domain", () => {
    const authCookie = capturedSetCookies.find(c => 
      /sb-.*-auth-token/.test(c)
    );
    expect(authCookie).toBeDefined();
    
    const parsed = parseCookie(authCookie!);
    
    // If domain is set, it should not be a wildcard or overly broad
    if ("domain" in parsed.flags) {
      const domain = parsed.flags.domain as string;
      expect(domain).not.toBe(".");
      expect(domain).not.toMatch(/^\./); // Should not start with dot (subdomain wildcard)
    }
    // No domain attribute is also fine (defaults to current host)
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 8. Bad signs detection
// ═══════════════════════════════════════════════════════════════════════════════

describe("Security bad signs detection", () => {
  it("cookies are not visible to JavaScript (HttpOnly check)", () => {
    // Already tested in HttpOnly section, but adding explicit documentation
    const authCookie = capturedSetCookies.find(c => 
      /sb-.*-auth-token/.test(c)
    );
    expect(authCookie).toBeDefined();
    
    const parsed = parseCookie(authCookie!);
    expect(parsed.flags.httponly).toBe(true);
  });

  it("no raw tokens in cookie names", () => {
    for (const cookie of capturedSetCookies) {
      const parsed = parseCookie(cookie);
      expect(parsed.name.toLowerCase()).not.toContain("access_token");
      expect(parsed.name.toLowerCase()).not.toContain("refresh_token");
    }
  });

  it("Supabase SSR does not leak server-only secrets", async () => {
    const res = await fetch(`${BASE_URL}/api/auth/session`, {
      headers: { Cookie: getCookieHeader() },
    });
    const text = await res.text();
    
    // Check for common secret patterns
    expect(text).not.toMatch(/sk_live_/); // Stripe secret key pattern
    expect(text).not.toMatch(/service_role/);
    expect(text).not.toMatch(/supabase.*key/i);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 9. Multiple cookies security consistency
// ═══════════════════════════════════════════════════════════════════════════════

describe("Multiple cookies security consistency", () => {
  it("all auth-related cookies have consistent security flags", () => {
    const authCookies = capturedSetCookies.filter(c => 
      /sb-.*-auth/.test(c)
    );
    
    expect(authCookies.length).toBeGreaterThan(0);
    
    for (const cookie of authCookies) {
      const parsed = parseCookie(cookie);
      
      // All should be HttpOnly
      expect(parsed.flags.httponly).toBe(true);
      
      // All should have SameSite
      const sameSite = (parsed.flags.samesite as string)?.toLowerCase();
      expect(["lax", "strict"]).toContain(sameSite);
      
      // All should have Path=/
      expect(parsed.flags.path).toBe("/");
    }
  });
});
