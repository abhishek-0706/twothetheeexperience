import type { ChatSession, GenerateContentResult, Part } from "@google/generative-ai";
import { logger } from "@/lib/logger";

const MODEL_CALL_TIMEOUT_MS = 20_000;
const TRANSIENT_STATUSES = new Set([429, 500, 503]);
const RETRY_DELAYS_MS = [800, 2000];

export class UpstreamTimeoutError extends Error {
  constructor() {
    super("Model call exceeded its deadline");
    this.name = "UpstreamTimeoutError";
  }
}

export function isTransientUpstreamError(error: unknown): boolean {
  if (typeof error !== "object" || error === null || !("status" in error)) return false;
  return typeof error.status === "number" && TRANSIENT_STATUSES.has(error.status);
}

/** Gemini returns 503 under load spikes; a short backoff usually succeeds. */
export async function sendWithRetry(
  chat: ChatSession,
  parts: Part[],
  deadline: number
): Promise<GenerateContentResult> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await sendWithTimeout(chat, parts, deadline);
    } catch (error) {
      const delay = RETRY_DELAYS_MS[attempt];
      const canRetry =
        isTransientUpstreamError(error) && delay !== undefined && Date.now() + delay < deadline;
      if (!canRetry) throw error;
      logger.warn("chat.upstream_retry", { attempt: attempt + 1 });
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

async function sendWithTimeout(
  chat: ChatSession,
  parts: Part[],
  deadline: number
): Promise<GenerateContentResult> {
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
