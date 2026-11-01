"use client";

interface TaskCardProps {
  title: string;
  description?: string;
  priority?: "high" | "medium" | "low";
  dueLabel?: string;
  dueSeverity?: "urgent" | "normal";
  hint?: string;
  checked?: boolean;
  onCheck?: (checked: boolean) => void;
}

const priorityStyles: Record<string, string> = {
  high: "bg-tertiary-fixed text-on-tertiary-fixed",
  medium: "bg-accent-container text-on-accent-container",
  low: "bg-surface-container-high text-on-surface-variant",
};

export default function TaskCard({
  title,
  description,
  priority,
  dueLabel,
  dueSeverity = "normal",
  hint,
  checked = false,
  onCheck,
}: TaskCardProps) {
  return (
    <div className="luxury-card rounded-xl bg-surface-container-lowest p-space-md flex gap-3">
      {/* Checkbox */}
      <button
        role="checkbox"
        aria-checked={checked}
        onClick={() => onCheck?.(!checked)}
        className={`mt-0.5 w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all duration-150 ${
          checked
            ? "bg-success border-success text-on-primary"
            : "border-outline-variant hover:border-secondary"
        }`}
      >
        {checked && (
          <span className="material-symbols-outlined text-[14px] text-white">
            check
          </span>
        )}
      </button>

      {/* Content */}
      <div className="flex flex-col gap-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`text-title-md font-title-md text-primary ${
              checked ? "line-through opacity-50" : ""
            }`}
          >
            {title}
          </span>
          {priority && (
            <span
              className={`text-label-sm font-label-sm uppercase px-2 py-0.5 rounded-full ${priorityStyles[priority]}`}
            >
              {priority}
            </span>
          )}
        </div>

        {description && (
          <p className="text-body-md font-body-md text-on-surface-variant line-clamp-1">
            {description}
          </p>
        )}

        <div className="flex items-center gap-3 mt-0.5">
          {dueLabel && (
            <span
              className={`text-label-sm font-label-sm flex items-center gap-1 ${
                dueSeverity === "urgent" ? "text-error" : "text-on-surface-variant"
              }`}
            >
              <span className="material-symbols-outlined text-[14px]">
                schedule
              </span>
              {dueLabel}
            </span>
          )}
          {hint && (
            <span className="text-label-sm font-label-sm text-secondary flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">
                auto_awesome
              </span>
              {hint}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
