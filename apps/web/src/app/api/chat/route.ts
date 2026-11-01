/**
 * POST /api/chat — the only route that talks to the model.
 *
 * Order of operations: rate limit → body size → schema → pre-flight guardrails over the
 * whole conversation → tool loop (deterministic tools, budget invariants) → figure
 * traceability (one corrective retry, then a deterministic fallback) → content policy.
 * The API key is read server-side only and never reaches the browser.
 */

import { NextResponse } from "next/server";
import {
  GoogleGenerativeAI,
  type ChatSession,
  type Content,
  type Part,
} from "@google/generative-ai";
import { z } from "zod";
import {
  collectTraceableFigures,
  postflightBudget,
  postflightPolicy,
  postflightTraceability,
  preflightConversation,
  redactPII,
  redactUntraceableFigures,
  type GuardrailEvent,
  type PreflightResult,
  type TraceabilityResult,
} from "@/lib/agent/guardrails";
import { checkRateLimit, clientKey } from "@/lib/agent/rate-limit";
import { SYSTEM_PROMPT, promptHash } from "@/lib/agent/system-prompt";
import {
  TOOL_DECLARATIONS,
  executeTool,
  latestBudgetPlan,
  summarizeBudgetPlan,
  type ToolInvocation,
  type ToolResult,
} from "@/lib/agent/tools";
import { EventBriefSchema, type EventBrief } from "@/lib/core/types";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const maxDuration = 60;

const MODEL_ID = process.env.GEMINI_MODEL ?? "gemini-3.8-flash";
const MAX_BODY_BYTES = 64 * 1024;
const MAX_MESSAGES = 30;
const MAX_MESSAGE_CHARS = 4000;
const MAX_TOOL_ROUNDS = 5;
const MAX_RETRY_ROUNDS = 2;
const MODEL_CALL_TIMEOUT_MS = 20_000;
const TURN_DEADLINE_MS = 50_000;

const ChatMessageSchema = z
  .object({
    role: z.enum(["user", "assistant"]),
    content: z
      .string()
      .trim()
      .min(1, "Message content cannot be empty")
      .max(MAX_MESSAGE_CHARS, `Message content must be at most ${MAX_MESSAGE_CHARS} characters`),
  })
  .strict();

const ChatRequestSchema = z.object({
  messages: z
    .array(ChatMessageSchema)
    .min(1)
    .max(MAX_MESSAGES, `At most ${MAX_MESSAGES} messages per request`),
  brief: EventBriefSchema.optional(),
});

type ChatMessage = z.infer<typeof ChatMessageSchema>;

const POLICY_FALLBACK =
  "I can't help with that part, but I'd be glad to help with the rest of your celebration — venues, budget, timeline, rituals or ideas. What would you like to plan next?";
const EMPTY_FALLBACK =
  "I couldn't complete that request. Could you rephrase it or share a little more detail about your event?";
const FIGURE_NOTE =
  "I only quote amounts produced by the budget engine. Ask me to allocate your budget and I'll give you exact figures.";

class UpstreamTimeoutError extends Error {
  constructor() {
    super("Model call exceeded its deadline");
    this.name = "UpstreamTimeoutError";
  }
}

/** `response` mirrors the message so the existing chat UI renders errors inline. */
function errorResponse(
  status: number,
  code: string,
  message: string,
  headers?: HeadersInit
): NextResponse {
  return NextResponse.json({ error: { code, message }, response: message }, { status, headers });
}

export async function POST(req: Request): Promise<NextResponse> {
  const limit = checkRateLimit(clientKey(req));
  if (!limit.allowed) {
    return errorResponse(
      429,
      "rate_limited",
      "Too many requests. Please wait a minute and try again.",
      {
        "Retry-After": String(limit.retryAfterSec),
      }
    );
  }

  if (Number(req.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) {
    return errorResponse(413, "payload_too_large", "Request is too large.");
  }
  const raw = await req.text();
  if (new TextEncoder().encode(raw).length > MAX_BODY_BYTES) {
    return errorResponse(413, "payload_too_large", "Request is too large.");
  }

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return errorResponse(400, "invalid_json", "Request body must be valid JSON.");
  }

  const parsed = ChatRequestSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const where = issue?.path.join(".") || "body";
    return errorResponse(
      400,
      "invalid_request",
      `${where}: ${issue?.message ?? "Invalid request"}`
    );
  }

  const { messages, brief } = parsed.data;
  if (messages[messages.length - 1]?.role !== "user") {
    return errorResponse(400, "invalid_request", "The last message must come from the user.");
  }

  const preflight = preflightConversation(messages);
  if (!preflight.allowed) {
    logger.warn("chat.guardrail_block", {
      rules: preflight.events.filter((e) => e.verdict === "block").map((e) => e.detail ?? e.ruleId),
      excerpt: preflight.sanitizedForLog.slice(0, 120),
    });
    return NextResponse.json({
      response: preflight.blockReason,
      guardrailEvents: preflight.events,
      blocked: true,
    });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return errorResponse(
      503,
      "not_configured",
      "The AI concierge is not configured on this deployment."
    );
  }

  try {
    const turn = await runTurn(apiKey, messages, brief, preflight);
    return NextResponse.json({
      response: turn.text,
      guardrailEvents: turn.events,
      toolResults: turn.invocations.map(({ name, result }) => ({ tool: name, ...result })),
      promptVersion: promptHash(),
      blocked: false,
    });
  } catch (error) {
    if (error instanceof UpstreamTimeoutError) {
      logger.warn("chat.upstream_timeout");
      return errorResponse(
        504,
        "upstream_timeout",
        "The AI service took too long to respond. Please try again."
      );
    }
    if (isTransientUpstreamError(error)) {
      logger.warn("chat.upstream_busy");
      return errorResponse(
        503,
        "upstream_busy",
        "The AI service is busy right now. Please try again in a moment."
      );
    }
    logger.error("chat.unhandled_error", {
      name: error instanceof Error ? error.name : "unknown",
      message: error instanceof Error ? redactPII(error.message).slice(0, 300) : undefined,
    });
    return errorResponse(500, "internal_error", "Something went wrong. Please try again.");
  }
}

interface TurnResult {
  text: string;
  events: GuardrailEvent[];
  invocations: ToolInvocation[];
}

async function runTurn(
  apiKey: string,
  messages: ChatMessage[],
  brief: EventBrief | undefined,
  preflight: PreflightResult
): Promise<TurnResult> {
  const deadline = Date.now() + TURN_DEADLINE_MS;
  const events: GuardrailEvent[] = [...preflight.events];
  const model = new GoogleGenerativeAI(apiKey).getGenerativeModel({
    model: MODEL_ID,
    systemInstruction: buildSystemInstruction(preflight.modelGuidance),
    tools: [{ functionDeclarations: TOOL_DECLARATIONS }],
  });
  const chat = model.startChat({ history: toGeminiHistory(messages.slice(0, -1)) });
  const userTexts = messages.filter((m) => m.role === "user").map((m) => m.content);
  const latest = messages[messages.length - 1]?.content ?? "";

  const first = await runToolLoop(
    chat,
    [{ text: latest }],
    MAX_TOOL_ROUNDS,
    brief,
    deadline,
    events
  );
  const invocations = [...first.invocations];
  let text = first.text;
  let trace = traceFigures(text, invocations, userTexts);
  events.push(...trace.events);

  if (!trace.passed) {
    const retry = await runToolLoop(
      chat,
      [{ text: correctionPrompt(trace) }],
      MAX_RETRY_ROUNDS,
      brief,
      deadline,
      events
    );
    invocations.push(...retry.invocations);
    if (retry.text.trim()) {
      text = retry.text;
      trace = traceFigures(text, invocations, userTexts);
      events.push(...trace.events.map((e) => ({ ...e, ruleId: "figure-traceability-retry" })));
    }
    if (!trace.passed) {
      text = deterministicFallback(text, trace, invocations);
      events.push({
        ruleId: "figure-traceability-fallback",
        verdict: "block",
        detail: "deterministic response returned",
        latencyMs: 0,
      });
      logger.warn("chat.traceability_fallback", { untraceable: trace.untraceable.length });
    }
  }

  if (!text.trim()) {
    const plan = latestBudgetPlan(invocations);
    text = plan ? summarizeBudgetPlan(plan) : EMPTY_FALLBACK;
  }

  const policy = postflightPolicy(text);
  events.push(...policy.events);
  if (!policy.passed) {
    logger.warn("chat.policy_block", {
      rules: policy.events.filter((e) => e.verdict === "block").map((e) => e.ruleId),
    });
    return { text: POLICY_FALLBACK, events, invocations };
  }
  if (policy.requiredNotes.length > 0) text = `${text}\n\n${policy.requiredNotes.join("\n")}`;

  logger.info("chat.turn_complete", {
    tools: invocations.map((i) => i.name),
    events: events.length,
  });
  return { text, events, invocations };
}

async function runToolLoop(
  chat: ChatSession,
  parts: Part[],
  maxRounds: number,
  brief: EventBrief | undefined,
  deadline: number,
  events: GuardrailEvent[]
): Promise<{ text: string; invocations: ToolInvocation[] }> {
  const invocations: ToolInvocation[] = [];
  let text = "";
  let next = parts;

  for (let round = 0; round < maxRounds; round++) {
    const result = await sendWithTimeout(chat, next, deadline);
    const responseParts = result.response.candidates?.[0]?.content?.parts ?? [];
    const texts = responseParts.flatMap((part) => (part.text ? [part.text] : []));
    if (texts.length > 0) text = texts.join("\n");

    const calls = responseParts.flatMap((part) => (part.functionCall ? [part.functionCall] : []));
    if (calls.length === 0) break;

    next = calls.map((call) => {
      const toolResult = guardToolResult(
        call.name,
        executeTool(call.name, call.args, brief),
        events
      );
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

const TRANSIENT_STATUSES = new Set([429, 500, 503]);
const RETRY_DELAYS_MS = [800, 2000];

function isTransientUpstreamError(error: unknown): boolean {
  const status = (error as { status?: unknown } | null)?.status;
  return typeof status === "number" && TRANSIENT_STATUSES.has(status);
}

// Gemini returns 503 under load spikes; a short backoff usually succeeds.
async function sendWithTimeout(chat: ChatSession, parts: Part[], deadline: number) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await sendOnce(chat, parts, deadline);
    } catch (error) {
      const delay = RETRY_DELAYS_MS[attempt];
      if (
        !isTransientUpstreamError(error) ||
        delay === undefined ||
        Date.now() + delay >= deadline
      ) {
        throw error;
      }
      logger.warn("chat.upstream_retry", { attempt: attempt + 1 });
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

async function sendOnce(chat: ChatSession, parts: Part[], deadline: number) {
  const remaining = Math.min(MODEL_CALL_TIMEOUT_MS, deadline - Date.now());
  if (remaining <= 0) throw new UpstreamTimeoutError();

  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new UpstreamTimeoutError());
    }, remaining);
  });

  try {
    return await Promise.race([chat.sendMessage(parts, { signal: controller.signal }), timeout]);
  } finally {
    clearTimeout(timer);
  }
}

function traceFigures(
  text: string,
  invocations: readonly ToolInvocation[],
  userTexts: readonly string[]
): TraceabilityResult {
  return postflightTraceability(
    text,
    collectTraceableFigures(
      invocations.map((i) => i.result),
      userTexts
    )
  );
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

function buildSystemInstruction(guidance: readonly string[]): string {
  if (guidance.length === 0) return SYSTEM_PROMPT;
  return `${SYSTEM_PROMPT}\nGUARDRAIL NOTES FOR THIS TURN\n${guidance.map((g) => `- ${g}`).join("\n")}\n`;
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
