/**
 * Patterns target instructions aimed at the assistant, not everyday words: "sound system: 2
 * speakers", "you are now engaged!" and "Dan's sangeet" must all pass.
 */
const INJECTION_RULES: ReadonlyArray<{ id: string; pattern: RegExp }> = [
  {
    id: "override-instructions",
    pattern:
      /\b(?:ignore|disregard|forget|override|bypass)\b[^.!?\n]{0,30}\b(?:previous|prior|above|earlier|all|your|system|these)\b[^.!?\n]{0,20}\b(?:instructions?|rules|prompts?|guidelines|guardrails|directives|restrictions)\b/i,
  },
  {
    id: "forget-context",
    pattern:
      /\bforget\s+(?:everything|all)\s+(?:above|before|previous|prior|you\s+(?:were|have\s+been)\s+told)\b/i,
  },
  { id: "role-prefix", pattern: /(?:^|\n)\s*(?:#{1,6}\s*)?\[?\s*(?:system|developer)\s*\]?\s*:/i },
  {
    id: "role-tag",
    pattern:
      /<\s*\/?\s*(?:system|developer|assistant|instructions?)\s*>|<\|im_(?:start|end)\|>|\[\/?INST\]/i,
  },
  { id: "prompt-exfiltration", pattern: /\b(?:system|hidden)\s+(?:prompt|instructions)\b/i },
  {
    id: "prompt-exfiltration",
    pattern:
      /\b(?:reveal|show|print|repeat|display|leak|dump|output)\b[^.!?\n]{0,30}\byour\s+(?:instructions|prompt|configuration|rules)\b/i,
  },
  {
    id: "secret-exfiltration",
    pattern:
      /\b(?:api[\s_-]?keys?|secret[\s_-]?keys?|access[\s_-]?tokens?|env(?:ironment)?\s+variables?)\b/i,
  },
  {
    id: "persona-override",
    pattern:
      /\byou\s+are\s+now\s+(?:an?\s+|in\s+)?(?:dan\b|unrestricted|unfiltered|uncensored|jailbroken|evil|developer\s+mode|admin|root|a\s+different|no\s+longer)/i,
  },
  {
    id: "persona-override",
    pattern:
      /\bfrom\s+now\s+on,?\s+you\s+(?:are|will|must)\s+(?:an?\s+)?(?:unrestricted|unfiltered|ignore|no\s+longer)/i,
  },
  {
    id: "persona-override",
    pattern:
      /\b(?:pretend|act|roleplay|role-play|behave)\b[^.!?\n]{0,40}\b(?:no|without|free\s+of|zero)\s+(?:rules|restrictions|guardrails|filters|guidelines|limits|censorship)\b/i,
  },
  {
    id: "persona-override",
    pattern:
      /\b(?:pretend|act\s+as|you\s+are)\b[^.!?\n]{0,20}\b(?:different|another|unrestricted|unfiltered|jailbroken)\s+(?:ai|model|assistant|chatbot)\b/i,
  },
  {
    id: "jailbreak",
    pattern: /\bjail\s?(?:break|broke|broken|breaking)\b|\bdo\s+anything\s+now\b|\bDAN\s+mode\b/i,
  },
  { id: "privileged-mode", pattern: /\b(?:developer|debug|god|sudo)\s+mode\b/i },
];

/** Returns the id of the first injection rule the text trips, or null. */
export function detectInjection(text: string): string | null {
  return INJECTION_RULES.find((rule) => rule.pattern.test(text))?.id ?? null;
}
