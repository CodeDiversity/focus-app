# EP17F — Proposal composition and decision affordances

**Story ID:** EP17F
**Epic:** [EP17](../../epics/EP17-adhd-friendly-pacing-and-plan-proposal.md)
**Milestone:** M10 (proposed, D17-1)
**Layer:** Frontend
**Status:** **Needs refinement** (D17-11) — the region hierarchy and the phone layout are UI/UX decisions the refiner grounds.
**Dependencies:** EP17E.

## Plan at a glance

- **What this changes:** the proposal page stops being a stack of seven equal regions. It becomes: a short summary of what the planner did (including how the week was spread), the editable week, and the decision — with **Use this plan** / **Not now** reachable from the editing area instead of only from the page header. The context regions (what this plan keeps, what moved forward, workload warnings, calibration note) are still there, in a secondary position that does not stand between the student and the decision. Absorbs BL-16-09 (phone-first proposal).
- **Why it improves it:** today the confirm sits at the very top (`PlanProposal.tsx:110-128`) and six regions sit between a student's eyes and it. A student with ADHD who has just finished nudging a session on Thursday has to scroll back to the top to say yes — a trivial-sounding cost that is exactly where confirmation gets abandoned (product). In code, one page that composes three regions is far easier to keep honest than seven sibling blocks with implicit priority (code).
- **Decisions needing you:** none — ▲ D-F1 (where the decision controls live) and ▲ D-F2 (what is demoted behind a disclosure) are both ratified (user, 2026-11-19).
- **How to change this plan:** edit a Ruling cell below; ask the planner for AC changes. AC text freezes when implementation starts; later asks become a follow-up story.

## Summary

Recompose `/plan/proposal` around the decision. Keep every piece of
information EP16C put there; change its rank. Add one sentence describing the
pacing (`pacing` from EP17D) so the student can judge the week before reading
the grid. Make the confirm and decline reachable without a trip to the page
header, on desktop and on a 360×640 phone, and fold the secondary context
behind a disclosure on narrow viewports (BL-16-09's phone-first idea, spec in
[EP16K](../EP16/EP16K-phone-first-proposal.md)).

## Scope

**In:** `PlanProposal.tsx` composition, the pacing summary line, the decision
control placement, the narrow-viewport layout, the disclosure(s), and their
tests.

**Out:** the editable week itself (EP17E); the spread preset controls
(EP17G); any change to what the payload contains (EP17D); rendering on the
EP15 calendar grid (BL-16-02's deferred half).

## Source requirement references

AC-E17-11, AC-E17-12, AC-E17-13; TR-E17-05, TR-E17-06 (the surface half);
DoD-1, DoD-5, DoD-6, DoD-7, DoD-8.

## Acceptance criteria

1. Exactly one confirm (**Use this plan**) and one decline (**Not now**)
   exist on the surface, and both are reachable from the editing area without
   scrolling back to the page header — on a desktop viewport and on 360×640
   (V-17-5). If the control is duplicated for reach, only one is exposed to
   assistive technology as an actionable control, so a screen-reader user is
   never offered two identical confirms.
2. One sentence under the heading states what the planner did, built from the
   `pacing` block: how many sessions, about how much time, and across which
   days the work was spread. It is a paragraph, never a heading, and it uses
   no forbidden word (D13-9, EP16 copy rules).
3. Every EP16C region is still present and reachable: calibration note,
   conflict summary, "what this plan keeps" (with its lock toggle), "moved
   forward", workload warnings, the rolled-over banner. Anything demoted
   behind a disclosure is announced by a labelled control that states what it
   contains, and is expanded by default on wide viewports.
4. The page's existing behaviours survive: focus lands on the `h1` on entry
   and after a reload settles; confirming resets the Today/calendar/recovery
   caches and lands on `/today`; **Not now** returns to `/plan` with no
   request; the loading skeleton and the error card are unchanged in
   behaviour.
5. Keyboard operability, visible focus order that matches the visual order,
   reduced-motion compliance and WCAG 2.2 AA hold on the recomposed surface;
   44 px targets on narrow viewports.

## Tests

- the confirm is reachable from the editing area at 360×640 — asserted in the
  component test by structure and in Playwright by position (EP17F-AC1,
  V-17-5).
- only one actionable confirm is exposed to assistive technology
  (EP17F-AC1, negative — `getAllByRole('button', { name: /use this plan/i })`
  returns one).
- the pacing sentence renders from a `pacing` fixture; a light week with one
  study day reads correctly; an empty proposal does not render it
  (EP17F-AC2, boundary).
- each demoted region is reachable by its disclosure control and expanded by
  default above the breakpoint (EP17F-AC3).
- heading focus on entry and after **Try again** (EP17F-AC4).
- confirm → the three caches are reset and navigation goes to `/today`;
  **Not now** issues no request (EP17F-AC4).
- the copy-audit helper over every string the surface renders (EP17F-AC2,
  TR-E17-05).
- axe has no violations on the recomposed surface at wide and narrow
  viewports (EP17F-AC5).

## Technical notes

- Inspected: `PlanProposal.tsx` — header + actions `:89-129`, rolled-over
  banner `:131-140`, loading skeleton `:142-157`, error card `:159-168`,
  `CalibrationNote` `:173`, empty state `:175-179`, the week `:182-202`,
  conflict summary `:203-221`, `WhatThisKeepsCard` `:225-231`,
  `MovedForwardList` `:233-235`, `WorkloadWarnings` `:237-241`. The existing
  `proposalSummary` helper (`:40-47`, EP16C D-C12) already produces "5
  sessions · about 4 h this week" — EP17F-AC2's sentence extends it with the
  spread, rather than adding a second summary.
- Inspected: `useProposal`'s `onConfirmed` resets `todayPlanApi`,
  `calendarApi` and `recoverySummaryApi` before navigating (`:65-74`,
  F-EP16F-02) — behaviour to preserve exactly.
- Inspected: the EP16K spec ([EP16K](../EP16/EP16K-phone-first-proposal.md),
  BL-16-09) already describes the phone-first disclosure in detail; EP17F
  absorbs it and the refiner reconciles it with the editable grid, which did
  not exist when EP16K was written.
- Unverified: the EP10 design-system primitives available for a sticky action
  bar and for a disclosure; whether a sticky bar collides with EP16E's mobile
  bottom tab bar (`widgets/tab-bar/`) and its `env(safe-area-inset-bottom)`
  padding — **the refiner must check this**, it is the most likely visual
  defect of ▲ D-F1 (a).

### Decisions

| ID | Options considered | Recommended | Ruling |
|---|---|---|---|
| ▲ D-F1 | Where the decision controls live: (a) a **sticky action bar** at the bottom of the viewport carrying the single confirm and decline, with the header's copies removed; (b) keep them in the header and repeat them at the end of the page; (c) header only, as today | **(a)** — it is the only option that is correct at every scroll position and on a phone, and it removes rather than duplicates a control. Must be reconciled with EP16E's bottom tab bar (see Technical notes) and must not cover the last row of the week. (b) is the safe fallback if the tab-bar collision cannot be solved cleanly. ▲ — user-visible workflow | Ratified (user, 2026-11-19) |
| ▲ D-F2 | What is demoted: (a) **"what this plan keeps", "moved forward" and the calibration note** go behind one labelled disclosure ("What else changed"), expanded by default above `md`; **workload warnings and the conflict summary stay always visible** because they describe work that will not happen; (b) demote nothing, only reorder; (c) demote the warnings too | **(a)** — a warning a student does not see is a promise the plan quietly breaks, so warnings never hide; reassurance and context are exactly what a disclosure is for. (c) is rejected on those grounds. ▲ — user-visible workflow | Ratified (user, 2026-11-19) |
| D-F3 | The pacing sentence: (a) extend the existing `proposalSummary` helper so there is one sentence; (b) a second line below it | **(a)** — one sentence is the point; two summaries is the defect this epic removes in miniature | Ratified (user, 2026-11-19) |
| D-F4 | Narrow-viewport week: (a) the week scrolls vertically as day sections below `md` (the EP16K direction) rather than as seven columns; (b) horizontal column scroll | **(a)** — seven columns on a 360 px screen is the current `PlanWeek` behaviour's weakest point and horizontal scrolling hides days. Refiner confirms against the editable grid of EP17E | Ratified (user, 2026-11-19) |

## Definition of Done

DoD-1, DoD-5, DoD-6, DoD-7, DoD-8. DoD-2/3/9 N/A. DoD-4 — the existing
confirm error copy (409 / rolled-over) is preserved. DoD-10/11 at the parent
review.

## Sizing

- **Outcome:** a proposal a student can judge and confirm without hunting,
  on a laptop or a phone.
- **Actual at closeout:** tbd.
- **Files:** `apps/web/src/features/plan-proposal/ui/PlanProposal.tsx` and
  its test; possibly **new** small components for the action bar and the
  disclosure in the same folder; `WhatThisKeepsCard.tsx`,
  `MovedForwardList.tsx` (placement only).
- **Start context:** this story,
  [contracts.md §5–§6](./contracts.md#5-the-pacing-block-in-the-proposal-payload-ep17d-owns-it),
  `PlanProposal.tsx`, EP17E's component, and
  [EP16K](../EP16/EP16K-phone-first-proposal.md) for the absorbed
  phone-first spec.
- **Verification:** `pnpm --filter @studypilot/web test -- plan-proposal`
  green; axe clean at both viewports; V-17-5 observed.
- **Dependencies / exclusions:** needs EP17E. The preset controls it makes
  room for are EP17G.
