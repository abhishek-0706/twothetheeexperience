/**
 * Guardrail chain — pre-flight (input) and post-flight (output).
 *
 * BUILD_PROMPT.md §8. Every decision writes a guardrail_events row (here: a log entry).
 * This is the ordered, instrumented chain — not ad-hoc if-statements.
 */

import { BudgetPlanSchema, type BudgetPlan, type TimelineTask, type Conflict } from "../core/types";

// ---------------------------------------------------------------------------
// Pre-flight: run on every user message before it reaches the model
// ---------------------------------------------------------------------------

/** Patterns that suggest prompt injection in untrusted content. */
const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?previous\s+instructions/i,
  /you\s+are\s+now\s+/i,
  /system\s*:\s*/i,
  /\bdo\s+not\s+follow\b.*\brules\b/i,
  /pretend\s+you\s+are/i,
  /forget\s+(everything|all|your)\s+(above|previous|prior)/i,
  /disregard\s+(your|the|all)\s+(instructions|rules|guidelines)/i,
  /\bDAN\b/,
  /\bjailbreak\b/i,
  /<\/?system>/i,
];

/** PII patterns to redact before logging. NOT before the model — the model needs context. */
const PII_PATTERNS: Array<{ pattern: RegExp; replacement: string }> = [
  { pattern: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, replacement: "[EMAIL]" },
  { pattern: /\b(?:\+91[\s-]?)?[6-9]\d{9}\b/g, replacement: "[PHONE]" },
  { pattern: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, replacement: "[CARD]" },
  { pattern: /\b\d{12}\b/g, replacement: "[AADHAAR]" },
  { pattern: /[A-Z]{5}\d{4}[A-Z]/g, replacement: "[PAN]" },
];

export interface GuardrailEvent {
  ruleId: string;
  verdict: "pass" | "flag" | "block";
  detail?: string;
  latencyMs: number;
}

export interface PreflightResult {
  allowed: boolean;
  sanitizedForLog: string;
  events: GuardrailEvent[];
  /** If blocked, a user-friendly reason. */
  blockReason?: string;
}

export function preflightCheck(userMessage: string): PreflightResult {
  const events: GuardrailEvent[] = [];
  const start = Date.now();

  // 1. PII redaction (for logging — original goes to the model)
  let sanitized = userMessage;
  for (const { pattern, replacement } of PII_PATTERNS) {
    sanitized = sanitized.replace(pattern, replacement);
  }
  events.push({ ruleId: "pii-redact", verdict: "pass", latencyMs: Date.now() - start });

  // 2. Injection scan
  const injStart = Date.now();
  const injectionHit = INJECTION_PATTERNS.find((p) => p.test(userMessage));
  if (injectionHit) {
    events.push({
      ruleId: "injection-scan",
      verdict: "block",
      detail: `Matched: ${injectionHit.source}`,
      latencyMs: Date.now() - injStart,
    });
    return {
      allowed: false,
      sanitizedForLog: sanitized,
      events,
      blockReason: "I noticed something in that message that looks like it might be trying to override my instructions. Could you rephrase what you need?",
    };
  }
  events.push({ ruleId: "injection-scan", verdict: "pass", latencyMs: Date.now() - injStart });

  // 3. Scope check — off-topic
  const scopeStart = Date.now();
  const OFF_TOPIC_SIGNALS = [
    /\b(stock|crypto|bitcoin|invest|trade)\b/i,
    /\b(diagnos|prescri|symptom|medicat)\b/i,
    /\b(lawsuit|legal\s+advice|sue\s+them)\b/i,
  ];
  const offTopic = OFF_TOPIC_SIGNALS.find((p) => p.test(userMessage));
  if (offTopic) {
    events.push({
      ruleId: "scope-router",
      verdict: "flag",
      detail: `Off-topic signal: ${offTopic.source}`,
      latencyMs: Date.now() - scopeStart,
    });
    // Flag but don't block — let the model redirect gracefully
  } else {
    events.push({ ruleId: "scope-router", verdict: "pass", latencyMs: Date.now() - scopeStart });
  }

  return { allowed: true, sanitizedForLog: sanitized, events };
}

// ---------------------------------------------------------------------------
// Post-flight: run on every model output before it reaches the user
// ---------------------------------------------------------------------------

export interface PostflightResult {
  passed: boolean;
  events: GuardrailEvent[];
  violations: string[];
}

/**
 * Post-flight invariant checks on a generated budget plan.
 * BUILD_PROMPT.md §3: every currency figure must trace to a tool result.
 */
export function postflightBudget(plan: BudgetPlan): PostflightResult {
  const events: GuardrailEvent[] = [];
  const violations: string[] = [];
  const start = Date.now();

  // Schema validation
  const parsed = BudgetPlanSchema.safeParse(plan);
  if (!parsed.success) {
    violations.push(`Schema validation failed: ${parsed.error.message}`);
    events.push({ ruleId: "schema-validate", verdict: "block", latencyMs: Date.now() - start });
    return { passed: false, events, violations };
  }
  events.push({ ruleId: "schema-validate", verdict: "pass", latencyMs: Date.now() - start });

  // Sum invariant: lines + contingency === total (tolerance ±1 minor unit)
  const sumStart = Date.now();
  const linesSum = plan.lines.reduce((acc, l) => acc + l.allocated.amountMinor, 0);
  const diff = Math.abs(plan.total.amountMinor - (linesSum + plan.contingency.amountMinor));
  if (diff > 1) {
    violations.push(
      `Budget sum invariant failed: lines(${linesSum}) + contingency(${plan.contingency.amountMinor}) ≠ total(${plan.total.amountMinor}), diff=${diff}`
    );
    events.push({ ruleId: "sum-invariant", verdict: "block", detail: `diff=${diff}`, latencyMs: Date.now() - sumStart });
  } else {
    events.push({ ruleId: "sum-invariant", verdict: "pass", latencyMs: Date.now() - sumStart });
  }

  // Contingency >= 5%
  const contStart = Date.now();
  if (plan.contingencyPct < 0.05) {
    violations.push(`Contingency too low: ${(plan.contingencyPct * 100).toFixed(1)}% < 5%`);
    events.push({ ruleId: "contingency-min", verdict: "block", latencyMs: Date.now() - contStart });
  } else {
    events.push({ ruleId: "contingency-min", verdict: "pass", latencyMs: Date.now() - contStart });
  }

  // Every line has a citation
  const citeStart = Date.now();
  const uncited = plan.lines.filter((l) => !l.sourceCitation);
  if (uncited.length > 0) {
    violations.push(`${uncited.length} budget line(s) missing source citation: ${uncited.map((l) => l.category).join(", ")}`);
    events.push({ ruleId: "citation-required", verdict: "flag", latencyMs: Date.now() - citeStart });
  } else {
    events.push({ ruleId: "citation-required", verdict: "pass", latencyMs: Date.now() - citeStart });
  }

  return { passed: violations.length === 0, events, violations };
}

/**
 * Post-flight policy check on model-generated text.
 * BUILD_PROMPT.md §8: refuse or reframe specific categories.
 */
export function postflightPolicy(text: string): PostflightResult {
  const events: GuardrailEvent[] = [];
  const violations: string[] = [];
  const start = Date.now();

  const POLICY_RULES: Array<{ id: string; pattern: RegExp; message: string }> = [
    { id: "no-dowry", pattern: /\bdowry\b/i, message: "Content referencing dowry facilitation is not allowed." },
    { id: "no-guarantee", pattern: /\bguarantee[ds]?\s+(availability|price|quality|booking)/i, message: "Cannot guarantee vendor availability or pricing." },
    { id: "no-caste-filter", pattern: /\b(upper|lower)\s*caste\b/i, message: "Caste-based filtering or ranking is not permitted." },
    { id: "no-fairness", pattern: /\b(fair(ness)?\s+cream|skin\s+(whitening|lightening|brightening))\b/i, message: "Skin-tone-based beauty advice is not provided." },
    { id: "no-weight-advice", pattern: /\b(crash\s+diet|lose\s+weight\s+(before|for)\s+(the\s+)?(wedding|event))\b/i, message: "Body/weight advice is not provided. Please consult a healthcare professional." },
  ];

  for (const rule of POLICY_RULES) {
    if (rule.pattern.test(text)) {
      violations.push(rule.message);
      events.push({ ruleId: rule.id, verdict: "block", latencyMs: Date.now() - start });
    }
  }

  if (violations.length === 0) {
    events.push({ ruleId: "policy-scan", verdict: "pass", latencyMs: Date.now() - start });
  }

  // Safety-critical domains — flag, don't block
  const SAFETY_DOMAINS = [
    { pattern: /\b(fireworks?|pyrotechnics?|firecracker)\b/i, domain: "fireworks" },
    { pattern: /\b(drone|uav)\b/i, domain: "drones" },
    { pattern: /\b(liquor\s+licen[cs]e|alcohol\s+permit|bar\s+licen[cs]e)\b/i, domain: "alcohol permits" },
    { pattern: /\b(fire\s+exit|crowd\s+capacity|stampede|fire\s+safety)\b/i, domain: "crowd safety" },
  ];

  for (const { pattern, domain } of SAFETY_DOMAINS) {
    if (pattern.test(text)) {
      events.push({
        ruleId: `safety-${domain}`,
        verdict: "flag",
        detail: `Safety-critical domain: ${domain} — response must include "verify with local authority"`,
        latencyMs: Date.now() - start,
      });
    }
  }

  return { passed: violations.length === 0, events, violations };
}

/**
 * Check that every currency figure in the model's response traces to a tool result.
 * BUILD_PROMPT.md §3: "If the final message contains a currency figure or date that does
 * not appear in any tool result from this turn, fail the turn."
 */
export function postflightTraceability(
  modelText: string,
  toolResultNumbers: Set<number>
): PostflightResult {
  const events: GuardrailEvent[] = [];
  const violations: string[] = [];
  const start = Date.now();

  // Extract currency figures from the model text
  const currencyPattern = /[₹$€£]\s?[\d,]+(?:\.\d{1,2})?/g;
  const matches = modelText.match(currencyPattern) || [];

  for (const match of matches) {
    const numStr = match.replace(/[₹$€£\s,]/g, "");
    const num = parseFloat(numStr);
    if (!isNaN(num) && !toolResultNumbers.has(num)) {
      violations.push(`Currency figure "${match}" (${num}) not found in tool results`);
    }
  }

  if (violations.length > 0) {
    events.push({
      ruleId: "figure-traceability",
      verdict: "block",
      detail: `${violations.length} untraceable figure(s)`,
      latencyMs: Date.now() - start,
    });
  } else {
    events.push({ ruleId: "figure-traceability", verdict: "pass", latencyMs: Date.now() - start });
  }

  return { passed: violations.length === 0, events, violations };
}
