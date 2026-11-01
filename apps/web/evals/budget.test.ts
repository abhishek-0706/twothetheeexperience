/**
 * Eval harness — Budget allocator invariants.
 * BUILD_PROMPT.md §9: 100% invariant pass is a hard merge block.
 *
 * Run: npm run evals:fast  (or: npx vitest run --dir evals)
 */

import { describe, it, expect } from "vitest";
import { allocateBudget } from "../src/lib/core/budget";
import type { EventBrief } from "../src/lib/core/types";

function makeBrief(overrides: Partial<EventBrief> = {}): EventBrief {
  return {
    eventFamily: "wedding",
    eventSubtype: "wedding",
    eventDate: "2027-02-14",
    dateConfidence: "fixed",
    city: "Jaipur",
    cityTier: "tier1",
    guestCount: 350,
    budget: { amountMinor: 2500000_00, currency: "INR" },
    budgetFlexibility: "soft",
    communities: ["punjabi"],
    ritualsOptIn: [],
    dietary: [],
    accessibility: [],
    formality: "traditional",
    aestheticTags: [],
    mustHaves: [],
    hardConstraints: [],
    localePack: "in-IN",
    openQuestions: [],
    ...overrides,
  };
}

describe("Budget Allocator — Invariants", () => {
  it("lines + contingency sum equals total within ±1 minor unit", () => {
    const brief = makeBrief();
    const plan = allocateBudget(brief);
    const linesSum = plan.lines.reduce((acc, l) => acc + l.allocated.amountMinor, 0);
    const diff = Math.abs(plan.total.amountMinor - (linesSum + plan.contingency.amountMinor));
    expect(diff).toBeLessThanOrEqual(1);
  });

  it("contingency is at least 5%", () => {
    const plan = allocateBudget(makeBrief());
    expect(plan.contingencyPct).toBeGreaterThanOrEqual(0.05);
  });

  it("every line has a rationale", () => {
    const plan = allocateBudget(makeBrief());
    for (const line of plan.lines) {
      expect(line.rationale).toBeTruthy();
    }
  });

  it("perHead is (total - contingency) / guestCount", () => {
    const brief = makeBrief({ guestCount: 200 });
    const plan = allocateBudget(brief);
    const expected = Math.round((plan.total.amountMinor - plan.contingency.amountMinor) / 200);
    const diff = Math.abs(plan.perHead.amountMinor - expected);
    expect(diff).toBeLessThanOrEqual(1);
  });

  it("works for birthday events (different category set)", () => {
    const brief = makeBrief({ eventFamily: "birthday_milestone", eventSubtype: "1st birthday", guestCount: 80, budget: { amountMinor: 300000_00, currency: "INR" } });
    const plan = allocateBudget(brief);
    const linesSum = plan.lines.reduce((acc, l) => acc + l.allocated.amountMinor, 0);
    const diff = Math.abs(plan.total.amountMinor - (linesSum + plan.contingency.amountMinor));
    expect(diff).toBeLessThanOrEqual(1);
    expect(plan.lines.length).toBeGreaterThan(0);
  });

  it("works for community events", () => {
    const brief = makeBrief({ eventFamily: "community", eventSubtype: "ganesh puja", guestCount: 500, budget: { amountMinor: 500000_00, currency: "INR" } });
    const plan = allocateBudget(brief);
    const linesSum = plan.lines.reduce((acc, l) => acc + l.allocated.amountMinor, 0);
    const diff = Math.abs(plan.total.amountMinor - (linesSum + plan.contingency.amountMinor));
    expect(diff).toBeLessThanOrEqual(1);
  });

  it("handles a very small budget (edge case)", () => {
    const brief = makeBrief({ guestCount: 20, budget: { amountMinor: 100000_00, currency: "INR" } });
    const plan = allocateBudget(brief);
    const linesSum = plan.lines.reduce((acc, l) => acc + l.allocated.amountMinor, 0);
    const diff = Math.abs(plan.total.amountMinor - (linesSum + plan.contingency.amountMinor));
    expect(diff).toBeLessThanOrEqual(1);
  });

  it("handles a very large budget", () => {
    const brief = makeBrief({ guestCount: 1000, budget: { amountMinor: 10000000_00, currency: "INR" } });
    const plan = allocateBudget(brief);
    const linesSum = plan.lines.reduce((acc, l) => acc + l.allocated.amountMinor, 0);
    const diff = Math.abs(plan.total.amountMinor - (linesSum + plan.contingency.amountMinor));
    expect(diff).toBeLessThanOrEqual(1);
  });
});
