import { useState } from "react";
import { sendChat, type GuardrailEntry } from "@/lib/client/chat-api";
import {
  alertForResult,
  applyChatResult,
  toApiHistory,
  type ChatMessage,
} from "@/lib/client/chat-messages";
import type { EventBrief } from "@/lib/core/types";

export interface ConciergeChat {
  messages: ChatMessage[];
  input: string;
  setInput: (value: string) => void;
  loading: boolean;
  alert: string;
  guardrailLog: GuardrailEntry[];
  submit: () => Promise<void>;
}

/** Conversation state for the AI Concierge, including the guardrail audit trail. */
export function useConciergeChat(brief: EventBrief): ConciergeChat {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState("");
  const [guardrailLog, setGuardrailLog] = useState<GuardrailEntry[]>([]);

  async function submit(): Promise<void> {
    const text = input.trim();
    if (!text || loading) return;

    const userMessage: ChatMessage = { role: "user", content: text };
    const previous = messages;
    const pending = [...previous, userMessage];
    setInput("");
    setMessages(pending);
    setAlert("");
    setLoading(true);

    try {
      const result = await sendChat(toApiHistory(pending), { brief });
      if (result.events.length > 0) setGuardrailLog((prev) => [...prev, ...result.events]);
      setMessages(applyChatResult(previous, userMessage, result));
      setAlert(alertForResult(result));
    } finally {
      setLoading(false);
    }
  }

  return { messages, input, setInput, loading, alert, guardrailLog, submit };
}
