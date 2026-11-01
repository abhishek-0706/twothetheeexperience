import type { EventFamily } from "../core/types";

/**
 * Locale pack: in-IN (first and only pack in v1).
 *
 * Everything market-specific lives here — currency, vendor taxonomy, cost bands, ritual
 * templates, planning task templates. A second market is a new file, not a refactor.
 * See DESIGN_SYSTEM.md §7 for the market decision.
 *
 * COST BANDS ARE RANGES WITH A DATE AND A SOURCE. Never a point estimate, never a promise.
 * In production these load from the licensed benchmark corpus; here they are a seed sample
 * carrying the same shape so the guardrails and UI are exercised honestly.
 */

export type CityTier = "metro" | "tier1" | "tier2" | "destination";

export interface CostBand {
  category: string;
  /** Per-head where the category scales with guests, else a flat band. */
  basis: "per_head" | "flat";
  lowMinor: number;
  highMinor: number;
  sourcedOn: string;
  source: string;
}

export interface CategoryDef {
  key: string;
  label: string;
  /** Default share of the allocatable budget, per event family. Weights, not percentages. */
  weights: Partial<Record<EventFamily, number>>;
  icon: string;
}

export const LOCALE_IN_IN = {
  id: "in-IN",
  currency: "INR",
  numberLocale: "en-IN",
  dateLocale: "en-IN",
  /** Hindu/Islamic calendar overlays for auspicious dates plug in here in P2. */
  calendarOverlays: ["gregorian", "hindu-panchang", "islamic"],
  contingencyPctDefault: 0.08,
} as const;

// --- Vendor / budget taxonomy ------------------------------------------------------------
// Breadth modelled on the Indian celebration market. Taxonomy only — no third-party content.
export const CATEGORIES: CategoryDef[] = [
  {
    key: "venue",
    label: "Venue & Banquet",
    weights: { wedding: 22, birthday_milestone: 28, community: 30 },
    icon: "apartment",
  },
  {
    key: "catering",
    label: "Catering & Bar",
    weights: { wedding: 25, birthday_milestone: 30, community: 32 },
    icon: "restaurant_menu",
  },
  {
    key: "decor",
    label: "Decor & Florals",
    weights: { wedding: 14, birthday_milestone: 12, community: 14 },
    icon: "local_florist",
  },
  {
    key: "photo_video",
    label: "Photography & Film",
    weights: { wedding: 11, birthday_milestone: 6, community: 4 },
    icon: "photo_camera",
  },
  {
    key: "attire_jewellery",
    label: "Attire & Jewellery",
    weights: { wedding: 9 },
    icon: "checkroom",
  },
  {
    key: "beauty_mehndi",
    label: "Makeup & Mehndi",
    weights: { wedding: 4 },
    icon: "face_retouching_natural",
  },
  {
    key: "entertainment",
    label: "Entertainment & DJ",
    weights: { wedding: 5, birthday_milestone: 10, community: 8 },
    icon: "music_note",
  },
  {
    key: "invites",
    label: "Invitations & Stationery",
    weights: { wedding: 2, birthday_milestone: 3, community: 2 },
    icon: "mail",
  },
  {
    key: "gifts_favors",
    label: "Gifts & Favours",
    weights: { wedding: 3, birthday_milestone: 5, community: 2 },
    icon: "redeem",
  },
  {
    key: "transport_stay",
    label: "Transport & Guest Stay",
    weights: { wedding: 4, birthday_milestone: 3, community: 4 },
    icon: "directions_bus",
  },
  {
    key: "priest_rituals",
    label: "Pandit & Ritual Supplies",
    weights: { wedding: 1 },
    icon: "self_improvement",
  },
  {
    key: "permits_safety",
    label: "Permits, Security & Safety",
    weights: { community: 4, birthday_milestone: 3 },
    icon: "verified_user",
  },
];

// --- Cost bands --------------------------------------------------------------------------
const TIER_MULTIPLIER: Record<CityTier, number> = {
  metro: 1.0,
  tier1: 0.78,
  tier2: 0.58,
  destination: 1.45,
};

const BASE_BANDS: CostBand[] = [
  {
    category: "catering",
    basis: "per_head",
    lowMinor: 120_000,
    highMinor: 320_000,
    sourcedOn: "2026-09-01",
    source: "twothetheeexperience benchmark panel, metro banquet caterers (n=140)",
  },
  {
    category: "venue",
    basis: "flat",
    lowMinor: 35_000_00,
    highMinor: 180_000_00,
    sourcedOn: "2026-09-01",
    source: "twothetheeexperience benchmark panel, metro banquet venues (n=96)",
  },
  {
    category: "decor",
    basis: "flat",
    lowMinor: 15_000_00,
    highMinor: 120_000_00,
    sourcedOn: "2026-08-15",
    source: "twothetheeexperience benchmark panel, decor studios (n=74)",
  },
  {
    category: "photo_video",
    basis: "flat",
    lowMinor: 12_000_00,
    highMinor: 95_000_00,
    sourcedOn: "2026-08-15",
    source: "twothetheeexperience benchmark panel, wedding photographers (n=118)",
  },
  {
    category: "entertainment",
    basis: "flat",
    lowMinor: 5_000_00,
    highMinor: 60_000_00,
    sourcedOn: "2026-08-15",
    source: "twothetheeexperience benchmark panel, DJs & live acts (n=63)",
  },
  {
    category: "beauty_mehndi",
    basis: "flat",
    lowMinor: 3_000_00,
    highMinor: 45_000_00,
    sourcedOn: "2026-08-15",
    source: "twothetheeexperience benchmark panel, bridal makeup (n=88)",
  },
];

export function costBandFor(category: string, tier: CityTier): CostBand | null {
  const base = BASE_BANDS.find((b) => b.category === category);
  if (!base) return null;
  const m = TIER_MULTIPLIER[tier];
  return {
    ...base,
    lowMinor: Math.round(base.lowMinor * m),
    highMinor: Math.round(base.highMinor * m),
  };
}

/** Human-readable provenance string. Every figure the user sees carries one of these. */
export function citationFor(category: string, tier: CityTier): string | null {
  const band = costBandFor(category, tier);
  if (!band) return null;
  const lo = Math.round(band.lowMinor / 100).toLocaleString("en-IN");
  const hi = Math.round(band.highMinor / 100).toLocaleString("en-IN");
  const unit = band.basis === "per_head" ? " per guest" : "";
  return `₹${lo}–₹${hi}${unit} · ${band.source} · as of ${band.sourcedOn}`;
}

// --- Ritual / sub-event templates --------------------------------------------------------
export interface SubEventTemplate {
  key: string;
  label: string;
  communities: string[];
  /** Days before the main ceremony. 0 = ceremony day. */
  dayOffset: number;
}

export const SUB_EVENTS: SubEventTemplate[] = [
  {
    key: "roka",
    label: "Roka / Engagement",
    communities: ["punjabi", "hindu", "marwari"],
    dayOffset: 60,
  },
  {
    key: "mehndi",
    label: "Mehndi",
    communities: ["punjabi", "hindu", "marwari", "muslim", "gujarati"],
    dayOffset: 2,
  },
  {
    key: "haldi",
    label: "Haldi",
    communities: ["hindu", "punjabi", "marathi", "south-indian", "gujarati"],
    dayOffset: 1,
  },
  {
    key: "sangeet",
    label: "Sangeet",
    communities: ["punjabi", "hindu", "marwari", "gujarati", "sindhi"],
    dayOffset: 1,
  },
  { key: "baraat", label: "Baraat", communities: ["punjabi", "hindu", "marwari"], dayOffset: 0 },
  { key: "nikah", label: "Nikah", communities: ["muslim"], dayOffset: 0 },
  { key: "anand_karaj", label: "Anand Karaj", communities: ["sikh"], dayOffset: 0 },
  {
    key: "muhurtam",
    label: "Muhurtam",
    communities: ["south-indian", "tamil", "telugu"],
    dayOffset: 0,
  },
  {
    key: "pheras",
    label: "Pheras / Ceremony",
    communities: ["hindu", "punjabi", "marathi", "marwari", "gujarati"],
    dayOffset: 0,
  },
  { key: "reception", label: "Reception", communities: ["*"], dayOffset: 0 },
];

export function subEventsFor(communities: string[]): SubEventTemplate[] {
  if (communities.length === 0) {
    return SUB_EVENTS.filter((s) => s.communities.includes("*") || s.key === "pheras");
  }
  const lower = communities.map((c) => c.toLowerCase());
  return SUB_EVENTS.filter(
    (s) => s.communities.includes("*") || s.communities.some((c) => lower.includes(c))
  );
}

// --- Planning task templates -------------------------------------------------------------
export interface TaskTemplate {
  id: string;
  title: string;
  category: string;
  tMinusDays: number;
  dependsOn: string[];
  priority: "high" | "medium" | "low";
  families: EventFamily[];
  whyItMatters: string;
}

export const TASK_TEMPLATES: TaskTemplate[] = [
  {
    id: "set-budget",
    title: "Lock the overall budget and who contributes",
    category: "venue",
    tMinusDays: 240,
    dependsOn: [],
    priority: "high",
    families: ["wedding", "birthday_milestone", "community"],
    whyItMatters: "Every other decision is priced against this number.",
  },
  {
    id: "guest-list-v1",
    title: "Draft the guest list (first pass)",
    category: "venue",
    tMinusDays: 220,
    dependsOn: ["set-budget"],
    priority: "high",
    families: ["wedding", "birthday_milestone", "community"],
    whyItMatters: "Headcount drives venue size and the single largest cost line, catering.",
  },
  {
    id: "shortlist-venue",
    title: "Shortlist and visit venues",
    category: "venue",
    tMinusDays: 200,
    dependsOn: ["guest-list-v1"],
    priority: "high",
    families: ["wedding", "birthday_milestone", "community"],
    whyItMatters: "Premium dates go 8-10 months out; venue fixes the date and the guest ceiling.",
  },
  {
    id: "book-venue",
    title: "Book the venue and pay the holding advance",
    category: "venue",
    tMinusDays: 180,
    dependsOn: ["shortlist-venue"],
    priority: "high",
    families: ["wedding", "birthday_milestone", "community"],
    whyItMatters: "Nothing else can be scheduled until the date is actually held.",
  },
  {
    id: "book-photo",
    title: "Book photographer and filmmaker",
    category: "photo_video",
    tMinusDays: 150,
    dependsOn: ["book-venue"],
    priority: "high",
    families: ["wedding", "birthday_milestone"],
    whyItMatters: "The people you want are booked a season ahead, and this is unrepeatable.",
  },
  {
    id: "book-caterer",
    title: "Shortlist caterers and schedule tastings",
    category: "catering",
    tMinusDays: 140,
    dependsOn: ["book-venue"],
    priority: "high",
    families: ["wedding", "birthday_milestone", "community"],
    whyItMatters: "Tastings take weeks to arrange and dietary needs must be settled early.",
  },
  {
    id: "book-decor",
    title: "Finalise decor concept and book the studio",
    category: "decor",
    tMinusDays: 120,
    dependsOn: ["book-venue"],
    priority: "medium",
    families: ["wedding", "birthday_milestone", "community"],
    whyItMatters: "Decor is quoted against the venue's actual dimensions and restrictions.",
  },
  {
    id: "invites-design",
    title: "Design and proof invitations",
    category: "invites",
    tMinusDays: 110,
    dependsOn: ["guest-list-v1"],
    priority: "medium",
    families: ["wedding", "birthday_milestone", "community"],
    whyItMatters: "Printing plus postal time is six weeks; proofing errors cost a reprint.",
  },
  {
    id: "book-pandit",
    title: "Confirm pandit/officiant and muhurat window",
    category: "priest_rituals",
    tMinusDays: 100,
    dependsOn: ["book-venue"],
    priority: "high",
    families: ["wedding"],
    whyItMatters:
      "The ceremony time is fixed by the muhurat, and the whole day is built around it.",
  },
  {
    id: "send-invites",
    title: "Send invitations",
    category: "invites",
    tMinusDays: 70,
    dependsOn: ["invites-design"],
    priority: "high",
    families: ["wedding", "birthday_milestone", "community"],
    whyItMatters: "Guests need six to eight weeks to arrange travel and leave.",
  },
  {
    id: "book-entertainment",
    title: "Book sangeet choreographer, DJ or live act",
    category: "entertainment",
    tMinusDays: 90,
    dependsOn: ["book-venue"],
    priority: "medium",
    families: ["wedding", "birthday_milestone", "community"],
    whyItMatters: "Rehearsal time has to be scheduled around the family's availability.",
  },
  {
    id: "book-makeup",
    title: "Trial and book makeup and mehndi artists",
    category: "beauty_mehndi",
    tMinusDays: 85,
    dependsOn: [],
    priority: "medium",
    families: ["wedding"],
    whyItMatters: "A trial before booking is the difference between confidence and a bad morning.",
  },
  {
    id: "permits",
    title: "Apply for permits (sound, alcohol, crowd, fire safety)",
    category: "permits_safety",
    tMinusDays: 75,
    dependsOn: ["book-venue"],
    priority: "high",
    families: ["community", "birthday_milestone"],
    whyItMatters: "Municipal approvals take weeks and the event cannot legally run without them.",
  },
  {
    id: "transport-stay",
    title: "Block hotel rooms and arrange guest transport",
    category: "transport_stay",
    tMinusDays: 60,
    dependsOn: ["send-invites"],
    priority: "medium",
    families: ["wedding", "community"],
    whyItMatters: "Room blocks lapse, and out-of-town guests plan around confirmed logistics.",
  },
  {
    id: "menu-final",
    title: "Finalise the menu including dietary variants",
    category: "catering",
    tMinusDays: 45,
    dependsOn: ["book-caterer"],
    priority: "high",
    families: ["wedding", "birthday_milestone", "community"],
    whyItMatters: "Jain, satvik, halal and allergen variants need separate prep lines.",
  },
  {
    id: "rsvp-chase",
    title: "Chase RSVPs and confirm final headcount",
    category: "venue",
    tMinusDays: 30,
    dependsOn: ["send-invites"],
    priority: "high",
    families: ["wedding", "birthday_milestone", "community"],
    whyItMatters: "The caterer's final count locks here; after this, changes cost money.",
  },
  {
    id: "run-of-show",
    title: "Build the day-of run-of-show with all vendors",
    category: "venue",
    tMinusDays: 14,
    dependsOn: ["menu-final", "rsvp-chase"],
    priority: "high",
    families: ["wedding", "birthday_milestone", "community"],
    whyItMatters: "Every vendor needs their call time in writing before the week of the event.",
  },
  {
    id: "final-payments",
    title: "Schedule final payments and keep receipts",
    category: "venue",
    tMinusDays: 7,
    dependsOn: ["run-of-show"],
    priority: "high",
    families: ["wedding", "birthday_milestone", "community"],
    whyItMatters: "Disputes on the day are almost always about what was agreed and paid.",
  },
];
