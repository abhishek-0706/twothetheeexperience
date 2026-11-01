import { SchemaType, type FunctionDeclaration } from "@google/generative-ai";

const BRIEF_PROPERTIES = {
  eventFamily: {
    type: SchemaType.STRING,
    description: "One of: wedding, birthday_milestone, community",
  },
  eventSubtype: {
    type: SchemaType.STRING,
    description: "E.g. Punjabi wedding, 1st birthday, Durga Puja",
  },
  eventDate: { type: SchemaType.STRING, description: "YYYY-MM-DD" },
  city: { type: SchemaType.STRING, description: "City name" },
  cityTier: { type: SchemaType.STRING, description: "One of: metro, tier1, tier2, destination" },
  guestCount: { type: SchemaType.INTEGER, description: "Number of guests" },
  budgetAmountMinor: {
    type: SchemaType.INTEGER,
    description: "Total budget in paise (₹1 = 100 paise)",
  },
  currency: { type: SchemaType.STRING, description: "ISO currency code, e.g. INR" },
  communities: {
    type: SchemaType.STRING,
    description: "Comma-separated communities the user declared",
  },
  dietary: { type: SchemaType.STRING, description: "Comma-separated dietary requirements" },
} as const;

/** Function declarations sent to Gemini. Arguments are re-validated server-side in tools.ts. */
export const TOOL_DECLARATIONS: FunctionDeclaration[] = [
  {
    name: "extract_brief",
    description:
      "Record the structured brief extracted from the user's description. Include only fields the user actually stated; never guess community or faith from a name.",
    parameters: { type: SchemaType.OBJECT, properties: BRIEF_PROPERTIES },
  },
  {
    name: "allocate_budget",
    description:
      "Deterministic budget allocation with category splits, per-head cost, contingency and source citations. NEVER calculate budget numbers yourself.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: BRIEF_PROPERTIES,
      required: ["eventFamily", "eventDate", "city", "guestCount", "budgetAmountMinor"],
    },
  },
  {
    name: "generate_timeline",
    description:
      "Reverse-planned task timeline from the event date, sorted by due date. NEVER calculate dates yourself.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: BRIEF_PROPERTIES,
      required: ["eventFamily", "eventDate"],
    },
  },
  {
    name: "detect_conflicts",
    description:
      "Check the plan for budget overallocation, unrealistic per-head costs, past dates, short lead times and dependency cycles.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: BRIEF_PROPERTIES,
      required: ["eventFamily", "eventDate", "guestCount", "budgetAmountMinor"],
    },
  },
  {
    name: "generate_ideas",
    description:
      "Frame a request for creative ideas: themes, decor, menu, entertainment, favours, invite copy or playlists.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        category: {
          type: SchemaType.STRING,
          description: "theme, decor, menu, entertainment, favors, invite_copy or playlist",
        },
        context: {
          type: SchemaType.STRING,
          description: "What the user wants ideas for, with constraints",
        },
      },
      required: ["category", "context"],
    },
  },
];
