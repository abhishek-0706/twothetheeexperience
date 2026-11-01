/**
 * Tools the model may call. All arithmetic and date math happens here; the model only
 * chooses inputs. Every argument is validated with Zod before a tool runs.
 */

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

export { TOOL_DECLARATIONS } from "./tool-declarations";

export type ToolStatus = "ok" | "needs_info" | "error";

export interface ToolResult {
  status: ToolStatus;
  [key: string]: unknown;
}

export interface ToolInvocation {
  name: string;
  result: ToolResult;
}

const MAX_LIST_CHARS = 300;
const MAX_GUESTS = 100_000;
/** ₹100 crore, in paise. */
const MAX_BUDGET_MINOR = 100_00_00_000_00;

const csvList = z
  .string()
  .max(MAX_LIST_CHARS)
  .transform((value) =>
    value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
  );

const lowerCased = (schema: z.ZodTypeAny): z.ZodTypeAny =>
  z.preprocess((value) => (typeof value === "string" ? value.trim().toLowerCase() : value), schema);

const BriefArgsSchema = z.object({
  eventFamily: lowerCased(EventFamily).optional(),
  eventSubtype: z.string().trim().min(1).max(100).optional(),
  eventDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "eventDate must be YYYY-MM-DD")
    .optional(),
  city: z.string().trim().min(1).max(80).optional(),
  cityTier: lowerCased(z.enum(["metro", "tier1", "tier2", "destination"])).optional(),
  guestCount: z.number().int().positive().max(MAX_GUESTS).optional(),
  budgetAmountMinor: z.number().int().positive().max(MAX_BUDGET_MINOR).optional(),
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
    return {
      ok: false,
      result: { status: "needs_info", missing, message: "Ask the user for the missing details." },
    };
  }

  const parsed = EventBriefSchema.safeParse(candidate);
  if (!parsed.success) {
    return {
      ok: false,
      result: {
        status: "error",
        error: "Invalid brief",
        issues: parsed.error.issues.map((i) => i.message),
      },
    };
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

/** User-supplied context is fenced as untrusted data so the model reads it, never obeys it. */
function ideasTool(rawArgs: unknown): ToolResult {
  const args = IdeasArgsSchema.safeParse(rawArgs ?? {});
  if (!args.success) return invalidArgs(args.error);
  const context = args.data.context.replace(/<\/?untrusted_data>/gi, "");
  return {
    status: "ok",
    category: args.data.category,
    context: `<untrusted_data>${context}</untrusted_data>`,
    guidance:
      "Give 4–6 specific, culturally appropriate ideas. Quote no prices unless a tool produced them.",
  };
}

function briefTool(name: string, brief: EventBrief): ToolResult {
  switch (name) {
    case "extract_brief":
      return { status: "ok", brief };
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

export function executeTool(
  name: string,
  rawArgs: unknown,
  existingBrief?: EventBrief
): ToolResult {
  if (name === "generate_ideas") return ideasTool(rawArgs);

  const args = BriefArgsSchema.safeParse(rawArgs ?? {});
  if (!args.success) return invalidArgs(args.error);

  const resolution = resolveBrief(args.data, existingBrief);
  return resolution.ok ? briefTool(name, resolution.brief) : resolution.result;
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
