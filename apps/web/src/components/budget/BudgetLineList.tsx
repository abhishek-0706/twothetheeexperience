"use client";

import { useState } from "react";
import Icon from "@/components/ui/Icon";
import type { BudgetPlan } from "@/lib/core/types";
import BudgetLineItem from "./BudgetLineItem";
import ContingencyReserve from "./ContingencyReserve";
import { shareOfTotalPct } from "./budget-math";

const LINES_LIST_ID = "budget-lines";

interface BudgetLineListProps {
  budget: BudgetPlan;
}

export default function BudgetLineList({ budget }: BudgetLineListProps) {
  const [showSources, setShowSources] = useState(false);

  return (
    <section aria-labelledby="allocations-heading" className="space-y-2.5">
      <div className="flex items-center justify-between gap-3">
        <h2 id="allocations-heading" className="font-title-md text-title-md text-primary">
          Category Allocations
        </h2>
        <button
          type="button"
          onClick={() => setShowSources((v) => !v)}
          aria-expanded={showSources}
          aria-controls={LINES_LIST_ID}
          className="min-h-[44px] px-2 text-label-md font-label-md text-secondary font-semibold flex items-center gap-1 hover:underline"
        >
          <Icon name={showSources ? "visibility_off" : "visibility"} className="text-[14px]" />
          {showSources ? "Hide sources" : "Show the math"}
        </button>
      </div>

      <ul id={LINES_LIST_ID} className="space-y-2.5">
        {budget.lines.map((line) => (
          <BudgetLineItem
            key={line.category}
            line={line}
            sharePct={shareOfTotalPct(line, budget)}
            showSources={showSources}
          />
        ))}
        <ContingencyReserve budget={budget} />
      </ul>
    </section>
  );
}
