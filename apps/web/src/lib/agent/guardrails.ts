/**
 * Guardrail chain — pre-flight (input) and post-flight (output).
 *
 * BUILD_PROMPT.md §8. Every decision emits a GuardrailEvent so the chain is auditable.
 * Events carry rule ids, never regex sources or raw user text.
 */

import { BudgetPlanSchema, type BudgetPlan } from "../core/types";

export interface GuardrailEvent {
  ruleId: string;
  verdict: "pass" | "flag" | "block";
  detail?: string;
  latencyMs: number;
}

export interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}

export interface PreflightResult {
  allowed: boolean;
  sanitizedForLog: string;
  events: GuardrailEvent[];
  /** If blocked, a user-friendly reason. */
  blockReason?: string;
  /** Server-authored instructions appended to the system prompt for this turn. */
  modelGuidance: string[];
}

export interface PostflightResult {
  passed: boolean;
  events: GuardrailEvent[];
  violations: string[];
}

export interface PolicyResult extends PostflightResult {
  /** Notes the response must carry (e.g. "verify with your local authority"). */
  requiredNotes: string[];
}

export interface CurrencyFigure {
  raw: string;
  index: number;
  rupees: number;
  /** Acceptable absolute difference in rupees, derived from the displayed precision. */
  tolerance: number;
}

export interface TraceabilityResult extends PostflightResult {
  untraceable: CurrencyFigure[];
}

const SENTENCE_SPLIT = /(?<=[.!?])\s+|\n+/;

function sentences(text: string): string[] {
  return text.split(SENTENCE_SPLIT).filter((s) => s.trim().length > 0);
}

// ---------------------------------------------------------------------------
// PII
// ---------------------------------------------------------------------------

/** Order matters: card and phone numbers before the shorter Aadhaar patterns. */
const PII_PATTERNS: ReadonlyArray<{ pattern: RegExp; replacement: string }> = [
  { pattern: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, replacement: "[EMAIL]" },
  { pattern: /\b[\w.-]{2,}@(?:ok\w+|ybl|ibl|axl|paytm|upi|apl)\b/gi, replacement: "[UPI]" },
  { pattern: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, replacement: "[CARD]" },
  { pattern: /(?:\+91[\s-]?|\b)[6-9]\d{9}\b/g, replacement: "[PHONE]" },
  { pattern: /\b\d{4}\s\d{4}\s\d{4}\b/g, replacement: "[AADHAAR]" },
  { pattern: /\b\d{12}\b/g, replacement: "[AADHAAR]" },
  { pattern: /\b[A-Z]{5}\d{4}[A-Z]\b/g, replacement: "[PAN]" },
];

/** Redact PII before anything is logged. The model still receives the original text. */
export function redactPII(text: string): string {
  return PII_PATTERNS.reduce((acc, { pattern, replacement }) => acc.replace(pattern, replacement), text);
}

// ---------------------------------------------------------------------------
// Prompt injection
// ---------------------------------------------------------------------------

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
    pattern: /\bforget\s+(?:everything|all)\s+(?:above|before|previous|prior|you\s+(?:were|have\s+been)\s+told)\b/i,
  },
  { id: "role-prefix", pattern: /(?:^|\n)\s*(?:#{1,6}\s*)?\[?\s*(?:system|developer)\s*\]?\s*:/i },
  {
    id: "role-tag",
    pattern: /<\s*\/?\s*(?:system|developer|assistant|instructions?)\s*>|<\|im_(?:start|end)\|>|\[\/?INST\]/i,
  },
  { id: "prompt-exfiltration", pattern: /\b(?:system|hidden)\s+(?:prompt|instructions)\b/i },
  {
    id: "prompt-exfiltration",
    pattern: /\b(?:reveal|show|print|repeat|display|leak|dump|output)\b[^.!?\n]{0,30}\byour\s+(?:instructions|prompt|configuration|rules)\b/i,
  },
  { id: "secret-exfiltration", pattern: /\b(?:api[\s_-]?keys?|secret[\s_-]?keys?|access[\s_-]?tokens?|env(?:ironment)?\s+variables?)\b/i },
  {
    id: "persona-override",
    pattern:
      /\byou\s+are\s+now\s+(?:an?\s+|in\s+)?(?:dan\b|unrestricted|unfiltered|uncensored|jailbroken|evil|developer\s+mode|admin|root|a\s+different|no\s+longer)/i,
  },
  {
    id: "persona-override",
    pattern: /\bfrom\s+now\s+on,?\s+you\s+(?:are|will|must)\s+(?:an?\s+)?(?:unrestricted|unfiltered|ignore|no\s+longer)/i,
  },
  {
    id: "persona-override",
    pattern:
      /\b(?:pretend|act|roleplay|role-play|behave)\b[^.!?\n]{0,40}\b(?:no|without|free\s+of|zero)\s+(?:rules|restrictions|guardrails|filters|guidelines|limits|censorship)\b/i,
  },
  {
    id: "persona-override",
    pattern: /\b(?:pretend|act\s+as|you\s+are)\b[^.!?\n]{0,20}\b(?:different|another|unrestricted|unfiltered|jailbroken)\s+(?:ai|model|assistant|chatbot)\b/i,
  },
  { id: "jailbreak", pattern: /\bjail\s?(?:break|broke|broken|breaking)\b|\bdo\s+anything\s+now\b|\bDAN\s+mode\b/i },
  { id: "privileged-mode", pattern: /\b(?:developer|debug|god|sudo)\s+mode\b/i },
];

/** Returns the id of the first injection rule the text trips, or null. */
export function detectInjection(text: string): string | null {
  return INJECTION_RULES.find((rule) => rule.pattern.test(text))?.id ?? null;
}

// ---------------------------------------------------------------------------
// Content policy
// ---------------------------------------------------------------------------

interface PolicyRule {
  id: string;
  pattern: RegExp;
  message: string;
  guidance: string;
}

const POLICY_RULES: readonly PolicyRule[] = [
  {
    id: "no-dowry",
    pattern: /\b(?:dowry|dahej)\b/i,
    message: "Content facilitating dowry is not allowed.",
    guidance:
      "The user mentioned dowry. Do not help plan, value, list or negotiate a dowry — it is illegal under the Dowry Prohibition Act, 1961. If they are rejecting dowry, support that. Offer help with lawful gifting or shagun customs instead.",
  },
  {
    id: "no-guarantee",
    pattern: /\bguarantee[ds]?\b[^.!?\n]{0,30}\b(?:availability|available|prices?|pricing|rates?|quality|bookings?)\b/i,
    message: "Cannot guarantee vendor availability, pricing or quality.",
    guidance: "Do not promise vendor availability, price or quality; say these must be confirmed with the vendor in writing.",
  },
  {
    id: "no-caste-filter",
    pattern:
      /\b(?:upper|lower|same|high|low)[-\s]?caste\b|\bcaste\b[^.!?\n]{0,40}\b(?:filter|rank|only|prefer|exclude|match|based)\b|\b(?:filter|rank|exclude|sort)\b[^.!?\n]{0,40}\bcaste\b/i,
    message: "Caste-based filtering or ranking is not permitted.",
    guidance: "Do not filter, rank or recommend vendors, guests or partners by caste. Offer criteria based on budget, style, reviews or location instead.",
  },
  {
    id: "no-fairness",
    pattern: /\b(?:fair(?:ness)?\s+cream|skin\s+(?:whitening|lightening|brightening)|look\s+fairer|become\s+fair(?:er)?)\b/i,
    message: "Skin-tone-based beauty advice is not provided.",
    guidance: "Do not give skin-lightening or fairness advice. Offer general skincare-routine and makeup-trial planning without reference to skin tone.",
  },
  {
    id: "no-weight-advice",
    pattern: /\bcrash\s+diet\b|\blose\s+(?:\d+\s*(?:kg|kgs|kilos?|pounds|lbs)|weight)\s+(?:fast|quickly|before|for)\b/i,
    message: "Body or weight advice is not provided. Please consult a healthcare professional.",
    guidance: "Do not give diet or weight-loss advice. Kindly suggest a doctor or registered dietitian and offer help with outfit fittings and timelines instead.",
  },
];

/** A sentence carrying one of these cues is a refusal or legal note, not facilitation. */
const REFUSAL_CUE =
  /\b(?:can(?:'|’)?t|cannot|can\s+not|won(?:'|’)?t|will\s+not|unable\s+to|not\s+able\s+to|refuse|decline|illegal|unlawful|prohibit(?:ed|ion|s)?|criminal|offen[cs]e|against\s+the\s+law|(?:do\s+)?not\s+(?:recommend|advise|provide|help|support|suggest|assist|offer|promise)|don(?:'|’)?t\s+(?:recommend|advise|provide|support|suggest|offer|promise)|no\s+(?:guarantees?|promises?))\b/i;

const SAFETY_DOMAINS: ReadonlyArray<{ pattern: RegExp; domain: string }> = [
  { pattern: /\b(?:fireworks?|pyrotechnics?|firecrackers?)\b/i, domain: "fireworks" },
  { pattern: /\b(?:drones?|uav)\b/i, domain: "drones" },
  { pattern: /\b(?:liquor\s+licen[cs]e|alcohol\s+permit|bar\s+licen[cs]e)\b/i, domain: "alcohol-permits" },
  { pattern: /\b(?:fire\s+exits?|crowd\s+capacity|stampede|fire\s+safety)\b/i, domain: "crowd-safety" },
];

const VERIFY_NOTE = "Please verify with your local municipal authority or a licensed vendor before finalising.";
const VERIFY_CUE = /\bverify\b|\bcheck\s+with\b|\bconfirm\s+with\b/i;
const AUTHORITY_CUE = /\b(?:municipal|local\s+authorit|police|fire\s+department|licen[cs]ed|licen[cs]ing|permit\s+office)/i;

const OFF_TOPIC_SIGNALS: ReadonlyArray<{ pattern: RegExp; topic: string }> = [
  { pattern: /\b(?:stocks?|crypto(?:currency)?|bitcoin|stock\s+market|mutual\s+funds?|day\s+trading)\b/i, topic: "investments" },
  { pattern: /\b(?:diagnos\w*|prescri\w*|symptoms?|medication|dosage)\b/i, topic: "medical" },
  { pattern: /\b(?:lawsuit|legal\s+advice|sue\s+(?:them|him|her|the)|court\s+case)\b/i, topic: "legal" },
];

// ---------------------------------------------------------------------------
// Pre-flight: run on every request before it reaches the model
// ---------------------------------------------------------------------------

const INJECTION_BLOCK_REASON =
  "I noticed something in that message that looks like it might be trying to override my instructions. Could you rephrase what you need?";
const HISTORY_BLOCK_REASON =
  "Part of our earlier conversation looks like it is trying to override my instructions, so I can't continue this thread. Please start a new chat and tell me what you'd like to plan.";

export function preflightCheck(userMessage: string): PreflightResult {
  const events: GuardrailEvent[] = [];
  const modelGuidance: string[] = [];

  const piiStart = Date.now();
  const sanitized = redactPII(userMessage);
  events.push({ ruleId: "pii-redact", verdict: "pass", latencyMs: Date.now() - piiStart });

  const injStart = Date.now();
  const injectionRule = detectInjection(userMessage);
  if (injectionRule) {
    events.push({ ruleId: "injection-scan", verdict: "block", detail: `rule: ${injectionRule}`, latencyMs: Date.now() - injStart });
    return { allowed: false, sanitizedForLog: sanitized, events, blockReason: INJECTION_BLOCK_REASON, modelGuidance };
  }
  events.push({ ruleId: "injection-scan", verdict: "pass", latencyMs: Date.now() - injStart });

  const policyStart = Date.now();
  const policyHits = POLICY_RULES.filter((rule) => rule.pattern.test(userMessage));
  for (const rule of policyHits) {
    events.push({ ruleId: `policy-input:${rule.id}`, verdict: "flag", latencyMs: Date.now() - policyStart });
    modelGuidance.push(rule.guidance);
  }
  if (policyHits.length === 0) {
    events.push({ ruleId: "policy-input", verdict: "pass", latencyMs: Date.now() - policyStart });
  }

  const scopeStart = Date.now();
  const offTopic = OFF_TOPIC_SIGNALS.find((signal) => signal.pattern.test(userMessage));
  if (offTopic) {
    events.push({ ruleId: "scope-router", verdict: "flag", detail: `topic: ${offTopic.topic}`, latencyMs: Date.now() - scopeStart });
    modelGuidance.push(
      `The user raised a ${offTopic.topic} question, which is outside celebration planning. Give brief general orientation only, recommend a qualified professional, and steer back to the event.`
    );
  } else {
    events.push({ ruleId: "scope-router", verdict: "pass", latencyMs: Date.now() - scopeStart });
  }

  return { allowed: true, sanitizedForLog: sanitized, events, modelGuidance };
}

/**
 * Pre-flight over the whole client-supplied conversation. The history is untrusted: an
 * attacker can fabricate earlier "user" or "assistant" turns, so every entry is scanned.
 */
export function preflightConversation(messages: readonly ConversationMessage[]): PreflightResult {
  const latest = messages[messages.length - 1];
  const result = preflightCheck(latest?.content ?? "");
  if (!result.allowed) return result;

  const start = Date.now();
  for (const [i, message] of messages.slice(0, -1).entries()) {
    const rule = detectInjection(message.content);
    if (rule) {
      result.events.push({
        ruleId: "history-injection-scan",
        verdict: "block",
        detail: `message ${i} (${message.role}) rule: ${rule}`,
        latencyMs: Date.now() - start,
      });
      return { ...result, allowed: false, blockReason: HISTORY_BLOCK_REASON, modelGuidance: [] };
    }
  }
  result.events.push({ ruleId: "history-injection-scan", verdict: "pass", latencyMs: Date.now() - start });
  return result;
}

// ---------------------------------------------------------------------------
// Post-flight: run on every model output before it reaches the user
// ---------------------------------------------------------------------------

/** Budget invariants: schema, lines + contingency === total, contingency ≥ 5%, citations. */
export function postflightBudget(candidate: unknown): PostflightResult {
  const events: GuardrailEvent[] = [];
  const violations: string[] = [];
  const start = Date.now();

  const parsed = BudgetPlanSchema.safeParse(candidate);
  if (!parsed.success) {
    violations.push(`Schema validation failed: ${parsed.error.issues[0]?.message ?? "invalid plan"}`);
    events.push({ ruleId: "budget-schema", verdict: "block", latencyMs: Date.now() - start });
    return { passed: false, events, violations };
  }
  events.push({ ruleId: "budget-schema", verdict: "pass", latencyMs: Date.now() - start });
  const plan: BudgetPlan = parsed.data;

  const sumStart = Date.now();
  const linesSum = plan.lines.reduce((acc, line) => acc + line.allocated.amountMinor, 0);
  const diff = Math.abs(plan.total.amountMinor - (linesSum + plan.contingency.amountMinor));
  if (diff > 1) {
    violations.push(
      `Budget sum invariant failed: lines(${linesSum}) + contingency(${plan.contingency.amountMinor}) ≠ total(${plan.total.amountMinor}), diff=${diff}`
    );
    events.push({ ruleId: "budget-sum-invariant", verdict: "block", detail: `diff=${diff}`, latencyMs: Date.now() - sumStart });
  } else {
    events.push({ ruleId: "budget-sum-invariant", verdict: "pass", latencyMs: Date.now() - sumStart });
  }

  const contStart = Date.now();
  if (plan.contingencyPct < 0.05) {
    violations.push(`Contingency too low: ${(plan.contingencyPct * 100).toFixed(1)}% < 5%`);
    events.push({ ruleId: "budget-contingency-min", verdict: "block", latencyMs: Date.now() - contStart });
  } else {
    events.push({ ruleId: "budget-contingency-min", verdict: "pass", latencyMs: Date.now() - contStart });
  }

  const citeStart = Date.now();
  const uncited = plan.lines.filter((line) => !line.sourceCitation);
  if (uncited.length > 0) {
    events.push({
      ruleId: "budget-citation",
      verdict: "flag",
      detail: `${uncited.length} line(s) without a cost-band source`,
      latencyMs: Date.now() - citeStart,
    });
  } else {
    events.push({ ruleId: "budget-citation", verdict: "pass", latencyMs: Date.now() - citeStart });
  }

  return { passed: violations.length === 0, events, violations };
}

/**
 * Content policy on model text, evaluated per sentence. A sentence that mentions a blocked
 * topic inside a refusal or legal note ("dowry is illegal…", "I can't recommend a crash
 * diet") passes; one that facilitates it is blocked.
 */
export function postflightPolicy(text: string): PolicyResult {
  const events: GuardrailEvent[] = [];
  const violations: string[] = [];
  const requiredNotes: string[] = [];
  const start = Date.now();
  const parts = sentences(text);

  for (const rule of POLICY_RULES) {
    const facilitating = parts.some((s) => rule.pattern.test(s) && !REFUSAL_CUE.test(s));
    if (facilitating) {
      violations.push(rule.message);
      events.push({ ruleId: rule.id, verdict: "block", latencyMs: Date.now() - start });
    }
  }
  if (violations.length === 0) {
    events.push({ ruleId: "policy-scan", verdict: "pass", latencyMs: Date.now() - start });
  }

  const hasVerifyNote = VERIFY_CUE.test(text) && AUTHORITY_CUE.test(text);
  for (const { pattern, domain } of SAFETY_DOMAINS) {
    if (!pattern.test(text)) continue;
    events.push({
      ruleId: `safety-${domain}`,
      verdict: "flag",
      detail: hasVerifyNote ? "verify-with-authority note present" : "verify-with-authority note appended",
      latencyMs: Date.now() - start,
    });
    if (!hasVerifyNote && !requiredNotes.includes(VERIFY_NOTE)) requiredNotes.push(VERIFY_NOTE);
  }

  return { passed: violations.length === 0, events, violations, requiredNotes };
}

// ---------------------------------------------------------------------------
// Figure traceability (BUILD_PROMPT.md §3)
// ---------------------------------------------------------------------------

const FIGURE_PATTERN =
  /(₹|\$|€|£|\brs\.?|\binr\b)?\s?(\d+(?:,\d+)*(?:\.\d+)?)\s*(crores?|cr|lakhs?|lacs?|l|k)?\b/gi;

const UNIT_MULTIPLIER: Record<string, number> = {
  crore: 1e7,
  crores: 1e7,
  cr: 1e7,
  lakh: 1e5,
  lakhs: 1e5,
  lac: 1e5,
  lacs: 1e5,
  l: 1e5,
  k: 1e3,
};

/** Units that mark a currency amount even without a ₹/Rs prefix ("28.4 lakh"). */
const STANDALONE_UNITS = new Set(["crore", "crores", "cr", "lakh", "lakhs", "lac", "lacs"]);

/** Extract currency amounts, understanding ₹28.4L, 1.2 crore, ₹2,50,000 and Rs. 500. */
export function extractCurrencyFigures(text: string): CurrencyFigure[] {
  const figures: CurrencyFigure[] = [];
  for (const match of text.matchAll(FIGURE_PATTERN)) {
    const [, prefix, digits, rawUnit] = match;
    const unit = rawUnit?.toLowerCase();
    if (!digits || (!prefix && !(unit && STANDALONE_UNITS.has(unit)))) continue;

    const value = Number.parseFloat(digits.replace(/,/g, ""));
    if (!Number.isFinite(value)) continue;

    const multiplier = (unit && UNIT_MULTIPLIER[unit]) || 1;
    const decimals = digits.split(".")[1]?.length ?? 0;
    const tolerance = multiplier > 1 ? 0.5 * 10 ** -decimals * multiplier + 1 : 1;

    const leading = match[0].length - match[0].trimStart().length;
    figures.push({ raw: match[0].trim(), index: (match.index ?? 0) + leading, rupees: value * multiplier, tolerance });
  }
  return figures;
}

/**
 * Every rupee amount a reply may quote this turn: Money values and quoted figures from tool
 * results, plus figures the user stated themselves (echoing them is not invention).
 */
export function collectTraceableFigures(toolResults: readonly unknown[], userTexts: readonly string[]): number[] {
  const allowed: number[] = [];

  const visit = (value: unknown): void => {
    if (typeof value === "string") {
      for (const figure of extractCurrencyFigures(value)) allowed.push(figure.rupees);
      return;
    }
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (value && typeof value === "object") {
      const record = value as Record<string, unknown>;
      if (typeof record.amountMinor === "number" && typeof record.currency === "string") {
        allowed.push(record.amountMinor / 100);
      }
      Object.values(record).forEach(visit);
    }
  };

  toolResults.forEach(visit);
  for (const text of userTexts) {
    for (const figure of extractCurrencyFigures(text)) allowed.push(figure.rupees);
  }
  return allowed;
}

/** Fail the turn if any currency figure in the reply does not trace to an allowed value. */
export function postflightTraceability(modelText: string, allowedRupees: Iterable<number>): TraceabilityResult {
  const start = Date.now();
  const allowed = [...allowedRupees];
  const untraceable = extractCurrencyFigures(modelText).filter(
    (figure) => !allowed.some((value) => Math.abs(value - figure.rupees) <= figure.tolerance)
  );
  const violations = untraceable.map((f) => `Currency figure "${f.raw}" not found in tool results`);

  const events: GuardrailEvent[] = [
    untraceable.length > 0
      ? {
          ruleId: "figure-traceability",
          verdict: "block",
          detail: `${untraceable.length} untraceable figure(s)`,
          latencyMs: Date.now() - start,
        }
      : { ruleId: "figure-traceability", verdict: "pass", latencyMs: Date.now() - start },
  ];

  return { passed: untraceable.length === 0, events, violations, untraceable };
}

/** Replace untraceable figures in place so no invented amount reaches the user. */
export function redactUntraceableFigures(text: string, untraceable: readonly CurrencyFigure[]): string {
  return [...untraceable]
    .sort((a, b) => b.index - a.index)
    .reduce(
      (acc, figure) =>
        acc.slice(0, figure.index) + "[estimate withheld]" + acc.slice(figure.index + figure.raw.length),
      text
    );
}
