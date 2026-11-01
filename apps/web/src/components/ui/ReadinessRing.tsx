interface ReadinessRingProps {
  percentage: number;
  label?: string;
}

/** Compact readiness gauge. The SVG is decorative; the value is exposed via role="progressbar". */
export default function ReadinessRing({
  percentage,
  label = "Planning readiness",
}: ReadinessRingProps) {
  const value = Math.min(Math.max(Math.round(percentage), 0), 100);
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuetext={`${value}% planned`}
      className="relative flex flex-col items-center justify-center w-20 h-20 bg-surface-container-low/60 rounded-full border border-secondary/20 shadow-inner"
    >
      <svg
        className="w-16 h-16 -rotate-90"
        viewBox="0 0 36 36"
        aria-hidden="true"
        focusable="false"
      >
        <path
          className="text-surface-variant"
          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
        />
        <path
          className="text-secondary"
          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
          fill="none"
          stroke="currentColor"
          strokeDasharray={`${value}, 100`}
          strokeLinecap="round"
          strokeWidth="3"
        />
      </svg>
      <div
        aria-hidden="true"
        className="absolute inset-0 flex flex-col items-center justify-center text-center"
      >
        <span className="font-headline-sm text-[15px] font-semibold text-primary leading-none">
          {value}%
        </span>
        <span className="font-label-sm text-[10px] uppercase tracking-wider text-on-surface-variant">
          Planned
        </span>
      </div>
    </div>
  );
}
