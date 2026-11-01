import type { TimelineTask } from "@/lib/core/types";

const DAY_MS = 1000 * 60 * 60 * 24;
const PERCENT = 100;

export const URGENT_WITHIN_DAYS = 14;

export function toPercent(fraction: number): number {
  return fraction * PERCENT;
}

/** Formats a 0–1 fraction as a percentage string without the % sign. */
export function formatPercent(fraction: number, digits = 0): string {
  return toPercent(fraction).toFixed(digits);
}

export function daysBetween(fromMs: number, isoDate: string): number {
  return Math.ceil((new Date(isoDate).getTime() - fromMs) / DAY_MS);
}

export function isUrgent(task: TimelineTask, nowMs: number | null): boolean {
  return nowMs !== null && daysBetween(nowMs, task.dueDate) <= URGENT_WITHIN_DAYS;
}

export interface PlanMetrics {
  daysToGo: number | null;
  completedTasks: number;
  readiness: number;
  urgentCount: number;
  sortedTasks: TimelineTask[];
}

export function computePlanMetrics(
  tasks: TimelineTask[],
  eventDate: string,
  nowMs: number | null
): PlanMetrics {
  const completedTasks = tasks.filter((t) => t.status === "done").length;
  return {
    daysToGo: nowMs === null ? null : Math.max(0, daysBetween(nowMs, eventDate)),
    completedTasks,
    readiness: tasks.length > 0 ? Math.round((completedTasks / tasks.length) * PERCENT) : 0,
    urgentCount: tasks.filter((t) => t.status !== "done" && isUrgent(t, nowMs)).length,
    sortedTasks: [...tasks].sort((a, b) => a.dueDate.localeCompare(b.dueDate)),
  };
}
