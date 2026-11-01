# CelebrateAI — Design System (extracted from mockups)

Source: two HTML mockups supplied by the product owner —
`mockups/01-hub.html` (Event Hub & AI Concierge) and
`mockups/02-timeline.html` (Interactive Timeline & Day-Of Run-of-Show).
Drop the raw HTML into `design/mockups/` so the build agent can diff against it.

Both mockups share an identical Tailwind config. That config, cleaned and corrected, is in
`apps/web/tailwind.tokens.js` and is the **single source of truth** for the build. The mockups
are prototype HTML (Tailwind CDN, inline config); they are reference, not shippable code.

---

## 1. Brand and aesthetic direction

**Name in the mockups: "CelebrateAI"**, tagline "Bespoke Atelier". The register is *luxury
editorial* — Playfair Display headings over Plus Jakarta Sans body, warm ivory ground,
champagne-gold accents, hairline gold foil borders, generous rounding, soft low-contrast
shadows. Nothing is loud. The AI never presents as a robot; it presents as a concierge.

Design intent to preserve as the product grows:
- **Calm, not dashboard-y.** Metrics are small and quiet; the celebration is the subject.
- **Editorial typography does the work** — serif display numbers ("124 Days to Go") carry the
  emotional weight, sans-serif carries the operational detail.
- **Gold is for status and AI, not decoration.** The champagne/gold family marks AI-authored
  content and milestone moments; it must stay rare enough to still mean something.
- **Green (`#4A7C59`) means "verified / on time / under budget".** It is the only success
  colour. Do not introduce a second one.

---

## 2. Colour tokens

The palette uses Material 3 token naming with a custom warm-neutral scheme. Full values in
`tailwind.tokens.js`. The ones that carry meaning:

| Token | Value | Role |
|---|---|---|
| `background` / `surface` | `#fbf9f6` | warm ivory page ground |
| `surface-container-lowest` | `#ffffff` | card ground — every card sits on white |
| `surface-container-low/`/`-high` | `#f5f3f0` / `#eae8e5` | nested fills, segmented control track |
| `primary` | `#170d16` | near-black aubergine — all headings and body |
| `primary-container` | `#2d222b` | dark pill/button fill (with `secondary-fixed` text) |
| `secondary` | `#775a19` | bronze — AI accent, links, active icons |
| `secondary-container` / `-fixed` / `-fixed-dim` | `#fed488` / `#ffdea5` / `#e9c176` | champagne fills and glows |
| `on-surface-variant` | `#4c4549` | secondary text |
| `outline` / `outline-variant` | `#7d757a` / `#cec4c9` | hairlines, tertiary text |
| `tertiary` / `tertiary-fixed` | `#23080c` / `#ffdadc` | blush — "Major Milestone" pills |
| `error` | `#ba1a1a` | overdue |

**Ad-hoc hex values in the mockups that MUST be promoted to named tokens before building:**

| Hex in mockup | Used for | Becomes |
|---|---|---|
| `#4A7C59` | on-time, verified, under budget | `success` |
| `#EDF4EF` | success pill fill | `success-container` |
| `#C5A059` | gold foil top border | `gold-foil` |
| `#FAF4E7` | warm gold pill fill | `accent-container` |
| `#8E6E26` | text on `#FAF4E7` | `on-accent-container` |
| `#FDF3F3` / `#9C5B62` | blush action chip | `blush-container` / `on-blush-container` |

No raw hex in component code. Enforce with an ESLint rule.

---

## 3. Typography

Two families only.

| Scale | Family | Size / line / weight | Use |
|---|---|---|---|
| `display-hero` / `-mobile` | Playfair Display | 56/64/600 · 38/44/600 | countdown number, hero moments |
| `headline-lg` / `-mobile` | Playfair Display | 36/44/600 · 28/34/600 | page titles |
| `headline-md` | Playfair Display | 24/32/500 | section headers |
| `headline-sm` | Playfair Display | 20/28/500 | card titles, event name in app bar |
| `title-md` | Plus Jakarta Sans | 16/24/600 | list item titles, metric values |
| `body-lg` / `body-md` | Plus Jakarta Sans | 16/26/400 · 14/22/400 | prose |
| `label-md` | Plus Jakarta Sans | 12/16/600, +0.04em | buttons, chips, meta |
| `label-sm` | Plus Jakarta Sans | 11/14/600, +0.06em | uppercase eyebrows, timestamps |

Icons: Material Symbols Outlined, with `FILL 1` reserved for active/selected states.

**Rule:** `label-sm` at 11px is for eyebrows, timestamps, and status pills only. Never use it
for information a user must read to act. Two places in the mockups break this (schedule time
ranges, AI alert timestamps) — promote those to `label-md`.

---

## 4. Spacing, shape, elevation

Spacing tokens: `space-xs` 4 · `space-sm` 8 · `space-md` 16 · `space-lg` 24 · `space-xl` 40;
page `margin` 16 (mobile) / 32 (tablet) / 56 (desktop); `gutter` 20 / 32.

Radii: `DEFAULT` 4 · `lg` 8 · `xl` 12 · `2xl` 16 (cards) · `full` (pills, nav, avatars).
Pills and the bottom nav are always fully rounded. Cards are `xl` or `2xl`, never square.

Two signature card treatments to implement as components, not utility soup:
- `.luxury-card` — `1px solid rgba(45,34,43,.06)` + `0 8px 24px -4px rgba(45,34,43,.04)`
- `.gold-foil-top` — `border-top: 2px solid #C5A059`, marks the hero / ceremony-day card
- `.champagne-pill` — gradient `rgba(254,212,136,.25) → rgba(245,241,235,.8)` with a
  `rgba(197,160,89,.35)` border; reserved for **AI-initiated** surfaces
- `.ambient-glow` — radial blush/gold wash, hero card only

---

## 5. Screen inventory and component map

### 5.1 Shared chrome
- **Top app bar** — fixed, `bg-surface/90` + backdrop blur. Leading: avatar (with presence dot) + **event switcher** (event name + date/city, `expand_more` affordance). Trailing: notifications with unread dot, settings. On the timeline screen the leading block degrades to brand + tagline.
- **Floating bottom nav** — 4 destinations, pill-shaped, blurred, `max-w-md`: **Hub** (`dashboard`) · **Studio** (`auto_awesome`) · **Budget** (`account_balance_wallet`) · **Timeline** (`calendar_today`). Active tab gets `secondary-fixed/30` fill, filled icon, and a dot.

> **Architecture note:** this is a 4-tab mobile app, not the two-pane chat+artifact layout the
> original plan assumed. See §7.

### 5.2 Hub (dashboard)
1. **Hero celebration card** — gold-foil border, ambient glow, "Villa Cora Celebration" chip, serif countdown ("124 Days to Go"), radial **readiness ring** (74% Planned), and a **Dynamic AI Insight banner** with one concrete finding and one action ("Floral proposals 12% under budget → Review Musician Quotes").
2. **Metrics bento** — 3 cards (Budget $28.4k / $45k cap · Guests 118 of 140 RSVP'd · Vendors 7/11) each with icon, value, sub-label, and a thin progress bar.
3. **AI Concierge Actions** — horizontally scrolling prompt pills: Draft Run-of-Show · Suggest Welcome Bag Gifts · Compare 3 Caterers · Write Toast Outline.
4. **Active Focus checklist** — up to 3 priority task cards: round checkbox, title, priority/type chip, one-line detail, due date (red when imminent), and a contextual hint ("AI Prompt Ready", "3 Quotes Generated"). "View All (14)".
5. **Inspiration mood strip** — 2-up image grid, gradient scrim, caption, "AI Curated" label.

### 5.3 Timeline / Run-of-Show
1. **Segmented switcher** — *High-Level Milestones* ↔ *Day-Of Run-of-Show*. Two genuinely different planning modes in one tab.
2. **Live Sync indicator** — pulsing green dot in the page header.
3. **Event day banner** — gold foil top, ceremony-day eyebrow, **weather chip** (86°F Sunny Expected), date + venue + address, and a 3-up metrics strip (Total Guests 118 · Staff On Site 24 Active · Schedule Pace **On Time**).
4. **Emergency Day-Of Orchestration card** (champagne pill) — "Run-of-Show delayed by 15 mins?" with **Recalculate +15m** and **Customize Delta**. This cascades downstream vendor alerts, kitchen fire times, and musical transitions.
5. **Vertical timeline track** — connector line, per-item status markers (completed green / upcoming outline / **active with pulse glow and left accent bar**), each card carrying time range, status chip (Completed · Photo Milestone · In 25 Mins · Major Milestone · Reception), title, assignee + location meta rows, optional nested day-of checklist, and inline **AI Alert pills** ("Shuttle 1 arrived on time (42 guests)").
6. **Broadcast Vendor Whisper** — one-tap silent sync notification to all 6 vendor leads.

---

## 6. What the mockups add to the product scope

Three capabilities the mockups introduce that the original plan did not cover. All three are
now folded into `PLAN.md` and `BUILD_PROMPT.md`:

1. **Day-Of Execution Mode** — a live, hour-by-hour run-of-show distinct from the planning
   timeline, with real-time status, pace tracking, and staff presence.
2. **Delay cascade recalculation** — "+15m" ripples through dependent items, vendor call times,
   kitchen fire times, and music cues. This is *pure deterministic graph math* and must never
   touch the model; it validates the core architectural rule.
3. **Vendor broadcast** — outbound push to vendor leads. This leaves the system boundary, so it
   is **confirm-tier**: show the exact message and the exact recipient list before sending.
   "Silent" must never mean "unconfirmed".

---

## 7. Conflicts with the original plan — resolved

| Issue | Mockup | Resolution |
|---|---|---|
| Brand | "CelebrateAI" | Adopt. "Utsav" dropped. |
| Layout | Mobile 4-tab app; AI appears as contextual banners, prompt pills, and a Studio tab | **Adopt the mockup.** The artifact *is* the app; chat is one surface among several, not the frame. This is the better shape — contextual AI affordances beat a chat box for a planning tool. Desktop becomes a responsive expansion (two-column Hub, side-by-side Studio), not a different information architecture. |
| Market | Florence, USD, °F, Western destination wedding | **Decided: India-first, premium segment, locale-pack architecture.** See below. |
| Chat surface | Only a "Studio" tab | Studio is the generative surface (ideas, moodboards, drafting). Conversational repair of the plan happens inline per card ("AI Prompt Ready"), not in a global chat. |

**Market decision — India-first, premium segment.** The reference site is India-first; the
mockups show a USD destination wedding in Florence. The mockup *content* is placeholder from a
mockup generator — the design system is the real artifact there, and its luxury-editorial
register maps directly onto the premium Indian celebration market that weddingsutra serves.
A $45k cap is ≈ ₹37L, a realistic Indian premium wedding budget. The two are not in tension.

So: **ship the aesthetic as drawn; localize the content.** Beachhead is the Indian premium
segment (₹15L–₹1Cr weddings in Mumbai, Delhi NCR, Bengaluru, Hyderabad, Jaipur, Goa), because
that is where multi-day complexity, many vendors, and willingness to pay all coincide — and
where generic Western planning tools are useless.

Everything market-specific loads as a **locale pack** from day one: currency and formatting,
units, date and calendar system (including Hindu/Islamic calendar overlays for auspicious
dates), vendor taxonomy, ritual KB, cost-benchmark bands, language set, and compliance profile.
`in-IN` is the first pack. `it-IT` / `en-US` destination packs become possible later with no
architectural change — which is what makes the Florence screen in the mockup eventually true
rather than wrong.

---

## 8. Accessibility findings — fix before build

Measured against WCAG 2.2 AA (4.5:1 for text under 18.66px). Three token pairs in the mockups
fail, all marginally and all fixable by darkening the foreground:

| Pair | Measured | Fix |
|---|---|---|
| `outline #7d757a` on `#fbf9f6` — used for timestamps and tertiary meta | **4.25:1** fail | `#6f686c` → 5.2:1 |
| `#8E6E26` on `#FAF4E7` — "Print" / "Photo Milestone" chips | **4.35:1** fail | `#85661f` → 4.9:1 |
| `#4A7C59` on `#EDF4EF` — success chips | **4.35:1** fail | `#3f6b4c` → 5.5:1 |

(`#4A7C59` on white is 4.86:1 and passes — only the tinted-pill pairings fail.)

Other issues in the prototype HTML:
- Images use `data-alt`, not `alt` — **no accessible name at all**. Real `alt` required.
- Status is conveyed by colour plus a text label everywhere except the timeline marker dots — add `aria-label` to markers.
- The pulsing "Live Sync" dot and active-item glow need `prefers-reduced-motion` guards.
- Checkboxes are `disabled` on completed items — use `aria-checked` + `readonly` styling instead so screen readers still announce state.
- 11px status pills: see §3.
- `darkMode: "class"` is configured but no dark palette exists. Either produce a real dark scheme or remove the setting — a half-applied M3 dark token set (`primary-container: #2d222b`) will produce unreadable surfaces if the class is ever toggled.

**Ship a contrast unit test** that asserts every token pair used in the component library meets
AA, and run it in CI. This palette is close enough to the line that it will regress otherwise.

---

## 9. Build notes

- Replace the Tailwind CDN with a real `tailwind.config.ts` generated from `tailwind.tokens.js`.
- All mockup images are Google `aida-public` placeholders — replace with licensed or
  user-uploaded assets. Honour the sourcing constraint in `docs/DATA_SOURCING.md`.
- Self-host Playfair Display and Plus Jakarta Sans via `next/font` (no render-blocking Google
  Fonts link, no third-party request on every page load).
- Subset Material Symbols to the ~40 glyphs actually used; the full variable font is ~3.5MB.
- Build the component library first (`AppBar`, `BottomNav`, `LuxuryCard`, `StatusPill`,
  `MetricTile`, `ReadinessRing`, `TimelineItem`, `AIInsightBanner`, `PromptPill`, `TaskCard`,
  `MoodTile`) with Storybook, then compose screens. Both mockups are ~80% the same ten
  components.
- Every AI-authored surface (`champagne-pill`, insight banners, AI alert pills, "AI Curated")
  must be visually distinguishable from user- and vendor-authored content, and must carry a
  provenance affordance — tap to see what the suggestion was based on.
