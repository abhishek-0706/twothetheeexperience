"use client";

import { useState } from "react";
import CategoryPicker from "@/components/studio/CategoryPicker";
import IdeaPromptForm from "@/components/studio/IdeaPromptForm";
import IdeaResults from "@/components/studio/IdeaResults";
import { useIdeaGenerator } from "@/hooks/useIdeaGenerator";
import { ideaCategoryLabel, type IdeaCategoryKey } from "@/lib/client/idea-categories";
import { DEMO_BRIEF } from "@/lib/demo/brief";

const ERROR_STYLE = "rounded-xl p-4 bg-error-container text-on-error-container text-body-md";

export default function StudioPage() {
  const [selected, setSelected] = useState<IdeaCategoryKey | null>(null);
  const { ideas, error, loading, generate } = useIdeaGenerator(DEMO_BRIEF);

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

      <CategoryPicker selected={selected} onSelect={setSelected} />

      {selected && (
        <IdeaPromptForm
          categoryLabel={ideaCategoryLabel(selected)}
          loading={loading}
          onGenerate={(prompt) => void generate(selected, prompt)}
        />
      )}

      <p role="status" className="sr-only">
        {loading ? "Generating ideas…" : ""}
      </p>
      <p role="alert" className={error ? ERROR_STYLE : "sr-only"}>
        {error}
      </p>

      <IdeaResults ideas={ideas} />
    </main>
  );
}
