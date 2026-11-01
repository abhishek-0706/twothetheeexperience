import Icon from "@/components/ui/Icon";
import type { Conflict } from "@/lib/core/types";

interface ConflictListProps {
  conflicts: Conflict[];
}

export default function ConflictList({ conflicts }: ConflictListProps) {
  return (
    <section
      aria-labelledby="conflicts-heading"
      className="bg-error-container rounded-xl p-4 border border-error/20"
    >
      <h2
        id="conflicts-heading"
        className="font-title-md text-title-md text-on-error-container font-semibold flex items-center gap-2"
      >
        <Icon name="warning" className="text-[18px]" />
        Plan Conflicts ({conflicts.length})
      </h2>
      <ul className="mt-2 space-y-1.5">
        {conflicts.map((c) => {
          const isBlocker = c.severity === "blocker";
          return (
            <li
              key={`${c.kind}-${c.message}`}
              className="text-body-md text-on-error-container flex items-start gap-2"
            >
              <Icon name={isBlocker ? "block" : "error"} className="shrink-0 mt-0.5 text-[16px]" />
              <span>
                <span className="font-semibold">{isBlocker ? "Blocker: " : "Warning: "}</span>
                {c.message}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
