import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { generateTimeline } from "../src/lib/core/timeline";
import { EventBriefSchema, TimelineTaskSchema, type EventBrief } from "../src/lib/core/types";
import { TASK_TEMPLATES } from "../src/lib/locale/in-IN";

function makeBrief(overrides: Partial<EventBrief> = {}): EventBrief {
  return EventBriefSchema.parse({
    eventFamily: "wedding",
    eventSubtype: "Punjabi wedding",
    eventDate: "2027-02-14",
    city: "Jaipur",
    cityTier: "tier1",
    guestCount: 350,
    budget: { amountMinor: 25_00_000_00, currency: "INR" },
    ...overrides,
  });
}

/** Calendar-day subtraction in UTC, independent of the code under test. */
function minusDays(iso: string, days: number): string {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

function freezeToday(year: number, monthIndex: number, day: number): void {
  vi.setSystemTime(new Date(year, monthIndex, day, 12, 0, 0));
}

const WEDDING_ORDER = [
  "set-budget",
  "guest-list-v1",
  "shortlist-venue",
  "book-venue",
  "book-photo",
  "book-caterer",
  "book-decor",
  "invites-design",
  "book-pandit",
  "book-entertainment",
  "book-makeup",
  "send-invites",
  "transport-stay",
  "menu-final",
  "rsvp-chase",
  "run-of-show",
  "final-payments",
];
const BIRTHDAY_ORDER = [
  "set-budget",
  "guest-list-v1",
  "shortlist-venue",
  "book-venue",
  "book-photo",
  "book-caterer",
  "book-decor",
  "invites-design",
  "book-entertainment",
  "permits",
  "send-invites",
  "menu-final",
  "rsvp-chase",
  "run-of-show",
  "final-payments",
];
const COMMUNITY_ORDER = [
  "set-budget",
  "guest-list-v1",
  "shortlist-venue",
  "book-venue",
  "book-caterer",
  "book-decor",
  "invites-design",
  "book-entertainment",
  "permits",
  "send-invites",
  "transport-stay",
  "menu-final",
  "rsvp-chase",
  "run-of-show",
  "final-payments",
];

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  freezeToday(2026, 0, 1); // 2026-01-01: every template for a Feb-2027 event is still ahead
});

afterEach(() => {
  vi.useRealTimers();
});

describe("generateTimeline() — template selection per event family", () => {
  it("returns all 17 wedding tasks in due-date order", () => {
    expect(generateTimeline(makeBrief()).map((t) => t.id)).toEqual(WEDDING_ORDER);
  });

  it("returns all 15 birthday tasks, including permits and excluding pandit, makeup and guest stay", () => {
    const brief = makeBrief({ eventFamily: "birthday_milestone", eventSubtype: "60th birthday" });
    expect(generateTimeline(brief).map((t) => t.id)).toEqual(BIRTHDAY_ORDER);
  });

  it("returns all 15 community-event tasks, including permits and guest transport", () => {
    const brief = makeBrief({ eventFamily: "community", eventSubtype: "Ganesh utsav" });
    expect(generateTimeline(brief).map((t) => t.id)).toEqual(COMMUNITY_ORDER);
  });
});

describe("generateTimeline() — due-date arithmetic", () => {
  it("sets every due date to exactly tMinusDays before the event", () => {
    const tasks = generateTimeline(makeBrief());
    for (const t of tasks) {
      expect(t.dueDate).toBe(minusDays("2027-02-14", t.tMinusDays));
    }
  });

  it("anchors the first and last wedding tasks to the expected calendar dates", () => {
    const tasks = generateTimeline(makeBrief());
    expect(tasks[0]).toMatchObject({ id: "set-budget", tMinusDays: 240, dueDate: "2026-06-19" });
    expect(tasks.at(-1)).toMatchObject({
      id: "final-payments",
      tMinusDays: 7,
      dueDate: "2027-02-07",
    });
  });

  it("handles leap years when counting back across February", () => {
    const leap = generateTimeline(makeBrief({ eventDate: "2028-03-01" }));
    const nonLeap = generateTimeline(makeBrief({ eventDate: "2027-03-01" }));
    expect(leap.find((t) => t.id === "final-payments")?.dueDate).toBe("2028-02-23");
    expect(nonLeap.find((t) => t.id === "final-payments")?.dueDate).toBe("2027-02-22");
  });

  it("lists tasks in strictly ascending due-date order", () => {
    const dates = generateTimeline(makeBrief()).map((t) => t.dueDate);
    expect(dates).toEqual([...dates].sort());
    expect(new Set(dates).size).toBe(dates.length);
  });
});

describe("generateTimeline() — tasks already overdue", () => {
  it("drops tasks whose due date has passed and keeps the rest", () => {
    freezeToday(2026, 10, 1); // 2026-11-01, 105 days before the event
    expect(generateTimeline(makeBrief()).map((t) => t.id)).toEqual([
      "book-pandit",
      "book-entertainment",
      "book-makeup",
      "send-invites",
      "transport-stay",
      "menu-final",
      "rsvp-chase",
      "run-of-show",
      "final-payments",
    ]);
  });

  it("keeps a task that is due today", () => {
    freezeToday(2026, 10, 1);
    const tasks = generateTimeline(makeBrief({ eventDate: "2026-11-08" }));
    expect(tasks.map((t) => [t.id, t.dueDate])).toEqual([["final-payments", "2026-11-01"]]);
  });

  it("returns no tasks when the event is less than a week away", () => {
    freezeToday(2026, 10, 1);
    expect(generateTimeline(makeBrief({ eventDate: "2026-11-07" }))).toEqual([]);
  });

  it("accepts an explicit 'today' instead of reading the clock", () => {
    const tasks = generateTimeline(makeBrief(), "2027-01-31"); // run-of-show is due exactly then
    expect(tasks.map((t) => t.id)).toEqual(["run-of-show", "final-payments"]);
  });

  it("returns no tasks for an event that has already happened", () => {
    freezeToday(2026, 10, 1);
    expect(generateTimeline(makeBrief({ eventDate: "2026-10-01" }))).toEqual([]);
  });
});

describe("generateTimeline() — task content and dependencies", () => {
  it("emits schema-valid tasks that copy their template fields", () => {
    for (const task of generateTimeline(makeBrief())) {
      const template = TASK_TEMPLATES.find((t) => t.id === task.id);
      if (!template) throw new Error(`No template for task "${task.id}"`);
      expect(TimelineTaskSchema.parse(task)).toEqual(task);
      expect(task).toMatchObject({
        title: template.title,
        category: template.category,
        priority: template.priority,
        dependsOn: template.dependsOn,
        whyItMatters: template.whyItMatters,
        status: "todo",
        subEventId: null,
      });
    }
  });

  it.each([
    ["wedding", "Punjabi wedding"],
    ["birthday_milestone", "60th birthday"],
  ] as const)(
    "resolves every dependency inside a full %s timeline",
    (eventFamily, eventSubtype) => {
      const tasks = generateTimeline(makeBrief({ eventFamily, eventSubtype }));
      const byId = new Map(tasks.map((t) => [t.id, t]));
      for (const task of tasks) {
        for (const dep of task.dependsOn) {
          expect(byId.has(dep)).toBe(true);
          expect((byId.get(dep)?.dueDate ?? "") < task.dueDate).toBe(true);
        }
      }
    }
  );

  it("is deterministic: the same brief produces the same timeline", () => {
    expect(generateTimeline(makeBrief())).toEqual(generateTimeline(makeBrief()));
  });
});
