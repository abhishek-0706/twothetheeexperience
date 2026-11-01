/**
 * Cascade delay engine — pure graph math, no AI.
 * Times are minutes from midnight (600 = 10:00).
 */

import { describe, it, expect } from "vitest";
import { cascadeDelay } from "../src/lib/core/cascade";
import {
  CascadeResultSchema,
  RunOfShowItemSchema,
  type RunOfShowItem,
} from "../src/lib/core/types";

type ItemInput = Pick<RunOfShowItem, "id" | "startMin" | "durationMin"> & Partial<RunOfShowItem>;

function item(input: ItemInput): RunOfShowItem {
  return RunOfShowItemSchema.parse({
    title: `Item ${input.id}`,
    minDurationMin: input.durationMin, // incompressible unless a test says otherwise
    ...input,
  });
}

/**
 * a 10:00–11:00 (compressible to 45) → b 11:00–12:00 (compressible to 30)
 *   → c 12:00–13:00 PINNED (muhurat) → d 13:00–14:30 (compressible to 60)
 */
function weddingDay(): RunOfShowItem[] {
  return [
    item({
      id: "a",
      title: "Baraat",
      startMin: 600,
      durationMin: 60,
      minDurationMin: 45,
      vendorLeads: ["Dhol"],
    }),
    item({
      id: "b",
      title: "Jaimala",
      startMin: 660,
      durationMin: 60,
      minDurationMin: 30,
      dependsOn: ["a"],
      vendorLeads: ["Decor"],
    }),
    item({
      id: "c",
      title: "Pheras",
      startMin: 720,
      durationMin: 60,
      dependsOn: ["b"],
      pinned: true,
      pinnedReason: "Muhurat window",
      vendorLeads: ["Pandit"],
    }),
    item({
      id: "d",
      title: "Lunch",
      startMin: 780,
      durationMin: 90,
      minDurationMin: 60,
      dependsOn: ["c"],
      vendorLeads: ["Caterer"],
    }),
  ];
}

function byId(items: RunOfShowItem[], id: string): RunOfShowItem {
  const found = items.find((i) => i.id === id);
  if (!found) throw new Error(`No run-of-show item "${id}"`);
  return found;
}

describe("cascadeDelay() — propagation", () => {
  it("shifts every downstream item when nothing can compress", () => {
    const chain = [
      item({ id: "p", startMin: 600, durationMin: 30, vendorLeads: ["Sound"] }),
      item({ id: "q", startMin: 630, durationMin: 30, dependsOn: ["p"], vendorLeads: ["Lights"] }),
      item({ id: "r", startMin: 660, durationMin: 30, dependsOn: ["q"], vendorLeads: ["Stage"] }),
    ];
    const result = cascadeDelay(chain, "p", 20);
    expect(result.shifted).toEqual([
      { itemId: "p", fromMin: 600, toMin: 620 },
      { itemId: "q", fromMin: 630, toMin: 650 },
      { itemId: "r", fromMin: 660, toMin: 680 },
    ]);
    expect(result).toMatchObject({ absorbedMin: 0, netDelayMin: 20, violations: [] });
    expect(result.affectedVendorLeads).toEqual(["Sound", "Lights", "Stage"]);
  });

  it("starts a joining item only after its latest dependency finishes (diamond graph)", () => {
    const diamond = [
      item({ id: "x", startMin: 600, durationMin: 30 }),
      item({ id: "y", startMin: 630, durationMin: 30, dependsOn: ["x"] }),
      item({ id: "z", startMin: 630, durationMin: 60, dependsOn: ["x"] }),
      item({ id: "w", startMin: 690, durationMin: 30, dependsOn: ["y", "z"] }),
    ];
    const result = cascadeDelay(diamond, "x", 10);
    expect(byId(result.items, "y").startMin).toBe(640);
    expect(byId(result.items, "z").startMin).toBe(640);
    expect(byId(result.items, "w").startMin).toBe(700); // after z (ends 700), not y (ends 670)
    expect(result.shifted.at(-1)).toEqual({ itemId: "w", fromMin: 690, toMin: 700 });
  });

  it("never moves items upstream of the delayed item", () => {
    const result = cascadeDelay(weddingDay(), "b", 15);
    expect(byId(result.items, "a")).toEqual(byId(weddingDay(), "a"));
  });
});

describe("cascadeDelay() — absorption by compression", () => {
  it("absorbs a 15-minute delay entirely by shortening the next flexible item", () => {
    const result = cascadeDelay(weddingDay(), "a", 15);
    expect(result).toMatchObject({ absorbedMin: 15, netDelayMin: 0, violations: [] });
    expect(result.shifted).toEqual([{ itemId: "a", fromMin: 600, toMin: 615 }]);
    expect(byId(result.items, "b")).toMatchObject({ startMin: 660, durationMin: 45 });
    expect(byId(result.items, "c").startMin).toBe(720);
  });

  it("compresses to the floor, then shifts the remainder", () => {
    const result = cascadeDelay(weddingDay(), "a", 45);
    expect(result).toMatchObject({ absorbedMin: 30, netDelayMin: 15, violations: [] });
    expect(result.shifted).toEqual([
      { itemId: "a", fromMin: 600, toMin: 645 },
      { itemId: "b", fromMin: 660, toMin: 675 },
    ]);
    expect(byId(result.items, "b")).toMatchObject({ startMin: 675, durationMin: 30 });
  });

  it("does not compress the delayed item itself", () => {
    const result = cascadeDelay(weddingDay(), "b", 15);
    expect(byId(result.items, "b")).toMatchObject({ startMin: 675, durationMin: 60 });
  });
});

describe("cascadeDelay() — pinned items", () => {
  it("leaves a pinned item in place and reports how far it would be overrun", () => {
    const result = cascadeDelay(weddingDay(), "b", 15);
    expect(result.violations).toEqual([
      {
        itemId: "c",
        itemTitle: "Pheras",
        kind: "pinned_overrun",
        overrunMin: 15,
        message: '"Pheras" is pinned (Muhurat window) and cannot be shifted by 15 min',
      },
    ]);
    expect(byId(result.items, "c").startMin).toBe(720);
  });

  it("does not move items that depend on a pinned item", () => {
    const result = cascadeDelay(weddingDay(), "b", 15);
    expect(byId(result.items, "d")).toEqual(byId(weddingDay(), "d"));
  });

  it("finds the exact boundary: 60 minutes fits before the muhurat, 61 overruns it by one", () => {
    expect(cascadeDelay(weddingDay(), "a", 60).violations).toEqual([]);
    expect(
      cascadeDelay(weddingDay(), "a", 61).violations.map((v) => [v.itemId, v.overrunMin])
    ).toEqual([["c", 1]]);
  });

  it("is unaffected by a pinned item at the very start of the day", () => {
    const day = weddingDay().map((i) =>
      i.id === "a" ? { ...i, pinned: true, pinnedReason: "Sunrise puja" } : i
    );
    const result = cascadeDelay(day, "b", 5);
    expect(byId(result.items, "a").startMin).toBe(600);
    expect(result.violations.map((v) => v.itemId)).toEqual(["c"]);
  });

  it("reports a pinned item at the very end of the day", () => {
    const day = [
      item({ id: "dinner", startMin: 1200, durationMin: 60 }),
      item({
        id: "curfew",
        title: "Venue curfew",
        startMin: 1260,
        durationMin: 60,
        dependsOn: ["dinner"],
        pinned: true,
        pinnedReason: "Venue hard stop",
      }),
    ];
    const result = cascadeDelay(day, "dinner", 5);
    expect(result.violations.map((v) => [v.itemId, v.overrunMin])).toEqual([["curfew", 5]]);
    expect(byId(result.items, "curfew").startMin).toBe(1260);
  });

  it("reports every pinned item a delay reaches, each with its own overrun", () => {
    const day = [
      item({ id: "x", startMin: 600, durationMin: 60 }),
      item({
        id: "nikah",
        startMin: 660,
        durationMin: 30,
        dependsOn: ["x"],
        pinned: true,
        pinnedReason: "Nikah time",
      }),
      item({
        id: "photos",
        startMin: 670,
        durationMin: 30,
        dependsOn: ["x"],
        pinned: true,
        pinnedReason: "Golden hour",
      }),
    ];
    const result = cascadeDelay(day, "x", 20);
    expect(result.violations.map((v) => [v.itemId, v.overrunMin]).sort()).toEqual([
      ["nikah", 20],
      ["photos", 10],
    ]);
  });
});

describe("cascadeDelay() — vendors to notify", () => {
  it("lists vendors of moved or compressed items only", () => {
    expect(cascadeDelay(weddingDay(), "a", 15).affectedVendorLeads).toEqual(["Dhol", "Decor"]);
  });

  it("lists each vendor once even if several of their items move", () => {
    const day = [
      item({ id: "m1", startMin: 600, durationMin: 30, vendorLeads: ["Mehndi artist"] }),
      item({
        id: "m2",
        startMin: 630,
        durationMin: 30,
        dependsOn: ["m1"],
        vendorLeads: ["Mehndi artist"],
      }),
    ];
    expect(cascadeDelay(day, "m1", 10).affectedVendorLeads).toEqual(["Mehndi artist"]);
  });
});

describe("cascadeDelay() — edge cases", () => {
  it("returns an unchanged schedule for a zero delay", () => {
    const result = cascadeDelay(weddingDay(), "b", 0);
    expect(result).toEqual({
      items: weddingDay(),
      violations: [],
      absorbedMin: 0,
      netDelayMin: 0,
      affectedVendorLeads: [],
      shifted: [],
    });
  });

  it("pulls only the delayed item earlier for a negative delay (running early)", () => {
    const result = cascadeDelay(weddingDay(), "b", -10);
    expect(result.shifted).toEqual([{ itemId: "b", fromMin: 660, toMin: 650 }]);
    expect(result).toMatchObject({ absorbedMin: 0, netDelayMin: -10, violations: [] });
    expect(byId(result.items, "c").startMin).toBe(720);
  });

  it("rejects a delay that would move an item before midnight", () => {
    expect(() => cascadeDelay(weddingDay(), "a", -601)).toThrow();
  });

  it("rejects an unknown target", () => {
    expect(() => cascadeDelay(weddingDay(), "zzz", 10)).toThrow('Target item "zzz" not found');
  });

  it("does not mutate the caller's schedule", () => {
    const input = weddingDay();
    const snapshot = structuredClone(input);
    cascadeDelay(input, "a", 61);
    expect(input).toEqual(snapshot);
  });

  it("is deterministic and always returns a schema-valid result", () => {
    const first = cascadeDelay(weddingDay(), "a", 61);
    expect(cascadeDelay(weddingDay(), "a", 61)).toEqual(first);
    expect(CascadeResultSchema.parse(first)).toEqual(first);
  });
});
