import { BudgetPlanSchema, type BudgetPlan } from "../../core/types";
import { guardrailEvent } from "./events";
import type { GuardrailEvent, PostflightResult } from "./types";

const MIN_CONTINGENCY_PCT = 0.05;
/** Largest-remainder rounding can leave at most one minor unit of drift. */
const SUM_TOLERANCE_MINOR = 1;

/** Budget invariants: schema, lines + contingency === total, contingency ≥ 5%, citations. */
export function postflightBudget(candidate: unknown): PostflightResult {
  const start = Date.now();
  const parsed = BudgetPlanSchema.safeParse(candidate);
  if (!parsed.success) {
    const reason = parsed.error.issues[0]?.message ?? "invalid plan";
    return {
      passed: false,
      events: [guardrailEvent("budget-schema", "block", start)],
      violations: [`Schema validation failed: ${reason}`],
    };
  }

  const plan = parsed.data;
  const checks = [checkSum(plan), checkContingency(plan)];
  const events = [
    guardrailEvent("budget-schema", "pass", start),
    ...checks.map((c) => c.event),
    checkCitations(plan),
  ];
  const violations = checks.flatMap((c) => (c.violation ? [c.violation] : []));
  return { passed: violations.length === 0, events, violations };
}

interface InvariantCheck {
  event: GuardrailEvent;
  violation?: string;
}

function checkSum(plan: BudgetPlan): InvariantCheck {
  const start = Date.now();
  const linesSum = plan.lines.reduce((acc, line) => acc + line.allocated.amountMinor, 0);
  const contingency = plan.contingency.amountMinor;
  const diff = Math.abs(plan.total.amountMinor - (linesSum + contingency));
  if (diff <= SUM_TOLERANCE_MINOR) {
    return { event: guardrailEvent("budget-sum-invariant", "pass", start) };
  }
  return {
    event: guardrailEvent("budget-sum-invariant", "block", start, `diff=${diff}`),
    violation: `Budget sum invariant failed: lines(${linesSum}) + contingency(${contingency}) ≠ total(${plan.total.amountMinor}), diff=${diff}`,
  };
}

function checkContingency(plan: BudgetPlan): InvariantCheck {
  const start = Date.now();
  if (plan.contingencyPct >= MIN_CONTINGENCY_PCT) {
    return { event: guardrailEvent("budget-contingency-min", "pass", start) };
  }
  return {
    event: guardrailEvent("budget-contingency-min", "block", start),
    violation: `Contingency too low: ${(plan.contingencyPct * 100).toFixed(1)}% < 5%`,
  };
}

/** Missing citations are flagged, not blocked: some categories have no benchmark yet. */
function checkCitations(plan: BudgetPlan): GuardrailEvent {
  const start = Date.now();
  const uncited = plan.lines.filter((line) => !line.sourceCitation).length;
  return uncited > 0
    ? guardrailEvent(
        "budget-citation",
        "flag",
        start,
        `${uncited} line(s) without a cost-band source`
      )
    : guardrailEvent("budget-citation", "pass", start);
}
