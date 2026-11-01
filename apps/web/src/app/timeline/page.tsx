"use client";

import { useState } from "react";
import CascadeControl from "@/components/timeline/CascadeControl";
import CascadePreview from "@/components/timeline/CascadePreview";
import DayBanner from "@/components/timeline/DayBanner";
import MilestonesNotice from "@/components/timeline/MilestonesNotice";
import RunOfShowList from "@/components/timeline/RunOfShowList";
import TimelineHeader from "@/components/timeline/TimelineHeader";
import VendorBroadcast from "@/components/timeline/VendorBroadcast";
import { toggleChecklistItem, uniqueVendorLeads } from "@/components/timeline/time";
import { useCascade } from "@/components/timeline/useCascade";
import { useSchedulePace } from "@/components/timeline/useSchedulePace";
import type { TimelineView } from "@/components/timeline/ViewSwitcher";
import type { RunOfShowItem } from "@/lib/core/types";
import { DEMO_RUN_OF_SHOW } from "@/lib/demo/run-of-show";

export default function TimelinePage() {
  const [view, setView] = useState<TimelineView>("runofshow");
  const [items, setItems] = useState<RunOfShowItem[]>(DEMO_RUN_OF_SHOW);
  const activeItem = items.find((item) => item.status === "active");
  const vendorLeads = uniqueVendorLeads(items);
  const pace = useSchedulePace(activeItem);
  const cascade = useCascade({ items, activeItem, onApply: setItems });

  function handleToggleCheck(itemId: string, index: number) {
    setItems((prev) => toggleChecklistItem(prev, itemId, index));
  }

  return (
    <main className="pt-20 px-margin max-w-md mx-auto flex flex-col gap-space-lg pb-36">
      <TimelineHeader view={view} onViewChange={setView} />

      <p aria-live="polite" className="sr-only">
        {cascade.announcement}
      </p>

      {view === "runofshow" && (
        <>
          <DayBanner vendorCount={vendorLeads.length} pace={pace} />
          <CascadeControl activeItemTitle={activeItem?.title} cascade={cascade} />
          {cascade.result && (
            <CascadePreview
              result={cascade.result}
              headingRef={cascade.previewHeadingRef}
              onApply={cascade.apply}
              onCancel={cascade.cancel}
            />
          )}
          <RunOfShowList items={items} onToggleCheck={handleToggleCheck} />
          <VendorBroadcast vendorLeads={vendorLeads} />
        </>
      )}

      {view === "milestones" && <MilestonesNotice />}
    </main>
  );
}
