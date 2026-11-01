/**
 * Budget allocator — exact allocations and invariants.
 * Run: npm test  (or: npx vitest run evals/budget.test.ts)
 */

import { describe, it, expect } from "vitest";
import { allocateBudget } from "../src/lib/core/budget";
import { BudgetPlanSchema, EventBriefSchema, type EventBrief } from "../src/lib/core/types";

const TEN_LAKH = 10_00_000_00; // ₹10,00,000 in paise

function makeBrief(overrides: Partial<EventBrief> = {}): EventBrief {
  return EventBriefSchema.parse({
    eventFamily: "wedding",
    eventSubtype: "Punjabi wedding",
    eventDate: "2027-02-14",
    city: "Jaipur",
    cityTier: "metro",
    guestCount: 100,
    budget: { amountMinor: TEN_LAKH, currency: "INR" },
    ...overrides,
  });
}

function allocations(brief: EventBrief): Record<string, number> {
  return Object.fromEntries(
    allocateBudget(brief).lines.map((l) => [l.category, l.allocated.amountMinor])
  );
}

function mulberry32(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe("allocateBudget() — exact splits per event family (₹10L, 8% contingency)", () => {
  it("splits a wedding across 11 categories in locale order", () => {
    expect(allocations(makeBrief())).toEqual({
      venue: 2_02_40_000,
      catering: 2_30_00_000,
      decor: 1_28_80_000,
      photo_video: 1_01_20_000,
      attire_jewellery: 82_80_000,
      beauty_mehndi: 36_80_000,
      entertainment: 46_00_000,
      invites: 18_40_000,
      gifts_favors: 27_60_000,
      transport_stay: 36_80_000,
      priest_rituals: 9_20_000,
    });
  });

  it("splits a milestone birthday across 9 categories, including permits and excluding rituals", () => {
    expect(
      allocations(makeBrief({ eventFamily: "birthday_milestone", eventSubtype: "60th birthday" }))
    ).toEqual({
      venue: 2_57_60_000,
      catering: 2_76_00_000,
      decor: 1_10_40_000,
      photo_video: 55_20_000,
      entertainment: 92_00_000,
      invites: 27_60_000,
      gifts_favors: 46_00_000,
      transport_stay: 27_60_000,
      permits_safety: 27_60_000,
    });
  });

  it("splits a community event across 9 categories", () => {
    expect(
      allocations(makeBrief({ eventFamily: "community", eventSubtype: "Durga puja" }))
    ).toEqual({
      venue: 2_76_00_000,
      catering: 2_94_40_000,
      decor: 1_28_80_000,
      photo_video: 36_80_000,
      entertainment: 73_60_000,
      invites: 18_40_000,
      gifts_favors: 18_40_000,
      transport_stay: 36_80_000,
      permits_safety: 36_80_000,
    });
  });
});

describe("allocateBudget() — contingency and per-head", () => {
  it("reserves exactly 8% contingency by default", () => {
    const plan = allocateBudget(makeBrief());
    expect(plan.contingencyPct).toBe(0.08);
    expect(plan.contingency).toEqual({ amountMinor: 80_00_000, currency: "INR" });
  });

  it("floors contingency on odd totals so paise are never invented", () => {
    const plan = allocateBudget(makeBrief({ budget: { amountMinor: 12_34_567, currency: "INR" } }));
    expect(plan.contingency.amountMinor).toBe(98_765); // floor(1,234,567 × 0.08)
  });

  it("computes per-head on the allocatable amount (total minus contingency)", () => {
    expect(allocateBudget(makeBrief()).perHead.amountMinor).toBe(9_20_000);
    // 25L wedding, 350 guests: 2,30,00,000 / 350 = 65,714.29 -> rounded to the nearest paisa
    const plan = allocateBudget(
      makeBrief({ guestCount: 350, budget: { amountMinor: 25_00_000_00, currency: "INR" } })
    );
    expect(plan.perHead.amountMinor).toBe(6_57_143);
  });

  it("refuses to compute per-head for zero guests", () => {
    // EventBriefSchema rejects this upstream; the allocator still fails loudly if bypassed.
    expect(() => allocateBudget({ ...makeBrief(), guestCount: 0 })).toThrow("Division by zero");
  });
});

describe("allocateBudget() — invariants", () => {
  it("makes lines plus contingency equal the total exactly, even for odd amounts", () => {
    for (const amountMinor of [1, 7, 12_34_567, 99_99_999, TEN_LAKH, 50_00_00_000_00]) {
      const plan = allocateBudget(makeBrief({ budget: { amountMinor, currency: "INR" } }));
      const lines = plan.lines.reduce((acc, l) => acc + l.allocated.amountMinor, 0);
      expect(lines + plan.contingency.amountMinor).toBe(amountMinor);
    }
  });

  describe("property: 150 seeded random briefs", () => {
    const rand = mulberry32(42);
    const families = ["wedding", "birthday_milestone", "community"] as const;
    const tiers = ["metro", "tier1", "tier2", "destination"] as const;
    const cases = Array.from({ length: 150 }, (_, i) => ({
      i,
      eventFamily: families[Math.floor(rand() * families.length)],
      cityTier: tiers[Math.floor(rand() * tiers.length)],
      guestCount: 1 + Math.floor(rand() * 2000),
      amountMinor: 1 + Math.floor(rand() * 1_00_00_00_000_00),
    }));

    it.each(cases)(
      "case $i ($eventFamily, $cityTier): exact sum, 8% floor contingency, non-negative lines",
      ({ eventFamily, cityTier, guestCount, amountMinor }) => {
        const plan = allocateBudget(
          makeBrief({ eventFamily, cityTier, guestCount, budget: { amountMinor, currency: "INR" } })
        );
        const lines = plan.lines.map((l) => l.allocated.amountMinor);
        expect(lines.reduce((a, b) => a + b, 0) + plan.contingency.amountMinor).toBe(amountMinor);
        expect(plan.contingency.amountMinor).toBe(Math.floor(amountMinor * 0.08));
        expect(lines.every((v) => Number.isInteger(v) && v >= 0)).toBe(true);
        expect(BudgetPlanSchema.parse(plan)).toEqual(plan);
      }
    );
  });

  it("is deterministic: the same brief produces a deep-equal plan", () => {
    expect(allocateBudget(makeBrief())).toEqual(allocateBudget(makeBrief()));
  });

  it("keeps the input currency on every figure", () => {
    const plan = allocateBudget(makeBrief({ budget: { amountMinor: TEN_LAKH, currency: "USD" } }));
    const currencies = new Set(
      [plan.total, plan.contingency, plan.perHead, ...plan.lines.map((l) => l.allocated)].map(
        (m) => m.currency
      )
    );
    expect([...currencies]).toEqual(["USD"]);
  });
});

describe("allocateBudget() — explanations and provenance", () => {
  it("explains each line with its weight share", () => {
    const venue = allocateBudget(makeBrief()).lines.find((l) => l.category === "venue");
    expect(venue).toMatchObject({
      label: "Venue & Banquet",
      rationale: "22.0% of allocatable budget (weight 22/100) for wedding",
      isLocked: false,
    });
  });

  it("states its assumptions in plain language", () => {
    expect(allocateBudget(makeBrief()).assumptions).toEqual([
      "Contingency reserved at 8% of total budget",
      "Per-head computed on allocatable amount (total minus contingency) divided by 100 guests",
      'Category weights sourced from in-IN locale pack for "wedding" events',
      "Cost citations based on metro tier pricing",
    ]);
  });

  it("cites a dated benchmark range for every category that has one, and null where none exists", () => {
    const cited = Object.fromEntries(
      allocateBudget(makeBrief()).lines.map((l) => [l.category, l.sourceCitation !== null])
    );
    expect(cited).toEqual({
      venue: true,
      catering: true,
      decor: true,
      photo_video: true,
      beauty_mehndi: true,
      entertainment: true,
      attire_jewellery: false,
      invites: false,
      gifts_favors: false,
      transport_stay: false,
      priest_rituals: false,
    });
  });

  it.each([
    ["metro", "₹1,200–₹3,200 per guest"],
    ["tier1", "₹936–₹2,496 per guest"],
    ["tier2", "₹696–₹1,856 per guest"],
    ["destination", "₹1,740–₹4,640 per guest"],
  ] as const)("prices the catering citation for the %s tier (%s)", (cityTier, range) => {
    const catering = allocateBudget(makeBrief({ cityTier })).lines.find(
      (l) => l.category === "catering"
    );
    expect(catering?.sourceCitation).toBe(
      `${range} · twothetheeexperience benchmark panel, metro banquet caterers (n=140) · as of 2026-09-01`
    );
  });

  it("allocates the same amounts in every city tier (tier only changes the cited price range)", () => {
    const metro = allocations(makeBrief({ cityTier: "metro" }));
    for (const cityTier of ["tier1", "tier2", "destination"] as const) {
      expect(allocations(makeBrief({ cityTier }))).toEqual(metro);
    }
  });
});

describe("EventBriefSchema — rejects invalid briefs before allocation", () => {
  const valid = {
    eventFamily: "wedding",
    eventSubtype: "wedding",
    eventDate: "2027-02-14",
    city: "Jaipur",
    guestCount: 100,
    budget: { amountMinor: TEN_LAKH, currency: "INR" },
  };

  it.each([
    ["negative guests", { guestCount: -5 }],
    ["zero guests", { guestCount: 0 }],
    ["fractional guests", { guestCount: 10.5 }],
    ["fractional paise", { budget: { amountMinor: 100.5, currency: "INR" } }],
    ["a non-ISO date", { eventDate: "14-02-2027" }],
    ["a slash-separated date", { eventDate: "2027/02/14" }],
    ["an unknown event family", { eventFamily: "funeral" }],
    ["an unknown city tier", { cityTier: "village" }],
    ["an empty city", { city: "" }],
  ])("rejects %s", (_label, override) => {
    expect(EventBriefSchema.safeParse({ ...valid, ...override }).success).toBe(false);
  });
});
