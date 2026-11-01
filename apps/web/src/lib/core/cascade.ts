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

/**
 * Build an adjacency list of dependents: for each item, which items depend on it.
 */
function buildDependentsMap(
  items: RunOfShowItem[]
): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const item of items) {
    if (!map.has(item.id)) map.set(item.id, []);
  }
  for (const item of items) {
    for (const dep of item.dependsOn) {
      const list = map.get(dep);
      if (list) list.push(item.id);
    }
  }
  return map;
}

/**
 * Topological sort (Kahn's algorithm) starting from a given set of IDs,
 * returning only downstream reachable items.
 */
function topologicalOrder(
  startIds: string[],
  items: RunOfShowItem[]
): string[] {
  const itemMap = new Map(items.map((it) => [it.id, it]));
  const dependents = buildDependentsMap(items);

  // BFS from startIds to collect all reachable downstream IDs
  const reachable = new Set<string>();
  const queue = [...startIds];
  while (queue.length > 0) {
    const id = queue.shift()!;
    const deps = dependents.get(id) ?? [];
    for (const dep of deps) {
      if (!reachable.has(dep)) {
        reachable.add(dep);
        queue.push(dep);
      }
    }
  }

  // Kahn's algorithm over reachable items only
  // In-degree counts only edges within reachable set + startIds
  const relevant = new Set([...startIds, ...reachable]);
  const inDegree = new Map<string, number>();
  for (const id of reachable) {
    const item = itemMap.get(id)!;
    let deg = 0;
    for (const dep of item.dependsOn) {
      if (relevant.has(dep)) deg++;
    }
    inDegree.set(id, deg);
  }

  // Start nodes are the startIds themselves (already shifted)
  const topoQueue: string[] = [];
  for (const id of reachable) {
    if (inDegree.get(id) === 0) topoQueue.push(id);
  }

  // Also seed with direct dependents of startIds that have all deps met
  // after we process startIds
  const sorted: string[] = [];
  const processed = new Set(startIds);

  // Decrease in-degree for items depending on startIds
  for (const startId of startIds) {
    for (const depId of dependents.get(startId) ?? []) {
      if (reachable.has(depId)) {
        inDegree.set(depId, (inDegree.get(depId) ?? 1) - 1);
      }
    }
  }

  // Re-seed queue
  topoQueue.length = 0;
  for (const id of reachable) {
    if ((inDegree.get(id) ?? 0) <= 0) topoQueue.push(id);
  }

  while (topoQueue.length > 0) {
    const id = topoQueue.shift()!;
    sorted.push(id);
    processed.add(id);
    for (const depId of dependents.get(id) ?? []) {
      if (!reachable.has(depId)) continue;
      const newDeg = (inDegree.get(depId) ?? 1) - 1;
      inDegree.set(depId, newDeg);
      if (newDeg <= 0 && !processed.has(depId)) {
        topoQueue.push(depId);
      }
    }
  }

  return sorted;
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
  const downstream = topologicalOrder([targetId], cloned);

  for (const itemId of downstream) {
    const item = itemMap.get(itemId)!;

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
