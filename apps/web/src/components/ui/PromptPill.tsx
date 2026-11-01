"use client";

interface PromptPillProps {
  label: string;
  icon: string;
  onClick?: () => void;
}

export function PromptPill({ label, icon, onClick }: PromptPillProps) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-outline-variant bg-surface-container-lowest hover:bg-accent-container active:scale-95 transition-all duration-150 whitespace-nowrap"
    >
      <span className="w-7 h-7 rounded-full bg-secondary-fixed/40 flex items-center justify-center">
        <span className="material-symbols-outlined text-[16px] text-secondary">
          {icon}
        </span>
      </span>
      <span className="text-label-md font-label-md text-primary">{label}</span>
    </button>
  );
}

interface PromptPillRowProps {
  pills: { label: string; icon: string; onClick?: () => void }[];
}

export default function PromptPillRow({ pills }: PromptPillRowProps) {
  return (
    <div className="flex gap-2 overflow-x-auto custom-scroll pb-1">
      {pills.map((pill) => (
        <PromptPill key={pill.label} {...pill} />
      ))}
    </div>
  );
}
