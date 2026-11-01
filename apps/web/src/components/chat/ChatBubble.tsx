import Icon from "@/components/ui/Icon";
import type { ChatMessage } from "@/lib/client/chat-messages";

const USER_STYLE = "bg-primary-container text-surface";
const FAILED_STYLE = "bg-error-container text-on-error-container border border-error/30";
const ASSISTANT_STYLE = "champagne-pill text-primary";

interface ChatBubbleProps {
  message: ChatMessage;
}

function bubbleTone(isUser: boolean, failed: boolean): string {
  if (isUser) return USER_STYLE;
  return failed ? FAILED_STYLE : ASSISTANT_STYLE;
}

export default function ChatBubble({ message }: ChatBubbleProps) {
  const isUser = message.role === "user";
  const failed = Boolean(message.blocked || message.isError);
  const tone = bubbleTone(isUser, failed);

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${tone}`}>
        <span className="sr-only">{isUser ? "You said: " : "Concierge said: "}</span>
        {!isUser && failed && (
          <p className="flex items-center gap-1 text-label-sm font-semibold mb-1">
            <Icon name={message.blocked ? "shield" : "error"} className="text-[14px]" />
            {message.blocked ? "Blocked by guardrail" : "Error"}
          </p>
        )}
        {!isUser && !failed && (
          <Icon name="auto_awesome" className="text-secondary text-[14px] mb-1 block" filled />
        )}
        <p className="font-body-md text-body-md whitespace-pre-wrap">{message.content}</p>
      </div>
    </div>
  );
}
