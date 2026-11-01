export interface PolicyRule {
  id: string;
  pattern: RegExp;
  /** Shown when model output facilitates the topic. */
  message: string;
  /** Appended to the system prompt when the user raises the topic. */
  guidance: string;
}

export const POLICY_RULES: readonly PolicyRule[] = [
  {
    id: "no-dowry",
    pattern: /\b(?:dowry|dahej)\b/i,
    message: "Content facilitating dowry is not allowed.",
    guidance:
      "The user mentioned dowry. Do not help plan, value, list or negotiate a dowry — it is illegal under the Dowry Prohibition Act, 1961. If they are rejecting dowry, support that. Offer help with lawful gifting or shagun customs instead.",
  },
  {
    id: "no-guarantee",
    pattern:
      /\bguarantee[ds]?\b[^.!?\n]{0,30}\b(?:availability|available|prices?|pricing|rates?|quality|bookings?)\b/i,
    message: "Cannot guarantee vendor availability, pricing or quality.",
    guidance:
      "Do not promise vendor availability, price or quality; say these must be confirmed with the vendor in writing.",
  },
  {
    id: "no-caste-filter",
    pattern:
      /\b(?:upper|lower|same|high|low)[-\s]?caste\b|\bcaste\b[^.!?\n]{0,40}\b(?:filter|rank|only|prefer|exclude|match|based)\b|\b(?:filter|rank|exclude|sort)\b[^.!?\n]{0,40}\bcaste\b/i,
    message: "Caste-based filtering or ranking is not permitted.",
    guidance:
      "Do not filter, rank or recommend vendors, guests or partners by caste. Offer criteria based on budget, style, reviews or location instead.",
  },
  {
    id: "no-fairness",
    pattern:
      /\b(?:fair(?:ness)?\s+cream|skin\s+(?:whitening|lightening|brightening)|look\s+fairer|become\s+fair(?:er)?)\b/i,
    message: "Skin-tone-based beauty advice is not provided.",
    guidance:
      "Do not give skin-lightening or fairness advice. Offer general skincare-routine and makeup-trial planning without reference to skin tone.",
  },
  {
    id: "no-weight-advice",
    pattern:
      /\bcrash\s+diet\b|\blose\s+(?:\d+\s*(?:kg|kgs|kilos?|pounds|lbs)|weight)\s+(?:fast|quickly|before|for)\b/i,
    message: "Body or weight advice is not provided. Please consult a healthcare professional.",
    guidance:
      "Do not give diet or weight-loss advice. Kindly suggest a doctor or registered dietitian and offer help with outfit fittings and timelines instead.",
  },
];

/** A sentence carrying one of these cues is a refusal or legal note, not facilitation. */
export const REFUSAL_CUE =
  /\b(?:can(?:'|’)?t|cannot|can\s+not|won(?:'|’)?t|will\s+not|unable\s+to|not\s+able\s+to|refuse|decline|illegal|unlawful|prohibit(?:ed|ion|s)?|criminal|offen[cs]e|against\s+the\s+law|(?:do\s+)?not\s+(?:recommend|advise|provide|help|support|suggest|assist|offer|promise)|don(?:'|’)?t\s+(?:recommend|advise|provide|support|suggest|offer|promise)|no\s+(?:guarantees?|promises?))\b/i;

export const SAFETY_DOMAINS: ReadonlyArray<{ pattern: RegExp; domain: string }> = [
  { pattern: /\b(?:fireworks?|pyrotechnics?|firecrackers?)\b/i, domain: "fireworks" },
  { pattern: /\b(?:drones?|uav)\b/i, domain: "drones" },
  {
    pattern: /\b(?:liquor\s+licen[cs]e|alcohol\s+permit|bar\s+licen[cs]e)\b/i,
    domain: "alcohol-permits",
  },
  {
    pattern: /\b(?:fire\s+exits?|crowd\s+capacity|stampede|fire\s+safety)\b/i,
    domain: "crowd-safety",
  },
];

export const VERIFY_NOTE =
  "Please verify with your local municipal authority or a licensed vendor before finalising.";
export const VERIFY_CUE = /\bverify\b|\bcheck\s+with\b|\bconfirm\s+with\b/i;
export const AUTHORITY_CUE =
  /\b(?:municipal|local\s+authorit|police|fire\s+department|licen[cs]ed|licen[cs]ing|permit\s+office)/i;
