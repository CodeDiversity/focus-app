# EP17F — Proposal composition and decision affordances

**Story ID:** EP17F
**Epic:** [EP17](../../epics/EP17-adhd-friendly-pacing-and-plan-proposal.md)
**Milestone:** M10 (proposed, D17-1)
**Layer:** Frontend
**Status:** **Ready for implementation** — the region hierarchy, the phone layout and the tab-bar collision are grounded below. One non-blocking observation for the user is recorded at D-F7.
**Dependencies:** EP17E.
**Refined:** 2026-11-19

## Plan at a glance

- **What this changes:** `/plan/proposal` stops being a stack of seven equal regions and becomes **four**: the heading with one sentence saying what the planner did and how the week was spread; EP17E's editable week; the things that will not happen (conflict summary and workload warnings), always visible; and one labelled **"What else changed"** disclosure holding the calibration note, "What this plan keeps" and "Moved forward into this plan" — open by default at `md`+, collapsed below it. **Use this plan** and **Not now** leave the page header entirely and live in one fixed bottom action bar that sits **above** EP16E's mobile tab bar, so the decision is one tap away from wherever the student stopped editing. Absorbs BL-16-09 (phone-first proposal).
- **Why it improves it:** today the confirm sits at the very top (`PlanProposal.tsx:110-128`) and six regions sit between a student's eyes and it. A student with ADHD who has just finished nudging a session on Thursday has to scroll back to the top to say yes — a trivial-sounding cost that is exactly where confirmation gets abandoned (product). In code, one page composing four regions with stated ranks is far easier to keep honest than seven sibling blocks with implicit priority, and the confirm stops being duplicated the moment it needs to be reachable twice (code).
- **Decisions needing you:** none that block — ▲ D-F1 and ▲ D-F2 are ratified (user, 2026-11-19). D-F5…D-F7 are refiner additions, `Proposed`; **D-F7 is worth a glance** — it records the one cost of D-F2 (a) that the refiner could not remove.
- **How to change this plan:** edit a Ruling cell below; ask the planner for AC changes. AC text freezes when implementation starts; later asks become a follow-up story.

## Summary

Recompose `/plan/proposal` around the decision. Keep every piece of
information EP16C put there; change its rank, and reduce seven visible blocks
to four. Extend the existing `proposalSummary` helper with the spread from
EP17D's `pacing` block so there is still exactly one summary sentence. Move
the confirm and the decline out of the header into a single fixed action bar
that is correct at every scroll position, on desktop and on a 360×640 phone,
and offset so it never covers the mobile tab bar or the last row of the week.
Fold the reassurance and context behind one disclosure on narrow viewports
(BL-16-09's phone-first idea, spec inherited from
[EP16K](../EP16/EP16K-phone-first-proposal.md), reconciled here with the
editable grid that did not exist when EP16K was written).

## Scope

**In:** `PlanProposal.tsx`'s composition and region order; the extended
`proposalSummary`; `shared/ui/Disclosure.tsx` (new, + test — none exists);
`features/plan-proposal/ui/ProposalActionBar.tsx` (new, + test); the
narrow-viewport layout and the tab-bar offset; their tests; the axe pass at
both viewports.

**Out:** the editable week itself and the `Disclosure`-free per-session
expansion (EP17E); the spread preset controls and the slot they occupy
(EP17G — EP17F only reserves the slot under the pacing sentence); any change
to what the payload contains (EP17D); any change to `WhatThisKeepsCard`,
`MovedForwardList`, `WorkloadWarnings` or `CalibrationNote` beyond where they
are rendered; the `widgets/tab-bar` and `widgets/layout` shell (read, never
edited); rendering on the EP15 calendar grid (BL-16-02's deferred half).

## Source requirement references

AC-E17-10 (the page half), AC-E17-11, AC-E17-12 (the page half), AC-E17-13;
TR-E17-05, TR-E17-06 (the surface half); V-17-5; DoD-1, DoD-4, DoD-5, DoD-6,
DoD-7, DoD-8.

## Acceptance criteria

1. Exactly one confirm (**Use this plan**) and one decline (**Not now**)
   exist in the DOM. They render in `ProposalActionBar`, not in the page
   header, so the "only one exposed to assistive technology" obligation is
   met by there being only one —
   `getAllByRole('button', { name: /use this plan/i })` returns one node at
   every viewport. Both are reachable from the editing area without scrolling
   back to the page header, on desktop and at 360×640 (V-17-5).
2. The action bar is fixed to the bottom of the viewport, sits **above**
   EP16E's tab bar rather than under it, and never covers the last row of the
   week: below `md` its bottom offset is
   `calc(3.5rem + env(safe-area-inset-bottom))` — the tab bar's own
   `min-h-14` plus the inset it pads with (`TabBar.tsx`) — and at `md`+ it is
   `bottom-0`; its own padding carries `env(safe-area-inset-bottom)`; its
   `z-index` is below the tab bar's `z-30`; and the proposal section reserves
   bottom padding equal to the bar's height.
3. One sentence under the heading states what the planner did, built from the
   existing `proposalSummary` extended with the `pacing` block: how many
   sessions, about how much time, and across how many days the work was
   spread. It is a paragraph, never a heading; it renders nothing when the
   proposal is empty; and it falls back to today's two-part sentence,
   unchanged, when no `pacing` block is present.
4. The surface renders exactly four regions in this order: heading + window
   line + pacing sentence (+ EP17G's slot), the editable week, the
   always-visible risk region (conflict summary then `WorkloadWarnings`), and
   one **"What else changed"** disclosure containing `CalibrationNote`,
   `WhatThisKeepsCard` (with its lock toggle) and `MovedForwardList`. Every
   EP16C region is still present and reachable; the disclosure's button
   carries a visible label, `aria-expanded` and `aria-controls`, and is
   expanded by default at `md`+ and collapsed below it.
5. The page's existing behaviours survive exactly: focus lands on the `h1` on
   entry and after a reload settles; confirming resets the Today, calendar
   and recovery-summary caches and lands on `/today`; **Not now** returns to
   `/plan` with no request; the rolled-over banner, the loading skeleton and
   the error card are unchanged in behaviour and in copy, including the
   confirm's 409 / `WINDOW_ROLLED_OVER` handling.
6. Keyboard operability, a focus order matching the visual order, visible
   focus, reduced-motion compliance and WCAG 2.2 AA hold on the recomposed
   surface; 44 px targets below `sm`; axe reports no violations at a wide and
   a narrow viewport.

## Tests

Updates to `apps/web/src/features/plan-proposal/ui/PlanProposal.test.tsx`
(including the existing `section order: calibration, week, editor, keeps,
moved forward, warnings (D-C6)` case, which this story rewrites), plus new
`apps/web/src/shared/ui/Disclosure.test.tsx` and
`apps/web/src/features/plan-proposal/ui/ProposalActionBar.test.tsx`.

- `exposes exactly one Use this plan and one Not now, and neither is in the
  page header` (EP17F-AC1) — `getAllByRole` returns one of each; the header
  `<div>` contains no button.
- `the action bar clears the mobile tab bar and the safe area` (EP17F-AC2) —
  asserts the bar's class contract contains
  `bottom-[calc(3.5rem+env(safe-area-inset-bottom))]` and `md:bottom-0`, in
  the same class-contract style `TabBar.test.tsx` already uses; and that the
  proposal section reserves matching bottom padding.
- `the confirm is reachable from the editing area at 360×640` (EP17F-AC1,
  V-17-5) — by structure in the component test, by position in EP17H's
  Playwright run.
- `the pacing sentence names the sessions, the time and the spread`
  (EP17F-AC3) from a `pacing` fixture; boundary cases
  `a one-study-day week reads "on 1 day"`, `an empty proposal renders no
  summary`, and `a preview without a pacing block renders today's sentence
  unchanged`.
- `renders four regions in the contract order` (EP17F-AC4).
- `What else changed is collapsed below md and expanded at md and above, and
  every demoted region is reachable through it` (EP17F-AC4).
- `Disclosure.test.tsx`: `toggles aria-expanded and its panel on click, Enter
  and Space`; `honours defaultOpen`; `points aria-controls at the panel`;
  `has a 44px target below sm and the shared focus ring`.
- `focus lands on the h1 on entry and after Try again` (EP17F-AC5).
- `confirm resets the three caches and navigates to /today; Not now issues no
  request` (EP17F-AC5).
- `a 409 marks the conflicted sessions, renders the conflict summary once and
  preserves edits` (EP17F-AC5) — the always-visible risk region means no
  disclosure needs forcing open, which retires EP16K's AC3 rule.
- `the copy audit passes in the ready, conflict, empty, error and
  rolled-over states` via `expectNoForbiddenWords` (EP17F-AC3, TR-E17-05).
- `axe reports no violations at 1280px and at 360px` (EP17F-AC6).

## Technical notes

**Inspected (2026-11-19, HEAD `3d10130`).**

### The sticky-bar / tab-bar collision — checked, and it is real

The planner flagged this as the most likely defect of ▲ D-F1 (a). It is:

- `apps/web/src/widgets/tab-bar/ui/TabBar.tsx` renders
  `<nav aria-label="Primary" class="fixed inset-x-0 bottom-0 z-30 border-t
  border-border bg-surface pb-[env(safe-area-inset-bottom)]">`, with each tab
  `min-h-14` (= 3.5 rem).
- `apps/web/src/widgets/layout/ui/Layout.tsx` gives `<main>`
  `pb-[calc(3.5rem+env(safe-area-inset-bottom))]` **only when** the bar is
  visible, with the comment "room for the fixed bar plus the device safe
  area, so no page control ends up underneath it" (EP16E-AC2).
- `apps/web/src/widgets/tab-bar/model/useTabBarVisible.ts`: visible when
  authenticated **and** below `md` (`MD_UP_QUERY = '(min-width: 768px)'`),
  with a `/focus`-only carve-out. `/plan/proposal` is a protected route, so on
  this surface the rule reduces exactly to **"visible below `md`"**.

So a naive `fixed bottom-0` action bar would land on top of the tab bar on
every phone. **Resolution (D-F5):** express the identical rule in CSS instead
of importing the hook —

```
fixed inset-x-0 z-20 border-t border-border bg-surface
bottom-[calc(3.5rem+env(safe-area-inset-bottom))] md:bottom-0
pb-[env(safe-area-inset-bottom)] md:pb-0
```

- The media query `md` is the *same* boundary `useTabBarVisible` uses, so the
  two can only agree.
- A hook import is **not** available: `apps/web/.eslintrc.cjs:69-74` forbids
  `src/features` importing from `src/widgets`, and this is not one of the
  sanctioned `app/store` exceptions (RD7). CSS keeps the layer direction
  clean with no `eslint-disable`.
- `z-20` is below the tab bar's `z-30`, so if a future shell change ever
  breaks the offset, navigation wins rather than being buried.
- `<main>`'s padding already clears the tab bar; the **proposal section**
  additionally gets `pb-24` (`6rem`, the bar's height plus a gap) so the last
  day of the week is never under the bar. That padding lives on the proposal,
  not in the shell — EP17F edits no `widgets/` file.

### Composition

- `PlanProposal.tsx` inspected: header + actions `:89-129`, rolled-over
  banner `:131-140`, loading skeleton `:142-157`, error card `:159-168`,
  `CalibrationNote` `:173`, empty state `:175-179`, the week `:182-202`,
  conflict summary `:203-221`, `WhatThisKeepsCard` `:225-231`,
  `MovedForwardList` `:233-235`, `WorkloadWarnings` `:237-241`. After this
  story the header `<div>` at `:110-128` is removed and its two buttons are
  rendered once by `ProposalActionBar`, under the same conditions as today —
  confirm when `preview` is non-null (so the loading and error phases show
  only **Not now**, preserving the existing
  `shows the week skeleton with aria-busy while loading, and only Not now in
  the header` case apart from its name), decline always.
- `proposalSummary` (`:40-47`, EP16C D-C12) gains a third optional argument:
  `proposalSummary(sessionCount, totalMinutes, studyDayCount?)`. With it
  absent the returned string is byte-identical to today's, which is what
  keeps the existing D-C12 test and every pre-EP17D fixture green. With it
  present the sentence becomes
  `"5 sessions · about 4 h this week · spread across 3 days"`, and
  `"2 sessions · about 1 h 30 min this week · on 1 day"` for a single study
  day. The count is `pacing.studyDays.length`
  ([contracts §5](./contracts.md#5-the-pacing-block-in-the-proposal-payload-ep17d-owns-it)),
  which is the **selected** day set whether or not minutes landed on each —
  that is exactly ▲ D-D1's distinction, and it is why the sentence says
  "spread across" rather than "uses". No `%` appears: the copy audit
  (`src/test/forbiddenWords.ts`) forbids the character outright, so the
  spread lever is never translated into a percentage on this surface.
- **Region order and ranks** (EP17F-AC4), replacing EP16C's D-C6 order:
  1. Heading region — `h1` (focus target, unchanged), `weekLine`, the pacing
     sentence, then EP17G's control slot. Rank: judge the week.
  2. `EditableWeek` (EP17E). Rank: change the week.
  3. Risk — the existing conflict-summary `div`
     (`data-testid="conflict-summary"`) then `WorkloadWarnings`. Always
     visible at every width, per ▲ D-F2 (a): work that will not happen is
     never hidden.
  4. `<Disclosure label="What else changed">` containing `CalibrationNote`,
     `WhatThisKeepsCard`, `MovedForwardList`. Rank: reassurance and context.
  The rolled-over banner, loading skeleton, error card and empty state keep
  their current positions and conditions.
- `shared/ui/Disclosure.tsx` is **new**: `ls apps/web/src/shared/ui` holds
  Badge, Button, Card, Dialog, EmptyState, Input, Select, Switch only, and
  EP16K recorded the same finding. Signature, inherited from EP16K's design
  note and simplified because no 409 needs to force it open any more:
  `Disclosure({ id, label, defaultOpen, children, className })` — a
  `<button aria-expanded aria-controls>` plus the panel, no animation, 44 px
  target below `sm`, the shared `focus-visible:ring-focus-ring`. `defaultOpen`
  is `useMediaQuery(MD_UP_QUERY, true)`
  (`shared/lib/useMediaQuery.ts`), whose `useSyncExternalStore` first render
  is synchronous, so there is no flash of the wrong state and existing
  desktop-default tests stay green.
- Heading levels are unchanged: `WhatThisKeepsCard.tsx:37`,
  `MovedForwardList.tsx:21` and `WorkloadWarnings.tsx:44` each render an
  `h2` under the page `h1`; moving two of them inside a disclosure panel does
  not alter the outline. `CalibrationNote` is a `role="note"` with no
  heading.
- `useProposal` is untouched. Its `onConfirmed` resetting `todayPlanApi`,
  `calendarApi` and `recoverySummaryApi` before navigating (`:65-74`,
  F-EP16F-02) is behaviour to preserve exactly; the only change is which
  component renders the button that calls `confirm()`.
- No API change, no new read or write — DoD-3 and DoD-9 are N/A. DoD-4 is
  satisfied by preservation: the 409 conflict summary and the
  `WINDOW_ROLLED_OVER` banner keep their existing actionable copy.

### Decisions

| ID | Options considered | Recommended | Ruling |
|---|---|---|---|
| ▲ D-F1 | Where the decision controls live: (a) a **sticky action bar** at the bottom of the viewport carrying the single confirm and decline, with the header's copies removed; (b) keep them in the header and repeat them at the end of the page; (c) header only, as today | **(a)** — and the refiner's check clears it: the tab-bar collision the planner feared is real but is solved in CSS by D-F5, with no `widgets` import and no shell edit, so (b)'s fallback is not needed. (a) is also the only option that removes a control instead of duplicating one, which is what lets EP17F-AC1 be satisfied by construction rather than by `aria-hidden` bookkeeping. ▲ — user-visible workflow | Ratified (user, 2026-11-19) |
| ▲ D-F2 | What is demoted: (a) **"what this plan keeps", "moved forward" and the calibration note** go behind one labelled disclosure ("What else changed"), expanded by default above `md`; **workload warnings and the conflict summary stay always visible** because they describe work that will not happen; (b) demote nothing, only reorder; (c) demote the warnings too | **(a)** — a warning a student does not see is a promise the plan quietly breaks, so warnings never hide; reassurance and context are exactly what a disclosure is for. (c) is rejected on those grounds. ▲ — user-visible workflow | Ratified (user, 2026-11-19) |
| D-F3 | The pacing sentence: (a) extend the existing `proposalSummary` helper so there is one sentence; (b) a second line below it | **(a)** — one sentence is the point; two summaries is the defect this epic removes in miniature. Implemented as an **optional** third argument so the pre-EP17D string stays byte-identical | Ratified (user, 2026-11-19) |
| D-F4 | Narrow-viewport week: (a) the week scrolls vertically as day sections below `md`; (b) horizontal column scroll | **(a)** — confirmed against EP17E: `EditableWeek` is `grid-cols-1 md:grid-cols-7`, so the narrow layout is the stack by construction and EP17F asserts rather than implements it | Ratified (user, 2026-11-19) |
| D-F5 | Clearing EP16E's tab bar (grounds ▲ D-F1 (a)): (a) **a CSS bottom offset** `bottom-[calc(3.5rem+env(safe-area-inset-bottom))] md:bottom-0`, mirroring `useTabBarVisible`'s own `md` rule, `z-20` under the bar's `z-30`; (b) import `useTabBarVisible` from `widgets/tab-bar`; (c) a `sticky` bar inside the content flow, relying on `<main>`'s padding to constrain it | **(a)** — (b) violates `import/no-restricted-paths` (`apps/web/.eslintrc.cjs:69-74`, features → widgets) and would need an `eslint-disable` for a layout constant; (c) depends on a subtle sticky-containing-block interaction with `<main>`'s padding that no test can state plainly. (a) is one class string, asserted directly, and cannot drift because it uses the same breakpoint constant | Proposed |
| D-F6 | Who owns the disclosure primitive: (a) **EP17F creates `shared/ui/Disclosure.tsx`** and uses one instance; EP17E's per-session expansion uses a plain button + panel on the card itself; (b) EP17E creates it and EP17F reuses it; (c) two local implementations | **(a)** — a session card's own header *is* its toggle, so wrapping each card in a labelled section primitive would add a redundant control per session in a seven-day grid; the page-level "What else changed" section is the genuine `Disclosure`. (b) would make EP17E ship a shared primitive it does not use | Proposed |
| D-F7 | The one cost of ▲ D-F2 (a), recorded not reversed: `CalibrationNote` explains adjusted estimates *before* they are read (EP13L D-L4), and below `md` it now starts collapsed. Options: (a) **accept** — the note renders `null` for an uncalibrated student (EP13L-AC3), so most students see no change, and the disclosure's label plus one tap is a small cost next to the region count; (b) keep the calibration note always visible and demote only the two reassurance regions; (c) auto-expand the disclosure when a calibration annotation is present | **(a)** — (c) is a rule a student cannot predict, which is the failure mode this epic's ADHD standard rejects; (b) is a defensible second choice if you would rather never collapse an explanation. Flagged for the user rather than decided by the refiner, because it narrows a ratified ▲ row | Proposed |

## Definition of Done

DoD-1, DoD-5 (loading / empty / error preserved), DoD-6 (keyboard), DoD-7
(responsive), DoD-8 (component + axe tests). DoD-4 — the existing confirm
error copy (409 conflicts, `WINDOW_ROLLED_OVER`) is preserved verbatim.
DoD-2, DoD-3, DoD-9 N/A — no input surface, no new read or write, no API or
migration change. DoD-10/11 at the parent review.

## Sizing

- **Outcome:** a proposal a student can judge and confirm without hunting,
  on a laptop or a phone.
- **Actual at closeout:** tbd.
- **Files:** `apps/web/src/features/plan-proposal/ui/PlanProposal.tsx` and
  its test; **new** `features/plan-proposal/ui/ProposalActionBar.tsx` + test;
  **new** `apps/web/src/shared/ui/Disclosure.tsx` + test. Read-only
  references: `widgets/tab-bar/ui/TabBar.tsx`,
  `widgets/layout/ui/Layout.tsx`, `shared/lib/useMediaQuery.ts`.
  `WhatThisKeepsCard.tsx`, `MovedForwardList.tsx`, `WorkloadWarnings.tsx`
  and `CalibrationNote.tsx` change placement only, not source.
- **Start context:** this story,
  [contracts.md §5–§6](./contracts.md#5-the-pacing-block-in-the-proposal-payload-ep17d-owns-it),
  `PlanProposal.tsx`, EP17E's `EditableWeek`, `TabBar.tsx`, `Layout.tsx`,
  and [EP16K](../EP16/EP16K-phone-first-proposal.md) for the absorbed
  phone-first spec.
- **Verification:**
  `pnpm --filter @studypilot/web test -- plan-proposal shared/ui` green;
  axe clean at 1280 px and 360 px; V-17-5 observed at 360×640 with the
  mobile tab bar rendered.
- **Dependencies / exclusions:** needs EP17E. The preset controls it makes
  room for under the pacing sentence are EP17G; the Playwright journeys are
  EP17H.
