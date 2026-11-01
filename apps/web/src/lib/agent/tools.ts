/**
 * Tools the model may call. All arithmetic and date math happens here; the model only
 * chooses inputs. Every argument is validated with Zod before a tool runs.
 */

import { SchemaType, type FunctionDeclaration } from "@google/generative-ai";
import { z } from "zod";
import { allocateBudget } from "@/lib/core/budget";
import { detectConflicts } from "@/lib/core/conflicts";
import { formatMoney } from "@/lib/core/money";
import { generateTimeline } from "@/lib/core/timeline";
import {
  BudgetPlanSchema,
  EventBriefSchema,
  EventFamily,
  type BudgetPlan,
  type EventBrief,
} from "@/lib/core/types";

export type ToolStatus = "ok" | "needs_info" | "error";

export interface ToolResult {
  status: ToolStatus;
  [key: string]: unknown;
}

export interface ToolInvocation {
  name: string;
  result: ToolResult;
}

const BRIEF_PROPERTIES = {
  eventFamily: { type: SchemaType.STRING, description: "One of: wedding, birthday_milestone, community" },
  eventSubtype: { type: SchemaType.STRING, description: "E.g. Punjabi wedding, 1st birthday, Durga Puja" },
  eventDate: { type: SchemaType.STRING, description: "YYYY-MM-DD" },
  city: { type: SchemaType.STRING, description: "City name" },
  cityTier: { type: SchemaType.STRING, description: "One of: metro, tier1, tier2, destination" },
  guestCount: { type: SchemaType.INTEGER, description: "Number of guests" },
  budgetAmountMinor: { type: SchemaType.INTEGER, description: "Total budget in paise (₹1 = 100 paise)" },
  currency: { type: SchemaType.STRING, description: "ISO currency code, e.g. INR" },
  communities: { type: SchemaType.STRING, description: "Comma-separated communities the user declared" },
  dietary: { type: SchemaType.STRING, description: "Comma-separated dietary requirements" },
} as const;

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
    description: "Reverse-planned task timeline from the event date, sorted by due date. NEVER calculate dates yourself.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: BRIEF_PROPERTIES,
      required: ["eventFamily", "eventDate"],
    },
  },
  {
    name: "detect_conflicts",
    description: "Check the plan for budget overallocation, unrealistic per-head costs, past dates, short lead times and dependency cycles.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: BRIEF_PROPERTIES,
      required: ["eventFamily", "eventDate", "guestCount", "budgetAmountMinor"],
    },
  },
  {
    name: "generate_ideas",
    description: "Frame a request for creative ideas: themes, decor, menu, entertainment, favours, invite copy or playlists.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        category: { type: SchemaType.STRING, description: "theme, decor, menu, entertainment, favors, invite_copy or playlist" },
        context: { type: SchemaType.STRING, description: "What the user wants ideas for, with constraints" },
      },
      required: ["category", "context"],
    },
  },
];

const csvList = z
  .string()
  .max(300)
  .transform((value) => value.split(",").map((item) => item.trim()).filter(Boolean));

const lowerCased = (schema: z.ZodTypeAny) =>
  z.preprocess((value) => (typeof value === "string" ? value.trim().toLowerCase() : value), schema);

const BriefArgsSchema = z.object({
  eventFamily: lowerCased(EventFamily).optional(),
  eventSubtype: z.string().trim().min(1).max(100).optional(),
  eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "eventDate must be YYYY-MM-DD").optional(),
  city: z.string().trim().min(1).max(80).optional(),
  cityTier: lowerCased(z.enum(["metro", "tier1", "tier2", "destination"])).optional(),
  guestCount: z.number().int().positive().max(100_000).optional(),
  budgetAmountMinor: z.number().int().positive().max(100_00_00_000_00).optional(),
  currency: z.string().trim().length(3).toUpperCase().optional(),
  communities: csvList.optional(),
  dietary: csvList.optional(),
});

const IdeasArgsSchema = z.object({
  category: z.string().trim().min(1).max(40),
  context: z.string().trim().min(1).max(1000),
});

type BriefArgs = z.infer<typeof BriefArgsSchema>;

type BriefResolution = { ok: true; brief: EventBrief } | { ok: false; result: ToolResult };

const REQUIRED_BRIEF_FIELDS = ["eventFamily", "eventDate", "city", "guestCount", "budget"] as const;

/** Merge validated args over the client's existing brief. Missing facts are asked for, never defaulted. */
function resolveBrief(args: BriefArgs, existing: EventBrief | undefined): BriefResolution {
  const amountMinor = args.budgetAmountMinor ?? existing?.budget.amountMinor;
  const eventFamily = args.eventFamily ?? existing?.eventFamily;
  const candidate = {
    ...existing,
    eventFamily,
    eventSubtype: args.eventSubtype ?? existing?.eventSubtype ?? eventFamily,
    eventDate: args.eventDate ?? existing?.eventDate,
    city: args.city ?? existing?.city,
    cityTier: args.cityTier ?? existing?.cityTier,
    guestCount: args.guestCount ?? existing?.guestCount,
    budget:
      amountMinor === undefined
        ? undefined
        : { amountMinor, currency: args.currency ?? existing?.budget.currency ?? "INR" },
    communities: args.communities ?? existing?.communities,
    dietary: args.dietary ?? existing?.dietary,
  };

  const missing = REQUIRED_BRIEF_FIELDS.filter((field) => candidate[field] === undefined);
  if (missing.length > 0) {
    return { ok: false, result: { status: "needs_info", missing, message: "Ask the user for the missing details." } };
  }

  const parsed = EventBriefSchema.safeParse(candidate);
  if (!parsed.success) {
    return { ok: false, result: { status: "error", error: "Invalid brief", issues: parsed.error.issues.map((i) => i.message) } };
  }
  return { ok: true, brief: parsed.data };
}

function invalidArgs(error: z.ZodError): ToolResult {
  return {
    status: "error",
    error: "Invalid tool arguments",
    issues: error.issues.map((issue) => `${issue.path.join(".") || "args"}: ${issue.message}`),
  };
}

export function executeTool(name: string, rawArgs: unknown, existingBrief?: EventBrief): ToolResult {
  if (name === "generate_ideas") {
    const args = IdeasArgsSchema.safeParse(rawArgs ?? {});
    if (!args.success) return invalidArgs(args.error);
    const context = args.data.context.replace(/<\/?untrusted_data>/gi, "");
    return {
      status: "ok",
      category: args.data.category,
      context: `<untrusted_data>${context}</untrusted_data>`,
      guidance: "Give 4–6 specific, culturally appropriate ideas. Quote no prices unless a tool produced them.",
    };
  }

  const args = BriefArgsSchema.safeParse(rawArgs ?? {});
  if (!args.success) return invalidArgs(args.error);

  if (name === "extract_brief") {
    const resolution = resolveBrief(args.data, existingBrief);
    return resolution.ok ? { status: "ok", brief: resolution.brief } : resolution.result;
  }

  const resolution = resolveBrief(args.data, existingBrief);
  if (!resolution.ok) return resolution.result;
  const brief = resolution.brief;

  switch (name) {
    case "allocate_budget":
      return { status: "ok", plan: allocateBudget(brief) };
    case "generate_timeline": {
      const tasks = generateTimeline(brief);
      return { status: "ok", tasks, taskCount: tasks.length };
    }
    case "detect_conflicts": {
      const conflicts = detectConflicts(brief, allocateBudget(brief), generateTimeline(brief));
      return { status: "ok", conflicts, conflictCount: conflicts.length };
    }
    default:
      return { status: "error", error: "Unknown tool" };
  }
}

/** Deterministic, fully traceable budget summary used when model text fails a guardrail. */
export function summarizeBudgetPlan(plan: BudgetPlan): string {
  return [
    "Here is your budget, computed by the planning engine:",
    "",
    `- **Total:** ${formatMoney(plan.total)}`,
    `- **Contingency (${Math.round(plan.contingencyPct * 100)}%):** ${formatMoney(plan.contingency)}`,
    `- **Per guest:** ${formatMoney(plan.perHead)}`,
    ...plan.lines.map((line) => `- **${line.label}:** ${formatMoney(line.allocated)}`),
    "",
    "Every figure comes from the deterministic budget engine. Open the Budget tab to see the source behind each line.",
  ].join("\n");
}

/** The most recent budget plan produced this turn, if any. */
export function latestBudgetPlan(invocations: readonly ToolInvocation[]): BudgetPlan | null {
  for (const { name, result } of [...invocations].reverse()) {
    if (name !== "allocate_budget" || result.status !== "ok") continue;
    const parsed = BudgetPlanSchema.safeParse(result.plan);
    if (parsed.success) return parsed.data;
  }
  return null;
}
