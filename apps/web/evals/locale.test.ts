import { describe, it, expect } from "vitest";
import {
  CATEGORIES,
  LOCALE_IN_IN,
  SUB_EVENTS,
  TASK_TEMPLATES,
  citationFor,
  costBandFor,
  subEventsFor,
} from "../src/lib/locale/in-IN";

const FAMILIES = ["wedding", "birthday_milestone", "community"] as const;

describe("LOCALE_IN_IN", () => {
  it("declares INR, Indian number formatting, and an 8% default contingency", () => {
    expect(LOCALE_IN_IN).toMatchObject({
      id: "in-IN",
      currency: "INR",
      numberLocale: "en-IN",
      contingencyPctDefault: 0.08,
    });
  });
});

describe("CATEGORIES", () => {
  it("has unique category keys", () => {
    const keys = CATEGORIES.map((c) => c.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it.each(FAMILIES)("weights for %s are positive and sum to 100", (family) => {
    const weights = CATEGORIES.map((c) => c.weights[family]).filter(
      (w): w is number => w !== undefined
    );
    expect(weights.length).toBeGreaterThanOrEqual(9);
    expect(weights.every((w) => w > 0)).toBe(true);
    expect(weights.reduce((a, b) => a + b, 0)).toBe(100);
  });

  it("only budgets ritual, attire and makeup lines for weddings", () => {
    const weddingOnly = CATEGORIES.filter((c) => Object.keys(c.weights).join() === "wedding").map(
      (c) => c.key
    );
    expect(weddingOnly).toEqual(["attire_jewellery", "beauty_mehndi", "priest_rituals"]);
  });

  it("gives every category a label and an icon", () => {
    for (const c of CATEGORIES) {
      expect(c.label.length).toBeGreaterThan(0);
      expect(c.icon).toMatch(/^[a-z_]+$/);
    }
  });
});

describe("costBandFor()", () => {
  it("returns the metro base band unchanged", () => {
    expect(costBandFor("catering", "metro")).toEqual({
      category: "catering",
      basis: "per_head",
      lowMinor: 120_000,
      highMinor: 320_000,
      sourcedOn: "2026-09-01",
      source: "twothetheeexperience benchmark panel, metro banquet caterers (n=140)",
    });
  });

  it.each([
    ["tier1", 93_600, 249_600],
    ["tier2", 69_600, 185_600],
    ["destination", 174_000, 464_000],
  ] as const)("scales the %s band by its tier multiplier", (tier, low, high) => {
    expect(costBandFor("catering", tier)).toMatchObject({ lowMinor: low, highMinor: high });
  });

  it("keeps every scaled band an integer range with low ≤ high", () => {
    for (const { key } of CATEGORIES) {
      for (const tier of ["metro", "tier1", "tier2", "destination"] as const) {
        const band = costBandFor(key, tier);
        if (!band) continue;
        expect(Number.isInteger(band.lowMinor) && Number.isInteger(band.highMinor)).toBe(true);
        expect(band.lowMinor).toBeLessThanOrEqual(band.highMinor);
      }
    }
  });

  it("returns null for a category without benchmark data", () => {
    expect(costBandFor("attire_jewellery", "metro")).toBeNull();
    expect(costBandFor("unknown", "metro")).toBeNull();
  });
});

describe("citationFor()", () => {
  it("formats a per-guest range with source and date", () => {
    expect(citationFor("catering", "metro")).toBe(
      "₹1,200–₹3,200 per guest · twothetheeexperience benchmark panel, metro banquet caterers (n=140) · as of 2026-09-01"
    );
  });

  it("formats a flat range in Indian digit grouping without 'per guest'", () => {
    expect(citationFor("venue", "metro")).toBe(
      "₹35,000–₹1,80,000 · twothetheeexperience benchmark panel, metro banquet venues (n=96) · as of 2026-09-01"
    );
  });

  it("reflects the tier multiplier in the cited range", () => {
    expect(citationFor("venue", "tier1")).toMatch(/^₹27,300–₹1,40,400 · /);
  });

  it("returns null when there is no band to cite", () => {
    expect(citationFor("invites", "metro")).toBeNull();
  });
});

describe("subEventsFor()", () => {
  const keys = (communities: string[]) => subEventsFor(communities).map((s) => s.key);

  it.each([
    [["punjabi"], ["roka", "mehndi", "haldi", "sangeet", "baraat", "pheras", "reception"]],
    [["muslim"], ["mehndi", "nikah", "reception"]],
    [["sikh"], ["anand_karaj", "reception"]],
    [["south-indian"], ["haldi", "muhurtam", "reception"]],
  ])("returns the ceremonies for %j in calendar order", (communities, expected) => {
    expect(keys(communities)).toEqual(expected);
  });

  it("falls back to a ceremony and reception when no community is declared", () => {
    expect(keys([])).toEqual(["pheras", "reception"]);
  });

  it("matches communities case-insensitively", () => {
    expect(keys(["Punjabi"])).toEqual(keys(["punjabi"]));
  });

  it("merges ceremonies for interfaith or multi-community weddings without duplicates", () => {
    expect(keys(["sikh", "muslim"])).toEqual(["mehndi", "nikah", "anand_karaj", "reception"]);
  });

  it("offers the reception for any declared community", () => {
    expect(keys(["parsi"])).toEqual(["reception"]);
  });

  it("schedules every sub-event on or before the main day", () => {
    expect(SUB_EVENTS.every((s) => s.dayOffset >= 0)).toBe(true);
  });
});

describe("TASK_TEMPLATES", () => {
  const ids = new Set(TASK_TEMPLATES.map((t) => t.id));

  it("has unique ids and covers at least one event family each", () => {
    expect(ids.size).toBe(TASK_TEMPLATES.length);
    expect(TASK_TEMPLATES.every((t) => t.families.length > 0)).toBe(true);
  });

  it("only depends on templates that exist", () => {
    for (const t of TASK_TEMPLATES) {
      for (const dep of t.dependsOn) expect(ids.has(dep)).toBe(true);
    }
  });

  it("always schedules a dependency before the task that needs it", () => {
    const tMinus = new Map(TASK_TEMPLATES.map((t) => [t.id, t.tMinusDays]));
    for (const t of TASK_TEMPLATES) {
      for (const dep of t.dependsOn) expect(tMinus.get(dep) ?? -1).toBeGreaterThan(t.tMinusDays);
    }
  });

  it("explains why every task matters", () => {
    expect(TASK_TEMPLATES.every((t) => t.whyItMatters.length > 20)).toBe(true);
  });
});
