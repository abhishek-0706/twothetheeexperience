import { daysBetween, isUrgent } from "@/lib/client/plan-metrics";
import type { TimelineTask } from "@/lib/core/types";

interface DueLabelProps {
  task: TimelineTask;
  nowMs: number | null;
}

/** "Due in Nd" for urgent open tasks, otherwise the due date. */
export default function DueLabel({ task, nowMs }: DueLabelProps) {
  if (nowMs !== null && isUrgent(task, nowMs) && task.status !== "done") {
    return (
      <>
        <span className="sr-only">Urgent: </span>
        Due in {daysBetween(nowMs, task.dueDate)}d
      </>
    );
  }
  return (
    <>
      <span className="sr-only">Due </span>
      <time dateTime={task.dueDate}>{task.dueDate}</time>
    </>
  );
}
