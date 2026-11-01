interface BudgetAssumptionsProps {
  assumptions: string[];
}

export default function BudgetAssumptions({ assumptions }: BudgetAssumptionsProps) {
  if (assumptions.length === 0) return null;

  return (
    <section aria-labelledby="assumptions-heading" className="space-y-2">
      <h2
        id="assumptions-heading"
        className="font-title-md text-title-md text-primary font-semibold"
      >
        Assumptions
      </h2>
      <ul className="list-disc list-inside space-y-1 text-body-md text-on-surface-variant">
        {assumptions.map((assumption) => (
          <li key={assumption}>{assumption}</li>
        ))}
      </ul>
    </section>
  );
}
