import { z } from "zod";
import type { EventBrief } from "@/lib/core/types";

const GuardrailEntrySchema = z.object({
  ruleId: z.string(),
  verdict: z.enum(["pass", "flag", "block"]),
  detail: z.string().optional(),
});

const ChatResponseSchema = z.object({
  response: z.string().optional(),
  blocked: z.boolean().optional(),
  guardrailEvents: z.array(GuardrailEntrySchema).optional(),
  error: z.object({ code: z.string(), message: z.string() }).optional(),
});

export type GuardrailEntry = z.infer<typeof GuardrailEntrySchema>;

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export type ChatResult =
  | { kind: "reply"; text: string; events: GuardrailEntry[] }
  | { kind: "blocked"; text: string; events: GuardrailEntry[] }
  | { kind: "error"; message: string; events: GuardrailEntry[] };

interface SendChatOptions {
  brief?: EventBrief;
  signal?: AbortSignal;
}

const CHAT_ENDPOINT = "/api/chat";
const NETWORK_ERROR = "Could not reach the server. Please check your connection.";
const GENERIC_ERROR = "Something went wrong. Please try again.";
const BLOCKED_FALLBACK = "That message was blocked.";
const EMPTY_REPLY_FALLBACK = "No response received.";

async function readBody(res: Response): Promise<z.infer<typeof ChatResponseSchema> | null> {
  try {
    const parsed = ChatResponseSchema.safeParse(await res.json());
    return parsed.success ? parsed.data : null;
  } catch {
    // Non-JSON bodies (e.g. a platform timeout page) are treated as a generic failure.
    return null;
  }
}

/** Sends a conversation to the chat API and returns a validated, discriminated result. */
export async function sendChat(
  messages: ChatTurn[],
  { brief, signal }: SendChatOptions = {}
): Promise<ChatResult> {
  let res: Response;
  try {
    res = await fetch(CHAT_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(brief ? { messages, brief } : { messages }),
      signal,
    });
  } catch {
    return { kind: "error", message: NETWORK_ERROR, events: [] };
  }

  const body = await readBody(res);
  if (!body) return { kind: "error", message: GENERIC_ERROR, events: [] };

  const events = body.guardrailEvents ?? [];
  if (!res.ok) return { kind: "error", message: body.error?.message ?? GENERIC_ERROR, events };
  if (body.blocked) return { kind: "blocked", text: body.response ?? BLOCKED_FALLBACK, events };
  return { kind: "reply", text: body.response ?? EMPTY_REPLY_FALLBACK, events };
}
