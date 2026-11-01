# CelebrateAI — Celebration & Event Planner (GenAI)
## Build Plan

> **Design:** driven by the supplied mockups. Tokens, component inventory, screen specs,
> accessibility findings and build notes live in [design/DESIGN_SYSTEM.md](design/DESIGN_SYSTEM.md);
> the token source of truth is [design/tailwind.tokens.js](design/tailwind.tokens.js).
>
> **Market (decided):** India-first, premium segment, with locale packs so other regions drop in
> later. Rationale in DESIGN_SYSTEM.md §7.
>
> **Sourcing:** weddingsutra.com is a reference for *category structure* only. We do **not**
> scrape, copy, or ingest its content. All vendor/editorial data must be licensed, first-party,
> or user-contributed. See §10.

---

## 1. Product thesis

A planning **co-pilot**, not a chatbot. The user describes a celebration in their own words;
the system returns a living, editable **Plan Artifact** — budget, timeline, vendor checklist,
and personalized idea boards — that it keeps internally consistent as constraints change.

The mockups settle the shape of this, and they are right: **the plan is the app; the AI is
contextual, not a chat window.** Four mobile-first destinations — Hub, Studio, Budget,
Timeline — with the assistant surfacing as insight banners, prompt pills, and inline alerts
attached to the thing they are about. A user should be able to run a whole celebration without
ever typing a sentence into a chat box, and still feel assisted on every screen.

It also runs on the day itself. The Timeline tab switches between **High-Level Milestones**
(months out) and **Day-Of Run-of-Show** (live, hour by hour, with pace tracking, staff
presence, weather, and a one-tap delay cascade). Most planning tools stop the day before the
event, which is the day the planning actually matters.

Three event families, one engine:

| Family | Examples | Distinctive logic |
|---|---|---|
| Weddings | Hindu/Punjabi/Marathi/South Indian/Muslim/Christian/Parsi/Bengali, destination, interfaith | multi-day sub-events, ritual dependencies, auspicious date windows, 20+ vendor categories |
| Birthdays & milestones | 1st birthday, kids' theme party, 60th, anniversary, baby shower | theme-first, short lead time, venue + cake + entertainment core |
| Community events | Ganesh/Durga puja, Eid iftar, church fete, society NYE, school fest | permits, sponsors, volunteers, ticketing, crowd safety |

**The differentiator is not "an LLM that talks about weddings."** It is: deterministic
planning math + retrieval-grounded local knowledge + a personalization layer that actually
remembers a family's traditions, budget reality, and taste.

---

## 2. Core principle: the LLM does not do arithmetic or date math

| Must be deterministic code | Must be LLM |
|---|---|
| Budget allocation, per-head cost, taxes, contingency, rebalancing | Explaining *why* a split makes sense |
| Reverse-planned timeline, T-minus dates, dependency ordering, conflict detection | Naming and sequencing culturally correct sub-events |
| Day-of delay cascade ("+15m" rippling through dependent items, vendor call times, kitchen fire times, music cues) | Drafting the whisper message each vendor lead receives |
| Vendor filtering, availability, price-band matching | Shortlist rationale, RFQ questions, negotiation prompts |
| Guest-count rollups, seating constraint solving | Theme, decor, menu, invite copy, sangeet set list |

Every number a user sees comes from a tool call whose output is schema-validated. The LLM
chooses the inputs and narrates the results; it never produces a figure free-hand. This single
rule removes most of the hallucination surface in this domain.

---

## 3. Architecture

```
Next.js 15 (App Router, TS, Tailwind, shadcn/ui)
  |- Chat pane (streaming) + Plan Artifact canvas (budget / timeline / vendors / ideas)
  |- BFF route handlers  -->  FastAPI Agent Service (Python 3.12)
                                |- Orchestrator (Claude tool-use loop)
                                |- Guardrail chain (pre + post)
                                |- Planning tools (deterministic, pure functions)
                                |- Retrievers (vendor catalog / culture KB / cost benchmarks)
                                |- Export service (PDF / XLSX / ICS)
                                      |
      Postgres 16 + pgvector | Redis (cache, rate limit) | S3 (uploads, exports)
                                      |
      OpenTelemetry --> Langfuse (traces, evals, prompt registry)
```

**Model routing** (cost/quality tiering):

| Job | Model | Why |
|---|---|---|
| Intent routing, PII/injection screening, field extraction, tagging | `claude-haiku-5-5` | high volume, narrow, latency-critical |
| Plan generation, idea studio, vendor rationale, chat | `claude-sonnet-5-5` | default workhorse |
| Multi-constraint replanning, budget conflict resolution, interfaith/multi-day weddings | `claude-opus-5-5` + extended thinking | genuinely hard reasoning |
| LLM-as-judge in evals | `claude-opus-5-5` (judge must differ from generator) | avoids self-preference bias |

Prompt caching on the system prompt + culture KB block (1h TTL) is the single biggest cost
lever — the static prefix is large and reused on every turn.

---

## 4. Data model (core tables)

- `users`, `households` (a family plans together), `events`, `event_members` (role: owner / co_planner / viewer / vendor_guest)
- `event_brief` — structured intake: type, dates, city, guest_count, budget_total, currency, communities[], dietary[], accessibility[], formality, aesthetic_tags[], must_haves[], hard_constraints[]
- `budget_lines` (category, allocated, committed, paid, vendor_id, is_locked)
- `timeline_tasks` (title, t_minus_days, due_date, depends_on[], owner_id, status, sub_event_id)
- `sub_events` (haldi, mehendi, sangeet, ceremony, reception, …; venue, time, guest subset)
- `vendors` / `vendor_offers` / `rfqs` / `quotes`
- `guests` (**PII-sensitive** — column-encrypted contact fields), `rsvps`, `seating`
- `idea_boards`, `idea_items`, `taste_signals` (likes/dismisses)
- `preference_memory` (scoped user / household / event; each row carries provenance + confidence)
- `agent_runs`, `tool_calls`, `guardrail_events`, `audit_log` (append-only)

---

## 5. Agent and tool surface

One orchestrator with typed tools — **not** a swarm of chatty sub-agents.

| Tool | Tier | Notes |
|---|---|---|
| `extract_brief` | auto | NL to EventBrief; asks only for missing *blocking* fields |
| `benchmark_costs` | auto | RAG over cost bands by city x tier x guest count |
| `allocate_budget` | auto | deterministic; returns lines + invariant proof |
| `generate_timeline` | auto | reverse-plan from event date, topological sort |
| `detect_conflicts` | auto | date / budget / capacity / ritual-order violations |
| `search_vendors` | auto | hybrid BM25 + vector + structured filters |
| `retrieve_traditions` | auto | ritual and etiquette KB, citation required |
| `generate_ideas` | auto | themes, decor, menu, favors, invite copy, playlists |
| `update_plan` | auto (undoable) | writes to the artifact, versioned |
| `cascade_delay` | auto (undoable) | deterministic graph shift; previews the full downstream diff before commit |
| `draft_vendor_message` | **confirm** | drafts only; never sends |
| `broadcast_vendor_update` | **confirm** | the "Vendor Whisper". Silent to guests, never silent to the user — exact message and exact recipient list shown first |
| `send_rfq` / `share_plan` / `export_*` | **confirm** | leaves the system boundary |
| `book` / `pay` | **blocked in v1** | no autonomous commerce |

Sub-agents are used only for genuinely parallel fan-out (e.g. researching six vendor
categories at once), each with a narrow brief and a read-only tool set.

---

## 6. Personalization (five layers)

1. **Cultural** — community and rituals, auspicious date windows, regional menu norms, language register (English / Hindi / Hinglish / Marathi / Tamil / Bengali …). Always *offered and confirmed*, never inferred from a surname. Interfaith and no-ritual celebrations are first-class.
2. **Economic** — budget tier drives everything: vendor bands, guest-count realism, explicit "what you would give up" tradeoff framing. No aspirational upsell beyond the stated budget unless labelled a stretch option.
3. **Aesthetic** — taste vector learned from idea-board likes/dismisses plus uploaded inspiration images; drives decor, palette, and invite copy tone.
4. **Logistical** — dietary (jain / satvik / halal / vegan / allergen), accessibility (step-free, wheelchair, hearing loop), kids, elders, out-of-town guests, weather and season.
5. **Relational** — who is co-planning, who decides what, family-politics-safe phrasing. The "difficult relative" constraint is real and should be handled with care, not jokes.

Memory rules: explicit beats inferred; every inferred preference carries provenance and
confidence and is surfaced in a user-editable "What I remember about your celebration" panel;
one-click forget; preferences never leak across households.

---

## 7. Guardrails

**Pre-flight (input):** PII detect and redact before any logging; prompt-injection classifier on
*all* untrusted text (uploaded quotes, vendor profiles, pasted emails, web results); jailbreak
screen; scope router (off-topic declines gracefully); language detection.

**Post-flight (output):**
- Schema validation with one bounded repair attempt, then a deterministic fallback
- **Invariants:** budget lines sum to total within rounding tolerance; contingency >= 5%; no negative or past dates; dependency DAG acyclic; every `vendor_id` resolves in the catalog; every cost or ritual claim carries a citation
- Groundedness check on factual spans (claim mapped to retrieved source)
- Policy classifier: no availability or price guarantees; no legal, medical, or financial advice; no dowry facilitation; no caste, religion, or skin-tone based filtering or "fairness" beauty advice; no body or weight advice; no fabricated reviews; inclusive by default (LGBTQ+, single-parent, interfaith, remarriage, low-budget)
- Sensitivity router: grief, called-off weddings, illness, family conflict get warm non-templated handling; crisis language escalates to a human or helpline
- Safety-critical domains (fireworks, drones, alcohol permits, crowd capacity, food safety) always resolve to "verify with the local authority", never a definitive legal answer

**Action guardrails:** nothing leaves the system without explicit user confirmation showing the
exact payload and recipient. No autonomous booking or payment in v1. Per-session token and
spend ceilings with a circuit breaker.

---

## 8. Evals harness

**Datasets**
- `golden/` — ~300 briefs stratified across event family x community x budget tier x city x guest count, each with a rubric and a reference plan reviewed by a professional planner
- `adversarial/` — ~150 cases: injection (including poisoned vendor PDFs), jailbreaks, PII exfiltration, discriminatory requests, impossible constraints (50k budget, 800 guests, this Saturday), contradictory multi-turn edits
- `regression/` — every production failure becomes a permanent case
- `benign-hard/` — over-refusal probes: legitimate alcohol, budget, and religious questions that must be *answered*

**Metrics**

| Layer | Metric | Gate |
|---|---|---|
| Schema and invariants | pass rate | 100% — hard block |
| Retrieval | recall@10, nDCG@10, faithfulness, context precision | >= baseline - 2 pts |
| Plan quality (LLM judge, 1-5 rubric, position-swapped, calibrated against human labels) | actionability, cultural accuracy, personalization fit, tone, budget realism | mean >= 4.0, no dimension < 3.5 |
| End-to-end task success (simulated personas, multi-turn) | goal completion, turns-to-first-plan, repair rate | completion >= 85% |
| Guardrails | attack success rate and false-refusal rate, reported separately | ASR <= 2%, FRR <= 5% |
| Ops | p95 TTFT, tokens/session, cost per plan | within budget |

**Infra:** YAML cases with a pytest runner; a fast tier (deterministic + guardrails, ~2 min) as a
merge gate on every PR; the full tier nightly; a prompt registry with content-hash versioning so
every eval result is attributable to an exact prompt + model pair; Langfuse experiments; 5%
canary in production with auto-rollback on online metric drop.

**The online signal that matters most:** edit distance between the generated plan and what the
user actually keeps. Thumbs are noisy; silent edits are honest.

---

## 9. Security

- OIDC auth; RBAC plus Postgres row-level security keyed on `event_id`; explicit cross-tenant isolation tests in CI
- Guest lists are sensitive personal data: column-level encryption, consent capture before any guest detail reaches a vendor, export and right-to-erasure endpoints
- **India DPDP Act 2023** (data-fiduciary duties, consent notice, breach reporting) plus GDPR for EU users; configurable data residency
- Model provider configured for zero retention / no training; prompt and completion logs redacted with a 30-day TTL
- Untrusted-content discipline: uploads parsed in a sandbox, active content stripped, wrapped in delimiters with spotlighting, and the model told explicitly that such text is *data, never instruction*
- No model-authored code or SQL is ever executed; exports render in a sandboxed worker
- OWASP LLM Top 10 mapping maintained as a living doc; `/security-review` on every PR touching auth, guest data, uploads, or tool permissions
- Anti-abuse: vendor-directory scrape detection, RFQ spam limits, refusal to generate fake reviews or impersonate vendors
- Append-only audit log of every agent action with actor, tool, payload hash, and outcome

---

## 10. Content and legal sourcing

- weddingsutra.com informs **taxonomy and UX expectations only**. No crawling, no content reuse, no image reuse. This constraint is recorded in the repo.
- Vendor data in v1: first-party onboarding, a licensed aggregator feed, and user submissions — each with provenance and a verified flag. Unverified vendors are labelled as such on every surface.
- Cost benchmarks: licensed market data or aggregated anonymized platform quotes, always shown as a *range with a date and a source*, never as a promise.

---

## 11. Phasing

| Phase | Scope | Exit criteria |
|---|---|---|
| **P0 — 4 wks** | Design system + component library (Storybook), `in-IN` locale pack, brief intake, budget, timeline, checklist, Hub screen, PDF/XLSX/ICS export. Guardrail chain v1, deterministic evals in CI. | 100% invariant pass; contrast test green; a professional planner rates 20 generated plans >= 4/5 |
| **P1 — 4 wks** | Vendor RAG, shortlists, RFQ drafts, Studio (ideas + moodboards), Budget screen, multi-user collaboration, memory panel. | retrieval gates green; judge evals green |
| **P2 — 4 wks** | **Day-Of Run-of-Show**: live schedule, pace tracking, delay cascade, vendor broadcast, staff presence, weather. Guest list, RSVP, seating with encryption and consent. | cascade correctness proven on 50 generated dependency graphs; broadcast provably cannot fire without a click |
| **P3 — 4 wks** | WhatsApp channel, multilingual (hi/hinglish + two regional), community-event module (permits, volunteers, sponsors), full adversarial suite and red-team pass. | PII and security review clean; ASR <= 2%, FRR <= 5% |
| **P4** | Vendor marketplace, quote comparison, assisted booking with human in the loop, planner-pro tier, second locale pack. | — |

---

## 12. Top risks

1. **Cost or price hallucination** — deterministic math, cited ranges, "verify with the vendor" framing. The highest-severity failure mode; one wrong number destroys trust instantly.
2. **Cultural error** (wrong ritual order, wrong community assumption) — citation-required KB, community expert review of the KB, never infer community from a name.
3. **Injection via vendor documents** — the dominant attack vector in this product. Treat every uploaded quote as hostile.
4. **Guest-list PII breach** — encryption, consent, minimal sharing.
5. **Over-refusal** making the assistant useless for legitimate alcohol, budget, or religious questions — measured explicitly as FRR and gated in CI.
6. **Thin vendor catalog** making recommendations worse than a web search — be honest about coverage per city and degrade to "questions to ask" rather than inventing names.
7. **Day-Of mode reliability** — it runs in a banquet hall on bad wifi, on the one day that cannot be retried. It must be offline-first with local-write and sync-on-reconnect, must never block on a model call, and a failed broadcast must fail *loudly*. A planner who stops trusting the run-of-show mid-event never opens it again.
