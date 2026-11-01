"use client";

import { useId, type FormEvent, type RefObject } from "react";
import Icon from "@/components/ui/Icon";

/** Mirrors the server's per-message limit so users are stopped before a 400. */
const MAX_MESSAGE_LENGTH = 4000;

interface ChatComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled: boolean;
  inputRef: RefObject<HTMLInputElement | null>;
}

export default function ChatComposer({
  value,
  onChange,
  onSubmit,
  disabled,
  inputRef,
}: ChatComposerProps) {
  const inputId = useId();

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    onSubmit();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="px-margin py-3 border-t border-outline-variant/30 bg-surface"
    >
      <label htmlFor={inputId} className="sr-only">
        Message the AI Concierge
      </label>
      <div className="flex items-center gap-2">
        <input
          id={inputId}
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Describe your celebration…"
          autoComplete="off"
          maxLength={MAX_MESSAGE_LENGTH}
          className="flex-1 min-h-[44px] px-4 py-3 rounded-full bg-surface-container-low border border-outline text-body-md focus:border-secondary"
        />
        <button
          type="submit"
          disabled={!value.trim() || disabled}
          aria-label="Send message"
          className="w-11 h-11 rounded-full bg-primary-container text-surface flex items-center justify-center shadow hover:scale-95 transition-transform disabled:opacity-40"
        >
          <Icon name="send" className="text-[18px]" />
        </button>
      </div>
    </form>
  );
}
