import type { RunOfShowItem, CascadeResult, CascadeViolation } from "./types";
import { CascadeResultSchema } from "./types";

/**
 * Delay cascade engine.
 *
 * Pure deterministic graph math. Shifts a target run-of-show item by a given
 * delay, then propagates downstream through the dependency graph in
 * topological order. Flexible items absorb delay by compressing duration
 * (down to minDurationMin). Pinned items generate violations instead of moving.
 *
 * No AI, no heuristics, no side effects.
 */

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

  // Deep clone items so we don't mutate the input
  const cloned: RunOfShowItem[] = items.map((it) => ({
    ...it,
    dependsOn: [...it.dependsOn],
    vendorLeads: [...it.vendorLeads],
    checklist: it.checklist.map((c) => ({ ...c })),
  }));

  const itemMap = new Map(cloned.map((it) => [it.id, it]));
  const target = itemMap.get(targetId);
  if (!target) {
    throw new Error(`Target item "${targetId}" not found`);
  }

  const shifts: ShiftRecord[] = [];
  const violations: CascadeViolation[] = [];
  const affectedVendors = new Set<string>();
  let totalAbsorbed = 0;

  // Shift the target item
  const targetOrigStart = target.startMin;
  target.startMin = targetOrigStart + delayMin;
  shifts.push({
    itemId: target.id,
    fromMin: targetOrigStart,
    toMin: target.startMin,
  });
  for (const v of target.vendorLeads) affectedVendors.add(v);

  // Get downstream items in topological order
  const downstream = downstreamInTopologicalOrder(targetId, itemMap, buildDependentsMap(cloned));

  for (const itemId of downstream) {
    const item = itemMap.get(itemId);
    if (!item) continue;

    // Compute the earliest this item can start based on its dependencies
    let earliestStart = item.startMin;
    for (const depId of item.dependsOn) {
      const dep = itemMap.get(depId);
      if (dep) {
        const depEnd = dep.startMin + dep.durationMin;
        if (depEnd > earliestStart) {
          earliestStart = depEnd;
        }
      }
    }

    // How much delay is being pushed into this item
    const pushMin = earliestStart - item.startMin;

    if (pushMin <= 0) {
      // No delay reaches this item
      continue;
    }

    if (item.pinned) {
      // Pinned items cannot move -- generate a violation
      violations.push({
        itemId: item.id,
        itemTitle: item.title,
        kind: "pinned_overrun",
        overrunMin: pushMin,
        message: `"${item.title}" is pinned${item.pinnedReason ? ` (${item.pinnedReason})` : ""} and cannot be shifted by ${pushMin} min`,
      });
      // Don't move the pinned item -- downstream of pinned items
      // still get processed but the pinned item stays put
      continue;
    }

    // Try to absorb delay by compressing duration
    const canAbsorb = item.durationMin - item.minDurationMin;
    const absorbed = Math.min(canAbsorb, pushMin);
    const remainingPush = pushMin - absorbed;

    if (absorbed > 0) {
      item.durationMin -= absorbed;
      totalAbsorbed += absorbed;
    }

    if (remainingPush > 0) {
      const origStart = item.startMin;
      item.startMin = origStart + remainingPush;
      shifts.push({
        itemId: item.id,
        fromMin: origStart,
        toMin: item.startMin,
      });
      for (const v of item.vendorLeads) affectedVendors.add(v);
    } else if (absorbed > 0) {
      // Item absorbed the delay fully but still affected vendors
      for (const v of item.vendorLeads) affectedVendors.add(v);
    }
  }

  // Net delay is the original delay minus all time absorbed by flexible items
  const netDelay = delayMin - totalAbsorbed;

  return CascadeResultSchema.parse({
    items: cloned,
    violations,
    absorbedMin: totalAbsorbed,
    netDelayMin: netDelay,
    affectedVendorLeads: Array.from(affectedVendors),
    shifted: shifts,
  });
}
