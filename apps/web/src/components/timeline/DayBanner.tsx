import Icon from "@/components/ui/Icon";
import { DEMO_BRIEF } from "@/lib/demo/brief";
import { DEMO_VENUE, DEMO_WEATHER } from "@/lib/demo/run-of-show";
import DayStats from "./DayStats";
import { formatLongDay } from "./time";
import type { SchedulePace } from "./useSchedulePace";

interface DayBannerProps {
  vendorCount: number;
  pace: SchedulePace;
}

export default function DayBanner({ vendorCount, pace }: DayBannerProps) {
  return (
    <section
      aria-labelledby="event-day-heading"
      className="luxury-card gold-foil-top bg-surface-container-lowest rounded-xl p-space-md flex flex-col gap-space-sm relative overflow-hidden"
    >
      <div
        aria-hidden="true"
        className="absolute -right-10 -bottom-10 w-32 h-32 rounded-full bg-secondary-fixed/20 blur-2xl pointer-events-none"
      />
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-label-sm font-label-sm text-secondary font-bold tracking-wider uppercase">
          <Icon name="celebration" className="text-secondary" filled />
          Ceremony Day
        </p>
        <p className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-success-container border border-success/20 text-on-success-container">
          <Icon name={DEMO_WEATHER.icon} className="text-[14px]" />
          <span className="text-label-sm font-label-sm font-semibold">
            <span className="sr-only">Weather: </span>
            {DEMO_WEATHER.temp} {DEMO_WEATHER.desc}
          </span>
        </p>
      </div>
      <div className="mt-0.5">
        <h2
          id="event-day-heading"
          className="text-headline-sm font-display text-primary font-semibold"
        >
          <time dateTime={DEMO_BRIEF.eventDate}>{formatLongDay(DEMO_BRIEF.eventDate)}</time> &bull;{" "}
          {DEMO_VENUE.name}
        </h2>
        <p className="text-body-md font-body-md text-on-surface-variant flex items-center gap-1 mt-0.5">
          <Icon name="location_on" className="text-[16px] text-outline" />
          {DEMO_VENUE.address}
        </p>
      </div>
      <DayStats vendorCount={vendorCount} pace={pace} />
    </section>
  );
}
