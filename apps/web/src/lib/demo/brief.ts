import type { EventBrief } from "../core/types";

export const DEMO_BRIEF: EventBrief = {
  eventFamily: "wedding",
  eventSubtype: "Punjabi wedding",
  eventDate: "2027-02-14",
  dateConfidence: "fixed",
  city: "Jaipur",
  cityTier: "tier1",
  guestCount: 350,
  budget: { amountMinor: 2500000_00, currency: "INR" },
  budgetFlexibility: "soft",
  communities: ["punjabi"],
  ritualsOptIn: ["mehndi", "haldi", "sangeet", "baraat", "pheras", "reception"],
  dietary: ["jain", "satvik"],
  accessibility: [],
  formality: "traditional",
  aestheticTags: ["royal", "marigold", "jewel-tones"],
  mustHaves: ["live dhol", "fireworks"],
  hardConstraints: [],
  localePack: "in-IN",
  openQuestions: [],
};
