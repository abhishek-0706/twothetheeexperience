import type { EventBrief, BudgetPlan, BudgetLine } from "./types";
import { BudgetPlanSchema } from "./types";
import {
  multiplyByFraction,
  subtract,
  sum,
  divideBy,
  largestRemainderSplit,
} from "./money";
import { CATEGORIES, LOCALE_IN_IN, citationFor } from "../locale/in-IN";

/**
 * Deterministic budget allocator.
 *
 * Splits the brief's budget across locale-defined categories using
 * largest-remainder apportionment so the lines sum EXACTLY to the total.
 * Pure function, no side effects, no model calls.
 */
export function allocateBudget(brief: EventBrief): BudgetPlan {
  const { budget, eventFamily, guestCount, cityTier } = brief;
  const contingencyPct = LOCALE_IN_IN.contingencyPctDefault;

  if (contingencyPct < 0.05) {
    throw new Error(
      `Contingency percentage ${contingencyPct} is below the 5% floor`
    );
  }

  // Reserve contingency from the total
  const contingency = multiplyByFraction(budget, contingencyPct);
  const allocatable = subtract(budget, contingency);

  // Filter categories to those relevant for this event family
  const relevant = CATEGORIES.filter(
    (cat) => cat.weights[eventFamily] !== undefined
  );

  if (relevant.length === 0) {
    throw new Error(
      `No categories found for event family "${eventFamily}"`
    );
  }

  const weights = relevant.map((cat) => cat.weights[eventFamily]!);

  // Split the allocatable amount across categories
  const amounts = largestRemainderSplit(allocatable, weights);

  const lines: BudgetLine[] = relevant.map((cat, i) => {
    const weightPct = (
      (weights[i] / weights.reduce((a, b) => a + b, 0)) *
      100
    ).toFixed(1);

    return {
      category: cat.key,
      label: cat.label,
      allocated: amounts[i],
      rationale: `${weightPct}% of allocatable budget (weight ${weights[i]}/${weights.reduce((a, b) => a + b, 0)}) for ${eventFamily}`,
      sourceCitation: citationFor(cat.key, cityTier),
      isLocked: false,
    };
  });

  // Validate: lines + contingency === total (tolerance +/- 1 minor unit)
  const linesTotal = sum(
    lines.map((l) => l.allocated),
    budget.currency
  );
  const reconstructed = linesTotal.amountMinor + contingency.amountMinor;
  const drift = Math.abs(reconstructed - budget.amountMinor);
  if (drift > 1) {
    throw new Error(
      `Budget integrity check failed: lines + contingency = ${reconstructed}, total = ${budget.amountMinor}, drift = ${drift}`
    );
  }

  const perHead = divideBy(allocatable, guestCount);

  const plan: BudgetPlan = {
    total: budget,
    contingency,
    contingencyPct,
    lines,
    perHead,
    assumptions: [
      `Contingency reserved at ${(contingencyPct * 100).toFixed(0)}% of total budget`,
      `Per-head computed on allocatable amount (total minus contingency) divided by ${guestCount} guests`,
      `Category weights sourced from in-IN locale pack for "${eventFamily}" events`,
      `Cost citations based on ${cityTier} tier pricing`,
    ],
  };

  return BudgetPlanSchema.parse(plan);
}
