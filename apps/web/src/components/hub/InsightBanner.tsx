import type { ReactNode } from "react";
import Icon from "@/components/ui/Icon";
import { formatPercent } from "@/lib/client/plan-metrics";
import { formatMoneyCompact } from "@/lib/core/money";
import type { BudgetPlan, Conflict } from "@/lib/core/types";

interface InsightBannerProps {
  budget: BudgetPlan | null;
  conflicts: Conflict[];
}

function insightContent(budget: BudgetPlan | null, conflicts: Conflict[]): ReactNode {
  if (conflicts.length > 0) {
    return (
      <>
        <span className="text-error font-semibold">
          {conflicts.length} issue{conflicts.length > 1 ? "s" : ""} detected.
        </span>{" "}
        {conflicts[0]?.message}
      </>
    );
  }
  if (!budget) return "Loading your plan…";
  return (
    <>
      Budget ready at{" "}
      <span className="text-on-success-container font-semibold">
        {formatMoneyCompact(budget.perHead)} per guest
      </span>
      . {budget.lines.length} categories allocated with {formatPercent(budget.contingencyPct)}%
      contingency.
    </>
  );
}

/** The single most important thing to know about the plan right now. */
export default function InsightBanner({ budget, conflicts }: InsightBannerProps) {
  return (
    <div
      className="rounded-xl p-3.5 bg-surface-container-low/90 border border-outline-variant/30 flex items-start gap-2.5"
      aria-live="polite"
    >
      <Icon name="auto_awesome" className="text-secondary shrink-0 mt-0.5" filled />
      <p className="font-body-md text-body-md text-primary font-medium leading-snug">
        {insightContent(budget, conflicts)}
      </p>
    </div>
  );
}
