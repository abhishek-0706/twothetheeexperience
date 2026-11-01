"use client";

import Icon from "@/components/ui/Icon";
import PromptPillRow from "@/components/ui/PromptPill";

const CONCIERGE_PROMPTS = [
  { label: "Plan my full wedding", icon: "auto_awesome" },
  { label: "Show budget breakdown", icon: "payments" },
  { label: "Suggest sangeet themes", icon: "music_note" },
  { label: "Draft vendor message", icon: "mail" },
] as const;

interface ConciergePromptsProps {
  /** The trigger is passed so focus can return to it when the chat closes. */
  onSelect: (prompt: string, trigger: HTMLElement) => void;
}

export default function ConciergePrompts({ onSelect }: ConciergePromptsProps) {
  return (
    <section aria-labelledby="concierge-heading" className="space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Icon name="magic_button" className="text-secondary text-[18px]" filled />
          <h2
            id="concierge-heading"
            className="font-headline-sm text-[17px] text-primary font-semibold"
          >
            AI Concierge
          </h2>
        </div>
        <span className="font-label-sm text-label-sm text-secondary uppercase tracking-wider">
          Ask anything
        </span>
      </div>
      <PromptPillRow
        label="Suggested questions"
        pills={CONCIERGE_PROMPTS.map((p) => ({
          label: p.label,
          icon: p.icon,
          onClick: (e) => onSelect(p.label, e.currentTarget),
        }))}
      />
    </section>
  );
}
