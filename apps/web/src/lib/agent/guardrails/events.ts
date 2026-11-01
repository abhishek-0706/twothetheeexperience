import type { GuardrailEvent, Verdict } from "./types";

export function guardrailEvent(
  ruleId: string,
  verdict: Verdict,
  startedAt: number,
  detail?: string
): GuardrailEvent {
  const event: GuardrailEvent = { ruleId, verdict, latencyMs: Date.now() - startedAt };
  if (detail !== undefined) event.detail = detail;
  return event;
}
