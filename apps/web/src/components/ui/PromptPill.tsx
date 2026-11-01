import Icon from "@/components/ui/Icon";

interface PromptPillProps {
  label: string;
  icon: string;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
}

export function PromptPill({ label, icon, onClick }: PromptPillProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="shrink-0 inline-flex items-center gap-2 min-h-[44px] px-3.5 py-2 rounded-full bg-surface-container-lowest border border-secondary/30 hover:bg-accent-container active:scale-95 transition-all text-left shadow-sm"
    >
      <span className="w-6 h-6 rounded-full bg-secondary-fixed/40 flex items-center justify-center text-secondary">
        <Icon name={icon} className="text-[14px]" />
      </span>
      <span className="font-label-md text-label-md text-primary font-medium whitespace-nowrap">
        {label}
      </span>
    </button>
  );
}

interface PromptPillRowProps {
  label: string;
  pills: PromptPillProps[];
}

export default function PromptPillRow({ label, pills }: PromptPillRowProps) {
  return (
    <ul
      aria-label={label}
      className="flex overflow-x-auto pb-1 gap-2 custom-scroll -mx-margin px-margin"
    >
      {pills.map((pill) => (
        <li key={pill.label} className="shrink-0">
          <PromptPill {...pill} />
        </li>
      ))}
    </ul>
  );
}
