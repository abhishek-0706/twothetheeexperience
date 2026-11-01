import Icon from "@/components/ui/Icon";
import type { RunOfShowItem } from "@/lib/core/types";

const PHOTO_MILESTONE_TAG = "Photo Milestone";

function upcomingBadgeClass(item: RunOfShowItem): string {
  if (item.pinned || item.tag?.includes("Major")) return "bg-tertiary-fixed text-tertiary";
  if (item.tag === PHOTO_MILESTONE_TAG) return "bg-accent-container text-on-accent-container";
  return "bg-surface-container text-on-surface-variant";
}

interface RunOfShowStatusBadgeProps {
  item: RunOfShowItem;
}

export default function RunOfShowStatusBadge({ item }: RunOfShowStatusBadgeProps) {
  if (item.status === "completed") {
    return (
      <span className="px-2 py-0.5 rounded-full bg-success-container text-on-success-container text-label-sm font-label-sm font-semibold border border-success/25 flex items-center gap-1">
        <Icon name="check_circle" className="text-[12px]" filled />
        Completed
      </span>
    );
  }
  if (item.status === "active") {
    return (
      <span className="px-2.5 py-0.5 rounded-full bg-secondary-fixed/50 text-secondary font-label-sm text-label-sm font-bold">
        Now<span className="sr-only">, in progress</span>
      </span>
    );
  }
  return (
    <span
      className={`px-2 py-0.5 rounded-full text-label-sm font-label-sm font-semibold flex items-center gap-1 ${upcomingBadgeClass(item)}`}
    >
      {item.pinned && <Icon name="lock" className="text-[12px]" />}
      {item.tag ?? "Upcoming"}
    </span>
  );
}
