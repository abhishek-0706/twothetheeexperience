interface ProgressBarProps {
  /** 0–100 */
  value: number;
  label: string;
  className?: string;
  barClassName?: string;
}

export default function ProgressBar({
  value,
  label,
  className = "h-1 bg-surface-container",
  barClassName = "bg-secondary",
}: ProgressBarProps) {
  const clamped = Math.min(Math.max(value, 0), 100);
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
      className={`w-full rounded-full overflow-hidden ${className}`}
    >
      <div
        className={`h-full rounded-full transition-all duration-500 ${barClassName}`}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
