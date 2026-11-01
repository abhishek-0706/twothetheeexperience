import { DEMO_BRIEF } from "@/lib/demo/brief";
import type { PaceTone, SchedulePace } from "./useSchedulePace";

const PACE_TONE_CLASS: Record<PaceTone, string> = {
  onTime: "text-success",
  unknown: "text-on-surface-variant",
  behind: "text-error",
};

interface DayStatsProps {
  vendorCount: number;
  pace: SchedulePace;
}

export default function DayStats({ vendorCount, pace }: DayStatsProps) {
  return (
    <dl className="grid grid-cols-3 pt-space-xs mt-1 border-t border-surface-container-high text-center">
      <div>
        <dt className="text-label-sm font-label-sm text-on-surface-variant">Total Guests</dt>
        <dd className="text-title-md font-title-md text-primary font-bold">
          {DEMO_BRIEF.guestCount}
        </dd>
      </div>
      <div className="border-x border-surface-container-high">
        <dt className="text-label-sm font-label-sm text-on-surface-variant">Vendors On Site</dt>
        <dd className="text-title-md font-title-md text-primary font-bold">{vendorCount} Active</dd>
      </div>
      <div>
        <dt className="text-label-sm font-label-sm text-on-surface-variant">Schedule Pace</dt>
        <dd className={`text-title-md font-title-md font-bold ${PACE_TONE_CLASS[pace.tone]}`}>
          {pace.label}
        </dd>
      </div>
    </dl>
  );
}
