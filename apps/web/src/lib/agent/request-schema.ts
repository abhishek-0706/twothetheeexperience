import { z } from "zod";
import { EventBriefSchema } from "@/lib/core/types";

export const MAX_BODY_BYTES = 64 * 1024;
export const MAX_MESSAGES = 30;
export const MAX_MESSAGE_CHARS = 4000;

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

export type ChatMessage = z.infer<typeof ChatMessageSchema>;
export type ChatRequest = z.infer<typeof ChatRequestSchema>;

export type RequestReadResult =
  { ok: true; data: ChatRequest } | { ok: false; status: 400 | 413; code: string; message: string };

const tooLarge = {
  ok: false,
  status: 413,
  code: "payload_too_large",
  message: "Request is too large.",
} as const;

/** Enforce the size cap before parsing, then validate the body shape. */
export async function readChatRequest(req: Request): Promise<RequestReadResult> {
  if (Number(req.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) return tooLarge;
  const raw = await req.text();
  if (new TextEncoder().encode(raw).length > MAX_BODY_BYTES) return tooLarge;

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return {
      ok: false,
      status: 400,
      code: "invalid_json",
      message: "Request body must be valid JSON.",
    };
  }

  const parsed = ChatRequestSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const where = issue?.path.join(".") || "body";
    const message = `${where}: ${issue?.message ?? "Invalid request"}`;
    return { ok: false, status: 400, code: "invalid_request", message };
  }

  if (parsed.data.messages.at(-1)?.role !== "user") {
    const message = "The last message must come from the user.";
    return { ok: false, status: 400, code: "invalid_request", message };
  }
  return { ok: true, data: parsed.data };
}
