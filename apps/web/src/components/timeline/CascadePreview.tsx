import type { Ref } from "react";
import Icon from "@/components/ui/Icon";
import type { CascadeResult } from "@/lib/core/types";
import CascadeShiftList from "./CascadeShiftList";
import CascadeViolations from "./CascadeViolations";

interface CascadePreviewProps {
  result: CascadeResult;
  headingRef: Ref<HTMLHeadingElement>;
  onApply: () => void;
  onCancel: () => void;
}

export default function CascadePreview({
  result,
  headingRef,
  onApply,
  onCancel,
}: CascadePreviewProps) {
  return (
    <section
      aria-labelledby="preview-heading"
      className="bg-accent-container rounded-xl p-4 border border-secondary/30 space-y-3"
    >
      <h2
        id="preview-heading"
        ref={headingRef}
        tabIndex={-1}
        className="font-title-md text-title-md text-on-accent-container font-semibold flex items-center gap-2"
      >
        <Icon name="schedule" className="text-[18px]" />
        Cascade Preview
      </h2>
      <CascadeShiftList result={result} />
      <CascadeViolations violations={result.violations} />
      <dl className="text-label-md text-on-surface-variant flex flex-wrap gap-x-3 gap-y-1">
        <div className="flex gap-1">
          <dt>Absorbed:</dt>
          <dd>{result.absorbedMin}m</dd>
        </div>
        <div className="flex gap-1">
          <dt>Net delay:</dt>
          <dd>{result.netDelayMin}m</dd>
        </div>
        <div className="flex gap-1">
          <dt>Vendors to notify:</dt>
          <dd>{result.affectedVendorLeads.join(", ") || "None"}</dd>
        </div>
      </dl>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onApply}
          className="min-h-[44px] px-4 py-2 rounded-full bg-primary text-surface font-label-md text-label-md font-semibold active:scale-95 transition-transform"
        >
          Apply Changes
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="min-h-[44px] px-4 py-2 rounded-full bg-surface-container-lowest text-primary font-label-md text-label-md font-medium border border-secondary/30 active:scale-95 transition-transform"
        >
          Cancel
        </button>
      </div>
    </section>
  );
}
