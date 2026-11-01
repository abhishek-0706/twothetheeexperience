import Icon from "@/components/ui/Icon";
import ProgressBar from "@/components/ui/ProgressBar";

interface MetricTileProps {
  label: string;
  value: string;
  subLabel?: string;
  icon: string;
  iconColor?: string;
  /** 0–1; omit to hide the bar */
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
    <div className="bg-surface-container-lowest p-3 rounded-xl border border-outline-variant/20 shadow-sm flex flex-col justify-between">
      <div className="flex items-center justify-between text-on-surface-variant">
        <span className="font-label-sm text-label-sm uppercase tracking-wide">{label}</span>
        <Icon name={icon} className={`text-[15px] ${iconColor}`} />
      </div>
      <div className="mt-2">
        <p className="font-title-md text-title-md text-primary leading-tight">{value}</p>
        {subLabel && <p className="font-label-sm text-[11px] text-on-surface-variant">{subLabel}</p>}
      </div>
      {progress !== undefined && (
        <ProgressBar
          value={progress * 100}
          label={`${label} progress`}
          className="h-1 bg-surface-container mt-2.5"
        />
      )}
    </div>
  );
}
