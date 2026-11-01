import Icon from "@/components/ui/Icon";

export default function MilestonesNotice() {
  return (
    <section
      aria-labelledby="milestones-heading"
      className="text-center py-12 text-on-surface-variant"
    >
      <Icon name="calendar_month" className="text-[48px] text-secondary/40 block mb-3" />
      <h2 id="milestones-heading" className="font-headline-sm text-headline-sm text-primary mb-1">
        High-Level Milestones
      </h2>
      <p className="font-body-md text-body-md">
        Switch to the Hub to see your full planning timeline, or use the Run-of-Show view for
        ceremony day coordination.
      </p>
    </section>
  );
}
