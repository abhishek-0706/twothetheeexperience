/**
 * POST /api/chat — the only route that talks to the model.
 *
 * Rate limit → body size and schema → pre-flight guardrails over the whole conversation →
 * model turn. The API key is read server-side only and never reaches the browser.
 */

import { NextResponse } from "next/server";
import { preflightConversation, type PreflightResult } from "@/lib/agent/guardrails";
import { errorResponse, upstreamErrorResponse } from "@/lib/agent/http";
import { runTurn } from "@/lib/agent/orchestrator";
import { checkRateLimit, clientKey } from "@/lib/agent/rate-limit";
import { readChatRequest } from "@/lib/agent/request-schema";
import { promptHash } from "@/lib/agent/system-prompt";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request): Promise<NextResponse> {
  const limit = checkRateLimit(clientKey(req));
  if (!limit.allowed) {
    return errorResponse(
      429,
      "rate_limited",
      "Too many requests. Please wait a minute and try again.",
      { "Retry-After": String(limit.retryAfterSec) }
    );
  }

  const request = await readChatRequest(req);
  if (!request.ok) return errorResponse(request.status, request.code, request.message);
  const { messages, brief } = request.data;

  const preflight = preflightConversation(messages);
  if (!preflight.allowed) return blockedResponse(preflight);

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
    return upstreamErrorResponse(error);
  }
}

function blockedResponse(preflight: PreflightResult): NextResponse {
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
