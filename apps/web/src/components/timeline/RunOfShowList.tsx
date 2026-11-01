import type { RunOfShowItem } from "@/lib/core/types";
import RunOfShowEntry from "./RunOfShowEntry";

interface RunOfShowListProps {
  items: RunOfShowItem[];
  onToggleCheck: (itemId: string, index: number) => void;
}

export default function RunOfShowList({ items, onToggleCheck }: RunOfShowListProps) {
  return (
    <section aria-labelledby="plan-heading" className="flex flex-col gap-space-sm pt-1">
      <div className="flex items-center justify-between mb-1">
        <h2 id="plan-heading" className="text-title-md font-title-md text-primary">
          Day-Of Execution Plan
        </h2>
        <span className="text-label-sm font-label-sm text-secondary font-medium">
          {items.length} Events
        </span>
      </div>

      <ol className="relative pl-6 space-y-6 before:content-[''] before:absolute before:left-[11px] before:top-4 before:bottom-4 before:w-[2px] before:bg-surface-variant">
        {items.map((item) => (
          <RunOfShowEntry
            key={item.id}
            item={item}
            onToggleCheck={(index) => onToggleCheck(item.id, index)}
          />
        ))}
      </ol>
    </section>
  );
}
