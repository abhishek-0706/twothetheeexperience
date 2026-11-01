"use client";

import { useEffect, useId, useRef } from "react";
import Icon from "@/components/ui/Icon";
import type { ChatMessage } from "@/lib/client/chat-messages";
import ChatComposer from "./ChatComposer";
import ChatMessageList from "./ChatMessageList";

interface ChatDialogProps {
  open: boolean;
  onClose: () => void;
  messages: ChatMessage[];
  input: string;
  onInputChange: (value: string) => void;
  onSubmit: () => void;
  loading: boolean;
  alert: string;
}

export default function ChatDialog({
  open,
  onClose,
  messages,
  input,
  onInputChange,
  onSubmit,
  loading,
  alert,
}: ChatDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const titleId = useId();

  // Native modal <dialog>: the browser makes the rest of the page inert, keeps focus
  // inside, and fires `close` on Escape.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      inputRef.current?.focus();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onClose={onClose}
      className="fixed inset-0 m-0 h-full max-h-none w-full max-w-none p-0 bg-surface text-on-surface open:flex open:flex-col backdrop:bg-primary/40"
    >
      <div className="flex items-center justify-between px-margin py-3 border-b border-outline-variant/30 bg-surface">
        <div className="flex items-center gap-2">
          <Icon name="auto_awesome" className="text-secondary" filled />
          <h2 id={titleId} className="font-headline-sm text-headline-sm text-primary font-semibold">
            AI Concierge
          </h2>
        </div>
        <button
          type="button"
          onClick={() => dialogRef.current?.close()}
          aria-label="Close chat"
          className="w-11 h-11 flex items-center justify-center rounded-full hover:bg-surface-variant transition-colors"
        >
          <Icon name="close" />
        </button>
      </div>

      <ChatMessageList messages={messages} loading={loading} />

      <p role="status" className="sr-only">
        {loading ? "The concierge is thinking…" : ""}
      </p>
      <p role="alert" className="sr-only">
        {alert}
      </p>

      <ChatComposer
        value={input}
        onChange={onInputChange}
        onSubmit={onSubmit}
        disabled={loading}
        inputRef={inputRef}
      />
    </dialog>
  );
}
