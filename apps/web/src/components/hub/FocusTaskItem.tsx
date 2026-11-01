"use client";

import Icon from "@/components/ui/Icon";
import { isUrgent } from "@/lib/client/plan-metrics";
import type { TimelineTask } from "@/lib/core/types";
import DueLabel from "./DueLabel";

const HIGH_PRIORITY_STYLE = "bg-success-container text-on-success-container border-success/20";
const DEFAULT_PRIORITY_STYLE =
  "bg-surface-container text-on-surface-variant border-outline-variant/20";

interface FocusTaskItemProps {
  task: TimelineTask;
  nowMs: number | null;
  onToggle: (id: string) => void;
}

export default function FocusTaskItem({ task, nowMs, onToggle }: FocusTaskItemProps) {
  const isDone = task.status === "done";
  const showUrgent = isUrgent(task, nowMs) && !isDone;
  const checkboxId = `task-${task.id}`;
  const priorityStyle = task.priority === "high" ? HIGH_PRIORITY_STYLE : DEFAULT_PRIORITY_STYLE;

  return (
    <li className="bg-surface-container-lowest rounded-xl p-3.5 border border-outline-variant/20 hover:border-secondary/40 transition-all flex items-start gap-3 shadow-sm">
      <input
        id={checkboxId}
        type="checkbox"
        checked={isDone}
        onChange={() => onToggle(task.id)}
        className="mt-0.5 w-6 h-6 shrink-0 cursor-pointer accent-success"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-title-md text-body-lg font-semibold truncate">
            <label
              htmlFor={checkboxId}
              className={`cursor-pointer ${isDone ? "line-through text-on-surface-variant" : "text-primary"}`}
            >
              {task.title}
            </label>
          </h3>
          <span
            className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-label-sm font-label-sm border capitalize ${priorityStyle}`}
          >
            <span className="sr-only">Priority: </span>
            {task.priority}
          </span>
        </div>
        <p className="font-body-md text-body-md text-on-surface-variant mt-0.5 line-clamp-1">
          {task.whyItMatters}
        </p>
        <div className="mt-2 flex items-center gap-3 text-label-sm font-label-sm text-on-surface-variant">
          <span
            className={`flex items-center gap-1 ${showUrgent ? "text-error font-semibold" : ""}`}
          >
            <Icon name={showUrgent ? "priority_high" : "event"} className="text-[14px]" />
            <DueLabel task={task} nowMs={nowMs} />
          </span>
          <span aria-hidden="true" className="text-outline">
            &bull;
          </span>
          <span className="flex items-center gap-1 text-secondary">
            <Icon name="auto_awesome" className="text-[14px]" />
            AI prompt ready
          </span>
        </div>
      </div>
    </li>
  );
}
