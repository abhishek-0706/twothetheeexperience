"use client";

import { useId, useState, type FormEvent } from "react";
import Icon from "@/components/ui/Icon";

const IDEA_CATEGORIES = [
  { key: "theme", label: "Themes & Colour Palettes", icon: "palette" },
  { key: "decor", label: "Decor & Florals", icon: "local_florist" },
  { key: "menu", label: "Menu & Cuisine", icon: "restaurant_menu" },
  { key: "entertainment", label: "Entertainment & Music", icon: "music_note" },
  { key: "invite_copy", label: "Invitation Wording", icon: "edit_note" },
  { key: "favors", label: "Guest Favours & Gifts", icon: "redeem" },
] as const;

type CategoryKey = (typeof IDEA_CATEGORIES)[number]["key"];

interface ChatApiResponse {
  response?: string;
  error?: string;
  blocked?: boolean;
}

export default function StudioPage() {
  const [selected, setSelected] = useState<CategoryKey | null>(null);
  const [prompt, setPrompt] = useState("");
  const [ideas, setIdeas] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const promptId = useId();
  const promptHintId = useId();
  const resultsHeadingId = useId();

  const selectedLabel = IDEA_CATEGORIES.find((c) => c.key === selected)?.label;

  async function generate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || !prompt.trim() || loading) return;
    setLoading(true);
    setIdeas(null);
    setError("");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            {
              role: "user",
              content: `Generate creative ${selected} ideas for: ${prompt.trim()}. This is for a Punjabi wedding in Jaipur with 350 guests. Budget-conscious but elegant. Give me 5 specific, actionable ideas.`,
            },
          ],
        }),
      });
      const data = (await res.json()) as ChatApiResponse;
      if (!res.ok || data.blocked) {
        setError(data.error ?? data.response ?? "No ideas could be generated. Please try again.");
      } else {
        setIdeas(data.response ?? "No ideas generated.");
      }
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="pt-20 px-margin max-w-md mx-auto flex flex-col gap-space-lg pb-36">
      <header className="pt-2">
        <p className="text-label-md font-label-md text-secondary uppercase tracking-widest font-semibold mb-0.5">
          Creative Engine
        </p>
        <h1 className="text-headline-lg-mobile font-display text-primary font-semibold">
          Idea Studio
        </h1>
        <p className="text-body-md text-on-surface-variant mt-1">
          Get personalized, culturally appropriate ideas powered by AI. Pick a category and describe
          what you are looking for.
        </p>
      </header>

      <section aria-labelledby="category-heading">
        <h2 id="category-heading" className="font-title-md text-title-md text-primary mb-2">
          1. Choose a category
        </h2>
        <ul className="grid grid-cols-2 gap-2.5">
          {IDEA_CATEGORIES.map((cat) => {
            const isSelected = selected === cat.key;
            return (
              <li key={cat.key}>
                <button
                  type="button"
                  onClick={() => setSelected(cat.key)}
                  aria-pressed={isSelected}
                  className={`w-full h-full min-h-[44px] p-4 rounded-xl border text-left transition-all active:scale-95 ${
                    isSelected
                      ? "bg-secondary-fixed/30 border-secondary shadow-md"
                      : "bg-surface-container-lowest border-outline-variant/40 hover:border-secondary/40 shadow-sm"
                  }`}
                >
                  <Icon
                    name={isSelected ? "check_circle" : cat.icon}
                    className={`text-[24px] mb-2 block ${isSelected ? "text-secondary" : "text-on-surface-variant"}`}
                    filled={isSelected}
                  />
                  <span className="font-title-md text-body-md font-semibold text-primary block">
                    {cat.label}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      {selected && (
        <section aria-labelledby="prompt-heading" className="space-y-3">
          <h2 id="prompt-heading" className="sr-only">
            2. Describe what you want
          </h2>
          <form onSubmit={generate} className="space-y-3">
            <label htmlFor={promptId} className="font-title-md text-title-md text-primary block">
              What are you looking for?
            </label>
            <p id={promptHintId} className="text-label-sm text-on-surface-variant">
              Category: {selectedLabel}. Include the mood, setting and any must-haves.
            </p>
            <textarea
              id={promptId}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              aria-describedby={promptHintId}
              placeholder={`E.g., "Royal Rajasthani theme with marigold and jewel tones for a palace courtyard"`}
              rows={3}
              maxLength={1000}
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
      )}

      <p role="status" className="sr-only">
        {loading ? "Generating ideas…" : ""}
      </p>
      <p
        role="alert"
        className={
          error
            ? "rounded-xl p-4 bg-error-container text-on-error-container text-body-md"
            : "sr-only"
        }
      >
        {error}
      </p>

      {/* Persistent live region so newly generated ideas are announced. */}
      <div aria-live="polite">
        {ideas && (
          <section
            aria-labelledby={resultsHeadingId}
            className="champagne-pill rounded-xl p-4 space-y-2"
          >
            <div className="flex items-center gap-2 mb-2">
              <Icon name="auto_awesome" className="text-secondary" filled />
              <h2
                id={resultsHeadingId}
                className="font-title-md text-title-md text-primary font-semibold"
              >
                AI-Generated Ideas
              </h2>
            </div>
            <div className="text-body-md text-primary whitespace-pre-wrap leading-relaxed">
              {ideas}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
