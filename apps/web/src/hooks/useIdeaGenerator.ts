import { useState } from "react";
import { sendChat } from "@/lib/client/chat-api";
import type { IdeaCategoryKey } from "@/lib/client/idea-categories";
import type { EventBrief } from "@/lib/core/types";

const IDEA_COUNT = 5;

export interface IdeaGenerator {
  ideas: string | null;
  error: string;
  loading: boolean;
  generate: (category: IdeaCategoryKey, prompt: string) => Promise<void>;
}

function buildIdeaPrompt(category: IdeaCategoryKey, prompt: string, brief: EventBrief): string {
  return (
    `Generate creative ${category} ideas for: ${prompt}. ` +
    `This is for a ${brief.eventSubtype} in ${brief.city} with ${brief.guestCount} guests. ` +
    `Budget-conscious but elegant. Give me ${IDEA_COUNT} specific, actionable ideas.`
  );
}

/** One-shot idea generation for the Idea Studio; each request is independent of the last. */
export function useIdeaGenerator(brief: EventBrief): IdeaGenerator {
  const [ideas, setIdeas] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function generate(category: IdeaCategoryKey, prompt: string): Promise<void> {
    if (loading) return;
    setLoading(true);
    setIdeas(null);
    setError("");

    try {
      const result = await sendChat([
        { role: "user", content: buildIdeaPrompt(category, prompt, brief) },
      ]);
      if (result.kind === "reply") setIdeas(result.text);
      else setError(result.kind === "blocked" ? result.text : result.message);
    } finally {
      setLoading(false);
    }
  }

  return { ideas, error, loading, generate };
}
