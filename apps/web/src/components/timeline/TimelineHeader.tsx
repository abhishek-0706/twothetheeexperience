import ViewSwitcher, { type TimelineView } from "./ViewSwitcher";

interface TimelineHeaderProps {
  view: TimelineView;
  onViewChange: (view: TimelineView) => void;
}

export default function TimelineHeader({ view, onViewChange }: TimelineHeaderProps) {
  return (
    <header className="flex flex-col gap-space-md pt-2">
      <div className="flex items-baseline justify-between gap-2">
        <div>
          <p className="text-label-md font-label-md text-secondary uppercase tracking-widest font-semibold mb-0.5">
            Real-Time Coordination
          </p>
          <h1 className="text-headline-lg-mobile font-display text-primary font-semibold">
            Timeline &amp; Run-of-Show
          </h1>
        </div>
        <p className="flex items-center gap-1 bg-surface-container-low px-2 py-1 rounded-full border border-success/20">
          <span aria-hidden="true" className="w-2 h-2 rounded-full bg-success animate-pulse" />
          <span className="text-label-sm font-label-sm text-on-success-container">Live Sync</span>
        </p>
      </div>
      <ViewSwitcher view={view} onChange={onViewChange} />
    </header>
  );
}
