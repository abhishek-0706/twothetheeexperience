import type { RunOfShowItem } from "@/lib/core/types";
import RunOfShowChecklist from "./RunOfShowChecklist";
import RunOfShowDetails from "./RunOfShowDetails";
import RunOfShowStatusBadge from "./RunOfShowStatusBadge";
import TimeRange from "./TimeRange";
import { endMinute } from "./time";

const MARKER_CLASS: Record<RunOfShowItem["status"], { ring: string; dot: string }> = {
  completed: { ring: "bg-success-container border-2 border-success", dot: "bg-success" },
  active: {
    ring: "bg-secondary-container border-2 border-secondary shadow-sm animate-pulse",
    dot: "bg-primary-container",
  },
  upcoming: { ring: "bg-surface-container-highest border-2 border-outline", dot: "bg-outline" },
};

interface RunOfShowEntryProps {
  item: RunOfShowItem;
  onToggleCheck: (index: number) => void;
}

export default function RunOfShowEntry({ item, onToggleCheck }: RunOfShowEntryProps) {
  const isActive = item.status === "active";
  const marker = MARKER_CLASS[item.status];
  const headingId = `ros-${item.id}`;

  return (
    <li className="relative" aria-current={isActive ? "step" : undefined}>
      <div
        aria-hidden="true"
        className={`absolute -left-6 top-3 w-5 h-5 rounded-full flex items-center justify-center z-10 ${marker.ring}`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${marker.dot}`} />
      </div>

      <article
        aria-labelledby={headingId}
        className={`luxury-card bg-surface-container-lowest rounded-xl p-space-md transition-all hover:border-secondary/30 ${
          isActive ? "border-l-4 border-l-secondary ring-1 ring-secondary/20" : ""
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <span
            className={`text-label-sm font-label-sm font-bold tracking-wider ${
              item.status === "upcoming" ? "text-outline" : "text-secondary"
            }`}
          >
            <TimeRange start={item.startMin} end={endMinute(item)} />
          </span>
          <RunOfShowStatusBadge item={item} />
        </div>
        <h3 id={headingId} className="text-title-md font-title-md text-primary mt-1">
          {item.title}
        </h3>
        <RunOfShowDetails item={item} />
        {item.checklist.length > 0 && (
          <RunOfShowChecklist
            itemId={item.id}
            checklist={item.checklist}
            onToggle={onToggleCheck}
          />
        )}
      </article>
    </li>
  );
}
