interface MetricTileProps {
  label: string;
  value: string;
  subLabel?: string;
  icon: string;
  iconColor?: string;
  progress?: number;
}

export default function MetricTile({
  label,
  value,
  subLabel,
  icon,
  iconColor = "text-secondary",
  progress,
}: MetricTileProps) {
  return (
    <div className="luxury-card rounded-xl bg-surface-container-lowest p-space-md flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-label-sm font-label-sm uppercase tracking-wider text-on-surface-variant">
          {label}
        </span>
        <span className={`material-symbols-outlined text-[20px] ${iconColor}`}>
          {icon}
        </span>
      </div>

      <span className="text-title-md font-title-md text-primary">{value}</span>

      {subLabel && (
        <span className="text-label-sm font-label-sm text-on-surface-variant">
          {subLabel}
        </span>
      )}

      {progress != null && (
        <div className="w-full h-1 rounded-full bg-surface-container-high mt-1">
          <div
            className="h-full rounded-full bg-secondary transition-all duration-300"
            style={{ width: `${Math.min(progress * 100, 100)}%` }}
          />
        </div>
      )}
    </div>
  );
}
