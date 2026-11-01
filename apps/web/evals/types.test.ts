import { describe, it, expect } from "vitest";
import {
  BudgetPlanSchema,
  CascadeResultSchema,
  ConflictSchema,
  EventBriefSchema,
  MoneySchema,
  RunOfShowItemSchema,
  TimelineTaskSchema,
} from "../src/lib/core/types";

const inr = (amountMinor: number) => ({ amountMinor, currency: "INR" });

describe("MoneySchema", () => {
  it("accepts integer minor units with a 3-letter currency code", () => {
    expect(MoneySchema.parse(inr(12_345))).toEqual(inr(12_345));
  });

  it.each([
    ["fractional minor units", { amountMinor: 1.5, currency: "INR" }],
    ["a 2-letter currency", { amountMinor: 100, currency: "RS" }],
    ["a 4-letter currency", { amountMinor: 100, currency: "INRS" }],
    ["a string amount", { amountMinor: "100", currency: "INR" }],
    ["a missing currency", { amountMinor: 100 }],
  ])("rejects %s", (_label, value) => {
    expect(MoneySchema.safeParse(value).success).toBe(false);
  });
});

describe("EventBriefSchema", () => {
  const minimal = {
    eventFamily: "community",
    eventSubtype: "Ganesh utsav",
    eventDate: "2027-09-04",
    city: "Pune",
    guestCount: 800,
    budget: inr(8_00_000_00),
  };

  it("fills safe defaults for everything the user has not told us", () => {
    expect(EventBriefSchema.parse(minimal)).toEqual({
      ...minimal,
      dateConfidence: "fixed",
      cityTier: "metro",
      budgetFlexibility: "soft",
      communities: [],
      ritualsOptIn: [],
      dietary: [],
      accessibility: [],
      formality: null,
      aestheticTags: [],
      mustHaves: [],
      hardConstraints: [],
      localePack: "in-IN",
      openQuestions: [],
    });
  });

  it("never infers a community: the list stays empty unless the user declares one", () => {
    const brief = EventBriefSchema.parse({
      ...minimal,
      eventSubtype: "Sharma family wedding",
      eventFamily: "wedding",
    });
    expect(brief.communities).toEqual([]);
  });

  it("keeps declared communities, dietary needs and accessibility needs", () => {
    const brief = EventBriefSchema.parse({
      ...minimal,
      communities: ["sikh", "muslim"],
      dietary: ["jain", "halal"],
      accessibility: ["wheelchair access"],
    });
    expect(brief).toMatchObject({
      communities: ["sikh", "muslim"],
      dietary: ["jain", "halal"],
      accessibility: ["wheelchair access"],
    });
  });

  it.each([
    ["every event family", "eventFamily", ["wedding", "birthday_milestone", "community"]],
    ["every city tier", "cityTier", ["metro", "tier1", "tier2", "destination"]],
    ["every date confidence", "dateConfidence", ["fixed", "window", "undecided"]],
    ["every formality", "formality", ["casual", "semi-formal", "formal", "traditional", null]],
  ] as const)("accepts %s", (_label, field, values) => {
    for (const value of values) {
      expect(EventBriefSchema.safeParse({ ...minimal, [field]: value }).success).toBe(true);
    }
  });

  it.each([
    ["an empty subtype", { eventSubtype: "" }],
    ["a date without dashes", { eventDate: "20270904" }],
    ["a date with a time", { eventDate: "2027-09-04T10:00" }],
    ["negative guests", { guestCount: -1 }],
    ["an unknown formality", { formality: "black-tie" }],
    ["communities as a string", { communities: "punjabi" }],
  ])("rejects %s", (_label, override) => {
    expect(EventBriefSchema.safeParse({ ...minimal, ...override }).success).toBe(false);
  });
});

describe("BudgetPlanSchema", () => {
  const plan = {
    total: inr(1_000),
    contingency: inr(80),
    contingencyPct: 0.08,
    lines: [
      {
        category: "venue",
        label: "Venue",
        allocated: inr(920),
        rationale: "100%",
        sourceCitation: null,
      },
    ],
    perHead: inr(92),
    assumptions: [],
  };

  it("accepts a plan and defaults isLocked to false", () => {
    expect(BudgetPlanSchema.parse(plan).lines[0]?.isLocked).toBe(false);
  });

  it("accepts a line without a citation (the guardrail flags it, the schema does not)", () => {
    expect(BudgetPlanSchema.safeParse(plan).success).toBe(true);
  });

  it.each([
    ["contingency under 5%", { contingencyPct: 0.049 }],
    ["no lines", { lines: [] }],
    ["a line with an empty category", { lines: [{ ...plan.lines[0], category: "" }] }],
    ["a fractional per-head", { perHead: inr(92.5) }],
  ])("rejects %s", (_label, override) => {
    expect(BudgetPlanSchema.safeParse({ ...plan, ...override }).success).toBe(false);
  });

  it("accepts contingency at exactly the 5% floor", () => {
    expect(BudgetPlanSchema.safeParse({ ...plan, contingencyPct: 0.05 }).success).toBe(true);
  });
});

describe("TimelineTaskSchema", () => {
  const task = {
    id: "book-venue",
    title: "Book venue",
    category: "venue",
    tMinusDays: 180,
    dueDate: "2026-08-18",
    whyItMatters: "Fixes the date.",
  };

  it("defaults status, priority, dependencies and sub-event", () => {
    expect(TimelineTaskSchema.parse(task)).toMatchObject({
      status: "todo",
      priority: "medium",
      dependsOn: [],
      subEventId: null,
    });
  });

  it.each([
    ["negative tMinusDays", { tMinusDays: -1 }],
    ["an unknown status", { status: "cancelled" }],
    ["a malformed due date", { dueDate: "18/08/2026" }],
  ])("rejects %s", (_label, override) => {
    expect(TimelineTaskSchema.safeParse({ ...task, ...override }).success).toBe(false);
  });
});

describe("RunOfShowItemSchema", () => {
  const base = {
    id: "pheras",
    title: "Pheras",
    startMin: 1005,
    durationMin: 60,
    minDurationMin: 45,
  };

  it("defaults to an unpinned, upcoming item with no vendors or checklist", () => {
    expect(RunOfShowItemSchema.parse(base)).toMatchObject({
      pinned: false,
      pinnedReason: null,
      dependsOn: [],
      vendorLeads: [],
      location: null,
      status: "upcoming",
      tag: null,
      checklist: [],
    });
  });

  it("keeps the reason a pinned item cannot move", () => {
    expect(
      RunOfShowItemSchema.parse({ ...base, pinned: true, pinnedReason: "Muhurat 4:45–6:00 PM" })
    ).toMatchObject({
      pinned: true,
      pinnedReason: "Muhurat 4:45–6:00 PM",
    });
  });

  it("accepts the first and last minute of the day", () => {
    expect(RunOfShowItemSchema.safeParse({ ...base, startMin: 0 }).success).toBe(true);
    expect(RunOfShowItemSchema.safeParse({ ...base, startMin: 1440 }).success).toBe(true);
  });

  it.each([
    ["a start before midnight", { startMin: -1 }],
    ["a start after the end of the day", { startMin: 1441 }],
    ["a fractional start", { startMin: 600.5 }],
    ["a zero duration", { durationMin: 0 }],
    ["a zero minimum duration", { minDurationMin: 0 }],
    ["an unknown status", { status: "delayed" }],
    ["a checklist item without a done flag", { checklist: [{ label: "Garlands" }] }],
  ])("rejects %s", (_label, override) => {
    expect(RunOfShowItemSchema.safeParse({ ...base, ...override }).success).toBe(false);
  });
});

describe("CascadeResultSchema", () => {
  const result = {
    items: [],
    violations: [],
    absorbedMin: 0,
    netDelayMin: -5,
    affectedVendorLeads: [],
    shifted: [],
  };

  it("allows a negative net delay (running early)", () => {
    expect(CascadeResultSchema.safeParse(result).success).toBe(true);
  });

  it("rejects negative absorbed minutes and unknown violation kinds", () => {
    expect(CascadeResultSchema.safeParse({ ...result, absorbedMin: -1 }).success).toBe(false);
    const badViolation = { itemId: "c", itemTitle: "C", kind: "late", overrunMin: 5, message: "x" };
    expect(CascadeResultSchema.safeParse({ ...result, violations: [badViolation] }).success).toBe(
      false
    );
  });
});

describe("ConflictSchema", () => {
  it("defaults refs to an empty list", () => {
    expect(
      ConflictSchema.parse({ kind: "date_in_past", severity: "blocker", message: "Past" }).refs
    ).toEqual([]);
  });

  it("rejects unknown kinds and severities", () => {
    expect(
      ConflictSchema.safeParse({ kind: "weather", severity: "blocker", message: "x" }).success
    ).toBe(false);
    expect(
      ConflictSchema.safeParse({ kind: "date_in_past", severity: "info", message: "x" }).success
    ).toBe(false);
  });
});
