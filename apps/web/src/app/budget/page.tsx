"use client";

import BudgetAssumptions from "@/components/budget/BudgetAssumptions";
import BudgetLineList from "@/components/budget/BudgetLineList";
import BudgetSkeleton from "@/components/budget/BudgetSkeleton";
import BudgetSummary from "@/components/budget/BudgetSummary";
import InvariantCheck from "@/components/budget/InvariantCheck";
import { useDemoBudget } from "@/components/budget/useDemoBudget";
import { formatMoneyCompact } from "@/lib/core/money";

export default function BudgetPage() {
  const budget = useDemoBudget();

  return (
    <main
      className="pt-20 px-margin max-w-md mx-auto flex flex-col gap-space-lg pb-36"
      aria-busy={!budget}
    >
      <header className="pt-2">
        <p className="text-label-md font-label-md text-secondary uppercase tracking-widest font-semibold mb-0.5">
          Financial Planning
        </p>
        <h1 className="text-headline-lg-mobile font-display text-primary font-semibold">
          Budget Breakdown
        </h1>
      </header>

      <p role="status" className="sr-only">
        {budget
          ? `Budget ready: ${formatMoneyCompact(budget.total)} across ${budget.lines.length} categories.`
          : "Loading budget…"}
      </p>

      {budget ? (
        <>
          <BudgetSummary budget={budget} />
          <BudgetLineList budget={budget} />
          <InvariantCheck budget={budget} />
          <BudgetAssumptions assumptions={budget.assumptions} />
        </>
      ) : (
        <BudgetSkeleton />
      )}
    </main>
  );
}
