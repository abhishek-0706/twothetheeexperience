import type { EventBrief, BudgetPlan, TimelineTask, Conflict } from "./types";
import { ConflictSchema } from "./types";
import { sum } from "./money";
import { costBandFor } from "../locale/in-IN";

/**
 * Conflict detector.
 *
 * Runs a battery of deterministic checks against the brief, budget, and
 * timeline. Returns validated Conflict[] with severity and references.
 * Pure function, no side effects, no model calls.
 */

function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function daysBetween(a: string, b: string): number {
  const da = new Date(a + "T00:00:00");
  const db = new Date(b + "T00:00:00");
  return Math.round((db.getTime() - da.getTime()) / (86400 * 1000));
}

/** Kahn's algorithm cycle detection. Returns the IDs forming cycles, if any. */
function findCycles(tasks: TimelineTask[]): string[] {
  const ids = new Set(tasks.map((t) => t.id));
  const inDegree = new Map<string, number>();
  const adjacency = new Map<string, string[]>();

  for (const t of tasks) {
    if (!inDegree.has(t.id)) inDegree.set(t.id, 0);
    if (!adjacency.has(t.id)) adjacency.set(t.id, []);
  }

  for (const t of tasks) {
    for (const dep of t.dependsOn) {
      if (!ids.has(dep)) continue; // external dep, skip
      adjacency.get(dep)!.push(t.id);
      inDegree.set(t.id, (inDegree.get(t.id) ?? 0) + 1);
    }
  }

  const queue: string[] = [];
  for (const [id, deg] of inDegree) {
    if (deg === 0) queue.push(id);
  }

  let processed = 0;
  while (queue.length > 0) {
    const id = queue.shift()!;
    processed++;
    for (const dep of adjacency.get(id) ?? []) {
      const newDeg = (inDegree.get(dep) ?? 1) - 1;
      inDegree.set(dep, newDeg);
      if (newDeg === 0) queue.push(dep);
    }
  }

  if (processed === ids.size) return [];

  // IDs with remaining in-degree are in cycles
  return [...inDegree.entries()]
    .filter(([, deg]) => deg > 0)
    .map(([id]) => id);
}

/** Typical venue capacity by city tier (guests). */
const TYPICAL_CAPACITY: Record<string, number> = {
  metro: 1500,
  tier1: 1000,
  tier2: 600,
  destination: 300,
};

export function detectConflicts(
  brief: EventBrief,
  budget: BudgetPlan,
  tasks: TimelineTask[]
): Conflict[] {
  const conflicts: Conflict[] = [];

  // 1. Budget lines sum matches total
  const linesSum = sum(
    budget.lines.map((l) => l.allocated),
    budget.total.currency
  );
  const expectedAllocatable =
    budget.total.amountMinor - budget.contingency.amountMinor;
  const drift = Math.abs(linesSum.amountMinor - expectedAllocatable);
  if (drift > 1) {
    conflicts.push(
      ConflictSchema.parse({
        kind: "budget_overallocated",
        severity: "blocker",
        message: `Budget lines sum to ${linesSum.amountMinor} minor units but allocatable is ${expectedAllocatable} (drift: ${drift})`,
        refs: ["budget.lines", "budget.total"],
      })
    );
  }

  // 2. Per-head below cost band floor for catering
  const cateringBand = costBandFor("catering", brief.cityTier);
  if (cateringBand && cateringBand.basis === "per_head") {
    if (budget.perHead.amountMinor < cateringBand.lowMinor) {
      const perHeadRupees = Math.round(budget.perHead.amountMinor / 100);
      const floorRupees = Math.round(cateringBand.lowMinor / 100);
      conflicts.push(
        ConflictSchema.parse({
          kind: "budget_unrealistic_per_head",
          severity: "warning",
          message: `Per-head budget of Rs ${perHeadRupees} is below the catering floor of Rs ${floorRupees} for ${brief.cityTier} tier`,
          refs: ["budget.perHead", "catering cost band"],
        })
      );
    }
  }

  // 3. Event date in the past
  const today = todayISO();
  if (brief.eventDate < today) {
    conflicts.push(
      ConflictSchema.parse({
        kind: "date_in_past",
        severity: "blocker",
        message: `Event date ${brief.eventDate} is in the past (today: ${today})`,
        refs: ["brief.eventDate"],
      })
    );
  }

  // 4. Lead time < 30 days for a wedding
  if (brief.eventFamily === "wedding") {
    const leadDays = daysBetween(today, brief.eventDate);
    if (leadDays >= 0 && leadDays < 30) {
      conflicts.push(
        ConflictSchema.parse({
          kind: "lead_time_too_short",
          severity: "warning",
          message: `Only ${leadDays} days until the wedding; minimum recommended lead time is 30 days`,
          refs: ["brief.eventDate", "brief.eventFamily"],
        })
      );
    }
  }

  // 5. Dependency graph has cycles
  const cycleIds = findCycles(tasks);
  if (cycleIds.length > 0) {
    conflicts.push(
      ConflictSchema.parse({
        kind: "dependency_cycle",
        severity: "blocker",
        message: `Dependency cycle detected among tasks: ${cycleIds.join(", ")}`,
        refs: cycleIds.map((id) => `task:${id}`),
      })
    );
  }

  // 6. Guest count exceeds typical venue capacity for the city tier
  const capacityCap = TYPICAL_CAPACITY[brief.cityTier];
  if (capacityCap !== undefined && brief.guestCount > capacityCap) {
    conflicts.push(
      ConflictSchema.parse({
        kind: "capacity_exceeded",
        severity: "warning",
        message: `Guest count of ${brief.guestCount} exceeds typical ${brief.cityTier} venue capacity of ${capacityCap}`,
        refs: ["brief.guestCount", "brief.cityTier"],
      })
    );
  }

  return conflicts;
}
