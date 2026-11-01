"use client";

import { useId } from "react";
import Icon from "@/components/ui/Icon";

interface IdeaResultsProps {
  ideas: string | null;
}

export default function IdeaResults({ ideas }: IdeaResultsProps) {
  const headingId = useId();

  return (
    // Persistent live region so newly generated ideas are announced.
    <div aria-live="polite">
      {ideas && (
        <section aria-labelledby={headingId} className="champagne-pill rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2 mb-2">
            <Icon name="auto_awesome" className="text-secondary" filled />
            <h2 id={headingId} className="font-title-md text-title-md text-primary font-semibold">
              AI-Generated Ideas
            </h2>
          </div>
          <div className="text-body-md text-primary whitespace-pre-wrap leading-relaxed">
            {ideas}
          </div>
        </section>
      )}
    </div>
  );
}
