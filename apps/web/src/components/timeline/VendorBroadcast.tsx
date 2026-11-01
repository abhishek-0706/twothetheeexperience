import Icon from "@/components/ui/Icon";

interface VendorBroadcastProps {
  vendorLeads: string[];
}

function previewBroadcast(vendorLeads: string[]): void {
  window.alert(
    `[Confirm-tier action]\n\nThis would send a status update to:\n${vendorLeads.join("\n")}\n\nIn production, you'd see the exact message and approve before it sends.`
  );
}

export default function VendorBroadcast({ vendorLeads }: VendorBroadcastProps) {
  return (
    <section
      aria-labelledby="broadcast-heading"
      className="bg-surface-container-lowest rounded-xl p-space-md border border-outline-variant/30 flex items-center justify-between gap-3"
    >
      <div className="flex items-center gap-2.5">
        <div
          aria-hidden="true"
          className="w-8 h-8 rounded-full bg-secondary-fixed/40 flex items-center justify-center"
        >
          <Icon name="radio_button_checked" className="text-secondary text-[18px]" />
        </div>
        <div>
          <h2
            id="broadcast-heading"
            className="text-title-md font-title-md text-primary leading-tight"
          >
            Broadcast Vendor Whisper
          </h2>
          <p className="text-label-sm font-label-sm text-on-surface-variant">
            Send silent sync to all {vendorLeads.length} vendor leads
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={() => previewBroadcast(vendorLeads)}
        aria-label="Preview vendor broadcast"
        className="w-11 h-11 shrink-0 rounded-full bg-primary-container text-surface flex items-center justify-center shadow hover:scale-95 transition-transform"
      >
        <Icon name="send" className="text-[18px]" />
      </button>
    </section>
  );
}
