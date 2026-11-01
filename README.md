# twothetheeexperience — GenAI Celebration & Event Planner

A planning assistant for **weddings, milestone birthdays and community events**, built India-first. It produces budgets, reverse-planned timelines, vendor checklists, a day-of run-of-show and personalised ideas. All arithmetic is deterministic code, and Google Gemini handles the conversation and creative work.

- **Live app:** https://web-henna-alpha-54.vercel.app
- **Demo video:** https://drive.google.com/file/d/1N66TlbjbuyrsYYMs3JyJLCUKTRKEJo9U/view?usp=sharing

## Problem statement → feature map

> *Create a GenAI-powered planning assistant that helps users organize weddings, birthdays, and community events with budgets, timelines, vendor checklists, and personalized ideas.*

| Requirement | Where it lives |
|---|---|
| Weddings, birthdays, community events | One `eventFamily` (`wedding` / `birthday_milestone` / `community`) drives category weights, task templates and ceremony suggestions (`src/lib/locale/in-IN.ts`). |
| Budgets | `allocateBudget()` splits the total across 9–11 vendor categories with an 8% contingency, a per-guest figure, a rationale per line and a dated cost-band citation. **Budget** screen → *Show the math*. |
| Timelines | `generateTimeline()` reverse-plans 14–17 tasks from the event date, with dependencies and a "why it matters" note. **Timeline** → *Milestones*. |
| Vendor checklists | Every task belongs to a vendor category (venue, caterer, decor, photographer, pandit, makeup, permits…). Each run-of-show item lists its vendor leads and a checklist. A delay notifies exactly the affected vendors. **Timeline** → *Run-of-show*. |
| Personalised ideas | **Idea Studio** (themes, decor, menu, entertainment, invitation wording, favours) and the **AI Concierge** on the Hub, both grounded in the brief: community, dietary needs, guest count and budget. |

India-specific depth: lakh/crore formatting, city-tier pricing, community-specific ceremonies (mehndi, sangeet, nikah, anand karaj, muhurtam…), and **pinned muhurat windows** that the delay engine refuses to move.

## Architecture

```
Browser (Next.js 15 App Router, React 19, Tailwind)
   │  POST /api/chat
   ▼
Chat API  ── rate limit → body cap → Zod schema → pre-flight guardrails
   │
   ▼
Gemini 3.8 Flash  ⇄  function calling (max 5 rounds)
   │      extract_brief · allocate_budget · generate_timeline · detect_conflicts · generate_ideas
   ▼
Deterministic engine (src/lib/core) ── pure functions, integer paise, Zod-validated output
   │
   ▼
Post-flight guardrails ── budget invariant · figure traceability · content policy → response
```

**The model never does arithmetic.** Every rupee figure in a reply must trace back to a tool result from that turn. Money is integer minor units (paise), and splits use largest-remainder apportionment, so the budget lines plus contingency always equal the total exactly.

| Path | Contents |
|---|---|
| `apps/web/src/lib/core/` | `money`, `budget`, `timeline`, `cascade`, `conflicts`, `types` (Zod contracts) |
| `apps/web/src/lib/agent/` | `orchestrator` (Gemini tool loop), `model-call` (timeout + retry), `tools` and `tool-declarations`, `request-schema`, `rate-limit`, `system-prompt` |
| `apps/web/src/lib/agent/guardrails/` | One module per check: `pii`, `injection`, `scope`, `policy`, `budget-invariant`, `traceability` |
| `apps/web/src/lib/client/` | Typed, Zod-validated chat client shared by Hub and Studio |
| `apps/web/src/lib/demo/` | Demo brief and run-of-show data |
| `apps/web/src/lib/locale/in-IN.ts` | Categories, cost bands, ceremonies, task templates. A new market is a new file. |
| `apps/web/src/app/` | Thin pages (Hub, Budget, Timeline, Studio) and the `api/chat` route handler |
| `apps/web/src/components/` | Feature components (`hub`, `chat`, `timeline`, `budget`, `studio`) and shared `ui` |
| `apps/web/src/hooks/` | `usePlan`, `useConciergeChat`, `useIdeaGenerator` |
| `apps/web/evals/` | Vitest suite |
| `demo/tooling/` | Reproducible demo-video pipeline (Playwright + FFmpeg + TTS) |

## Guardrails

| Stage | Check | Behaviour |
|---|---|---|
| Pre-flight | PII redaction | Email, UPI ID, phone, card, Aadhaar and PAN are redacted from the copy that gets logged; the model still sees the original. |
| Pre-flight | Prompt-injection scan | Runs over **every user message in the history**, not just the latest. Blocks override, role-prefix, prompt-exfiltration, secret-exfiltration, persona and jailbreak patterns. |
| Pre-flight | Scope routing | Finance, medical and legal requests are flagged so the model redirects them. |
| Pre-flight | Input policy | Topics such as dowry, caste and crash diets add guidance so the model answers safely, rather than refusing. |
| Post-flight | Budget invariant | Every `allocate_budget` result is re-validated (schema, sum, contingency ≥ 5%). |
| Post-flight | Figure traceability | Any ₹ figure (including lakh/crore forms) must come from a tool result or the user's own message. On failure: one corrective retry, then a deterministic fallback. |
| Post-flight | Content policy | Checked per sentence: blocks facilitation (dowry, caste filtering, skin-lightening, crash diets, guaranteed prices) while allowing the model's own safe refusals. Safety topics (fireworks, drones, alcohol permits, crowd safety) are flagged. |

## Security

- The Gemini key is read server-side only (`GEMINI_API_KEY`) and never reaches the browser.
- Per-client rate limit on `/api/chat` (20 requests/minute) with `Retry-After`.
- 64 KB body cap, at most 30 messages of up to 4,000 characters each, all checked by a Zod request schema.
- Error responses are generic. Details go to structured server logs, which only ever see the PII-redacted copy of a message.
- Security headers on every route: Content-Security-Policy, HSTS, `X-Frame-Options: DENY`, `nosniff`, Referrer-Policy and Permissions-Policy.

## Accessibility (WCAG 2.2 AA)

- A skip link jumps to the main content, and each page has one `<main>` landmark.
- Chat replies, delay-cascade results and generated ideas are announced through live regions. Loading states use `role="status"` and errors use `role="alert"`.
- Visible `:focus-visible` outlines and labelled controls, and motion is disabled under `prefers-reduced-motion`.
- Colour tokens are contrast-tested by the test suite (`contrast.test.ts`): every text colour on every light surface, and every `on-*` colour on its container, must reach 4.5:1. Four mockup colours were darkened to pass.
- The layout is mobile-first and built for one-handed use on the wedding day.

## Testing

```bash
cd apps/web
npm run check          # typecheck + lint + tests
npm test               # vitest
npm run test:coverage  # coverage for src/lib/core
```

| File | Covers |
|---|---|
| `money.test.ts` | Integer arithmetic, currency guards, lakh/crore formatting, and 200 seeded property cases for `largestRemainderSplit` |
| `budget.test.ts` | Exact splits for all three event families, every city tier, contingency and per-head, citations, 150 seeded property cases, schema rejection |
| `timeline.test.ts` | Task selection per family, due-date arithmetic (including leap years), overdue filtering on a frozen clock, dependency order |
| `conflicts.test.ts` | All six conflict kinds with exact messages and boundary values (29/30 days, the capacity cap, the per-head floor) |
| `cascade.test.ts` | Propagation, compression, pinned muhurat boundaries, multiple pinned items, diamond dependencies, negative delays, immutability |
| `locale.test.ts` | Weights sum to 100 per family, tier multipliers, citation format, ceremonies per community, template dependency order |
| `types.test.ts` | Accept/reject cases for every Zod contract |
| `contrast.test.ts` | WCAG 2.2 AA contrast for every text/surface token pair |
| `guardrails.test.ts` | Adversarial injections, benign-but-tricky requests (interfaith, dry weddings, low budgets), PII, policy, traceability |
| `chat-route.test.ts` | API route with Gemini mocked: validation, size limits, rate limiting, history injection, traceability fallback |

Run `npm test` for the current count.

## Quick start

```bash
cd apps/web
npm install
cp .env.example .env.local   # set GEMINI_API_KEY
npm run dev                  # http://localhost:3000
```

The budget, timeline and delay-cascade screens work without a key. The AI Concierge and Idea Studio need `GEMINI_API_KEY`.

## Further reading

- [PLAN.md](PLAN.md): product and architecture plan
- [BUILD_PROMPT.md](BUILD_PROMPT.md): engineering spec and acceptance criteria
- [design/DESIGN_SYSTEM.md](design/DESIGN_SYSTEM.md): tokens, components, accessibility audit
- [DEMO_SCRIPT.md](DEMO_SCRIPT.md): demo walkthrough
