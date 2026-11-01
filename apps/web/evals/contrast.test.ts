import { describe, expect, it } from "vitest";
import { palette } from "../tailwind.tokens";

type Token = keyof typeof palette;

const AA_NORMAL_TEXT = 4.5;

function channel(value: number): number {
  const c = value / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number {
  const n = Number.parseInt(hex.slice(1), 16);
  return (
    0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255)
  );
}

function contrast(fg: Token, bg: Token): number {
  const [hi, lo] = [luminance(palette[fg]), luminance(palette[bg])].sort((a, b) => b - a) as [
    number,
    number,
  ];
  return (hi + 0.05) / (lo + 0.05);
}

const LIGHT_SURFACES: Token[] = ["background", "surface-container-lowest", "surface-container-low"];

const BODY_TEXT: Token[] = [
  "primary",
  "on-surface",
  "on-surface-variant",
  "secondary",
  "tertiary",
  "error",
  "success",
  "outline",
  "primary-container",
];

const CONTAINER_PAIRS: Array<[Token, Token]> = [
  ["on-primary", "primary"],
  ["on-primary", "primary-container"],
  ["on-success-container", "success-container"],
  ["on-accent-container", "accent-container"],
  ["on-error-container", "error-container"],
  ["on-blush-container", "blush-container"],
  ["on-secondary-container", "secondary-container"],
];

describe("contrast() — WCAG reference values", () => {
  it("rates black on white at 21:1", () => {
    expect(contrast("primary", "surface-container-lowest")).toBeGreaterThan(18);
  });

  it("is symmetric in its arguments", () => {
    expect(contrast("outline", "background")).toBeCloseTo(contrast("background", "outline"), 10);
  });
});

describe("design tokens — text on light surfaces meets WCAG 2.2 AA", () => {
  for (const fg of BODY_TEXT) {
    for (const bg of LIGHT_SURFACES) {
      it(`${fg} on ${bg} is at least ${AA_NORMAL_TEXT}:1`, () => {
        expect(contrast(fg, bg)).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
      });
    }
  }
});

describe("design tokens — on-* text on its container meets WCAG 2.2 AA", () => {
  for (const [fg, bg] of CONTAINER_PAIRS) {
    it(`${fg} on ${bg} is at least ${AA_NORMAL_TEXT}:1`, () => {
      expect(contrast(fg, bg)).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
    });
  }
});

describe("design tokens — the three mockup colours corrected for AA stay corrected", () => {
  it.each<[Token, Token]>([
    ["outline", "surface"],
    ["on-success-container", "success-container"],
    ["on-accent-container", "accent-container"],
  ])("%s on %s passes AA", (fg, bg) => {
    expect(contrast(fg, bg)).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
  });
});
