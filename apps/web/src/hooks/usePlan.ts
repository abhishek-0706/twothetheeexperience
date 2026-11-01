import { useEffect, useState } from "react";
import type { BudgetPlan, Conflict, EventBrief, TimelineTask } from "@/lib/core/types";

export interface PlanState {
  budget: BudgetPlan | null;
  tasks: TimelineTask[];
  conflicts: Conflict[];
  /** Null until mounted, so server and client render identical HTML. */
  nowMs: number | null;
  toggleTask: (id: string) => void;
}

/** Builds the deterministic plan (budget, timeline, conflicts) for a brief on the client. */
export function usePlan(brief: EventBrief): PlanState {
  const [budget, setBudget] = useState<BudgetPlan | null>(null);
  const [tasks, setTasks] = useState<TimelineTask[]>([]);
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [nowMs, setNowMs] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadPlan(): Promise<void> {
      const [{ allocateBudget }, { generateTimeline }, { detectConflicts }] = await Promise.all([
        import("@/lib/core/budget"),
        import("@/lib/core/timeline"),
        import("@/lib/core/conflicts"),
      ]);
      if (cancelled) return;
      const plan = allocateBudget(brief);
      const timeline = generateTimeline(brief);
      setBudget(plan);
      setTasks(timeline);
      setConflicts(detectConflicts(brief, plan, timeline));
    }

    setNowMs(Date.now());
    void loadPlan();
    return () => {
      cancelled = true;
    };
  }, [brief]);

  function toggleTask(id: string): void {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: t.status === "done" ? "todo" : "done" } : t))
    );
  }

  return { budget, tasks, conflicts, nowMs, toggleTask };
}
