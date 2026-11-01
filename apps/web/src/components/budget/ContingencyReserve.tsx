import Icon from "@/components/ui/Icon";
import { formatMoneyCompact } from "@/lib/core/money";
import type { BudgetPlan } from "@/lib/core/types";
import { formatFractionAsPercent } from "./budget-math";

interface ContingencyReserveProps {
  budget: BudgetPlan;
}

export default function ContingencyReserve({ budget }: ContingencyReserveProps) {
  return (
    <li className="bg-accent-container rounded-xl p-4 border border-secondary/20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon name="shield" className="text-on-accent-container text-[18px]" />
          <h3 className="font-title-md text-body-lg font-semibold text-on-accent-container">
            Contingency Reserve
          </h3>
        </div>
        <span className="font-title-md text-title-md text-on-accent-container">
          {formatMoneyCompact(budget.contingency)}
        </span>
      </div>
      <p className="text-body-md text-on-accent-container mt-1">
        {formatFractionAsPercent(budget.contingencyPct)} buffer for unexpected costs — venue damage
        deposits, last-minute additions, weather contingencies.
      </p>
    </li>
  );
}
