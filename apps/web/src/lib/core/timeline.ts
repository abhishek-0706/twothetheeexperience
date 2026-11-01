import type { EventBrief, TimelineTask } from "./types";
import { TimelineTaskSchema } from "./types";
import { TASK_TEMPLATES } from "../locale/in-IN";

/**
 * Deterministic timeline generator.
 *
 * Maps locale-defined task templates onto concrete due dates by subtracting
 * tMinusDays from the event date. Skips tasks whose due date is already past.
 * Pure function, no side effects, no model calls.
 */

function parseDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function subtractDays(iso: string, days: number): string {
  const date = parseDate(iso);
  date.setDate(date.getDate() - days);
  return formatDate(date);
}

function todayISO(): string {
  return formatDate(new Date());
}

export function generateTimeline(brief: EventBrief): TimelineTask[] {
  const { eventFamily, eventDate } = brief;
  const today = todayISO();

  const applicable = TASK_TEMPLATES.filter((t) =>
    t.families.includes(eventFamily)
  );

  const tasks: TimelineTask[] = [];

  for (const template of applicable) {
    const dueDate = subtractDays(eventDate, template.tMinusDays);

    // Skip tasks whose due date is in the past
    if (dueDate < today) continue;

    const task: TimelineTask = TimelineTaskSchema.parse({
      id: template.id,
      title: template.title,
      category: template.category,
      tMinusDays: template.tMinusDays,
      dueDate,
      dependsOn: template.dependsOn,
      status: "todo",
      priority: template.priority,
      subEventId: null,
      whyItMatters: template.whyItMatters,
    });

    tasks.push(task);
  }

  // Sort by dueDate ascending
  tasks.sort((a, b) => (a.dueDate < b.dueDate ? -1 : a.dueDate > b.dueDate ? 1 : 0));

  return tasks;
}
