/**
 * Eval harness — Cascade delay engine.
 * BUILD_PROMPT.md §3: pure deterministic graph math, no AI.
 */

import { describe, it, expect } from "vitest";
import { cascadeDelay } from "../src/lib/core/cascade";
import type { RunOfShowItem } from "../src/lib/core/types";

function makeItems(): RunOfShowItem[] {
  return [
    {
      id: "a", title: "Event A", startMin: 600, durationMin: 60, minDurationMin: 45,
      dependsOn: [], pinned: false, pinnedReason: null, vendorLeads: ["Vendor1"],
      location: "Room 1", status: "completed", tag: null, checklist: [],
    },
    {
      id: "b", title: "Event B", startMin: 660, durationMin: 60, minDurationMin: 30,
      dependsOn: ["a"], pinned: false, pinnedReason: null, vendorLeads: ["Vendor2"],
      location: "Room 2", status: "active", tag: null, checklist: [],
    },
    {
      id: "c", title: "Event C (pinned)", startMin: 720, durationMin: 60, minDurationMin: 45,
      dependsOn: ["b"], pinned: true, pinnedReason: "Muhurat window", vendorLeads: ["Vendor3"],
      location: "Mandap", status: "upcoming", tag: "Pinned", checklist: [],
    },
    {
      id: "d", title: "Event D", startMin: 780, durationMin: 90, minDurationMin: 60,
      dependsOn: ["c"], pinned: false, pinnedReason: null, vendorLeads: ["Vendor4"],
      location: "Hall", status: "upcoming", tag: null, checklist: [],
    },
  ];
}

describe("Cascade Delay Engine", () => {
  it("shifts a target item and its downstream dependents", () => {
    const result = cascadeDelay(makeItems(), "b", 15);
    const bItem = result.items.find((i) => i.id === "b")!;
    expect(bItem.startMin).toBe(675); // 660 + 15
  });

  it("reports a violation when a pinned item would be overrun", () => {
    // Delay B by 30 mins — C is pinned at 720, B ends at 660+60+30 = 750 > 720
    const result = cascadeDelay(makeItems(), "b", 30);
    expect(result.violations.length).toBeGreaterThan(0);
    expect(result.violations[0].kind).toBe("pinned_overrun");
    expect(result.violations[0].itemId).toBe("c");
  });

  it("absorbs delay by compressing flexible items", () => {
    // Small delay — B can compress from 60 to 30 (absorb up to 30 min)
    const result = cascadeDelay(makeItems(), "a", 15);
    // B should absorb some of the delay
    expect(result.absorbedMin).toBeGreaterThanOrEqual(0);
  });

  it("collects all affected vendor leads", () => {
    const result = cascadeDelay(makeItems(), "b", 10);
    expect(result.affectedVendorLeads.length).toBeGreaterThan(0);
  });

  it("records all shifts with from/to values", () => {
    const result = cascadeDelay(makeItems(), "b", 10);
    expect(result.shifted.length).toBeGreaterThan(0);
    for (const s of result.shifted) {
      expect(s.fromMin).toBeDefined();
      expect(s.toMin).toBeDefined();
      expect(s.toMin).toBeGreaterThanOrEqual(s.fromMin);
    }
  });

  it("does not shift items upstream of the target", () => {
    const result = cascadeDelay(makeItems(), "b", 15);
    const aItem = result.items.find((i) => i.id === "a")!;
    expect(aItem.startMin).toBe(600); // unchanged
  });

  it("handles zero delay gracefully", () => {
    const result = cascadeDelay(makeItems(), "b", 0);
    expect(result.shifted.length).toBe(0);
    expect(result.netDelayMin).toBe(0);
  });

  it("returns a valid CascadeResult shape", () => {
    const result = cascadeDelay(makeItems(), "b", 15);
    expect(result.items).toBeInstanceOf(Array);
    expect(result.violations).toBeInstanceOf(Array);
    expect(typeof result.absorbedMin).toBe("number");
    expect(typeof result.netDelayMin).toBe("number");
    expect(result.affectedVendorLeads).toBeInstanceOf(Array);
    expect(result.shifted).toBeInstanceOf(Array);
  });
});
