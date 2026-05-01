import { describe, it, expect } from "vitest";
import {
  asRecord,
  toNumber,
  toInteger,
  toStringValue,
  toNullableString,
  isUuid,
  isIsoDate,
  toCurrencyCents,
  fromCurrencyCents,
  calculateLineAmountCents,
  BILLING_RULES,
} from "@/lib/validation";

// ─── asRecord ───────────────────────────────────────────────────────────────

describe("asRecord", () => {
  it("returns the object as-is for plain objects", () => {
    const obj = { foo: "bar", num: 42 };
    expect(asRecord(obj)).toEqual(obj);
  });

  it("returns empty object for null", () => {
    expect(asRecord(null)).toEqual({});
  });

  it("returns empty object for undefined", () => {
    expect(asRecord(undefined)).toEqual({});
  });

  it("returns empty object for primitive values", () => {
    expect(asRecord("hello")).toEqual({});
    expect(asRecord(123)).toEqual({});
    expect(asRecord(true)).toEqual({});
  });

  it("returns the array as record for arrays", () => {
    expect(asRecord([1, 2, 3])).toEqual([1, 2, 3]);
  });
});

// ─── toNumber ────────────────────────────────────────────────────────────────

describe("toNumber", () => {
  it("returns the number for valid finite numbers", () => {
    expect(toNumber(42)).toBe(42);
    expect(toNumber(0)).toBe(0);
    expect(toNumber(-3.14)).toBe(-3.14);
  });

  it("returns fallback (0) for NaN", () => {
    expect(toNumber(NaN)).toBe(0);
  });

  it("returns fallback for Infinity", () => {
    expect(toNumber(Infinity)).toBe(0);
    expect(toNumber(-Infinity)).toBe(0);
  });

  it("parses numeric strings", () => {
    expect(toNumber("42")).toBe(42);
    expect(toNumber("3.14")).toBe(3.14);
    expect(toNumber("  100  ")).toBe(100);
  });

  it("returns fallback for non-numeric strings", () => {
    expect(toNumber("hello")).toBe(0);
    expect(toNumber("")).toBe(0);
    expect(toNumber("   ")).toBe(0);
  });

  it("returns custom fallback when provided", () => {
    expect(toNumber(NaN, -1)).toBe(-1);
    expect(toNumber("abc", 99)).toBe(99);
  });

  it("returns fallback for boolean values (only numbers and strings are coerced)", () => {
    expect(toNumber(true)).toBe(0);
    expect(toNumber(false)).toBe(0);
    expect(toNumber(true, -1)).toBe(-1);
  });
});

// ─── toInteger ───────────────────────────────────────────────────────────────

describe("toInteger", () => {
  it("returns integer part of number", () => {
    expect(toInteger(42.9)).toBe(42);
    expect(toInteger(3.14)).toBe(3);
    expect(toInteger(-7.5)).toBe(-7);
  });

  it("handles string inputs", () => {
    expect(toInteger("42.9")).toBe(42);
    expect(toInteger("  10  ")).toBe(10);
  });

  it("returns fallback for non-numeric inputs", () => {
    expect(toInteger("abc")).toBe(0);
    expect(toInteger(NaN)).toBe(0);
  });

  it("returns custom fallback", () => {
    expect(toInteger("abc", -1)).toBe(-1);
  });
});

// ─── toStringValue ───────────────────────────────────────────────────────────

describe("toStringValue", () => {
  it("returns string as-is", () => {
    expect(toStringValue("hello")).toBe("hello");
    expect(toStringValue("")).toBe("");
  });

  it("coerces numbers to strings", () => {
    expect(toStringValue(42)).toBe("42");
  });

  it("coerces booleans to strings", () => {
    expect(toStringValue(true)).toBe("true");
    expect(toStringValue(false)).toBe("false");
  });

  it("returns fallback for null and undefined", () => {
    expect(toStringValue(null)).toBe("");
    expect(toStringValue(undefined)).toBe("");
  });

  it("returns custom fallback", () => {
    expect(toStringValue(null, "N/A")).toBe("N/A");
  });
});

// ─── toNullableString ────────────────────────────────────────────────────────

describe("toNullableString", () => {
  it("returns trimmed string for non-empty values", () => {
    expect(toNullableString("hello")).toBe("hello");
    expect(toNullableString("  world  ")).toBe("world");
  });

  it("returns null for null and undefined", () => {
    expect(toNullableString(null)).toBeNull();
    expect(toNullableString(undefined)).toBeNull();
  });

  it("returns null for empty or whitespace strings", () => {
    expect(toNullableString("")).toBeNull();
    expect(toNullableString("   ")).toBeNull();
  });

  it("converts numbers to strings", () => {
    expect(toNullableString(42)).toBe("42");
  });
});

// ─── isUuid ──────────────────────────────────────────────────────────────────

describe("isUuid", () => {
  it("accepts valid UUID v4", () => {
    expect(isUuid("550e8400-e29b-41d4-a716-446655440000")).toBe(true);
  });

  it("accepts valid UUID v1", () => {
    expect(isUuid("6ba7b810-9dad-11d1-80b4-00c04fd430c8")).toBe(true);
  });

  it("rejects invalid UUIDs", () => {
    expect(isUuid("not-a-uuid")).toBe(false);
  });

  it("rejects empty string", () => {
    expect(isUuid("")).toBe(false);
  });

  it("rejects UUID with wrong version digit", () => {
    // Version must be 1-5 in 3rd group first char
    expect(isUuid("550e8400-e29b-61d4-a716-446655440000")).toBe(false);
  });

  it("is case insensitive", () => {
    expect(isUuid("550E8400-E29B-41D4-A716-446655440000")).toBe(true);
  });
});

// ─── isIsoDate ───────────────────────────────────────────────────────────────

describe("isIsoDate", () => {
  it("accepts valid ISO date", () => {
    expect(isIsoDate("2024-01-15")).toBe(true);
    expect(isIsoDate("2024-12-31")).toBe(true);
  });

  it("rejects invalid dates", () => {
    expect(isIsoDate("2024-13-01")).toBe(false); // month 13
    expect(isIsoDate("2024-02-30")).toBe(false); // Feb 30
    expect(isIsoDate("not-a-date")).toBe(false);
  });

  it("rejects non-date formats", () => {
    expect(isIsoDate("2024/01/15")).toBe(false);
    expect(isIsoDate("01-15-2024")).toBe(false);
    expect(isIsoDate("2024-01-15T12:00:00Z")).toBe(false);
  });

  it("rejects empty string", () => {
    expect(isIsoDate("")).toBe(false);
  });
});

// ─── toCurrencyCents ─────────────────────────────────────────────────────────

describe("toCurrencyCents", () => {
  it("converts dollars to cents", () => {
    expect(toCurrencyCents(1.00)).toBe(100);
    expect(toCurrencyCents(10.50)).toBe(1050);
    expect(toCurrencyCents(0.99)).toBe(99);
  });

  it("handles zero", () => {
    expect(toCurrencyCents(0)).toBe(0);
  });

  it("rounds correctly for floating point", () => {
    expect(toCurrencyCents(0.1 + 0.2)).toBe(30); // 0.30000000000000004 -> 30 cents
    expect(toCurrencyCents(19.999)).toBe(2000);
  });

  it("handles negative values", () => {
    expect(toCurrencyCents(-5.00)).toBe(-500);
  });
});

// ─── fromCurrencyCents ───────────────────────────────────────────────────────

describe("fromCurrencyCents", () => {
  it("converts cents to dollars", () => {
    expect(fromCurrencyCents(100)).toBe(1.00);
    expect(fromCurrencyCents(1050)).toBe(10.50);
    expect(fromCurrencyCents(99)).toBe(0.99);
  });

  it("handles zero", () => {
    expect(fromCurrencyCents(0)).toBe(0.00);
  });

  it("handles negative values", () => {
    expect(fromCurrencyCents(-500)).toBe(-5.00);
  });
});

// ─── calculateLineAmountCents ────────────────────────────────────────────────

describe("calculateLineAmountCents", () => {
  it("calculates line amount for hourly billing", () => {
    // 1 hour at $100/hr = $100.00 = 10000 cents
    expect(calculateLineAmountCents(1, 100)).toBe(10000);
  });

  it("calculates fractional hours", () => {
    // 0.5 hours at $100/hr = $50.00 = 5000 cents
    expect(calculateLineAmountCents(0.5, 100)).toBe(5000);
  });

  it("calculates 15-minute increment", () => {
    // 0.25 hours at $80/hr = $20.00 = 2000 cents
    expect(calculateLineAmountCents(0.25, 80)).toBe(2000);
  });

  it("rounds correctly for floating point precision", () => {
    // 1.333 hours at $75/hr = ~$99.975 -> 9998 cents (rounded)
    expect(calculateLineAmountCents(1.333, 75)).toBe(9998);
  });
});

// ─── BILLING_RULES constant ──────────────────────────────────────────────────

describe("BILLING_RULES", () => {
  it("contains all 8 billing rules", () => {
    expect(BILLING_RULES).toHaveLength(8);
    expect(BILLING_RULES).toContain("exact");
    expect(BILLING_RULES).toContain("round_up_5");
    expect(BILLING_RULES).toContain("round_up_10");
    expect(BILLING_RULES).toContain("round_up_15");
    expect(BILLING_RULES).toContain("round_up_30");
    expect(BILLING_RULES).toContain("round_up_60");
    expect(BILLING_RULES).toContain("min_15");
    expect(BILLING_RULES).toContain("min_30");
  });
});
