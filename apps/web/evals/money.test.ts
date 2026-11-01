import { describe, it, expect } from "vitest";
import {
  money,
  fromMajor,
  add,
  subtract,
  sum,
  multiplyByFraction,
  divideBy,
  isZero,
  largestRemainderSplit,
  formatMoney,
  formatMoneyCompact,
} from "../src/lib/core/money";

/** Deterministic PRNG (mulberry32) so property tests are reproducible. */
function mulberry32(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const amounts = (parts: { amountMinor: number }[]) => parts.map((p) => p.amountMinor);

describe("money()", () => {
  it("creates a Money value in integer minor units", () => {
    expect(money(10_000)).toEqual({ amountMinor: 10_000, currency: "INR" });
  });

  it("defaults the currency to INR and accepts an explicit one", () => {
    expect(money(0).currency).toBe("INR");
    expect(money(500, "USD")).toEqual({ amountMinor: 500, currency: "USD" });
  });

  it("rejects fractional minor units", () => {
    expect(() => money(99.5)).toThrow("Money must be integer minor units, got 99.5");
  });

  it("rejects NaN and Infinity", () => {
    expect(() => money(Number.NaN)).toThrow("integer minor units");
    expect(() => money(Number.POSITIVE_INFINITY)).toThrow("integer minor units");
  });
});

describe("fromMajor()", () => {
  it("converts rupees to paise", () => {
    expect(fromMajor(1234.56)).toEqual({ amountMinor: 123_456, currency: "INR" });
  });

  it("rounds sub-paise values to the nearest paisa", () => {
    expect(fromMajor(10.005).amountMinor).toBe(1001);
    expect(fromMajor(10.004).amountMinor).toBe(1000);
  });
});

describe("add() / subtract() / sum()", () => {
  it("adds and subtracts in minor units", () => {
    expect(add(money(100), money(200))).toEqual(money(300));
    expect(subtract(money(500), money(200))).toEqual(money(300));
    expect(subtract(money(100), money(250))).toEqual(money(-150));
  });

  it("refuses to mix currencies", () => {
    expect(() => add(money(100, "INR"), money(200, "USD"))).toThrow(
      "Currency mismatch: INR vs USD"
    );
    expect(() => subtract(money(100, "INR"), money(200, "USD"))).toThrow(
      "Currency mismatch: INR vs USD"
    );
    expect(() => sum([money(1, "INR"), money(1, "USD")])).toThrow("Currency mismatch");
  });

  it("sums a list, and returns zero in the requested currency for an empty list", () => {
    expect(sum([money(100), money(200), money(300)])).toEqual(money(600));
    expect(sum([], "USD")).toEqual({ amountMinor: 0, currency: "USD" });
  });
});

describe("multiplyByFraction() / divideBy() / isZero()", () => {
  it("floors when multiplying by a fraction (residue is never invented)", () => {
    expect(multiplyByFraction(money(100), 0.33)).toEqual(money(33));
    expect(multiplyByFraction(money(250_000_000), 0.08)).toEqual(money(20_000_000));
  });

  it("rounds to the nearest minor unit when dividing", () => {
    expect(divideBy(money(100), 3)).toEqual(money(33));
    expect(divideBy(money(200), 3)).toEqual(money(67));
  });

  it("refuses to divide by zero", () => {
    expect(() => divideBy(money(100), 0)).toThrow("Division by zero");
  });

  it("detects zero amounts", () => {
    expect(isZero(money(0))).toBe(true);
    expect(isZero(money(1))).toBe(false);
    expect(isZero(money(-1))).toBe(false);
  });
});

describe("largestRemainderSplit()", () => {
  it("splits evenly divisible totals exactly", () => {
    expect(amounts(largestRemainderSplit(money(100), [1, 1, 1, 1]))).toEqual([25, 25, 25, 25]);
  });

  it("gives the residue to the largest fractional parts first", () => {
    // exact: 0, 3.33, 6.67 -> floors 0, 3, 6 -> one unit of residue goes to index 2
    expect(amounts(largestRemainderSplit(money(10), [0, 1, 2]))).toEqual([0, 3, 7]);
  });

  it("breaks ties by input order so the output is deterministic", () => {
    expect(amounts(largestRemainderSplit(money(10), [1, 1, 1]))).toEqual([4, 3, 3]);
    expect(amounts(largestRemainderSplit(money(11), [1, 1, 1]))).toEqual([4, 4, 3]);
  });

  it("returns the whole total for a single weight", () => {
    expect(amounts(largestRemainderSplit(money(99_999), [7]))).toEqual([99_999]);
  });

  it("gives zero-weight entries nothing", () => {
    expect(amounts(largestRemainderSplit(money(100), [0, 1, 1]))).toEqual([0, 50, 50]);
  });

  it("returns an empty list for no weights", () => {
    expect(largestRemainderSplit(money(100), [])).toEqual([]);
  });

  it("rejects weights that do not sum to a positive number", () => {
    expect(() => largestRemainderSplit(money(100), [0, 0])).toThrow(
      "Weights must sum to a positive number"
    );
  });

  it("preserves the input currency", () => {
    expect(largestRemainderSplit(money(1000, "USD"), [50, 50])).toEqual([
      money(500, "USD"),
      money(500, "USD"),
    ]);
  });

  it("handles crore-scale totals without precision loss", () => {
    const total = money(5_00_00_000_00); // ₹5 crore in paise
    const parts = largestRemainderSplit(total, [22, 25, 14, 11, 9, 4, 5, 2, 3, 4, 1]);
    expect(parts.reduce((a, p) => a + p.amountMinor, 0)).toBe(total.amountMinor);
    expect(parts[0]?.amountMinor).toBe(1_10_00_000_00);
  });

  describe("property: 200 seeded random splits", () => {
    const rand = mulberry32(20261101);
    const cases = Array.from({ length: 200 }, (_, i) => {
      const total = Math.floor(rand() * 10_000_000_000);
      const n = 1 + Math.floor(rand() * 12);
      const weights = Array.from({ length: n }, () => Math.round(rand() * 10_000) / 100);
      if (!weights.some((w) => w > 0)) weights[0] = 1;
      return { i, total, weights };
    });

    it.each(cases)(
      "case $i: parts sum to the total, are non-negative, and stay within one unit of the exact share",
      ({ total, weights }) => {
        const parts = amounts(largestRemainderSplit(money(total), weights));
        const weightSum = weights.reduce((a, b) => a + b, 0);

        expect(parts).toHaveLength(weights.length);
        expect(parts.reduce((a, b) => a + b, 0)).toBe(total);
        parts.forEach((part, k) => {
          expect(Number.isInteger(part)).toBe(true);
          expect(part).toBeGreaterThanOrEqual(0);
          const weight = weights[k] ?? Number.NaN;
          expect(Math.abs(part - (total * weight) / weightSum)).toBeLessThan(1);
        });
      }
    );
  });
});

describe("formatMoney()", () => {
  it("formats INR with Indian digit grouping and no decimals", () => {
    expect(formatMoney(money(2_50_000_00))).toBe("₹2,50,000");
  });

  it("formats other currencies in the requested locale", () => {
    expect(formatMoney(money(1_234_500, "USD"), "en-US")).toBe("$12,345");
  });
});

describe("formatMoneyCompact()", () => {
  it("uses crores for ₹1Cr and above", () => {
    expect(formatMoneyCompact(money(1_00_00_000_00))).toBe("₹1Cr");
    expect(formatMoneyCompact(money(2_50_00_000_00))).toBe("₹2.50Cr");
  });

  it("uses lakhs between ₹1L and ₹1Cr", () => {
    expect(formatMoneyCompact(money(1_00_000_00))).toBe("₹1L");
    expect(formatMoneyCompact(money(5_00_000_00))).toBe("₹5L");
    expect(formatMoneyCompact(money(28_40_000_00))).toBe("₹28.4L");
  });

  it("uses thousands between ₹1k and ₹1L", () => {
    expect(formatMoneyCompact(money(5_000_00))).toBe("₹5k");
    expect(formatMoneyCompact(money(1_500_00))).toBe("₹1.5k");
  });

  it("renders amounts under ₹1,000 as whole rupees", () => {
    expect(formatMoneyCompact(money(500_00))).toBe("₹500");
    expect(formatMoneyCompact(money(999_49))).toBe("₹999");
  });

  it("keeps the sign for negative amounts", () => {
    expect(formatMoneyCompact(money(-5_00_000_00))).toBe("₹-5L");
  });

  it("uses Western M/k units for non-INR currencies outside en-IN", () => {
    expect(formatMoneyCompact(money(1_000_000_00, "USD"), "en-US")).toBe("$1.0M");
    expect(formatMoneyCompact(money(1_500_00, "USD"), "en-US")).toBe("$1.5k");
    expect(formatMoneyCompact(money(500_00, "EUR"), "de-DE")).toBe("EUR 500");
  });

  it("always uses Indian units for INR, whatever the locale", () => {
    expect(formatMoneyCompact(money(5_00_000_00), "en-US")).toBe("₹5L");
  });
});
