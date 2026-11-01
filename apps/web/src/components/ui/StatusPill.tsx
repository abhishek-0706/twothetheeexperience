interface StatusPillProps {
  variant: "success" | "warning" | "milestone" | "active" | "neutral";
  children: React.ReactNode;
  icon?: string;
}

const variantStyles: Record<StatusPillProps["variant"], string> = {
  success: "bg-success-container text-on-success-container",
  warning: "bg-accent-container text-on-accent-container",
  active: "bg-accent-container text-on-accent-container",
  milestone: "bg-tertiary-fixed text-on-tertiary-fixed",
  neutral: "bg-surface-container-high text-on-surface-variant",
};

export default function StatusPill({ variant, children, icon }: StatusPillProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-label-sm font-label-sm uppercase tracking-wider ${variantStyles[variant]}`}
    >
      {icon && (
        <span className="material-symbols-outlined text-[14px]">{icon}</span>
      )}
      {children}
    </span>
  );
}
