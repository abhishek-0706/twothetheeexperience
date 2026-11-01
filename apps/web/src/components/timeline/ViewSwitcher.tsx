export type TimelineView = "milestones" | "runofshow";

const VIEW_OPTIONS: ReadonlyArray<{ key: TimelineView; label: string }> = [
  { key: "milestones", label: "High-Level Milestones" },
  { key: "runofshow", label: "Day-Of Run-of-Show" },
];

interface ViewSwitcherProps {
  view: TimelineView;
  onChange: (view: TimelineView) => void;
}

export default function ViewSwitcher({ view, onChange }: ViewSwitcherProps) {
  return (
    <div
      role="group"
      aria-label="Timeline view"
      className="p-1 bg-surface-container-high rounded-full flex items-center shadow-inner"
    >
      {VIEW_OPTIONS.map((option) => (
        <button
          key={option.key}
          type="button"
          onClick={() => onChange(option.key)}
          aria-pressed={view === option.key}
          className={`flex-1 min-h-[44px] py-2 text-center text-label-md font-label-md rounded-full transition-all duration-200 ${
            view === option.key
              ? "bg-primary-container text-surface-container-lowest font-semibold shadow-md"
              : "text-on-surface-variant hover:text-primary"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
