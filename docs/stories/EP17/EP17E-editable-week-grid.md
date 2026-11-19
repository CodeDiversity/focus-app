# EP17E — Editable week grid

**Story ID:** EP17E
**Epic:** [EP17](../../epics/EP17-adhd-friendly-pacing-and-plan-proposal.md)
**Milestone:** M10 (proposed, D17-1)
**Layer:** Frontend
**Status:** **Implemented — awaiting parent review** (implementer, 2026-11-19). All 8 ACs met; record at [artifacts/EP17E/implementation.md](./artifacts/EP17E/implementation.md).
**Dependencies:** EP17D.
**Refined:** 2026-11-19

## Plan at a glance

- **What this changes:** the proposed week stops rendering twice. A new `EditableWeek` region draws each day once; selecting a session expands it in place into the controls `PlanSessionEditor` ships today (day, start, end, Move earlier/later, Shorten/Lengthen, Pin/Make flexible, Delete with undo), one session open at a time. `PlanSessionEditor` is deleted — nothing else imports it. Day headings read "Wed, Nov 19" instead of `2026-11-19`, and below `md` the week stacks as day sections instead of seven squeezed columns.
- **Why it improves it:** today a student who wants to move one session looks at the grid, scrolls past it, finds the same session again in a second list of form rows, and edits it there (`PlanProposal.tsx:182-202`). That is two mental models of one week and an unnecessary search — exactly the friction that makes a student abandon the proposal (product). In code it removes a duplicated rendering of the same data, the drift risk between them, and one whole component (code).
- **Decisions needing you:** none — ▲ D17-4 and ▲ D-E1 are **Ruled (user, 2026-11-19)**. D-E5…D-E8 below are refiner additions, `Proposed`, none material.
- **How to change this plan:** edit a Ruling cell below; ask the planner for AC changes. AC text freezes when implementation starts; later asks become a follow-up story.

## Summary

Replace the `PlanWeek` + `PlanSessionEditor` pair on `/plan/proposal` with one
editable week region. Every capability `PlanSessionEditor` has today survives
— and keeps its reviewed accessible names (F-EP16C-01, WCAG 2.5.3) — but it
is reached on the session, in the week, instead of in a second list below it.
A session's card is a disclosure button; activating it opens the one editing
panel. Day headings and every rendered date become human-readable.

`PlanWeek` itself stays: `pages/plan/ui/PlanPage.tsx:124` still renders it
(re-exported as `WeekGrid` from `features/study-plan/ui/WeekGrid.tsx`), so it
is untouched by this story. `PlanSessionEditor` has no caller other than
`PlanProposal.tsx:196` and its own test, so it is removed outright (D-E8).

## Scope

**In:** `features/plan-proposal/ui/EditableWeek.tsx` and
`EditableSessionCard.tsx` (new, + tests); the shared day-label helper
`features/study-plan/lib/dayLabel.ts` (new, + test); their integration into
`PlanProposal.tsx` replacing both `PlanWeek` and `PlanSessionEditor`;
deletion of `PlanSessionEditor.tsx` and `PlanSessionEditor.test.tsx`; the
stale `PlanSessionEditor` reference in `WhatThisKeepsCard.tsx:21`'s comment;
the grid's own responsive behaviour; component tests.

**Out:** the rest of the page's composition, the decision controls, the
"What else changed" disclosure and the `shared/ui/Disclosure` primitive
(all EP17F); the spread presets (EP17G); `PlanWeek.tsx`,
`WeekGrid.tsx` and `PlanPage.tsx` (unchanged — `PlanWeek` keeps its ISO-ish
label on `/plan`, which is outside AC-E17-10's "the proposal"); rendering on
the EP15 calendar grid (BL-16-02's deferred half); drag-and-drop
(rejected, ▲ D-E1); any change to `useProposal`, the payload or an endpoint.

## Source requirement references

AC-E17-09, AC-E17-10, AC-E17-12 (the per-session half), AC-E17-13;
TR-E17-05; V-17-4; DoD-1, DoD-2, DoD-5, DoD-6, DoD-7, DoD-8.

## Acceptance criteria

1. The proposed week is rendered **once**, by `EditableWeek`. Neither
   `PlanWeek` nor `PlanSessionEditor` is rendered on `/plan/proposal`, and
   `PlanSessionEditor.tsx` no longer exists in the repository. For each
   session, a student can, without leaving that session's place in the week:
   change its day, change its start, change its length, pin it / make it
   flexible, and delete it with an undo affordance.
2. Each session card's first element is a disclosure button whose accessible
   name is the session's title and time label; activating it opens that
   session's editing panel (`aria-expanded`, `aria-controls`) and **closes
   any other open panel** — at most one panel is open at a time. `Escape`
   inside a panel closes it and returns focus to its disclosure button.
3. Every edit has a keyboard path, visible focus, and a result announced once
   in a single polite live region owned by `EditableWeek`. Focus stays on or
   returns to the edited session after a change, including after a day change
   that moves the card to another column, and after an undo. Moving a
   `FLEX_DAY` session or typing a start time pins it and says so; resizing
   does not pin
   ([contracts §6](./contracts.md#6-proposal-surface-contract-ep17eep17f-own-it),
   EP13H D-H5).
4. Deleting a session removes it from the week, keeps the existing
   toast-with-**Undo** (D-E3), and moves focus to the next session's
   disclosure button in the same day — or, when the day is left empty, to
   that day section's heading (`tabIndex={-1}`). Focus never falls to
   `document.body`.
5. No raw ISO date is shown to a student anywhere in the proposal: day
   headings, every day section's accessible name and the in-panel day
   `<select>`'s options all read as weekday + month + day in the plan's time
   zone ("Wed, Nov 19", D-E5).
6. Conflicts are still marked on the session they belong to: the card keeps
   `data-conflicted`, the `border-danger` edge **and** a visible text mark,
   so the distinction is never colour-only; the reason text renders on the
   card; and a conflicted session's panel is open on arrival.
7. Loading, empty and error states are preserved unchanged: the skeleton week
   while loading, the "Nothing new to schedule" empty state, the error card
   with **Try again**; a day with no sessions reads "No sessions".
8. Responsive: at `md` and above the week is a seven-column grid and an open
   panel spans the full grid width below its day row; below `md` the week is
   a single vertical stack of day sections with no horizontal scrolling trap
   and 44 px minimum targets.

## Tests

`apps/web/src/features/plan-proposal/ui/EditableWeek.test.tsx` (new),
`EditableSessionCard.test.tsx` (new),
`apps/web/src/features/study-plan/lib/dayLabel.test.ts` (new), and updates to
`apps/web/src/features/plan-proposal/ui/PlanProposal.test.tsx`. Naming follows
the repo style — `describe('EditableWeek (EP17E, AC-E17-09)')` with one
behavioural `it(...)` per case. Each edit case is driven by keyboard
(`userEvent.tab()` / `{Enter}`) **and** by pointer.

- `renders each day exactly once and renders no PlanWeek or PlanSessionEditor`
  (EP17E-AC1) — `queryByTestId('plan-week')` and
  `queryByTestId('plan-session-editor')` are both null.
- `opens one session panel at a time and closes the previous one`
  (EP17E-AC2).
- `Escape closes the open panel and returns focus to its disclosure button`
  (EP17E-AC2).
- `changing the day moves the card to the new day section and keeps focus on
  its disclosure button` (EP17E-AC3); the announcement names the new day in
  human form.
- `typing a start time pins a flexible session and announces it`
  (EP17E-AC3).
- `Lengthen and Shorten change the duration and do not change the anchor`
  (EP17E-AC3).
- `Make flexible derives the window hint from the current start`
  (EP17E-AC3, D-H6) — never a stale hint.
- `deleting focuses the next session in the day; deleting the last session in
  a day focuses the day heading; Undo restores the session at its original
  position` (EP17E-AC4).
- `a conflicted session is open on arrival, names its reason and is marked by
  text as well as by border` (EP17E-AC6).
- `the loading skeleton, the empty state and the error card are unchanged`
  (EP17E-AC7).
- Negative: `an edit that would move a session past midnight is refused and
  leaves the session unchanged` (EP17E-AC1/AC3) — the existing `clampTime` /
  `moveBy` / `resizeBy` guards (`PlanSessionEditor.tsx:33-39`, `:93`,
  `:115-116`) move across with the controls.
- Negative: `no rendered string matches /\d{4}-\d{2}-\d{2}/` over every
  rendered string including `aria-label`s (EP17E-AC5, V-17-4), reusing
  `renderedStrings` from `@/test/forbiddenWords`.
- `passes the copy audit` via `expectNoForbiddenWords` (EP17E-AC5,
  TR-E17-05).
- `dayLabel` unit cases: a mid-month date, the 1st, a December date, and
  stability across the test runner's local zone (the helper formats in `UTC`
  from the civil date, so no browser clock takes part).
- Responsive: `below md the week is a single column stack` and `at md the
  week is a seven-column grid` (EP17E-AC8) — asserted on the container's
  class contract (`grid-cols-1 md:grid-cols-7`), the same way
  `TabBar.test.tsx` asserts `min-h-14`.

## Technical notes

**Inspected (2026-11-19, HEAD `3d10130`).**

| File | Why it changes |
|---|---|
| `apps/web/src/features/plan-proposal/ui/PlanProposal.tsx` | `:182-202` renders `PlanWeek` from `preview.days` and then `PlanSessionEditor` from `edited` — the two renderings this story collapses into one `EditableWeek` |
| `apps/web/src/features/plan-proposal/ui/EditableWeek.tsx` | **new** — the single editable week region |
| `apps/web/src/features/plan-proposal/ui/EditableSessionCard.tsx` | **new** — one session: the disclosure button plus the editing panel |
| `apps/web/src/features/study-plan/lib/dayLabel.ts` | **new** — the one human day label, beside the existing `weekLine.ts` |
| `apps/web/src/features/study-plan/ui/PlanSessionEditor.tsx` + `.test.tsx` | **deleted** (D-E8) |
| `apps/web/src/features/plan-proposal/ui/WhatThisKeepsCard.tsx` | `:21` — a comment naming `PlanSessionEditor`; update the wording, no behaviour change |

- **One source of truth.** `EditableWeek` is the **single** consumer of
  `useProposal`'s `edited` list. It groups `edited` by `date` for rendering —
  it does **not** read `preview.days`, which is what let the two old regions
  drift. Props:
  `{ sessions: ProposedSession[]; days: string[]; onChange: (s: ProposedSession[]) => void; conflicts?: PlanConflict[]; timeZone?: string; className?: string }`
  — deliberately the union of today's `PlanSessionEditor` props plus
  `timeZone`, so `PlanProposal`'s data path is unchanged.
- **Session identity.** `conflicts[].sessionIndex` indexes the flat `edited`
  array (`PlanSessionEditor.tsx:145`), and `projectSessions` preserves that
  order. `EditableWeek` therefore keeps the flat index as each card's
  identity (`data-session-index`), groups for display only, and passes the
  flat index to `updateAt` / `removeAt`. The open panel is held as
  `openIndex: number | null`, so a card that changes day stays open and
  refocuses (EP17E-AC3) without any key gymnastics.
- **Carried over verbatim** from `PlanSessionEditor.tsx`, as behaviour, not
  as a redesign: `minutesOf` `:28`, `clampTime` `:33`, `updateAt` `:51`,
  `removeAt` `:59` with its toast-Undo, `moveBy` `:87` (pins `FLEX_DAY`,
  D-H5), `resizeBy` `:110` (does not pin), the start-time `onChange` pin at
  `:194-200`, the shared flexible/fixed explanation paragraph `:140-143`, the
  five button labels and their `aria-label`s `:220-265`, and the pin/unpin
  pair `:270-301` whose accessible names begin with the visible text
  (F-EP16C-01, WCAG 2.5.3). Moving them unchanged is what makes ▲ D-E1 (a)
  the small change.
- **The live region** (`role="status" aria-live="polite" aria-atomic="true"
  class="sr-only"`, `PlanSessionEditor.tsx:135`) moves to `EditableWeek` —
  one per surface, not one per card. `PlanWeek`'s unused empty live region
  (`data-testid="plan-week-live"`) is not reproduced.
- **Day label** (D-E5): `dayLabel(date: string): string` returns
  `new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day:
  'numeric', timeZone: 'UTC' }).format(new Date(\`${date}T00:00:00.000Z\`))`
  → `"Wed, Nov 19"`. `UTC` on a civil date, matching `weekLine.ts`'s
  no-client-zone-arithmetic rule (D05-6) and `PlanWeek.tsx:30-32`'s existing
  derivation; `en-US` matches `shared/lib/datetime.ts:221`'s locale, so the
  app has one date voice. The plan's `timeZone` is already named once in the
  week line (`weekLine.ts`) when it differs from the browser's — it is not
  repeated per day.
- **Layout** (EP17E-AC8). `EditableWeek` renders
  `grid grid-cols-1 gap-2 md:grid-cols-7`; each day is a
  `<section aria-labelledby>` with an `h3` heading carrying `tabIndex={-1}`
  (EP17E-AC4's delete target). An open panel cannot live inside a
  ~140 px desktop column, so it renders as a **grid sibling placed after the
  seven day sections** with `md:col-span-7`, visually connected to its card by
  the card's `aria-controls` and a persistent selected state on the card
  (ring + "Editing" text, never colour alone). Below `md` the single column
  makes the panel render directly under its own card, which is the ideal
  placement on the viewport that needs it most. No `useMediaQuery` is needed:
  the behaviour falls out of the grid, so there is no JS breakpoint to keep in
  sync.
- **Focus after a delete** (EP17E-AC4): compute the target **before**
  `onChange`, then focus it in a `useEffect` keyed on the sessions length —
  the card being focused is unmounted by the time React commits, so a
  synchronous `.focus()` would be lost.
- No new endpoint, no payload change, no `useProposal` change — EP17E is a
  rendering change only. DoD-3 and DoD-9 are N/A for exactly that reason.

### Decisions

| ID | Options considered | Recommended | Ruling |
|---|---|---|---|
| ▲ D-E1 | In-place interaction model: (a) **select a session → it expands in place** into the controls `PlanSessionEditor` already renders, one open at a time; (b) a popover/sheet anchored to the session; (c) drag-and-drop between day columns with keyboard equivalents | **(a)** — **refiner confirms (a) on inspection.** It moves five reviewed buttons, two time inputs, a day select and their WCAG 2.5.3 accessible names across unchanged (`PlanSessionEditor.tsx:165-301`), so the only new code is the grouping and the disclosure. (b) needs a focus trap, a dismissal contract and positioning logic on a 360 px screen for no student-visible gain. (c) needs a full keyboard alternative anyway — and that alternative *is* (a) — plus pointer-event, autoscroll and reduced-motion work the epic's ADHD standard does not ask for. ▲ — user-visible workflow | Ratified (user, 2026-11-19) |
| D-E2 | Where the component lives: (a) a new `EditableWeek` in `features/plan-proposal/ui/`; (b) extend `PlanWeek` in `features/study-plan/ui/` in place | **(a)** — confirmed: `PlanWeek` has a second live caller, `PlanPage.tsx:124` (via the `WeekGrid` re-export), and is a read-only presentation of a saved week. Editing belongs to the proposal feature that owns the edit state | Ratified (user, 2026-11-19) |
| D-E3 | Undo: (a) keep the existing toast-with-Undo (`PlanSessionEditor.tsx:65-82`); (b) an in-grid "restore" slot | **(a)** — it is shipped, tested and consistent with the rest of the app; changing it is a separate concern | Ratified (user, 2026-11-19) |
| D-E4 | Day label format: (a) weekday + day + month in the plan's time zone; (b) weekday only ("Wed") | **(a)**, at both widths — D-F4 (a) stacks the week vertically below `md`, so the narrow layout has *more* horizontal room per heading, not less, and (b)'s space argument never arises | Ratified (user, 2026-11-19) |
| D-E5 | Exact label string (refines D-E4): (a) **"Wed, Nov 19"** — `en-US`, matching `shared/lib/datetime.ts:221` and `weekLine`'s "Oct 30, 2026"; (b) "Wed 19 Nov" — the planner's illustrative example, which needs a second locale (`en-GB`) for one component | **(a)** — one date voice across the app beats matching an example that was written as shorthand. Both satisfy AC-E17-10 | Ratified by default, 2026-11-19 |
| D-E6 | Open-panel placement at `md`+: (a) a **full-width panel below the seven day columns** (`md:col-span-7`), with the source card showing a persistent "Editing" state; (b) the panel inside its ~140 px day column; (c) the panel replaces the day column's contents | **(a)** — (b) cannot hold a day select and two time inputs legibly and would reintroduce horizontal scrolling; (c) hides the rest of the day while editing it. Below `md` the single-column stack puts the panel directly under its card with no extra rule | Ratified by default, 2026-11-19 |
| D-E7 | Delete affordance: (a) the **Delete** button stays inside the expanded panel, where it is today, behind one deliberate act of opening the session; (b) a delete control on the collapsed card | **(a)** — a destructive control on every collapsed card in a seven-day grid is a mis-tap surface, and the toast-Undo (D-E3) is the safety net for the deliberate case, not for an accidental one | Ratified by default, 2026-11-19 |
| D-E8 | `PlanSessionEditor`'s fate: (a) **delete the component and its test**; (b) keep it unused; (c) keep it for `/plan` | **(a)** — grep for `PlanSessionEditor` finds `PlanProposal.tsx:196`, the component, its own test and one stale comment in `WhatThisKeepsCard.tsx:21`. `/plan` renders `PlanWeek`, not the editor. Leaving a 315-line unused component is the drift this story exists to remove | Ratified by default, 2026-11-19 |

## Definition of Done

DoD-1, DoD-2 (the time inputs keep their `clampTime` / bounds guards), DoD-5
(loading / empty / error), DoD-6 (keyboard), DoD-7 (responsive), DoD-8
(component tests). DoD-3 N/A — no new read or write. DoD-4 N/A — error copy
unchanged. DoD-9 N/A — no API or migration change. DoD-10/11 at the parent
review.

## Sizing

- **Outcome:** one editable week — a student changes a session where they see
  it.
- **Actual at closeout:** as sized — three new modules + tests,
  `PlanProposal` + test updated, `PlanSessionEditor` + test deleted,
  `WhatThisKeepsCard` comment; plus four Playwright specs whose proposal
  selectors the collapse broke (deviation 2 in the implementation record).
  105 targeted tests / 1455 full web suite green.
- **Files:** **new** `EditableWeek.tsx`, `EditableSessionCard.tsx` and their
  tests in `apps/web/src/features/plan-proposal/ui/`; **new**
  `apps/web/src/features/study-plan/lib/dayLabel.ts` + test;
  `features/plan-proposal/ui/PlanProposal.tsx` and its test;
  `features/plan-proposal/ui/WhatThisKeepsCard.tsx` (comment only);
  **deleted** `features/study-plan/ui/PlanSessionEditor.tsx` and
  `PlanSessionEditor.test.tsx`.
- **Start context:** this story,
  [contracts.md §6](./contracts.md#6-proposal-surface-contract-ep17eep17f-own-it),
  `PlanProposal.tsx`, `PlanSessionEditor.tsx`, `PlanWeek.tsx`,
  `useProposal.ts`, `features/study-plan/lib/weekLine.ts`.
- **Verification:**
  `pnpm --filter @studypilot/web test -- plan-proposal study-plan` green;
  `tsc` and `eslint` clean (the delete must leave no dangling import);
  V-17-4 (no ISO date rendered) observed.
- **Dependencies / exclusions:** needs EP17D for the payload. Page
  composition, the decision controls, the `Disclosure` primitive and the
  phone-first demotion are EP17F; the spread presets are EP17G.
