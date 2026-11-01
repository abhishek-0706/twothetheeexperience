import type { ChatResult, ChatTurn } from "./chat-api";

const BLOCKED_ALERT = "Your message was blocked by a safety guardrail.";

export interface ChatMessage extends ChatTurn {
  /** The guardrail chain refused this exchange; it stays on screen but is never re-sent. */
  blocked?: boolean;
  /** The request failed; it stays on screen but is never re-sent. */
  isError?: boolean;
}

/**
 * Only clean exchanges go back to the model. Blocked or failed turns would otherwise
 * re-trigger the input guardrail on every later message and break turn alternation.
 */
export function toApiHistory(messages: ChatMessage[]): ChatTurn[] {
  return messages
    .filter((m) => !m.blocked && !m.isError)
    .map(({ role, content }) => ({ role, content }));
}

/** The conversation after a turn resolves; refused or failed turns are marked, never dropped. */
export function applyChatResult(
  previous: ChatMessage[],
  userMessage: ChatMessage,
  result: ChatResult
): ChatMessage[] {
  switch (result.kind) {
    case "reply":
      return [...previous, userMessage, { role: "assistant", content: result.text }];
    case "blocked":
      return [
        ...previous,
        { ...userMessage, blocked: true },
        { role: "assistant", content: result.text, blocked: true },
      ];
    case "error":
      return [
        ...previous,
        { ...userMessage, isError: true },
        { role: "assistant", content: result.message, isError: true },
      ];
  }
}

/** Text for the screen-reader alert region after a turn resolves. */
export function alertForResult(result: ChatResult): string {
  if (result.kind === "blocked") return BLOCKED_ALERT;
  if (result.kind === "error") return result.message;
  return "";
}
