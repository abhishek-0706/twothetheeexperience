import Icon from "@/components/ui/Icon";
import type { CascadeResult } from "@/lib/core/types";
import TimeRange from "./TimeRange";

interface CascadeShiftListProps {
  result: CascadeResult;
}

export default function CascadeShiftList({ result }: CascadeShiftListProps) {
  if (result.shifted.length === 0) return null;
  const titleById = new Map(result.items.map((item) => [item.id, item.title]));

  return (
    <ul className="space-y-1" aria-label="Items that would move">
      {result.shifted.map((s) => (
        <li
          key={s.itemId}
          className="text-body-md text-primary flex flex-wrap items-center gap-x-2"
        >
          <Icon name="arrow_forward" className="text-[14px] text-secondary" />
          <span className="font-medium">{titleById.get(s.itemId) ?? s.itemId}</span>
          <span className="text-on-surface-variant">
            <span className="sr-only">moves from </span>
            <TimeRange start={s.fromMin} end={s.toMin} />
          </span>
        </li>
      ))}
    </ul>
  );
}
