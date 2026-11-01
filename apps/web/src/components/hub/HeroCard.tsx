import Icon from "@/components/ui/Icon";
import ReadinessRing from "@/components/ui/ReadinessRing";
import type { BudgetPlan, Conflict } from "@/lib/core/types";
import InsightBanner from "./InsightBanner";

interface HeroCardProps {
  daysToGo: number | null;
  readiness: number;
  budget: BudgetPlan | null;
  conflicts: Conflict[];
}

export default function HeroCard({ daysToGo, readiness, budget, conflicts }: HeroCardProps) {
  return (
    <section
      aria-labelledby="countdown-heading"
      className="relative overflow-hidden rounded-2xl bg-surface-container-lowest luxury-card gold-foil-top p-5 ambient-glow"
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-label-sm font-label-sm bg-accent-container text-on-accent-container border border-secondary/20">
            <Icon name="stars" className="text-[13px] text-secondary" filled />
            Jaipur Royal Celebration
          </p>
          <h2
            id="countdown-heading"
            className="mt-2.5 font-display text-display-hero-mobile text-primary tracking-tight leading-tight"
          >
            {daysToGo ?? "—"}{" "}
            <span className="font-headline-sm text-headline-sm font-normal text-on-surface-variant italic">
              Days to Go
            </span>
          </h2>
        </div>
        <ReadinessRing percentage={readiness} />
      </div>
      <InsightBanner budget={budget} conflicts={conflicts} />
    </section>
  );
}
