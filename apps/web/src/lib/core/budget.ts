import type { BudgetLine, BudgetPlan, EventBrief } from "./types";
import { BudgetPlanSchema } from "./types";
import { divideBy, largestRemainderSplit, multiplyByFraction, subtract, sum } from "./money";
import { CATEGORIES, LOCALE_IN_IN, citationFor } from "../locale/in-IN";

const CONTINGENCY_FLOOR = 0.05;
const MAX_DRIFT_MINOR = 1;

/**
 * Splits the budget across locale categories with largest-remainder apportionment, so the
 * lines plus contingency sum exactly to the total. Pure: no I/O, no model calls.
 */
export function allocateBudget(brief: EventBrief): BudgetPlan {
  const { budget, eventFamily, guestCount, cityTier } = brief;
  const contingencyPct = LOCALE_IN_IN.contingencyPctDefault;

  if (contingencyPct < CONTINGENCY_FLOOR) {
    throw new Error(`Contingency percentage ${contingencyPct} is below the 5% floor`);
  }

  const contingency = multiplyByFraction(budget, contingencyPct);
  const allocatable = subtract(budget, contingency);

  const relevant = CATEGORIES.flatMap((cat) => {
    const weight = cat.weights[eventFamily];
    return weight === undefined ? [] : [{ cat, weight }];
  });
  if (relevant.length === 0) {
    throw new Error(`No categories found for event family "${eventFamily}"`);
  }

  const weights = relevant.map((r) => r.weight);
  const weightSum = weights.reduce((a, b) => a + b, 0);
  const amounts = largestRemainderSplit(allocatable, weights);

  const lines: BudgetLine[] = relevant.map(({ cat, weight }, i) => ({
    category: cat.key,
    label: cat.label,
    allocated: amounts[i] ?? allocatable,
    rationale: `${((weight / weightSum) * 100).toFixed(1)}% of allocatable budget (weight ${weight}/${weightSum}) for ${eventFamily}`,
    sourceCitation: citationFor(cat.key, cityTier),
    isLocked: false,
  }));

  const linesTotal = sum(
    lines.map((l) => l.allocated),
    budget.currency
  );
  const reconstructed = linesTotal.amountMinor + contingency.amountMinor;
  const drift = Math.abs(reconstructed - budget.amountMinor);
  if (drift > MAX_DRIFT_MINOR) {
    throw new Error(
      `Budget integrity check failed: lines + contingency = ${reconstructed}, total = ${budget.amountMinor}, drift = ${drift}`
    );
  }

  return BudgetPlanSchema.parse({
    total: budget,
    contingency,
    contingencyPct,
    lines,
    perHead: divideBy(allocatable, guestCount),
    assumptions: [
      `Contingency reserved at ${(contingencyPct * 100).toFixed(0)}% of total budget`,
      `Per-head computed on allocatable amount (total minus contingency) divided by ${guestCount} guests`,
      `Category weights sourced from in-IN locale pack for "${eventFamily}" events`,
      `Cost citations based on ${cityTier} tier pricing`,
    ],
  });
}
