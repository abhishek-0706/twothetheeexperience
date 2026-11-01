import type { RunOfShowItem } from "@/lib/core/types";

interface RunOfShowChecklistProps {
  itemId: string;
  checklist: RunOfShowItem["checklist"];
  onToggle: (index: number) => void;
}

export default function RunOfShowChecklist({
  itemId,
  checklist,
  onToggle,
}: RunOfShowChecklistProps) {
  const headingId = `checklist-${itemId}`;

  return (
    <div className="mt-3 pt-3 border-t border-surface-container-high">
      <h4
        id={headingId}
        className="text-label-sm font-label-sm text-outline font-semibold uppercase mb-1.5"
      >
        Day-Of Checklist
      </h4>
      <ul aria-labelledby={headingId} className="flex flex-col gap-1.5">
        {checklist.map((check, index) => (
          <li key={check.label}>
            <label className="flex items-center gap-2 min-h-[24px] cursor-pointer">
              <input
                type="checkbox"
                checked={check.done}
                onChange={() => onToggle(index)}
                className="w-5 h-5 shrink-0 accent-success"
              />
              <span
                className={`text-body-md font-body-md text-on-surface ${check.done ? "line-through" : ""}`}
              >
                {check.label}
              </span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}
