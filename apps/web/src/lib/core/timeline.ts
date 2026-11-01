import type { EventBrief, TimelineTask } from "./types";
import { TimelineTaskSchema } from "./types";
import { TASK_TEMPLATES } from "../locale/in-IN";

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

function parseDate(iso: string): Date {
  const match = ISO_DATE.exec(iso);
  if (!match) throw new Error(`Expected YYYY-MM-DD, got "${iso}"`);
  const [, y, m, d] = match;
  return new Date(Number(y), Number(m) - 1, Number(d));
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

/**
 * Reverse-plans locale task templates from the event date, dropping tasks already past.
 * `today` is injectable so the function stays deterministic under test.
 */
export function generateTimeline(
  brief: EventBrief,
  today: string = formatDate(new Date())
): TimelineTask[] {
  const { eventFamily, eventDate } = brief;

  return TASK_TEMPLATES.filter((t) => t.families.includes(eventFamily))
    .map((template) => ({ template, dueDate: subtractDays(eventDate, template.tMinusDays) }))
    .filter(({ dueDate }) => dueDate >= today)
    .map(({ template, dueDate }) =>
      TimelineTaskSchema.parse({
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
      })
    )
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}
