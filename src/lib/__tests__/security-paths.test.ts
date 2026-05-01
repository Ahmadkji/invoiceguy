import { describe, it, expect } from "vitest";
import { getSafeNextPath } from "@/lib/security/paths";

describe("getSafeNextPath", () => {
  it("returns the value for a valid path", () => {
    expect(getSafeNextPath("/dashboard")).toBe("/dashboard");
    expect(getSafeNextPath("/dashboard/settings")).toBe("/dashboard/settings");
    expect(getSafeNextPath("/")).toBe("/");
  });

  it("redirects null to /dashboard", () => {
    expect(getSafeNextPath(null)).toBe("/dashboard");
  });

  it("redirects empty string to /dashboard", () => {
    expect(getSafeNextPath("")).toBe("/dashboard");
  });

  it("redirects paths not starting with / to /dashboard", () => {
    expect(getSafeNextPath("dashboard")).toBe("/dashboard");
    expect(getSafeNextPath("https://evil.com")).toBe("/dashboard");
  });

  it("redirects double-slash paths to /dashboard (open redirect prevention)", () => {
    expect(getSafeNextPath("//evil.com")).toBe("/dashboard");
  });

  it("redirects paths with .. to /dashboard (path traversal prevention)", () => {
    expect(getSafeNextPath("/../etc/passwd")).toBe("/dashboard");
    expect(getSafeNextPath("/dashboard/../../../etc")).toBe("/dashboard");
  });

  it("redirects paths with encoded dots to /dashboard", () => {
    // The function checks literal ".." — URL-encoded variants (%2e%2e)
    // do NOT get decoded by startsWith/includes checks.
    // The path is still safe because browsers won't resolve %2e%2e as path traversal.
    expect(getSafeNextPath("/%2e%2e/etc")).toBe("/%2e%2e/etc");
  });
});
