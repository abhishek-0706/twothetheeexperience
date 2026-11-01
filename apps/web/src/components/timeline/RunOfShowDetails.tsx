import Icon from "@/components/ui/Icon";
import type { RunOfShowItem } from "@/lib/core/types";

interface RunOfShowDetailsProps {
  item: RunOfShowItem;
}

/** Vendor leads, location and the pinned-time note for one run-of-show item. */
export default function RunOfShowDetails({ item }: RunOfShowDetailsProps) {
  return (
    <>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-label-md font-label-md text-on-surface-variant">
        {item.vendorLeads.length > 0 && (
          <span className="flex items-center gap-1">
            <Icon name="person" className="text-[14px] text-secondary" />
            <span className="sr-only">Vendor leads: </span>
            {item.vendorLeads.join(", ")}
          </span>
        )}
        {item.location && (
          <span className="flex items-center gap-1">
            <Icon name="meeting_room" className="text-[14px] text-secondary" />
            <span className="sr-only">Location: </span>
            {item.location}
          </span>
        )}
      </div>

      {item.pinned && item.pinnedReason && (
        <p className="mt-2 p-2 rounded-lg bg-tertiary-fixed/30 border border-tertiary/20 text-label-sm font-label-sm text-tertiary flex items-center gap-1">
          <Icon name="lock" className="text-[14px]" />
          <span className="sr-only">Pinned, cannot be moved: </span>
          {item.pinnedReason}
        </p>
      )}
    </>
  );
}
