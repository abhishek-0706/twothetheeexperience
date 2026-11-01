import { guardrailEvent } from "./events";
import type { CurrencyFigure, TraceabilityResult } from "./types";

const FIGURE_PATTERN =
  /(₹|\$|€|£|\brs\.?|\binr\b)?\s?(\d+(?:,\d+)*(?:\.\d+)?)\s*(crores?|cr|lakhs?|lacs?|l|k)?\b/gi;

const UNIT_MULTIPLIER: Readonly<Record<string, number>> = {
  crore: 1e7,
  crores: 1e7,
  cr: 1e7,
  lakh: 1e5,
  lakhs: 1e5,
  lac: 1e5,
  lacs: 1e5,
  l: 1e5,
  k: 1e3,
};

/** Units that mark a currency amount even without a ₹/Rs prefix ("28.4 lakh"). */
const STANDALONE_UNITS = new Set(["crore", "crores", "cr", "lakh", "lakhs", "lac", "lacs"]);

const WITHHELD = "[estimate withheld]";

/** Extract currency amounts, understanding ₹28.4L, 1.2 crore, ₹2,50,000 and Rs. 500. */
export function extractCurrencyFigures(text: string): CurrencyFigure[] {
  const figures: CurrencyFigure[] = [];
  for (const match of text.matchAll(FIGURE_PATTERN)) {
    const [whole, prefix, digits, rawUnit] = match;
    const unit = rawUnit?.toLowerCase();
    if (!digits || (!prefix && !(unit && STANDALONE_UNITS.has(unit)))) continue;

    const value = Number.parseFloat(digits.replace(/,/g, ""));
    if (!Number.isFinite(value)) continue;

    const multiplier = (unit && UNIT_MULTIPLIER[unit]) || 1;
    const decimals = digits.split(".")[1]?.length ?? 0;
    const leading = whole.length - whole.trimStart().length;
    figures.push({
      raw: whole.trim(),
      index: (match.index ?? 0) + leading,
      rupees: value * multiplier,
      tolerance: multiplier > 1 ? 0.5 * 10 ** -decimals * multiplier + 1 : 1,
    });
  }
  return figures;
}

interface MoneyLike {
  amountMinor: number;
  currency: string;
}

function isMoneyLike(value: Record<string, unknown>): value is Record<string, unknown> & MoneyLike {
  return typeof value.amountMinor === "number" && typeof value.currency === "string";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Every rupee amount a reply may quote this turn: Money values and quoted figures from tool
 * results, plus figures the user stated themselves (echoing them is not invention).
 */
export function collectTraceableFigures(
  toolResults: readonly unknown[],
  userTexts: readonly string[]
): number[] {
  const allowed: number[] = [];
  const visit = (value: unknown): void => {
    if (typeof value === "string") {
      allowed.push(...extractCurrencyFigures(value).map((f) => f.rupees));
    } else if (Array.isArray(value)) {
      value.forEach(visit);
    } else if (isRecord(value)) {
      if (isMoneyLike(value)) allowed.push(value.amountMinor / 100);
      Object.values(value).forEach(visit);
    }
  };

  toolResults.forEach(visit);
  for (const text of userTexts) allowed.push(...extractCurrencyFigures(text).map((f) => f.rupees));
  return allowed;
}

/** Fail the turn if any currency figure in the reply does not trace to an allowed value. */
export function postflightTraceability(
  modelText: string,
  allowedRupees: Iterable<number>
): TraceabilityResult {
  const start = Date.now();
  const allowed = [...allowedRupees];
  const untraceable = extractCurrencyFigures(modelText).filter(
    (figure) => !allowed.some((value) => Math.abs(value - figure.rupees) <= figure.tolerance)
  );
  const event =
    untraceable.length > 0
      ? guardrailEvent(
          "figure-traceability",
          "block",
          start,
          `${untraceable.length} untraceable figure(s)`
        )
      : guardrailEvent("figure-traceability", "pass", start);

  return {
    passed: untraceable.length === 0,
    events: [event],
    violations: untraceable.map((f) => `Currency figure "${f.raw}" not found in tool results`),
    untraceable,
  };
}

/** Replace untraceable figures in place so no invented amount reaches the user. */
export function redactUntraceableFigures(
  text: string,
  untraceable: readonly CurrencyFigure[]
): string {
  return [...untraceable]
    .sort((a, b) => b.index - a.index)
    .reduce(
      (acc, figure) =>
        acc.slice(0, figure.index) + WITHHELD + acc.slice(figure.index + figure.raw.length),
      text
    );
}
