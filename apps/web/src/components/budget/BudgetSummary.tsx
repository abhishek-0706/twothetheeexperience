import { formatMoneyCompact } from "@/lib/core/money";
import type { BudgetPlan } from "@/lib/core/types";
import { formatFractionAsPercent } from "./budget-math";

interface BudgetSummaryProps {
  budget: BudgetPlan;
}

export default function BudgetSummary({ budget }: BudgetSummaryProps) {
  return (
    <section
      aria-labelledby="summary-heading"
      className="luxury-card gold-foil-top bg-surface-container-lowest rounded-xl p-5 relative overflow-hidden"
    >
      <h2 id="summary-heading" className="sr-only">
        Summary
      </h2>
      <div
        aria-hidden="true"
        className="absolute -right-8 -top-8 w-28 h-28 rounded-full bg-secondary-fixed/20 blur-2xl pointer-events-none"
      />
      <dl className="grid grid-cols-3 gap-4 text-center">
        <div>
          <dt className="text-label-sm font-label-sm text-on-surface-variant uppercase">
            Total Budget
          </dt>
          <dd className="text-headline-md font-display text-primary font-semibold mt-1">
            {formatMoneyCompact(budget.total)}
          </dd>
        </div>
        <div className="border-x border-surface-container-high">
          <dt className="text-label-sm font-label-sm text-on-surface-variant uppercase">
            Per Guest
          </dt>
          <dd className="text-headline-md font-display text-primary font-semibold mt-1">
            {formatMoneyCompact(budget.perHead)}
          </dd>
        </div>
        <div>
          <dt className="text-label-sm font-label-sm text-on-surface-variant uppercase">
            Contingency
          </dt>
          <dd className="text-headline-md font-display text-on-success-container font-semibold mt-1">
            {formatFractionAsPercent(budget.contingencyPct)}
          </dd>
        </div>
      </dl>
    </section>
  );
}
