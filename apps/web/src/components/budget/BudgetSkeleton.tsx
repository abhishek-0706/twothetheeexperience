const SKELETON_ROWS = 5;

export default function BudgetSkeleton() {
  return (
    <div className="animate-pulse space-y-4" aria-hidden="true">
      {Array.from({ length: SKELETON_ROWS }, (_, i) => (
        <div key={i} className="h-16 bg-surface-container rounded-xl" />
      ))}
    </div>
  );
}
