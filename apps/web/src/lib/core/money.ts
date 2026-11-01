import type { Money } from "./types";

/**
 * Integer minor-unit arithmetic. No floats, ever.
 *
 * BUILD_PROMPT.md §3: the model never does arithmetic. Every rupee a user sees comes
 * through this module.
 */

export function money(amountMinor: number, currency = "INR"): Money {
  if (!Number.isInteger(amountMinor)) {
    throw new Error(`Money must be integer minor units, got ${amountMinor}`);
  }
  return { amountMinor, currency };
}

export function fromMajor(amountMajor: number, currency = "INR"): Money {
  return money(Math.round(amountMajor * 100), currency);
}

function assertSameCurrency(a: Money, b: Money): void {
  if (a.currency !== b.currency) {
    throw new Error(`Currency mismatch: ${a.currency} vs ${b.currency}`);
  }
}

export function add(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return money(a.amountMinor + b.amountMinor, a.currency);
}

export function subtract(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return money(a.amountMinor - b.amountMinor, a.currency);
}

export function sum(items: Money[], currency = "INR"): Money {
  if (items.length === 0) return money(0, currency);
  return items.reduce((acc, m) => add(acc, m));
}

/** Floor division — the remainder is redistributed by largestRemainder, never dropped. */
export function multiplyByFraction(m: Money, fraction: number): Money {
  return money(Math.floor(m.amountMinor * fraction), m.currency);
}

export function divideBy(m: Money, divisor: number): Money {
  if (divisor === 0) throw new Error("Division by zero");
  return money(Math.round(m.amountMinor / divisor), m.currency);
}

export function isZero(m: Money): boolean {
  return m.amountMinor === 0;
}

/**
 * Split `total` across `weights` so the parts sum EXACTLY to the total.
 *
 * Naive percentage splits lose or invent paise through rounding, which is precisely the
 * class of bug that makes a budget tool untrustworthy. Largest-remainder apportionment
 * distributes the rounding residue deterministically.
 */
export function largestRemainderSplit(total: Money, weights: number[]): Money[] {
  if (weights.length === 0) return [];
  const weightSum = weights.reduce((a, b) => a + b, 0);
  if (weightSum <= 0) {
    throw new Error("Weights must sum to a positive number");
  }

  const exact = weights.map((w) => (total.amountMinor * w) / weightSum);
  const floored = exact.map((e) => Math.floor(e));
  let residue = total.amountMinor - floored.reduce((a, b) => a + b, 0);

  const order = exact
    .map((e, i) => ({ i, frac: e - Math.floor(e) }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i);

  const result = [...floored];
  let k = 0;
  while (residue > 0 && order.length > 0) {
    result[order[k % order.length].i] += 1;
    residue -= 1;
    k += 1;
  }

  return result.map((amount) => money(amount, total.currency));
}

const FORMATTERS = new Map<string, Intl.NumberFormat>();

export function formatMoney(m: Money, locale = "en-IN"): string {
  const key = `${locale}:${m.currency}`;
  let fmt = FORMATTERS.get(key);
  if (!fmt) {
    fmt = new Intl.NumberFormat(locale, {
      style: "currency",
      currency: m.currency,
      maximumFractionDigits: 0,
    });
    FORMATTERS.set(key, fmt);
  }
  return fmt.format(m.amountMinor / 100);
}

/**
 * Indian numbering: ₹28.4L / ₹1.2Cr. Western: $28.4k.
 * A premium Indian user reads lakhs, not "2,840,000".
 */
export function formatMoneyCompact(m: Money, locale = "en-IN"): string {
  const major = m.amountMinor / 100;
  const symbol = m.currency === "INR" ? "₹" : m.currency === "USD" ? "$" : `${m.currency} `;

  if (locale === "en-IN" || m.currency === "INR") {
    if (Math.abs(major) >= 1e7) return `${symbol}${(major / 1e7).toFixed(2).replace(/\.00$/, "")}Cr`;
    if (Math.abs(major) >= 1e5) return `${symbol}${(major / 1e5).toFixed(1).replace(/\.0$/, "")}L`;
    if (Math.abs(major) >= 1e3) return `${symbol}${(major / 1e3).toFixed(1).replace(/\.0$/, "")}k`;
    return `${symbol}${Math.round(major)}`;
  }

  if (Math.abs(major) >= 1e6) return `${symbol}${(major / 1e6).toFixed(1)}M`;
  if (Math.abs(major) >= 1e3) return `${symbol}${(major / 1e3).toFixed(1)}k`;
  return `${symbol}${Math.round(major)}`;
}
