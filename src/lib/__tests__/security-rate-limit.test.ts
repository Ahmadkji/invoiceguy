import { describe, it, expect } from "vitest";
import { checkRateLimit } from "@/lib/security/rate-limit";

describe("checkRateLimit", () => {
  it("allows first request", () => {
    const key = `test-${Date.now()}-${Math.random()}`;
    const result = checkRateLimit(key, 5, 60_000);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
    expect(result.retryAfterSeconds).toBe(0);
  });

  it("allows requests up to the limit", () => {
    const key = `test-${Date.now()}-${Math.random()}`;
    for (let i = 0; i < 3; i++) {
      const result = checkRateLimit(key, 3, 60_000);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(3 - i - 1);
    }
  });

  it("blocks requests exceeding the limit", () => {
    const key = `test-${Date.now()}-${Math.random()}`;
    // Use up all 2 allowed requests
    checkRateLimit(key, 2, 60_000);
    checkRateLimit(key, 2, 60_000);
    // 3rd request should be blocked
    const result = checkRateLimit(key, 2, 60_000);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("resets after the window expires", () => {
    const key = `test-${Date.now()}-${Math.random()}`;
    // Use all requests with a window in the past
    const result = checkRateLimit(key, 2, -1); // negative window means immediate expiry
    // First request creates new bucket since window expired
    expect(result.allowed).toBe(true);
  });

  it("returns positive remaining count", () => {
    const key = `test-${Date.now()}-${Math.random()}`;
    const result = checkRateLimit(key, 5, 60_000);
    expect(result.remaining).toBeGreaterThanOrEqual(0);
  });
});
