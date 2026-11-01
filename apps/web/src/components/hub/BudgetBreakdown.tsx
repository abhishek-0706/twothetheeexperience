import ProgressBar from "@/components/ui/ProgressBar";
import { formatPercent, toPercent } from "@/lib/client/plan-metrics";
import { formatMoneyCompact } from "@/lib/core/money";
import type { BudgetPlan } from "@/lib/core/types";

const LINE_PERCENT_DIGITS = 1;

interface BudgetBreakdownProps {
  budget: BudgetPlan;
}

export default function BudgetBreakdown({ budget }: BudgetBreakdownProps) {
  return (
    <section aria-labelledby="hub-budget-heading" className="space-y-3">
      <h2
        id="hub-budget-heading"
        className="font-headline-sm text-headline-sm text-primary font-semibold"
      >
        Budget Allocation
      </h2>
      <ul className="space-y-2">
        {budget.lines.map((line) => {
          const share = line.allocated.amountMinor / budget.total.amountMinor;
          const sharePct = formatPercent(share, LINE_PERCENT_DIGITS);
          return (
            <li
              key={line.category}
              className="bg-surface-container-lowest rounded-xl p-3 border border-outline-variant/20 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <span className="font-title-md text-body-md font-semibold text-primary">
                  {line.label}
                </span>
                <span className="font-title-md text-title-md text-primary">
                  {formatMoneyCompact(line.allocated)}
                </span>
              </div>
              <ProgressBar
                value={toPercent(share)}
                label={`${line.label}: ${sharePct}% of total budget`}
                className="h-1 bg-surface-container mt-2"
              />
              <details className="mt-1.5">
                <summary className="inline-flex min-h-[24px] items-center text-label-sm font-semibold text-secondary">
                  Show the math<span className="sr-only"> for {line.label}</span>
                </summary>
                <p className="mt-1 text-label-sm text-on-surface-variant">{line.rationale}</p>
                {line.sourceCitation && (
                  <p className="mt-0.5 text-[11px] text-on-surface-variant">
                    Source: {line.sourceCitation}
                  </p>
                )}
              </details>
            </li>
          );
        })}
        <li className="bg-accent-container rounded-xl p-3 border border-secondary/20">
          <div className="flex items-center justify-between">
            <span className="font-title-md text-body-md font-semibold text-on-accent-container">
              Contingency ({formatPercent(budget.contingencyPct)}%)
            </span>
            <span className="font-title-md text-title-md text-on-accent-container">
              {formatMoneyCompact(budget.contingency)}
            </span>
          </div>
        </li>
      </ul>
    </section>
  );
}
