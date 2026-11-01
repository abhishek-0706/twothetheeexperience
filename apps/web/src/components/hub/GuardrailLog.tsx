import Icon from "@/components/ui/Icon";
import type { GuardrailEntry } from "@/lib/client/chat-api";

type Verdict = GuardrailEntry["verdict"];

const VERDICT_ICON: Record<Verdict, string> = {
  pass: "check_circle",
  flag: "flag",
  block: "block",
};

const VERDICT_COLOR: Record<Verdict, string> = {
  pass: "text-success",
  flag: "text-secondary",
  block: "text-error",
};

interface GuardrailLogProps {
  entries: GuardrailEntry[];
}

/** Audit trail of every guardrail decision this session, shown for transparency. */
export default function GuardrailLog({ entries }: GuardrailLogProps) {
  return (
    <section
      aria-labelledby="guardrail-heading"
      className="bg-surface-container rounded-xl p-4 border border-outline-variant/30"
    >
      <h2
        id="guardrail-heading"
        className="font-title-md text-title-md text-primary font-semibold flex items-center gap-2 mb-2"
      >
        <Icon name="shield" className="text-[18px]" />
        Guardrail Log
      </h2>
      <ul
        tabIndex={0}
        aria-labelledby="guardrail-heading"
        className="space-y-1 max-h-40 overflow-y-auto text-label-sm text-on-surface-variant font-mono rounded"
      >
        {entries.map((entry, i) => (
          // The log is append-only, so the index disambiguates repeated rule ids stably.
          <li key={`${entry.ruleId}-${i}`} className="flex items-center gap-2">
            <Icon
              name={VERDICT_ICON[entry.verdict]}
              className={`text-[14px] ${VERDICT_COLOR[entry.verdict]}`}
            />
            <span>
              {entry.ruleId}: {entry.verdict}
              {entry.detail ? ` — ${entry.detail}` : ""}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
