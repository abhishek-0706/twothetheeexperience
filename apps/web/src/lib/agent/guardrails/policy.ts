import { guardrailEvent } from "./events";
import {
  AUTHORITY_CUE,
  POLICY_RULES,
  REFUSAL_CUE,
  SAFETY_DOMAINS,
  VERIFY_CUE,
  VERIFY_NOTE,
  type PolicyRule,
} from "./policy-rules";
import type { GuardrailEvent, PolicyResult } from "./types";

const SENTENCE_SPLIT = /(?<=[.!?])\s+|\n+/;

function sentences(text: string): string[] {
  return text.split(SENTENCE_SPLIT).filter((s) => s.trim().length > 0);
}

/** Policy rules a user message touches, so the model can be told to decline with care. */
export function matchInputPolicy(text: string): PolicyRule[] {
  return POLICY_RULES.filter((rule) => rule.pattern.test(text));
}

/**
 * Content policy on model text, evaluated per sentence. A sentence that mentions a blocked
 * topic inside a refusal or legal note ("dowry is illegal…", "I can't recommend a crash
 * diet") passes; one that facilitates it is blocked.
 */
export function postflightPolicy(text: string): PolicyResult {
  const start = Date.now();
  const parts = sentences(text);
  const blocked = POLICY_RULES.filter((rule) =>
    parts.some((s) => rule.pattern.test(s) && !REFUSAL_CUE.test(s))
  );

  const events: GuardrailEvent[] = blocked.map((rule) => guardrailEvent(rule.id, "block", start));
  if (blocked.length === 0) events.push(guardrailEvent("policy-scan", "pass", start));

  const safety = checkSafetyDomains(text, start);
  return {
    passed: blocked.length === 0,
    events: [...events, ...safety.events],
    violations: blocked.map((rule) => rule.message),
    requiredNotes: safety.requiredNotes,
  };
}

function checkSafetyDomains(
  text: string,
  start: number
): { events: GuardrailEvent[]; requiredNotes: string[] } {
  const hasVerifyNote = VERIFY_CUE.test(text) && AUTHORITY_CUE.test(text);
  const detail = hasVerifyNote
    ? "verify-with-authority note present"
    : "verify-with-authority note appended";
  const events = SAFETY_DOMAINS.filter(({ pattern }) => pattern.test(text)).map(({ domain }) =>
    guardrailEvent(`safety-${domain}`, "flag", start, detail)
  );
  const requiredNotes = events.length > 0 && !hasVerifyNote ? [VERIFY_NOTE] : [];
  return { events, requiredNotes };
}
