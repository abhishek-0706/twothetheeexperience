import { useEffect, useState } from "react";
import type { BudgetPlan } from "@/lib/core/types";
import { DEMO_BRIEF } from "@/lib/demo/brief";

/** Allocates the demo brief on the client; null until the engine chunk has loaded. */
export function useDemoBudget(): BudgetPlan | null {
  const [budget, setBudget] = useState<BudgetPlan | null>(null);

  useEffect(() => {
    async function load() {
      const { allocateBudget } = await import("@/lib/core/budget");
      setBudget(allocateBudget(DEMO_BRIEF));
    }
    void load();
  }, []);

  return budget;
}
