# twothetheeexperience — Celebration & Event Planner

A GenAI-powered planning assistant for weddings, birthdays, and community events.
Budget, timeline, vendor checklists, day-of run-of-show, and personalized ideas —
with deterministic math, retrieval-grounded knowledge, and a guardrail chain on every surface.

## Quick Start

```bash
cd apps/web
npm install
cp .env.example .env.local    # add your Google Gemini API key
npm run dev                    # opens on http://localhost:3000
```

The deterministic features (budget, timeline, cascade delay) work **without** an API key.
The AI chat and idea studio need a valid `GEMINI_API_KEY`.

## Run Evals

```bash
cd apps/web
npm run evals:fast             # deterministic + guardrail invariants (~2 min)
```

## Architecture

```
apps/web/           Next.js 15, TypeScript, Tailwind, shadcn-style components
  src/lib/core/     Deterministic planning engine (budget, timeline, cascade, conflicts)
  src/lib/agent/    Guardrail chain + system prompt
  src/lib/locale/   Locale packs (in-IN first)
  src/app/          Pages: Hub, Studio, Budget, Timeline
  evals/            Vitest eval harness
design/             Design system spec + Tailwind tokens
```

## Key Design Decisions

1. **The model never does arithmetic.** Every number traces to a deterministic tool call.
2. **Every cost/ritual claim carries a source citation with a date.**
3. **Guardrails run on input AND output** — injection scan, PII redaction, policy classifier, invariant checks.
4. **India-first, premium segment** — locale packs make other markets a data exercise, not a refactor.
5. **Day-of mode** — live run-of-show with one-tap delay cascade that respects pinned muhurat windows.

## Docs

- [PLAN.md](PLAN.md) — full build plan
- [BUILD_PROMPT.md](BUILD_PROMPT.md) — executable engineering spec
- [design/DESIGN_SYSTEM.md](design/DESIGN_SYSTEM.md) — design tokens, components, accessibility
- [DEMO_SCRIPT.md](DEMO_SCRIPT.md) — shot-by-shot video script for the 4-minute submission
