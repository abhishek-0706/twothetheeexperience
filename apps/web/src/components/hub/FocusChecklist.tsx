"use client";

import { useId, useState } from "react";
import type { TimelineTask } from "@/lib/core/types";
import FocusTaskItem from "./FocusTaskItem";

const FOCUS_TASK_COUNT = 3;

interface FocusChecklistProps {
  /** Already sorted by due date. */
  tasks: TimelineTask[];
  nowMs: number | null;
  onToggle: (id: string) => void;
}

export default function FocusChecklist({ tasks, nowMs, onToggle }: FocusChecklistProps) {
  const [showAll, setShowAll] = useState(false);
  const listId = useId();
  const visible = showAll ? tasks : tasks.slice(0, FOCUS_TASK_COUNT);

  return (
    <section aria-labelledby="focus-heading" className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2
            id="focus-heading"
            className="font-headline-sm text-headline-sm text-primary font-semibold"
          >
            Active Focus
          </h2>
          <p className="font-body-md text-label-sm text-on-surface-variant">
            Top priority tasks coming up
          </p>
        </div>
        <button
          type="button"
          aria-expanded={showAll}
          aria-controls={listId}
          onClick={() => setShowAll((v) => !v)}
          className="min-h-[44px] px-2 text-label-md font-label-md text-secondary font-semibold hover:underline"
        >
          {showAll ? "Show fewer" : `View all (${tasks.length})`}
        </button>
      </div>
      <ul id={listId} className="space-y-2.5">
        {visible.map((task) => (
          <FocusTaskItem key={task.id} task={task} nowMs={nowMs} onToggle={onToggle} />
        ))}
      </ul>
    </section>
  );
}
