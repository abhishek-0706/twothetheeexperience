import { z } from "zod";

/**
 * Shared schema: the contract between the deterministic engine, the model layer and the UI.
 * Model output is validated against these before it reaches a user.
 */

// --- Money -------------------------------------------------------------------------------
// Always integer minor units (paise/cents). Never floats. Never model-authored.
export const MoneySchema = z.object({
  amountMinor: z.number().int(),
  currency: z.string().length(3),
});
export type Money = z.infer<typeof MoneySchema>;

export const EventFamily = z.enum(["wedding", "birthday_milestone", "community"]);
export type EventFamily = z.infer<typeof EventFamily>;

export const BudgetFlexibility = z.enum(["hard", "soft", "unknown"]);

// --- Brief -------------------------------------------------------------------------------
export const EventBriefSchema = z.object({
  eventFamily: EventFamily,
  eventSubtype: z.string().min(1),
  eventDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .refine(
      (d) => {
        const parsed = new Date(`${d}T00:00:00Z`);
        return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === d;
      },
      {
        message: "Not a real calendar date",
      }
    ),
  dateConfidence: z.enum(["fixed", "window", "undecided"]).default("fixed"),
  city: z.string().min(1),
  cityTier: z.enum(["metro", "tier1", "tier2", "destination"]).default("metro"),
  guestCount: z.number().int().positive(),
  budget: MoneySchema.extend({ amountMinor: z.number().int().positive() }),
  budgetFlexibility: BudgetFlexibility.default("soft"),
  /** User-declared only. Never inferred from a name. */
  communities: z.array(z.string()).default([]),
  ritualsOptIn: z.array(z.string()).default([]),
  dietary: z.array(z.string()).default([]),
  accessibility: z.array(z.string()).default([]),
  formality: z.enum(["casual", "semi-formal", "formal", "traditional"]).nullable().default(null),
  aestheticTags: z.array(z.string()).default([]),
  mustHaves: z.array(z.string()).default([]),
  hardConstraints: z.array(z.string()).default([]),
  localePack: z.string().default("in-IN"),
  /** What the agent still needs. Drives the single blocking question per turn. */
  openQuestions: z.array(z.string()).default([]),
});
export type EventBrief = z.infer<typeof EventBriefSchema>;

// --- Budget ------------------------------------------------------------------------------
export const BudgetLineSchema = z.object({
  category: z.string().min(1),
  label: z.string().min(1),
  allocated: MoneySchema,
  /** Why this number. Surfaced in the "show the math" popover. */
  rationale: z.string(),
  /** Cost band provenance. A figure with no source is not shippable. */
  sourceCitation: z.string().nullable(),
  isLocked: z.boolean().default(false),
});
export type BudgetLine = z.infer<typeof BudgetLineSchema>;

export const BudgetPlanSchema = z.object({
  total: MoneySchema,
  contingency: MoneySchema,
  contingencyPct: z.number().min(0.05),
  lines: z.array(BudgetLineSchema).min(1),
  perHead: MoneySchema,
  assumptions: z.array(z.string()),
});
export type BudgetPlan = z.infer<typeof BudgetPlanSchema>;

// --- Planning timeline (months out) ------------------------------------------------------
export const TaskStatus = z.enum(["todo", "doing", "done", "blocked"]);

export const TimelineTaskSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  category: z.string().min(1),
  tMinusDays: z.number().int().nonnegative(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dependsOn: z.array(z.string()).default([]),
  status: TaskStatus.default("todo"),
  priority: z.enum(["high", "medium", "low"]).default("medium"),
  subEventId: z.string().nullable().default(null),
  whyItMatters: z.string(),
});
export type TimelineTask = z.infer<typeof TimelineTaskSchema>;

// --- Day-of run-of-show ------------------------------------------------------------------
export const RunOfShowItemSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  /** Minutes from midnight, local venue time. Integer math only. */
  startMin: z
    .number()
    .int()
    .min(0)
    .max(24 * 60),
  durationMin: z.number().int().positive(),
  /** Floor the item can compress to when absorbing a delay. */
  minDurationMin: z.number().int().positive(),
  dependsOn: z.array(z.string()).default([]),
  /**
   * Astrologically or externally fixed and CANNOT move: muhurat windows, nikah time,
   * sunset-dependent photography, a venue's hard curfew. The cascade refuses to shift these
   * and reports a violation instead. This is the difference between a toy and a usable
   * run-of-show.
   */
  pinned: z.boolean().default(false),
  pinnedReason: z.string().nullable().default(null),
  vendorLeads: z.array(z.string()).default([]),
  location: z.string().nullable().default(null),
  status: z.enum(["completed", "active", "upcoming"]).default("upcoming"),
  tag: z.string().nullable().default(null),
  checklist: z.array(z.object({ label: z.string(), done: z.boolean() })).default([]),
});
export type RunOfShowItem = z.infer<typeof RunOfShowItemSchema>;

export const CascadeViolationSchema = z.object({
  itemId: z.string(),
  itemTitle: z.string(),
  kind: z.enum(["pinned_overrun", "curfew_breach", "negative_gap"]),
  overrunMin: z.number().int(),
  message: z.string(),
});
export type CascadeViolation = z.infer<typeof CascadeViolationSchema>;

export const CascadeResultSchema = z.object({
  items: z.array(RunOfShowItemSchema),
  violations: z.array(CascadeViolationSchema),
  /** Delay recovered by compressing flexible items. */
  absorbedMin: z.number().int().nonnegative(),
  /** Delay still present at the end of the day after absorption. */
  netDelayMin: z.number().int(),
  affectedVendorLeads: z.array(z.string()),
  shifted: z.array(
    z.object({ itemId: z.string(), fromMin: z.number().int(), toMin: z.number().int() })
  ),
});
export type CascadeResult = z.infer<typeof CascadeResultSchema>;

// --- Conflicts ---------------------------------------------------------------------------
export const ConflictSchema = z.object({
  kind: z.enum([
    "budget_overallocated",
    "budget_unrealistic_per_head",
    "date_in_past",
    "lead_time_too_short",
    "dependency_cycle",
    "capacity_exceeded",
    "ritual_order_broken",
  ]),
  severity: z.enum(["blocker", "warning"]),
  message: z.string(),
  refs: z.array(z.string()).default([]),
});
export type Conflict = z.infer<typeof ConflictSchema>;
