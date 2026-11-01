import Icon from "@/components/ui/Icon";
import ProgressBar from "@/components/ui/ProgressBar";
import { formatMoneyCompact } from "@/lib/core/money";
import type { BudgetLine } from "@/lib/core/types";

interface BudgetLineItemProps {
  line: BudgetLine;
  /** Share of the total budget, 0–100. */
  sharePct: number;
  showSources: boolean;
}

export default function BudgetLineItem({ line, sharePct, showSources }: BudgetLineItemProps) {
  const share = sharePct.toFixed(1);

  return (
    <li className="bg-surface-container-lowest rounded-xl p-4 border border-outline-variant/20 shadow-sm">
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-title-md text-body-lg font-semibold text-primary">{line.label}</h3>
        <p className="text-right">
          <span className="font-title-md text-title-md text-primary block">
            {formatMoneyCompact(line.allocated)}
          </span>
          <span className="font-label-sm text-label-sm text-on-surface-variant">
            {share}%<span className="sr-only"> of total</span>
          </span>
        </p>
      </div>

      <ProgressBar
        value={sharePct}
        label={`${line.label}: ${share}% of total budget`}
        className="h-2 bg-surface-container mt-2"
      />

      {showSources && (
        <div className="mt-3 pt-3 border-t border-surface-container-high space-y-1">
          <p className="text-body-md text-on-surface-variant">{line.rationale}</p>
          {line.sourceCitation && (
            <p className="text-label-sm text-on-surface-variant flex items-center gap-1">
              <Icon name="source" className="text-[12px]" />
              <span className="sr-only">Source: </span>
              {line.sourceCitation}
            </p>
          )}
          {line.isLocked && (
            <p className="inline-flex items-center gap-1 text-label-sm text-secondary font-semibold">
              <Icon name="lock" className="text-[12px]" />
              Locked
            </p>
          )}
        </div>
      )}
    </li>
  );
}
