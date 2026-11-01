"use client";

import { useId, useState, type FormEvent } from "react";
import Icon from "@/components/ui/Icon";

const MAX_PROMPT_LENGTH = 1000;
const PROMPT_ROWS = 3;

interface IdeaPromptFormProps {
  categoryLabel: string;
  loading: boolean;
  onGenerate: (prompt: string) => void;
}

export default function IdeaPromptForm({
  categoryLabel,
  loading,
  onGenerate,
}: IdeaPromptFormProps) {
  const [prompt, setPrompt] = useState("");
  const promptId = useId();
  const hintId = useId();

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const text = prompt.trim();
    if (text) onGenerate(text);
  }

  return (
    <section aria-labelledby="prompt-heading" className="space-y-3">
      <h2 id="prompt-heading" className="sr-only">
        2. Describe what you want
      </h2>
      <form onSubmit={handleSubmit} className="space-y-3">
        <label htmlFor={promptId} className="font-title-md text-title-md text-primary block">
          What are you looking for?
        </label>
        <p id={hintId} className="text-label-sm text-on-surface-variant">
          Category: {categoryLabel}. Include the mood, setting and any must-haves.
        </p>
        <textarea
          id={promptId}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          aria-describedby={hintId}
          placeholder={`E.g., "Royal Rajasthani theme with marigold and jewel tones for a palace courtyard"`}
          rows={PROMPT_ROWS}
          maxLength={MAX_PROMPT_LENGTH}
          className="w-full px-4 py-3 rounded-xl bg-surface-container-low border border-outline text-body-md focus:border-secondary resize-none"
        />
        <button
          type="submit"
          disabled={!prompt.trim() || loading}
          className="w-full min-h-[44px] py-3 rounded-full bg-primary text-on-primary font-label-md text-label-md font-semibold flex items-center justify-center gap-2 shadow-md active:scale-95 transition-transform disabled:opacity-40"
        >
          <Icon name="auto_awesome" className="text-[16px]" filled />
          {loading ? "Generating…" : "Generate Ideas"}
        </button>
      </form>
    </section>
  );
}
