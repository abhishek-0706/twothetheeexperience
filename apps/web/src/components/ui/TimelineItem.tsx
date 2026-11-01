import type { RunOfShowItem } from "@/lib/core/types";

interface TimelineItemProps extends RunOfShowItem {
  isActive?: boolean;
}

function formatTime(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  const suffix = h >= 12 ? "PM" : "AM";
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour12}:${m.toString().padStart(2, "0")} ${suffix}`;
}

const statusConfig = {
  completed: {
    dot: "bg-success",
    line: "bg-success/30",
    label: "Completed",
    labelClass: "bg-success-container text-on-success-container",
  },
  active: {
    dot: "bg-secondary ring-4 ring-secondary/20 animate-pulse",
    line: "bg-secondary/30",
    label: "In Progress",
    labelClass: "bg-accent-container text-on-accent-container",
  },
  upcoming: {
    dot: "bg-surface-container-high border-2 border-outline-variant",
    line: "bg-outline-variant/50",
    label: "Upcoming",
    labelClass: "bg-surface-container-high text-on-surface-variant",
  },
} as const;

export default function TimelineItem({
  title,
  startMin,
  durationMin,
  status = "upcoming",
  isActive = false,
  tag,
  vendorLeads,
  location,
  checklist,
}: TimelineItemProps) {
  const cfg = statusConfig[status];
  const endMin = startMin + durationMin;

  return (
    <div className="flex gap-3 relative">
      {/* Connector line + dot */}
      <div className="flex flex-col items-center">
        <div
          className={`w-3 h-3 rounded-full flex-shrink-0 mt-1 ${cfg.dot}`}
          aria-label={`Status: ${cfg.label}`}
        />
        <div className={`w-0.5 flex-1 ${cfg.line}`} />
      </div>

      {/* Card body */}
      <div
        className={`flex-1 pb-6 ${
          isActive ? "border-l-2 border-secondary pl-3 -ml-[1px]" : ""
        }`}
      >
        {/* Time + status */}
        <div className="flex items-center gap-2 mb-1">
          <span className="text-label-md font-label-md text-primary">
            {formatTime(startMin)} &ndash; {formatTime(endMin)}
          </span>
          {tag && (
            <span
              className={`text-label-sm font-label-sm uppercase px-2 py-0.5 rounded-full ${cfg.labelClass}`}
            >
              {tag}
            </span>
          )}
        </div>

        {/* Title */}
        <h3
          className={`text-title-md font-title-md text-primary ${
            status === "completed" ? "line-through opacity-60" : ""
          }`}
        >
          {title}
        </h3>

        {/* Meta: assignee + location */}
        <div className="flex flex-wrap items-center gap-3 mt-1 text-label-sm font-label-sm text-on-surface-variant">
          {vendorLeads.length > 0 && (
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">
                person
              </span>
              {vendorLeads.join(", ")}
            </span>
          )}
          {location && (
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">
                location_on
              </span>
              {location}
            </span>
          )}
        </div>

        {/* Nested checklist */}
        {checklist && checklist.length > 0 && (
          <ul className="mt-2 space-y-1">
            {checklist.map((item) => (
              <li
                key={item.label}
                className="flex items-center gap-2 text-body-md font-body-md text-on-surface-variant"
              >
                <span
                  className={`material-symbols-outlined text-[16px] ${
                    item.done ? "text-success" : "text-outline-variant"
                  }`}
                  style={
                    item.done
                      ? { fontVariationSettings: "'FILL' 1" }
                      : undefined
                  }
                >
                  {item.done ? "check_circle" : "radio_button_unchecked"}
                </span>
                <span className={item.done ? "line-through opacity-60" : ""}>
                  {item.label}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
