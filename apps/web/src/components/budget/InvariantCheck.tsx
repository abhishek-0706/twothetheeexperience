import Icon from "@/components/ui/Icon";
import { formatMoney } from "@/lib/core/money";
import type { BudgetPlan } from "@/lib/core/types";
import { SUM_TOLERANCE_MINOR, checkBudgetInvariant } from "./budget-math";

interface InvariantCheckProps {
  budget: BudgetPlan;
}

/** Shows the lines + contingency === total proof so the arithmetic is auditable on screen. */
export default function InvariantCheck({ budget }: InvariantCheckProps) {
  const { linesSumMinor, diffMinor, passes } = checkBudgetInvariant(budget);

  return (
    <section
      aria-labelledby="invariant-heading"
      className="bg-surface-container rounded-xl p-4 border border-outline-variant/30"
    >
      <h2
        id="invariant-heading"
        className="font-title-md text-title-md text-primary font-semibold flex items-center gap-2 mb-2"
      >
        <Icon
          name={passes ? "verified" : "error"}
          className={`text-[18px] ${passes ? "text-success" : "text-error"}`}
        />
        Invariant Verification
      </h2>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-label-sm text-on-surface-variant font-mono">
        <dt>Sum of lines</dt>
        <dd>{formatMoney({ amountMinor: linesSumMinor, currency: budget.total.currency })}</dd>
        <dt>Contingency</dt>
        <dd>{formatMoney(budget.contingency)}</dd>
        <dt>Total</dt>
        <dd>{formatMoney(budget.total)}</dd>
        <dt>Difference</dt>
        <dd>
          {diffMinor} paise (tolerance: {SUM_TOLERANCE_MINOR})
        </dd>
      </dl>
      {passes ? (
        <p className="text-on-success-container font-semibold mt-2 flex items-center gap-1 text-label-sm">
          <Icon name="check_circle" className="text-[14px]" />
          All invariants pass
        </p>
      ) : (
        <p
          role="alert"
          className="text-error font-semibold mt-2 flex items-center gap-1 text-label-sm"
        >
          <Icon name="error" className="text-[14px]" />
          Invariant failed: lines plus contingency do not equal the total
        </p>
      )}
    </section>
  );
}
