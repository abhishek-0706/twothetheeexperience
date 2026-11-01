import Icon from "@/components/ui/Icon";
import DelayForm from "./DelayForm";
import type { CascadeState } from "./useCascade";

interface CascadeControlProps {
  activeItemTitle: string | undefined;
  cascade: CascadeState;
}

export default function CascadeControl({ activeItemTitle, cascade }: CascadeControlProps) {
  return (
    <section
      aria-labelledby="orchestration-heading"
      className="champagne-pill rounded-xl p-space-md shadow-sm"
    >
      <div className="flex items-start gap-3">
        <div
          aria-hidden="true"
          className="w-10 h-10 rounded-full bg-primary-container text-secondary-fixed flex items-center justify-center shrink-0 shadow-sm"
        >
          <Icon name="auto_awesome" filled />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between gap-2">
            <h2
              id="orchestration-heading"
              className="text-label-md font-label-md font-bold text-primary"
            >
              Emergency Day-Of Orchestration
            </h2>
            <span className="text-label-sm font-label-sm text-secondary font-semibold">
              AI Copilot
            </span>
          </div>
          <p className="text-body-md font-body-md text-primary-container mt-1 font-medium">
            Run-of-Show running behind?
          </p>
          <p className="text-label-md font-label-md text-on-surface-variant mt-0.5">
            Recalculate downstream vendor alerts, kitchen fire times &amp; musical transitions
            {activeItemTitle ? ` from “${activeItemTitle}”` : ""}.
          </p>
          <DelayForm cascade={cascade} disabled={!activeItemTitle} />
        </div>
      </div>
    </section>
  );
}
