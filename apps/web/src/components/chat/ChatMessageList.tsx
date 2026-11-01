import Icon from "@/components/ui/Icon";
import type { ChatMessage } from "@/lib/client/chat-messages";
import ChatBubble from "./ChatBubble";

interface ChatMessageListProps {
  messages: ChatMessage[];
  loading: boolean;
}

export default function ChatMessageList({ messages, loading }: ChatMessageListProps) {
  return (
    <div
      role="log"
      aria-live="polite"
      aria-label="Conversation"
      tabIndex={0}
      className="flex-1 overflow-y-auto px-margin py-4 space-y-4"
    >
      {messages.length === 0 && (
        <div className="text-center py-12 text-on-surface-variant">
          <Icon name="auto_awesome" className="text-[48px] text-secondary/40 block mb-3" filled />
          <p className="font-headline-sm text-headline-sm text-primary mb-1">How can I help?</p>
          <p className="font-body-md text-body-md">
            Ask me anything about your celebration planning.
          </p>
        </div>
      )}
      {messages.map((message, i) => (
        // Messages are append-only and never reordered, so the index is a stable key.
        <ChatBubble key={i} message={message} />
      ))}
      {loading && (
        <div className="flex justify-start" aria-hidden="true">
          <div className="champagne-pill rounded-2xl px-4 py-3">
            <Icon name="auto_awesome" className="text-secondary animate-pulse text-[14px]" />
            <span className="text-body-md text-on-surface-variant ml-2">Thinking…</span>
          </div>
        </div>
      )}
    </div>
  );
}
