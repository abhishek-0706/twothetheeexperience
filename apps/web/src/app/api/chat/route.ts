/**
 * BFF route: POST /api/chat
 *
 * Orchestrator: receives the user message, runs pre-flight guardrails, calls Gemini with
 * function calling, runs post-flight guardrails, returns the response.
 *
 * BUILD_PROMPT.md §2: model keys never reach the browser.
 * BUILD_PROMPT.md §3: every number the user sees comes from a tool call.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  GoogleGenerativeAI,
  type FunctionDeclaration,
  SchemaType,
  type Content,
  type Part,
} from "@google/generative-ai";
import { SYSTEM_PROMPT, promptHash } from "@/lib/agent/system-prompt";
import { preflightCheck, postflightPolicy } from "@/lib/agent/guardrails";
import { EventBriefSchema, type EventBrief } from "@/lib/core/types";

let genAI: GoogleGenerativeAI | null = null;
function getClient(): GoogleGenerativeAI {
  if (!genAI) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error("GEMINI_API_KEY is not set");
    genAI = new GoogleGenerativeAI(key);
  }
  return genAI;
}

// Gemini function declarations (tool definitions)
const TOOLS: FunctionDeclaration[] = [
  {
    name: "extract_brief",
    description:
      "Parse the user's natural-language celebration description into a structured EventBrief. Call this when the user first describes their event.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        description: { type: SchemaType.STRING, description: "The user's event description" },
      },
      required: ["description"],
    },
  },
  {
    name: "allocate_budget",
    description:
      "Generate a deterministic budget allocation. Returns category-level splits, per-head cost, contingency, and source citations. NEVER calculate budget numbers yourself — always call this tool.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        eventFamily: { type: SchemaType.STRING, description: "wedding, birthday_milestone, or community" },
        eventSubtype: { type: SchemaType.STRING, description: "E.g. Punjabi wedding, 1st birthday" },
        eventDate: { type: SchemaType.STRING, description: "YYYY-MM-DD format" },
        city: { type: SchemaType.STRING, description: "City name" },
        cityTier: { type: SchemaType.STRING, description: "metro, tier1, tier2, or destination" },
        guestCount: { type: SchemaType.NUMBER, description: "Number of guests" },
        budgetAmountMinor: { type: SchemaType.NUMBER, description: "Budget in minor units (paise)" },
        currency: { type: SchemaType.STRING, description: "Currency code, e.g. INR" },
        communities: { type: SchemaType.STRING, description: "Comma-separated community list" },
        dietary: { type: SchemaType.STRING, description: "Comma-separated dietary requirements" },
      },
      required: ["eventFamily", "eventDate", "city", "guestCount", "budgetAmountMinor"],
    },
  },
  {
    name: "generate_timeline",
    description:
      "Generate a reverse-planned timeline from the event date. Returns tasks sorted by due date with dependencies. NEVER calculate dates yourself.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        eventFamily: { type: SchemaType.STRING, description: "wedding, birthday_milestone, or community" },
        eventDate: { type: SchemaType.STRING, description: "YYYY-MM-DD format" },
        communities: { type: SchemaType.STRING, description: "Comma-separated community list" },
      },
      required: ["eventFamily", "eventDate"],
    },
  },
  {
    name: "detect_conflicts",
    description:
      "Check the plan for conflicts: budget overallocation, unrealistic per-head costs, past dates, short lead times, dependency cycles.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        eventFamily: { type: SchemaType.STRING },
        eventDate: { type: SchemaType.STRING },
        city: { type: SchemaType.STRING },
        guestCount: { type: SchemaType.NUMBER },
        budgetAmountMinor: { type: SchemaType.NUMBER },
        currency: { type: SchemaType.STRING },
      },
      required: ["eventFamily", "eventDate", "guestCount", "budgetAmountMinor"],
    },
  },
  {
    name: "generate_ideas",
    description:
      "Generate creative, personalized ideas for themes, decor, menu, entertainment, favors, or invite copy.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        category: { type: SchemaType.STRING, description: "theme, decor, menu, entertainment, favors, invite_copy, or playlist" },
        context: { type: SchemaType.STRING, description: "What the user wants ideas for, with constraints" },
      },
      required: ["category", "context"],
    },
  },
];

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages, brief: existingBrief } = body as {
      messages: ChatMessage[];
      brief?: EventBrief;
    };

    if (!messages || messages.length === 0) {
      return NextResponse.json({ error: "No messages provided" }, { status: 400 });
    }

    const latestUserMsg = messages[messages.length - 1];
    if (latestUserMsg.role !== "user") {
      return NextResponse.json({ error: "Last message must be from user" }, { status: 400 });
    }

    // --- Pre-flight guardrails ---
    const preflight = preflightCheck(latestUserMsg.content);
    if (!preflight.allowed) {
      return NextResponse.json({
        response: preflight.blockReason,
        guardrailEvents: preflight.events,
        blocked: true,
      });
    }

    // --- Model call with Gemini function calling ---
    const client = getClient();
    const model = client.getGenerativeModel({
      model: "gemini-2.0-flash",
      systemInstruction: SYSTEM_PROMPT,
      tools: [{ functionDeclarations: TOOLS }],
    });

    // Convert messages to Gemini Content format
    const geminiHistory: Content[] = messages.slice(0, -1).map((m) => ({
      role: m.role === "user" ? "user" : "model",
      parts: [{ text: m.content }],
    }));

    const chat = model.startChat({ history: geminiHistory });

    // Tool-use loop
    let finalText = "";
    const toolResults: Record<string, unknown>[] = [];
    let guardrailEvents = [...preflight.events];
    const MAX_ROUNDS = 5;

    let currentUserParts: Part[] = [{ text: latestUserMsg.content }];

    for (let round = 0; round < MAX_ROUNDS; round++) {
      const result = await chat.sendMessage(currentUserParts);
      const response = result.response;
      const candidate = response.candidates?.[0];

      if (!candidate?.content?.parts) break;

      const textParts: string[] = [];
      const functionCalls: Array<{ name: string; args: Record<string, unknown> }> = [];

      for (const part of candidate.content.parts) {
        if (part.text) {
          textParts.push(part.text);
        }
        if (part.functionCall) {
          functionCalls.push({
            name: part.functionCall.name,
            args: (part.functionCall.args as Record<string, unknown>) || {},
          });
        }
      }

      if (textParts.length > 0) {
        finalText = textParts.join("\n");
      }

      // If no function calls, we're done
      if (functionCalls.length === 0) break;

      // Execute tools and send results back
      const functionResponses: Part[] = [];

      for (const fc of functionCalls) {
        const toolResult = await executeTool(fc.name, fc.args, existingBrief);
        toolResults.push(toolResult as Record<string, unknown>);

        functionResponses.push({
          functionResponse: {
            name: fc.name,
            response: toolResult as object,
          },
        });
      }

      currentUserParts = functionResponses;
    }

    // --- Post-flight guardrails ---
    const policyCheck = postflightPolicy(finalText);
    guardrailEvents.push(...policyCheck.events);

    if (!policyCheck.passed) {
      finalText =
        "I need to rephrase my response. " +
        policyCheck.violations.join(" ") +
        " Let me provide helpful guidance within my guidelines instead.\n\n" +
        "I'd be happy to help with your celebration planning! Could you tell me more about what you're looking for?";
    }

    return NextResponse.json({
      response: finalText,
      guardrailEvents,
      toolResults,
      promptVersion: promptHash(),
      blocked: false,
    });
  } catch (error) {
    console.error("Chat API error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      { error: message.includes("API_KEY") ? "Service configuration error — check GEMINI_API_KEY in .env.local" : "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}

/**
 * Execute a tool call. All arithmetic happens here — the model only picks the inputs.
 */
async function executeTool(
  name: string,
  input: Record<string, unknown>,
  existingBrief?: EventBrief
): Promise<unknown> {
  switch (name) {
    case "extract_brief": {
      const parsed = EventBriefSchema.safeParse({
        eventFamily: input.eventFamily || "wedding",
        eventSubtype: input.eventSubtype || "wedding",
        eventDate: input.eventDate || "2027-02-14",
        city: input.city || "Jaipur",
        guestCount: input.guestCount || 200,
        budget: {
          amountMinor: input.budgetAmountMinor || 2500000_00,
          currency: (input.currency as string) || "INR",
        },
        communities: typeof input.communities === "string"
          ? input.communities.split(",").map((s: string) => s.trim()).filter(Boolean)
          : [],
        dietary: typeof input.dietary === "string"
          ? input.dietary.split(",").map((s: string) => s.trim()).filter(Boolean)
          : [],
      });
      if (parsed.success) return { brief: parsed.data, status: "ok" };
      return { error: parsed.error.message, status: "validation_failed" };
    }

    case "allocate_budget": {
      const { allocateBudget } = await import("@/lib/core/budget");
      const briefInput: Partial<EventBrief> = {
        eventFamily: (input.eventFamily as EventBrief["eventFamily"]) || existingBrief?.eventFamily || "wedding",
        eventSubtype: (input.eventSubtype as string) || existingBrief?.eventSubtype || "wedding",
        eventDate: (input.eventDate as string) || existingBrief?.eventDate || "2027-02-14",
        city: (input.city as string) || existingBrief?.city || "Jaipur",
        cityTier: (input.cityTier as EventBrief["cityTier"]) || existingBrief?.cityTier || "metro",
        guestCount: (input.guestCount as number) || existingBrief?.guestCount || 200,
        budget: {
          amountMinor: (input.budgetAmountMinor as number) || existingBrief?.budget?.amountMinor || 2500000_00,
          currency: (input.currency as string) || existingBrief?.budget?.currency || "INR",
        },
        communities: typeof input.communities === "string"
          ? input.communities.split(",").map((s: string) => s.trim()).filter(Boolean)
          : existingBrief?.communities || [],
        dietary: typeof input.dietary === "string"
          ? input.dietary.split(",").map((s: string) => s.trim()).filter(Boolean)
          : existingBrief?.dietary || [],
      };
      const parsed = EventBriefSchema.safeParse(briefInput);
      if (!parsed.success) return { error: "Invalid brief", details: parsed.error.message };
      const plan = allocateBudget(parsed.data);
      return { plan, status: "ok" };
    }

    case "generate_timeline": {
      const { generateTimeline } = await import("@/lib/core/timeline");
      const briefInput: Partial<EventBrief> = {
        eventFamily: (input.eventFamily as EventBrief["eventFamily"]) || existingBrief?.eventFamily || "wedding",
        eventSubtype: (input.eventSubtype as string) || existingBrief?.eventSubtype || "wedding",
        eventDate: (input.eventDate as string) || existingBrief?.eventDate || "2027-02-14",
        city: (input.city as string) || existingBrief?.city || "Jaipur",
        guestCount: existingBrief?.guestCount || 200,
        budget: existingBrief?.budget || { amountMinor: 2500000_00, currency: "INR" },
        communities: typeof input.communities === "string"
          ? input.communities.split(",").map((s: string) => s.trim()).filter(Boolean)
          : existingBrief?.communities || [],
      };
      const parsed = EventBriefSchema.safeParse(briefInput);
      if (!parsed.success) return { error: "Invalid brief", details: parsed.error.message };
      const tasks = generateTimeline(parsed.data);
      return { tasks, taskCount: tasks.length, status: "ok" };
    }

    case "detect_conflicts": {
      const { detectConflicts } = await import("@/lib/core/conflicts");
      const briefInput: Partial<EventBrief> = {
        eventFamily: (input.eventFamily as EventBrief["eventFamily"]) || existingBrief?.eventFamily || "wedding",
        eventSubtype: existingBrief?.eventSubtype || "wedding",
        eventDate: (input.eventDate as string) || existingBrief?.eventDate || "2027-02-14",
        city: (input.city as string) || existingBrief?.city || "Jaipur",
        guestCount: (input.guestCount as number) || existingBrief?.guestCount || 200,
        budget: {
          amountMinor: (input.budgetAmountMinor as number) || existingBrief?.budget?.amountMinor || 2500000_00,
          currency: (input.currency as string) || existingBrief?.budget?.currency || "INR",
        },
      };
      const parsed = EventBriefSchema.safeParse(briefInput);
      if (!parsed.success) return { error: "Invalid brief" };
      const { allocateBudget } = await import("@/lib/core/budget");
      const { generateTimeline } = await import("@/lib/core/timeline");
      const budget = allocateBudget(parsed.data);
      const tasks = generateTimeline(parsed.data);
      const conflicts = detectConflicts(parsed.data, budget, tasks);
      return { conflicts, conflictCount: conflicts.length, status: "ok" };
    }

    case "generate_ideas": {
      return {
        instruction: `Generate 4-6 creative ${input.category} ideas for: ${input.context}. Be specific, culturally appropriate, and budget-conscious.`,
        status: "ok",
      };
    }

    default:
      return { error: `Unknown tool: ${name}` };
  }
}
