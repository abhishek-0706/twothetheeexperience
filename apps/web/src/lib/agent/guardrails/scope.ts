const OFF_TOPIC_SIGNALS: ReadonlyArray<{ pattern: RegExp; topic: string }> = [
  {
    pattern:
      /\b(?:stocks?|crypto(?:currency)?|bitcoin|stock\s+market|mutual\s+funds?|day\s+trading)\b/i,
    topic: "investments",
  },
  { pattern: /\b(?:diagnos\w*|prescri\w*|symptoms?|medication|dosage)\b/i, topic: "medical" },
  {
    pattern: /\b(?:lawsuit|legal\s+advice|sue\s+(?:them|him|her|the)|court\s+case)\b/i,
    topic: "legal",
  },
];

/** Returns the off-topic area the text falls into, or null when it is in scope. */
export function detectOffTopic(text: string): string | null {
  return OFF_TOPIC_SIGNALS.find((signal) => signal.pattern.test(text))?.topic ?? null;
}

export function offTopicGuidance(topic: string): string {
  return `The user raised a ${topic} question, which is outside celebration planning. Give brief general orientation only, recommend a qualified professional, and steer back to the event.`;
}
