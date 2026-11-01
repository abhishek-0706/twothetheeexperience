import type { RunOfShowItem, CascadeResult, CascadeViolation } from "./types";
import { CascadeResultSchema } from "./types";

interface ShiftRecord {
  itemId: string;
  fromMin: number;
  toMin: number;
}

function buildDependentsMap(items: RunOfShowItem[]): Map<string, string[]> {
  const map = new Map<string, string[]>(items.map((item) => [item.id, []]));
  for (const item of items) {
    for (const dep of item.dependsOn) map.get(dep)?.push(item.id);
  }
  return map;
}

/** Items downstream of `startId`, in dependency order (Kahn's algorithm over the reachable subgraph). */
function downstreamInTopologicalOrder(
  startId: string,
  itemMap: Map<string, RunOfShowItem>,
  dependents: Map<string, string[]>
): string[] {
  const reachable = new Set<string>();
  const frontier = [startId];
  for (let head = 0; head < frontier.length; head++) {
    for (const dep of dependents.get(frontier[head] ?? "") ?? []) {
      if (!reachable.has(dep)) {
        reachable.add(dep);
        frontier.push(dep);
      }
    }
  }

  // The start item is already shifted, so only edges inside the reachable set count.
  const inDegree = new Map<string, number>();
  for (const id of reachable) {
    const deps = itemMap.get(id)?.dependsOn ?? [];
    inDegree.set(id, deps.filter((dep) => reachable.has(dep)).length);
  }

  const order = [...reachable].filter((id) => inDegree.get(id) === 0);
  for (let head = 0; head < order.length; head++) {
    for (const dep of dependents.get(order[head] ?? "") ?? []) {
      if (!reachable.has(dep)) continue;
      const remaining = (inDegree.get(dep) ?? 0) - 1;
      inDegree.set(dep, remaining);
      if (remaining === 0) order.push(dep);
    }
  }
  return order;
}

interface CascadeState {
  shifts: ShiftRecord[];
  violations: CascadeViolation[];
  affectedVendors: Set<string>;
  absorbedMin: number;
}

function cloneItems(items: readonly RunOfShowItem[]): RunOfShowItem[] {
  return items.map((it) => ({
    ...it,
    dependsOn: [...it.dependsOn],
    vendorLeads: [...it.vendorLeads],
    checklist: it.checklist.map((c) => ({ ...c })),
  }));
}

function shiftStart(item: RunOfShowItem, byMin: number, state: CascadeState): void {
  const fromMin = item.startMin;
  item.startMin = fromMin + byMin;
  state.shifts.push({ itemId: item.id, fromMin, toMin: item.startMin });
  for (const vendor of item.vendorLeads) state.affectedVendors.add(vendor);
}

/** Minutes by which this item's dependencies now push past its current start. */
function pushFromDependencies(item: RunOfShowItem, itemMap: Map<string, RunOfShowItem>): number {
  const latestDepEnd = item.dependsOn.reduce((latest, depId) => {
    const dep = itemMap.get(depId);
    return dep ? Math.max(latest, dep.startMin + dep.durationMin) : latest;
  }, item.startMin);
  return latestDepEnd - item.startMin;
}

function pinnedViolation(item: RunOfShowItem, pushMin: number): CascadeViolation {
  const reason = item.pinnedReason ? ` (${item.pinnedReason})` : "";
  return {
    itemId: item.id,
    itemTitle: item.title,
    kind: "pinned_overrun",
    overrunMin: pushMin,
    message: `"${item.title}" is pinned${reason} and cannot be shifted by ${pushMin} min`,
  };
}

/** Flexible items compress toward minDurationMin first; whatever is left moves the start. */
function absorbOrShift(item: RunOfShowItem, pushMin: number, state: CascadeState): void {
  const absorbed = Math.min(item.durationMin - item.minDurationMin, pushMin);
  if (absorbed > 0) {
    item.durationMin -= absorbed;
    state.absorbedMin += absorbed;
  }

  const remainingPush = pushMin - absorbed;
  if (remainingPush > 0) {
    shiftStart(item, remainingPush, state);
  } else if (absorbed > 0) {
    for (const vendor of item.vendorLeads) state.affectedVendors.add(vendor);
  }
}

/**
 * Shift `targetId` by `delayMin` and propagate downstream in topological order. Pinned
 * items never move; they produce violations instead. Inputs are never mutated.
 */
export function cascadeDelay(
  items: RunOfShowItem[],
  targetId: string,
  delayMin: number
): CascadeResult {
  if (delayMin === 0) {
    return CascadeResultSchema.parse({
      items: items.map((it) => ({ ...it })),
      violations: [],
      absorbedMin: 0,
      netDelayMin: 0,
      affectedVendorLeads: [],
      shifted: [],
    });
  }

  const cloned = cloneItems(items);
  const itemMap = new Map(cloned.map((it) => [it.id, it]));
  const target = itemMap.get(targetId);
  if (!target) throw new Error(`Target item "${targetId}" not found`);

  const state: CascadeState = {
    shifts: [],
    violations: [],
    affectedVendors: new Set(),
    absorbedMin: 0,
  };
  shiftStart(target, delayMin, state);

  const dependents = buildDependentsMap(cloned);
  for (const itemId of downstreamInTopologicalOrder(targetId, itemMap, dependents)) {
    const item = itemMap.get(itemId);
    if (!item) continue;
    const pushMin = pushFromDependencies(item, itemMap);
    if (pushMin <= 0) continue;
    if (item.pinned) state.violations.push(pinnedViolation(item, pushMin));
    else absorbOrShift(item, pushMin, state);
  }

  return CascadeResultSchema.parse({
    items: cloned,
    violations: state.violations,
    absorbedMin: state.absorbedMin,
    netDelayMin: delayMin - state.absorbedMin,
    affectedVendorLeads: [...state.affectedVendors],
    shifted: state.shifts,
  });
}
