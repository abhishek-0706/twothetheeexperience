"use client";

import { useState } from "react";

const IDEA_CATEGORIES = [
  { key: "theme", label: "Themes & Colour Palettes", icon: "palette" },
  { key: "decor", label: "Decor & Florals", icon: "local_florist" },
  { key: "menu", label: "Menu & Cuisine", icon: "restaurant_menu" },
  { key: "entertainment", label: "Entertainment & Music", icon: "music_note" },
  { key: "invite_copy", label: "Invitation Wording", icon: "edit_note" },
  { key: "favors", label: "Guest Favours & Gifts", icon: "redeem" },
];

export default function StudioPage() {
  const [selected, setSelected] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [ideas, setIdeas] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function generate() {
    if (!selected || !prompt.trim()) return;
    setLoading(true);
    setIdeas(null);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            {
              role: "user",
              content: `Generate creative ${selected} ideas for: ${prompt}. This is for a Punjabi wedding in Jaipur with 350 guests. Budget-conscious but elegant. Give me 5 specific, actionable ideas.`,
            },
          ],
        }),
      });
      const data = await res.json();
      setIdeas(data.response || data.error || "No ideas generated.");
    } catch {
      setIdeas("Could not reach the server. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="pt-20 px-margin max-w-md mx-auto flex flex-col gap-space-lg pb-36">
      <section className="pt-2">
        <span className="text-label-md font-label-md text-secondary uppercase tracking-widest font-semibold block mb-0.5">
          Creative Engine
        </span>
        <h1 className="text-headline-lg-mobile font-display text-primary font-semibold">
          Idea Studio
        </h1>
        <p className="text-body-md text-on-surface-variant mt-1">
          Get personalized, culturally appropriate ideas powered by AI. Pick a category and describe what you are looking for.
        </p>
      </section>

      {/* Category Grid */}
      <section className="grid grid-cols-2 gap-2.5">
        {IDEA_CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            onClick={() => setSelected(cat.key)}
            className={`p-4 rounded-xl border text-left transition-all active:scale-95 ${
              selected === cat.key
                ? "bg-secondary-fixed/30 border-secondary/40 shadow-md"
                : "bg-surface-container-lowest border-outline-variant/20 hover:border-secondary/30 shadow-sm"
            }`}
          >
            <span
              className={`material-symbols-outlined text-[24px] mb-2 block ${
                selected === cat.key ? "text-secondary" : "text-on-surface-variant"
              }`}
              style={selected === cat.key ? { fontVariationSettings: "'FILL' 1" } : undefined}
            >
              {cat.icon}
            </span>
            <span className="font-title-md text-body-md font-semibold text-primary block">
              {cat.label}
            </span>
          </button>
        ))}
      </section>

      {/* Prompt Input */}
      {selected && (
        <section className="space-y-3">
          <label className="font-title-md text-title-md text-primary block">
            What are you looking for?
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={`E.g., "Royal Rajasthani theme with marigold and jewel tones, something that works for a palace courtyard setting"`}
            rows={3}
            className="w-full px-4 py-3 rounded-xl bg-surface-container-low border border-outline-variant/30 text-body-md focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary resize-none"
          />
          <button
            onClick={generate}
            disabled={!prompt.trim() || loading}
            className="w-full py-3 rounded-full bg-primary text-on-primary font-label-md text-label-md font-semibold flex items-center justify-center gap-2 shadow-md active:scale-95 transition-transform disabled:opacity-40"
          >
            <span
              className="material-symbols-outlined text-[16px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              auto_awesome
            </span>
            {loading ? "Generating..." : "Generate Ideas"}
          </button>
        </section>
      )}

      {/* Results */}
      {ideas && (
        <section className="champagne-pill rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2 mb-2">
            <span
              className="material-symbols-outlined text-secondary"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              auto_awesome
            </span>
            <span className="font-title-md text-title-md text-primary font-semibold">
              AI-Generated Ideas
            </span>
          </div>
          <div className="text-body-md text-primary whitespace-pre-wrap leading-relaxed">
            {ideas}
          </div>
        </section>
      )}
    </main>
  );
}
