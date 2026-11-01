import { guardrailEvent } from "./events";
import { detectInjection } from "./injection";
import { redactPII } from "./pii";
import { matchInputPolicy } from "./policy";
import { detectOffTopic, offTopicGuidance } from "./scope";
import type { ConversationMessage, GuardrailEvent, PreflightResult } from "./types";

const INJECTION_BLOCK_REASON =
  "I noticed something in that message that looks like it might be trying to override my instructions. Could you rephrase what you need?";
const HISTORY_BLOCK_REASON =
  "Part of our earlier conversation looks like it is trying to override my instructions, so I can't continue this thread. Please start a new chat and tell me what you'd like to plan.";

/** Pre-flight on a single user message: PII redaction, injection, input policy, scope. */
export function preflightCheck(userMessage: string): PreflightResult {
  const piiStart = Date.now();
  const sanitizedForLog = redactPII(userMessage);
  const events: GuardrailEvent[] = [guardrailEvent("pii-redact", "pass", piiStart)];

  const injStart = Date.now();
  const injectionRule = detectInjection(userMessage);
  if (injectionRule) {
    events.push(guardrailEvent("injection-scan", "block", injStart, `rule: ${injectionRule}`));
    return {
      allowed: false,
      sanitizedForLog,
      events,
      blockReason: INJECTION_BLOCK_REASON,
      modelGuidance: [],
    };
  }
  events.push(guardrailEvent("injection-scan", "pass", injStart));

  const modelGuidance: string[] = [];
  const policyStart = Date.now();
  const policyHits = matchInputPolicy(userMessage);
  for (const rule of policyHits) {
    events.push(guardrailEvent(`policy-input:${rule.id}`, "flag", policyStart));
    modelGuidance.push(rule.guidance);
  }
  if (policyHits.length === 0) events.push(guardrailEvent("policy-input", "pass", policyStart));

  const scopeStart = Date.now();
  const topic = detectOffTopic(userMessage);
  if (topic) {
    events.push(guardrailEvent("scope-router", "flag", scopeStart, `topic: ${topic}`));
    modelGuidance.push(offTopicGuidance(topic));
  } else {
    events.push(guardrailEvent("scope-router", "pass", scopeStart));
  }

  return { allowed: true, sanitizedForLog, events, modelGuidance };
}

/**
 * Pre-flight over the whole client-supplied conversation. The history is untrusted: an
 * attacker can fabricate earlier "user" or "assistant" turns, so every entry is scanned.
 */
export function preflightConversation(messages: readonly ConversationMessage[]): PreflightResult {
  const result = preflightCheck(messages.at(-1)?.content ?? "");
  if (!result.allowed) return result;

  const start = Date.now();
  for (const [i, message] of messages.slice(0, -1).entries()) {
    const rule = detectInjection(message.content);
    if (rule) {
      const detail = `message ${i} (${message.role}) rule: ${rule}`;
      result.events.push(guardrailEvent("history-injection-scan", "block", start, detail));
      return { ...result, allowed: false, blockReason: HISTORY_BLOCK_REASON, modelGuidance: [] };
    }
  }
  result.events.push(guardrailEvent("history-injection-scan", "pass", start));
  return result;
}
