import Icon from "@/components/ui/Icon";
import type { CascadeViolation } from "@/lib/core/types";

interface CascadeViolationsProps {
  violations: CascadeViolation[];
}

export default function CascadeViolations({ violations }: CascadeViolationsProps) {
  if (violations.length === 0) return null;

  return (
    <div className="bg-error-container/50 rounded-lg p-3 space-y-1">
      <h3 className="font-label-md text-error font-semibold flex items-center gap-1">
        <Icon name="warning" className="text-[14px]" />
        Violations
      </h3>
      <ul className="space-y-1">
        {violations.map((v) => (
          <li key={v.message} className="text-body-md text-on-error-container">
            {v.message}
          </li>
        ))}
      </ul>
    </div>
  );
}
