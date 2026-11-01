import {
  GoogleGenerativeAI,
  type ChatSession,
  type Content,
  type Part,
} from "@google/generative-ai";
import type { EventBrief } from "@/lib/core/types";
import { logger } from "@/lib/logger";
import {
  collectTraceableFigures,
  postflightBudget,
  postflightPolicy,
  postflightTraceability,
  redactUntraceableFigures,
  type GuardrailEvent,
  type PreflightResult,
  type TraceabilityResult,
} from "./guardrails";
import { sendWithRetry } from "./model-call";
import type { ChatMessage } from "./request-schema";
import { SYSTEM_PROMPT } from "./system-prompt";
import {
  TOOL_DECLARATIONS,
  executeTool,
  latestBudgetPlan,
  summarizeBudgetPlan,
  type ToolInvocation,
  type ToolResult,
} from "./tools";

const MODEL_ID = process.env.GEMINI_MODEL ?? "gemini-3.8-flash";
const MAX_TOOL_ROUNDS = 5;
const MAX_RETRY_ROUNDS = 2;
const TURN_DEADLINE_MS = 50_000;

const POLICY_FALLBACK =
  "I can't help with that part, but I'd be glad to help with the rest of your celebration — venues, budget, timeline, rituals or ideas. What would you like to plan next?";
const EMPTY_FALLBACK =
  "I couldn't complete that request. Could you rephrase it or share a little more detail about your event?";
const FIGURE_NOTE =
  "I only quote amounts produced by the budget engine. Ask me to allocate your budget and I'll give you exact figures.";

export interface TurnResult {
  text: string;
  events: GuardrailEvent[];
  invocations: ToolInvocation[];
}

interface TurnContext {
  chat: ChatSession;
  brief: EventBrief | undefined;
  deadline: number;
  events: GuardrailEvent[];
  userTexts: string[];
}

interface Draft {
  text: string;
  invocations: ToolInvocation[];
}

/**
 * One chat turn: tool loop over deterministic tools → figure traceability (one corrective
 * retry, then a deterministic fallback) → content policy.
 */
export async function runTurn(
  apiKey: string,
  messages: readonly ChatMessage[],
  brief: EventBrief | undefined,
  preflight: PreflightResult
): Promise<TurnResult> {
  const model = new GoogleGenerativeAI(apiKey).getGenerativeModel({
    model: MODEL_ID,
    systemInstruction: buildSystemInstruction(preflight.modelGuidance),
    tools: [{ functionDeclarations: TOOL_DECLARATIONS }],
  });
  const ctx: TurnContext = {
    chat: model.startChat({ history: toGeminiHistory(messages.slice(0, -1)) }),
    brief,
    deadline: Date.now() + TURN_DEADLINE_MS,
    events: [...preflight.events],
    userTexts: messages.filter((m) => m.role === "user").map((m) => m.content),
  };

  const draft = await draftTracedReply(ctx, messages.at(-1)?.content ?? "");
  const text = draft.text.trim() ? draft.text : emptyFallback(draft.invocations);
  return applyContentPolicy(text, ctx.events, draft.invocations);
}

async function draftTracedReply(ctx: TurnContext, latest: string): Promise<Draft> {
  const first = await runToolLoop(ctx, [{ text: latest }], MAX_TOOL_ROUNDS);
  const invocations = [...first.invocations];
  let text = first.text;
  let trace = traceFigures(text, invocations, ctx.userTexts);
  ctx.events.push(...trace.events);
  if (trace.passed) return { text, invocations };

  const retry = await runToolLoop(ctx, [{ text: correctionPrompt(trace) }], MAX_RETRY_ROUNDS);
  invocations.push(...retry.invocations);
  if (retry.text.trim()) {
    text = retry.text;
    trace = traceFigures(text, invocations, ctx.userTexts);
    ctx.events.push(...trace.events.map((e) => ({ ...e, ruleId: "figure-traceability-retry" })));
  }
  if (trace.passed) return { text, invocations };

  ctx.events.push({
    ruleId: "figure-traceability-fallback",
    verdict: "block",
    detail: "deterministic response returned",
    latencyMs: 0,
  });
  logger.warn("chat.traceability_fallback", { untraceable: trace.untraceable.length });
  return { text: deterministicFallback(text, trace, invocations), invocations };
}

async function runToolLoop(ctx: TurnContext, parts: Part[], maxRounds: number): Promise<Draft> {
  const invocations: ToolInvocation[] = [];
  let text = "";
  let next = parts;

  for (let round = 0; round < maxRounds; round++) {
    const result = await sendWithRetry(ctx.chat, next, ctx.deadline);
    const responseParts = result.response.candidates?.[0]?.content?.parts ?? [];
    const texts = responseParts.flatMap((part) => (part.text ? [part.text] : []));
    if (texts.length > 0) text = texts.join("\n");

    const calls = responseParts.flatMap((part) => (part.functionCall ? [part.functionCall] : []));
    if (calls.length === 0) break;

    next = calls.map((call) => {
      const raw = executeTool(call.name, call.args, ctx.brief);
      const toolResult = guardToolResult(call.name, raw, ctx.events);
      invocations.push({ name: call.name, result: toolResult });
      return { functionResponse: { name: call.name, response: toolResult } };
    });
  }

  return { text, invocations };
}

/** A budget that fails its invariants is withheld so the model can never narrate it. */
function guardToolResult(name: string, result: ToolResult, events: GuardrailEvent[]): ToolResult {
  if (name !== "allocate_budget" || result.status !== "ok") return result;
  const check = postflightBudget(result.plan);
  events.push(...check.events);
  if (check.passed) return result;
  logger.warn("chat.budget_invariant_failed", { violations: check.violations });
  return { status: "error", error: "The budget failed integrity checks and was withheld." };
}

function applyContentPolicy(
  text: string,
  events: GuardrailEvent[],
  invocations: ToolInvocation[]
): TurnResult {
  const policy = postflightPolicy(text);
  events.push(...policy.events);
  if (!policy.passed) {
    const rules = policy.events.filter((e) => e.verdict === "block").map((e) => e.ruleId);
    logger.warn("chat.policy_block", { rules });
    return { text: POLICY_FALLBACK, events, invocations };
  }

  const notes = policy.requiredNotes;
  const finalText = notes.length > 0 ? `${text}\n\n${notes.join("\n")}` : text;
  logger.info("chat.turn_complete", {
    tools: invocations.map((i) => i.name),
    events: events.length,
  });
  return { text: finalText, events, invocations };
}

function traceFigures(
  text: string,
  invocations: readonly ToolInvocation[],
  userTexts: readonly string[]
): TraceabilityResult {
  const toolResults = invocations.map((i) => i.result);
  return postflightTraceability(text, collectTraceableFigures(toolResults, userTexts));
}

function correctionPrompt(trace: TraceabilityResult): string {
  const figures = trace.untraceable.map((f) => f.raw).join(", ");
  return (
    `Your previous reply quoted amounts that did not come from a tool result or from the user: ${figures}. ` +
    "Rewrite the reply without those amounts. Use only figures returned by the tools (call allocate_budget if exact numbers are needed) or stated by the user."
  );
}

function deterministicFallback(
  text: string,
  trace: TraceabilityResult,
  invocations: readonly ToolInvocation[]
): string {
  const plan = latestBudgetPlan(invocations);
  if (plan) return summarizeBudgetPlan(plan);
  return `${redactUntraceableFigures(text, trace.untraceable)}\n\n${FIGURE_NOTE}`;
}

function emptyFallback(invocations: readonly ToolInvocation[]): string {
  const plan = latestBudgetPlan(invocations);
  return plan ? summarizeBudgetPlan(plan) : EMPTY_FALLBACK;
}

function buildSystemInstruction(guidance: readonly string[]): string {
  if (guidance.length === 0) return SYSTEM_PROMPT;
  const notes = guidance.map((g) => `- ${g}`).join("\n");
  return `${SYSTEM_PROMPT}\nGUARDRAIL NOTES FOR THIS TURN\n${notes}\n`;
}

/** Gemini history must start with a user turn; leading UI greetings are dropped. */
function toGeminiHistory(history: readonly ChatMessage[]): Content[] {
  const firstUser = history.findIndex((m) => m.role === "user");
  if (firstUser === -1) return [];
  return history.slice(firstUser).map((m) => ({
    role: m.role === "user" ? "user" : "model",
    parts: [{ text: m.content }],
  }));
}
