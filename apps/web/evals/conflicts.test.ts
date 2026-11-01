import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { detectConflicts } from "../src/lib/core/conflicts";
import { allocateBudget } from "../src/lib/core/budget";
import { generateTimeline } from "../src/lib/core/timeline";
import {
  ConflictSchema,
  EventBriefSchema,
  TimelineTaskSchema,
  type BudgetPlan,
  type EventBrief,
  type TimelineTask,
} from "../src/lib/core/types";

// Every test runs as if today were 2026-11-01 so date-based checks never rot.
const TODAY = "2026-11-01";

function makeBrief(overrides: Partial<EventBrief> = {}): EventBrief {
  return EventBriefSchema.parse({
    eventFamily: "wedding",
    eventSubtype: "Punjabi wedding",
    eventDate: "2027-12-12",
    city: "Jaipur",
    cityTier: "tier1",
    guestCount: 350,
    budget: { amountMinor: 25_00_000_00, currency: "INR" },
    ...overrides,
  });
}

function run(
  brief: EventBrief,
  budgetOverride?: (b: BudgetPlan) => BudgetPlan,
  tasks?: TimelineTask[]
) {
  const budget = allocateBudget(brief);
  return detectConflicts(
    brief,
    budgetOverride ? budgetOverride(budget) : budget,
    tasks ?? generateTimeline(brief)
  );
}

const kinds = (conflicts: { kind: string }[]) => conflicts.map((c) => c.kind);

function task(id: string, dependsOn: string[]): TimelineTask {
  return TimelineTaskSchema.parse({
    id,
    title: `Task ${id}`,
    category: "venue",
    tMinusDays: 100,
    dueDate: "2027-09-03",
    dependsOn,
    whyItMatters: "test fixture",
  });
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 10, 1, 12, 0, 0));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("detectConflicts() — healthy plan", () => {
  it("returns no conflicts for a well-formed, well-funded plan", () => {
    expect(run(makeBrief())).toEqual([]);
  });
});

describe("detectConflicts() — budget_overallocated", () => {
  const shiftFirstLine =
    (delta: number) =>
    (b: BudgetPlan): BudgetPlan => ({
      ...b,
      lines: b.lines.map((l, i) =>
        i === 0
          ? { ...l, allocated: { ...l.allocated, amountMinor: l.allocated.amountMinor + delta } }
          : l
      ),
    });

  it("blocks when budget lines drift from the allocatable amount", () => {
    const conflicts = run(makeBrief(), shiftFirstLine(1000));
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]).toMatchObject({
      kind: "budget_overallocated",
      severity: "blocker",
      refs: ["budget.lines", "budget.total"],
    });
    expect(conflicts[0]?.message).toContain("(drift: 1000)");
  });

  it("tolerates a drift of exactly one minor unit", () => {
    expect(kinds(run(makeBrief(), shiftFirstLine(1)))).toEqual([]);
  });

  it("flags a drift of two minor units, in either direction", () => {
    expect(kinds(run(makeBrief(), shiftFirstLine(2)))).toEqual(["budget_overallocated"]);
    expect(kinds(run(makeBrief(), shiftFirstLine(-2)))).toEqual(["budget_overallocated"]);
  });
});

describe("detectConflicts() — budget_unrealistic_per_head", () => {
  it("warns with the per-head and catering-floor figures in rupees", () => {
    const brief = makeBrief({
      guestCount: 500,
      budget: { amountMinor: 1_00_000_00, currency: "INR" },
    });
    expect(run(brief)).toEqual([
      {
        kind: "budget_unrealistic_per_head",
        severity: "warning",
        message: "Per-head budget of Rs 184 is below the catering floor of Rs 936 for tier1 tier",
        refs: ["budget.perHead", "catering cost band"],
      },
    ]);
  });

  it("does not warn when per-head equals the tier floor exactly", () => {
    const atFloor = (b: BudgetPlan): BudgetPlan => ({
      ...b,
      perHead: { ...b.perHead, amountMinor: 93_600 },
    });
    expect(kinds(run(makeBrief(), atFloor))).toEqual([]);
  });

  it("warns one paisa below the tier floor", () => {
    const belowFloor = (b: BudgetPlan): BudgetPlan => ({
      ...b,
      perHead: { ...b.perHead, amountMinor: 93_599 },
    });
    expect(kinds(run(makeBrief(), belowFloor))).toEqual(["budget_unrealistic_per_head"]);
  });

  it("uses the floor for the brief's city tier", () => {
    // ₹700/head clears the tier2 floor (₹696) but not the metro floor (₹1,200).
    const perHead700 = (b: BudgetPlan): BudgetPlan => ({
      ...b,
      perHead: { ...b.perHead, amountMinor: 70_000 },
    });
    expect(kinds(run(makeBrief({ cityTier: "tier2" }), perHead700))).toEqual([]);
    expect(kinds(run(makeBrief({ cityTier: "metro" }), perHead700))).toEqual([
      "budget_unrealistic_per_head",
    ]);
  });
});

describe("detectConflicts() — date_in_past", () => {
  it("blocks an event dated yesterday and names today's date", () => {
    expect(run(makeBrief({ eventDate: "2026-10-31" }))).toEqual([
      {
        kind: "date_in_past",
        severity: "blocker",
        message: `Event date 2026-10-31 is in the past (today: ${TODAY})`,
        refs: ["brief.eventDate"],
      },
    ]);
  });

  it("does not treat an event today as past", () => {
    expect(kinds(run(makeBrief({ eventDate: TODAY })))).not.toContain("date_in_past");
  });
});

describe("detectConflicts() — lead_time_too_short", () => {
  it("warns when a wedding is 15 days away", () => {
    expect(run(makeBrief({ eventDate: "2026-11-16" }))).toEqual([
      {
        kind: "lead_time_too_short",
        severity: "warning",
        message: "Only 15 days until the wedding; minimum recommended lead time is 30 days",
        refs: ["brief.eventDate", "brief.eventFamily"],
      },
    ]);
  });

  it("warns at 29 days and at 0 days, but not at 30 days", () => {
    expect(kinds(run(makeBrief({ eventDate: "2026-11-30" })))).toEqual(["lead_time_too_short"]);
    expect(kinds(run(makeBrief({ eventDate: TODAY })))).toEqual(["lead_time_too_short"]);
    expect(kinds(run(makeBrief({ eventDate: "2026-12-01" })))).toEqual([]);
  });

  it("only applies to weddings", () => {
    const soon = { eventDate: "2026-11-16" };
    expect(
      kinds(
        run(makeBrief({ ...soon, eventFamily: "birthday_milestone", eventSubtype: "1st birthday" }))
      )
    ).toEqual([]);
    expect(
      kinds(run(makeBrief({ ...soon, eventFamily: "community", eventSubtype: "Durga puja" })))
    ).toEqual([]);
  });
});

describe("detectConflicts() — dependency_cycle", () => {
  it("blocks a two-task cycle and references both tasks", () => {
    const conflicts = run(makeBrief(), undefined, [task("a", ["b"]), task("b", ["a"])]);
    expect(conflicts).toEqual([
      {
        kind: "dependency_cycle",
        severity: "blocker",
        message: "Dependency cycle detected among tasks: a, b",
        refs: ["task:a", "task:b"],
      },
    ]);
  });

  it("blocks a task that depends on itself", () => {
    expect(run(makeBrief(), undefined, [task("a", ["a"])])[0]?.refs).toEqual(["task:a"]);
  });

  it("ignores dependencies on tasks outside the list", () => {
    expect(run(makeBrief(), undefined, [task("a", ["not-in-list"]), task("b", ["a"])])).toEqual([]);
  });

  it("accepts the generated wedding timeline as a valid DAG", () => {
    expect(kinds(run(makeBrief()))).not.toContain("dependency_cycle");
  });
});

describe("detectConflicts() — capacity_exceeded", () => {
  it.each([
    ["metro", 1500],
    ["tier1", 1000],
    ["tier2", 600],
    ["destination", 300],
  ] as const)(
    "allows exactly the %s cap of %i guests and warns one guest above it",
    (cityTier, cap) => {
      const generous = { amountMinor: 50_00_00_000_00, currency: "INR" };
      expect(kinds(run(makeBrief({ cityTier, guestCount: cap, budget: generous })))).toEqual([]);
      const over = run(makeBrief({ cityTier, guestCount: cap + 1, budget: generous }));
      expect(over).toEqual([
        {
          kind: "capacity_exceeded",
          severity: "warning",
          message: `Guest count of ${cap + 1} exceeds typical ${cityTier} venue capacity of ${cap}`,
          refs: ["brief.guestCount", "brief.cityTier"],
        },
      ]);
    }
  );
});

describe("detectConflicts() — combined", () => {
  it("reports every applicable conflict in check order, all schema-valid", () => {
    const brief = makeBrief({
      eventDate: "2026-10-31",
      cityTier: "tier2",
      guestCount: 700,
      budget: { amountMinor: 1_00_000_00, currency: "INR" },
    });
    const conflicts = run(brief);
    expect(kinds(conflicts)).toEqual([
      "budget_unrealistic_per_head",
      "date_in_past",
      "capacity_exceeded",
    ]);
    for (const c of conflicts) expect(ConflictSchema.parse(c)).toEqual(c);
  });
});
