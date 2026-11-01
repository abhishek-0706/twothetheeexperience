import type { BudgetLine, BudgetPlan } from "@/lib/core/types";

/** Largest-remainder splits can leave at most one paisa of rounding. */
export const SUM_TOLERANCE_MINOR = 1;

const PERCENT = 100;

export interface InvariantCheck {
  linesSumMinor: number;
  diffMinor: number;
  passes: boolean;
}

export function checkBudgetInvariant(plan: BudgetPlan): InvariantCheck {
  const linesSumMinor = plan.lines.reduce((acc, line) => acc + line.allocated.amountMinor, 0);
  const diffMinor = Math.abs(
    plan.total.amountMinor - (linesSumMinor + plan.contingency.amountMinor)
  );
  return { linesSumMinor, diffMinor, passes: diffMinor <= SUM_TOLERANCE_MINOR };
}

/** Line share of the total budget, 0–100. */
export function shareOfTotalPct(line: BudgetLine, plan: BudgetPlan): number {
  return (line.allocated.amountMinor / plan.total.amountMinor) * PERCENT;
}

/** 0.08 → "8%". */
export function formatFractionAsPercent(fraction: number): string {
  return `${(fraction * PERCENT).toFixed(0)}%`;
}
