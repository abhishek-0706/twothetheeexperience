export type Verdict = "pass" | "flag" | "block";

/** Events carry rule ids, never regex sources or raw user text, so they are safe to log. */
export interface GuardrailEvent {
  ruleId: string;
  verdict: Verdict;
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
  /** Notes the response must carry, such as "verify with your local authority". */
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
