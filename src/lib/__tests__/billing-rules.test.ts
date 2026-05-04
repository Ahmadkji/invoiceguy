import { describe, it, expect } from "vitest";
import {
  getRuleLabel,
  getRuleDescription,
  calculateBilledMinutes,
  formatMinutes,
  formatDecimalHours,
  formatCurrency,
  formatTimeRange,
  calculateAmount,
  getBillingRuleConfig,
} from "@/lib/billing-rules";

// ─── getRuleLabel ────────────────────────────────────────────────────────────

describe("getRuleLabel", () => {
  it("returns labels for all billing rules", () => {
    expect(getRuleLabel("exact")).toBe("Exact time");
    expect(getRuleLabel("round_up_5")).toBe("Round up to 5 min");
    expect(getRuleLabel("round_up_10")).toBe("Round up to 10 min");
    expect(getRuleLabel("round_up_15")).toBe("Round up to 15 min");
    expect(getRuleLabel("round_up_30")).toBe("Round up to 30 min");
    expect(getRuleLabel("round_up_60")).toBe("Round up to 1 hour");
    expect(getRuleLabel("min_15")).toBe("Minimum 15 min");
    expect(getRuleLabel("min_30")).toBe("Minimum 30 min");
  });
});

// ─── getRuleDescription ──────────────────────────────────────────────────────

describe("getRuleDescription", () => {
  it("returns descriptions for all billing rules", () => {
    expect(getRuleDescription("exact")).toBe("Bills the exact time worked");
    expect(getRuleDescription("round_up_5")).toBe("Rounds up to nearest 5 minutes");
    expect(getRuleDescription("round_up_10")).toBe("Rounds up to nearest 10 minutes");
    expect(getRuleDescription("round_up_15")).toBe("Rounds up to nearest 15 minutes");
    expect(getRuleDescription("round_up_30")).toBe("Rounds up to nearest 30 minutes");
    expect(getRuleDescription("round_up_60")).toBe("Rounds up to nearest 1 hour");
    expect(getRuleDescription("min_15")).toBe("Bills at least 15 minutes per entry");
    expect(getRuleDescription("min_30")).toBe("Bills at least 30 minutes per entry");
  });
});

// ─── calculateBilledMinutes ──────────────────────────────────────────────────

describe("calculateBilledMinutes", () => {
  describe("exact", () => {
    it("returns exact minutes", () => {
      expect(calculateBilledMinutes(23, "exact")).toBe(23);
      expect(calculateBilledMinutes(0, "exact")).toBe(0);
      expect(calculateBilledMinutes(120, "exact")).toBe(120);
    });
  });

  describe("round_up_5", () => {
    it("rounds up to nearest 5 minutes", () => {
      expect(calculateBilledMinutes(1, "round_up_5")).toBe(5);
      expect(calculateBilledMinutes(5, "round_up_5")).toBe(5);
      expect(calculateBilledMinutes(6, "round_up_5")).toBe(10);
      expect(calculateBilledMinutes(23, "round_up_5")).toBe(25);
    });

    it("handles exact multiple of 5", () => {
      expect(calculateBilledMinutes(10, "round_up_5")).toBe(10);
      expect(calculateBilledMinutes(60, "round_up_5")).toBe(60);
    });
  });

  describe("round_up_10", () => {
    it("rounds up to nearest 10 minutes", () => {
      expect(calculateBilledMinutes(1, "round_up_10")).toBe(10);
      expect(calculateBilledMinutes(10, "round_up_10")).toBe(10);
      expect(calculateBilledMinutes(11, "round_up_10")).toBe(20);
      expect(calculateBilledMinutes(43, "round_up_10")).toBe(50);
    });
  });

  describe("round_up_15", () => {
    it("rounds up to nearest 15 minutes", () => {
      expect(calculateBilledMinutes(1, "round_up_15")).toBe(15);
      expect(calculateBilledMinutes(15, "round_up_15")).toBe(15);
      expect(calculateBilledMinutes(16, "round_up_15")).toBe(30);
      expect(calculateBilledMinutes(47, "round_up_15")).toBe(60);
    });
  });

  describe("round_up_30", () => {
    it("rounds up to nearest 30 minutes", () => {
      expect(calculateBilledMinutes(1, "round_up_30")).toBe(30);
      expect(calculateBilledMinutes(30, "round_up_30")).toBe(30);
      expect(calculateBilledMinutes(31, "round_up_30")).toBe(60);
      expect(calculateBilledMinutes(75, "round_up_30")).toBe(90);
    });
  });

  describe("round_up_60", () => {
    it("rounds up to nearest 60 minutes", () => {
      expect(calculateBilledMinutes(1, "round_up_60")).toBe(60);
      expect(calculateBilledMinutes(60, "round_up_60")).toBe(60);
      expect(calculateBilledMinutes(61, "round_up_60")).toBe(120);
      expect(calculateBilledMinutes(125, "round_up_60")).toBe(180);
    });
  });

  describe("min_15", () => {
    it("applies minimum 15 minutes", () => {
      expect(calculateBilledMinutes(5, "min_15")).toBe(15);
      expect(calculateBilledMinutes(15, "min_15")).toBe(15);
      expect(calculateBilledMinutes(30, "min_15")).toBe(30);
      expect(calculateBilledMinutes(0, "min_15")).toBe(15);
    });
  });

  describe("min_30", () => {
    it("applies minimum 30 minutes", () => {
      expect(calculateBilledMinutes(5, "min_30")).toBe(30);
      expect(calculateBilledMinutes(15, "min_30")).toBe(30);
      expect(calculateBilledMinutes(30, "min_30")).toBe(30);
      expect(calculateBilledMinutes(45, "min_30")).toBe(45);
    });
  });

  describe("minimumMinutes parameter (project-level override)", () => {
    it("overrides rule minimum with higher project minimum", () => {
      // exact with project minimum of 30 => min 30
      expect(calculateBilledMinutes(10, "exact", 30)).toBe(30);
      expect(calculateBilledMinutes(45, "exact", 30)).toBe(45);
    });

    it("does not lower billed minutes below the rule", () => {
      // min_15 already ensures 15, project min of 5 shouldn't reduce it
      expect(calculateBilledMinutes(5, "min_15", 5)).toBe(15);
    });

    it("ignores null and zero minimumMinutes", () => {
      expect(calculateBilledMinutes(10, "exact", null)).toBe(10);
      expect(calculateBilledMinutes(10, "exact", 0)).toBe(10);
    });

    it("combines round_up with project minimum", () => {
      // round_up_15 of 3 = 15, but project min is 20 => 20
      expect(calculateBilledMinutes(3, "round_up_15", 20)).toBe(20);
    });
  });
});

// ─── formatMinutes ───────────────────────────────────────────────────────────

describe("formatMinutes", () => {
  it("formats minutes only", () => {
    expect(formatMinutes(0)).toBe("0m");
    expect(formatMinutes(5)).toBe("5m");
    expect(formatMinutes(59)).toBe("59m");
  });

  it("formats hours only", () => {
    expect(formatMinutes(60)).toBe("1h");
    expect(formatMinutes(120)).toBe("2h");
    expect(formatMinutes(180)).toBe("3h");
  });

  it("formats hours and minutes", () => {
    expect(formatMinutes(90)).toBe("1h 30m");
    expect(formatMinutes(125)).toBe("2h 5m");
    expect(formatMinutes(145)).toBe("2h 25m");
  });
});

// ─── formatDecimalHours ──────────────────────────────────────────────────────

describe("formatDecimalHours", () => {
  it("converts minutes to decimal hours", () => {
    expect(formatDecimalHours(60)).toBe("1.00");
    expect(formatDecimalHours(30)).toBe("0.50");
    expect(formatDecimalHours(90)).toBe("1.50");
    expect(formatDecimalHours(15)).toBe("0.25");
  });
});

// ─── formatCurrency ──────────────────────────────────────────────────────────

describe("formatCurrency", () => {
  it("formats amount with default $ sign", () => {
    expect(formatCurrency(100.00)).toBe("$100.00");
    expect(formatCurrency(0)).toBe("$0.00");
    expect(formatCurrency(9.99)).toBe("$9.99");
  });

  it("formats with custom currency symbol", () => {
    expect(formatCurrency(100, "€")).toBe("€100.00");
    expect(formatCurrency(50, "£")).toBe("£50.00");
  });

  it("handles NaN with em dash placeholder", () => {
    expect(formatCurrency(NaN)).toBe("$—");
    expect(formatCurrency(Infinity)).toBe("$—");
    expect(formatCurrency(-Infinity)).toBe("$—");
  });
});

// ─── formatTimeRange ─────────────────────────────────────────────────────────

describe("formatTimeRange", () => {
  it("returns empty string if startTime is null", () => {
    expect(formatTimeRange(null, "2024-01-15T14:00:00Z")).toBe("");
  });

  it("returns empty string if endTime is null", () => {
    expect(formatTimeRange("2024-01-15T09:00:00Z", null)).toBe("");
  });

  it("formats a valid time range", () => {
    const result = formatTimeRange("2024-01-15T09:00:00Z", "2024-01-15T17:00:00Z");
    expect(result).toContain("–"); // en dash separator
    expect(result).toMatch(/AM|PM/);
  });
});

// ─── calculateAmount ─────────────────────────────────────────────────────────

describe("calculateAmount", () => {
  it("calculates amount from minutes and hourly rate", () => {
    expect(calculateAmount(60, 100)).toBe(100.00);
    expect(calculateAmount(30, 100)).toBe(50.00);
    expect(calculateAmount(15, 80)).toBe(20.00);
  });

  it("handles zero minutes", () => {
    expect(calculateAmount(0, 100)).toBe(0.00);
  });

  it("rounds to 2 decimal places with cent arithmetic", () => {
    expect(calculateAmount(1, 100)).toBe(1.70); // cent-based: 17 millis * 10000 cents / 1000 = 170 cents = 1.70
  });
});

// ─── getBillingRuleConfig ────────────────────────────────────────────────────

describe("getBillingRuleConfig", () => {
  it("returns correct config for exact", () => {
    expect(getBillingRuleConfig("exact")).toEqual({
      rule: "exact",
      incrementMinutes: null,
      minimumMinutes: null,
    });
  });

  it("returns correct config for round_up_15", () => {
    expect(getBillingRuleConfig("round_up_15")).toEqual({
      rule: "round_up_15",
      incrementMinutes: 15,
      minimumMinutes: null,
    });
  });

  it("returns correct config for round_up_60", () => {
    expect(getBillingRuleConfig("round_up_60")).toEqual({
      rule: "round_up_60",
      incrementMinutes: 60,
      minimumMinutes: null,
    });
  });

  it("returns correct config for min_15", () => {
    expect(getBillingRuleConfig("min_15")).toEqual({
      rule: "min_15",
      incrementMinutes: null,
      minimumMinutes: 15,
    });
  });

  it("returns correct config for min_30", () => {
    expect(getBillingRuleConfig("min_30")).toEqual({
      rule: "min_30",
      incrementMinutes: null,
      minimumMinutes: 30,
    });
  });
});
