import type { RunOfShowItem } from "@/lib/core/types";

const MINUTES_PER_HOUR = 60;
const HOURS_PER_HALF_DAY = 12;

const longDayFormat = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
  timeZone: "UTC",
});

/** 12-hour clock label, e.g. 945 → "3:45 PM". */
export function minutesToTime(mins: number): string {
  const h = Math.floor(mins / MINUTES_PER_HOUR);
  const m = mins % MINUTES_PER_HOUR;
  const ampm = h >= HOURS_PER_HALF_DAY ? "PM" : "AM";
  const h12 = h === 0 ? HOURS_PER_HALF_DAY : h > HOURS_PER_HALF_DAY ? h - HOURS_PER_HALF_DAY : h;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

/** HH:MM for the <time dateTime> attribute. */
export function isoTime(mins: number): string {
  const h = Math.floor(mins / MINUTES_PER_HOUR);
  return `${String(h).padStart(2, "0")}:${String(mins % MINUTES_PER_HOUR).padStart(2, "0")}`;
}

/** Fixed locale and UTC so server and client render the same text. */
export function formatLongDay(isoDate: string): string {
  return longDayFormat.format(new Date(`${isoDate}T00:00:00Z`));
}

export function minutesSinceMidnight(date: Date): number {
  return date.getHours() * MINUTES_PER_HOUR + date.getMinutes();
}

export function endMinute(item: RunOfShowItem): number {
  return item.startMin + item.durationMin;
}

export function uniqueVendorLeads(items: RunOfShowItem[]): string[] {
  return [...new Set(items.flatMap((item) => item.vendorLeads))];
}

export function toggleChecklistItem(
  items: RunOfShowItem[],
  itemId: string,
  index: number
): RunOfShowItem[] {
  return items.map((item) =>
    item.id === itemId
      ? {
          ...item,
          checklist: item.checklist.map((c, i) => (i === index ? { ...c, done: !c.done } : c)),
        }
      : item
  );
}
