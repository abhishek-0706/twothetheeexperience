import type { EventBrief, BudgetPlan, TimelineTask, Conflict } from "./types";
import { ConflictSchema } from "./types";
import { sum } from "./money";
import { costBandFor, type CityTier } from "../locale/in-IN";

const MS_PER_DAY = 86_400_000;
const MIN_WEDDING_LEAD_DAYS = 30;
const MAX_DRIFT_MINOR = 1;

/** Typical largest venue capacity by city tier (guests). */
const TYPICAL_CAPACITY: Record<CityTier, number> = {
  metro: 1500,
  tier1: 1000,
  tier2: 600,
  destination: 300,
};

function localISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function daysBetween(fromISO: string, toISO: string): number {
  const from = new Date(`${fromISO}T00:00:00`).getTime();
  const to = new Date(`${toISO}T00:00:00`).getTime();
  return Math.round((to - from) / MS_PER_DAY);
}

/** Kahn's algorithm: returns the IDs left with unmet dependencies, i.e. those in a cycle. */
function findCycles(tasks: TimelineTask[]): string[] {
  const inDegree = new Map<string, number>(tasks.map((t) => [t.id, 0]));
  const dependents = new Map<string, string[]>(tasks.map((t) => [t.id, []]));

  for (const task of tasks) {
    for (const dep of task.dependsOn) {
      const list = dependents.get(dep);
      if (!list) continue;
      list.push(task.id);
      inDegree.set(task.id, (inDegree.get(task.id) ?? 0) + 1);
    }
  }

  const order = [...inDegree].filter(([, deg]) => deg === 0).map(([id]) => id);
  for (let head = 0; head < order.length; head++) {
    for (const dep of dependents.get(order[head] ?? "") ?? []) {
      const remaining = (inDegree.get(dep) ?? 0) - 1;
      inDegree.set(dep, remaining);
      if (remaining === 0) order.push(dep);
    }
  }

  if (order.length === inDegree.size) return [];
  return [...inDegree].filter(([, deg]) => deg > 0).map(([id]) => id);
}

interface ConflictContext {
  brief: EventBrief;
  budget: BudgetPlan;
  tasks: TimelineTask[];
  today: string;
}

type ConflictCheck = (ctx: ConflictContext) => Conflict | null;

function checkBudgetSum({ budget }: ConflictContext): Conflict | null {
  const linesSum = sum(
    budget.lines.map((l) => l.allocated),
    budget.total.currency
  );
  const expectedAllocatable = budget.total.amountMinor - budget.contingency.amountMinor;
  const drift = Math.abs(linesSum.amountMinor - expectedAllocatable);
  if (drift <= MAX_DRIFT_MINOR) return null;
  return ConflictSchema.parse({
    kind: "budget_overallocated",
    severity: "blocker",
    message: `Budget lines sum to ${linesSum.amountMinor} minor units but allocatable is ${expectedAllocatable} (drift: ${drift})`,
    refs: ["budget.lines", "budget.total"],
  });
}

function checkPerHeadFloor({ brief, budget }: ConflictContext): Conflict | null {
  const band = costBandFor("catering", brief.cityTier);
  if (!band || band.basis !== "per_head" || budget.perHead.amountMinor >= band.lowMinor) {
    return null;
  }
  const perHeadRupees = Math.round(budget.perHead.amountMinor / 100);
  const floorRupees = Math.round(band.lowMinor / 100);
  return ConflictSchema.parse({
    kind: "budget_unrealistic_per_head",
    severity: "warning",
    message: `Per-head budget of Rs ${perHeadRupees} is below the catering floor of Rs ${floorRupees} for ${brief.cityTier} tier`,
    refs: ["budget.perHead", "catering cost band"],
  });
}

function checkDateInPast({ brief, today }: ConflictContext): Conflict | null {
  if (brief.eventDate >= today) return null;
  return ConflictSchema.parse({
    kind: "date_in_past",
    severity: "blocker",
    message: `Event date ${brief.eventDate} is in the past (today: ${today})`,
    refs: ["brief.eventDate"],
  });
}

function checkWeddingLeadTime({ brief, today }: ConflictContext): Conflict | null {
  if (brief.eventFamily !== "wedding") return null;
  const leadDays = daysBetween(today, brief.eventDate);
  if (leadDays < 0 || leadDays >= MIN_WEDDING_LEAD_DAYS) return null;
  return ConflictSchema.parse({
    kind: "lead_time_too_short",
    severity: "warning",
    message: `Only ${leadDays} days until the wedding; minimum recommended lead time is 30 days`,
    refs: ["brief.eventDate", "brief.eventFamily"],
  });
}

function checkDependencyCycle({ tasks }: ConflictContext): Conflict | null {
  const cycleIds = findCycles(tasks);
  if (cycleIds.length === 0) return null;
  return ConflictSchema.parse({
    kind: "dependency_cycle",
    severity: "blocker",
    message: `Dependency cycle detected among tasks: ${cycleIds.join(", ")}`,
    refs: cycleIds.map((id) => `task:${id}`),
  });
}

function checkVenueCapacity({ brief }: ConflictContext): Conflict | null {
  const capacityCap = TYPICAL_CAPACITY[brief.cityTier];
  if (brief.guestCount <= capacityCap) return null;
  return ConflictSchema.parse({
    kind: "capacity_exceeded",
    severity: "warning",
    message: `Guest count of ${brief.guestCount} exceeds typical ${brief.cityTier} venue capacity of ${capacityCap}`,
    refs: ["brief.guestCount", "brief.cityTier"],
  });
}

const CHECKS: readonly ConflictCheck[] = [
  checkBudgetSum,
  checkPerHeadFloor,
  checkDateInPast,
  checkWeddingLeadTime,
  checkDependencyCycle,
  checkVenueCapacity,
];

/**
 * Deterministic checks over the brief, budget and timeline. `today` is injectable so
 * date-based checks are reproducible under test.
 */
export function detectConflicts(
  brief: EventBrief,
  budget: BudgetPlan,
  tasks: TimelineTask[],
  today: string = localISODate(new Date())
): Conflict[] {
  const ctx: ConflictContext = { brief, budget, tasks, today };
  return CHECKS.flatMap((check) => check(ctx) ?? []);
}
