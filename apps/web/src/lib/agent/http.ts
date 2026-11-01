import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { redactPII } from "./guardrails";
import { isTransientUpstreamError, UpstreamTimeoutError } from "./model-call";

/** `response` mirrors the message so the chat UI can render errors inline. */
export function errorResponse(
  status: number,
  code: string,
  message: string,
  headers?: HeadersInit
): NextResponse {
  return NextResponse.json({ error: { code, message }, response: message }, { status, headers });
}

/** Map a failed model turn to a safe response; internals only ever reach the server log. */
export function upstreamErrorResponse(error: unknown): NextResponse {
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
