import MetricTile from "@/components/ui/MetricTile";
import { formatMoneyCompact } from "@/lib/core/money";
import type { BudgetPlan } from "@/lib/core/types";

interface MetricsRowProps {
  budget: BudgetPlan | null;
  guestCount: number;
  completedTasks: number;
  totalTasks: number;
  urgentCount: number;
}

export default function MetricsRow({
  budget,
  guestCount,
  completedTasks,
  totalTasks,
  urgentCount,
}: MetricsRowProps) {
  return (
    <section aria-labelledby="metrics-heading">
      <h2 id="metrics-heading" className="sr-only">
        Key metrics
      </h2>
      <div className="grid grid-cols-3 gap-2.5">
        <MetricTile
          label="Budget"
          value={budget ? formatMoneyCompact(budget.total) : "…"}
          subLabel={`${guestCount} guests`}
          icon="payments"
        />
        <MetricTile
          label="Guests"
          value={String(guestCount)}
          subLabel="RSVP pending"
          icon="group"
          iconColor="text-success"
        />
        <MetricTile
          label="Tasks"
          value={`${completedTasks}/${totalTasks}`}
          subLabel={`${urgentCount} urgent`}
          icon="checklist"
          iconColor="text-primary"
          progress={totalTasks > 0 ? completedTasks / totalTasks : 0}
        />
      </div>
    </section>
  );
}
