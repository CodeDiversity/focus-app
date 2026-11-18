# EP16B — Today's Secondary Content

**Story ID:** EP16B
**Parent epic:** [EP16: Today-First Simplification](../../epics/EP16-today-first-simplification.md)
**Milestone:** M9 (D16-1)
**Layer:** Frontend
**Status:** Needs refinement — Coming up row layout, classes-line format, momentum-row layout and exact copy are the refiner's (D16-15). Implementation after EP16A.
**Dependencies:** EP16A implemented (`TodayPage` composition root, `features/today`). Epic decisions D16-3 (ratified), D16-8 (ratified, option c), D16-12, D16-18.

## Plan at a glance

- **What this changes:** Today gains, in this order under the hero: one plan-note sentence (only when work moved forward), one compact momentum row (seven day marks + one sentence + "See history"), **Coming up** (unfinished assignments, past-due first with a **Past due** text badge, five rows, "All assignments"), and a one-line **Classes today**; a shared forbidden-words test helper lands with it.
- **Why it improves it:** the three questions after "what now" — "am I keeping up", "what's coming", "where am I today" — each get exactly one quiet region, and an overdue list no longer leads the page (product, AC-E16-03/04/05); four section components and their empty-state copy are replaced by three regions that render nothing when empty (code).
- **Decisions needing you:** none ▲ — D-B1…D-B4 are refiner-level.
- **How to change this plan:** edit a Ruling cell below; ask the planner for AC changes. AC text freezes when implementation starts.

## Summary

Fill in Today's secondary regions per the contract table, moving the plan
note from `/plan` and the momentum sentences from the card into one row.
Nothing new is read: the assignments list, the calendar events, the momentum
summary and the recovery summary are the same four queries the dashboard
already made.

## Scope

**In:** `features/today/ui/{PlanNote,MomentumRow,ComingUp,ClassesToday}.tsx` (+ tests); `TodayPage` composition and live-region count sentence; `planHealthApi` moved to `features/today/api/` (the note is its only Today reader; EP16C deletes the plan-health view); `PlanPage.tsx:233-245` note removed; `apps/web/src/test/forbiddenWords.ts` helper (TR-E16-05); copy-audit test over Today in every state.
**Out:** the hero (EP16A); the `/plan` page beyond deleting the note (EP16C); `MomentumCard` itself stays for the Focus-page celebration only if still referenced there — otherwise deleted here (D-B4).

## Source requirement references

AC-E16-03, AC-E16-04, AC-E16-05 (primary); AC-E16-07 (note link); AC-E16-12. TR-E16-01, TR-E16-05, TR-E16-06. DoD-1, 5, 6, 7, 8.

## Acceptance criteria

1. **Plan note:** when `rolledForwardCount > 0` a single sentence — "Some earlier sessions moved into your current plan — today's list is up to date." — with the link **See your week** → `/plan` renders directly under the hero; otherwise nothing; no number appears; `PlanPage` no longer renders the note.
2. **Momentum row:** when `hasHistory`, one row: `MomentumWeekStrip compact` (decorative, with its sr-only sentence) beside `weeklyLine(momentum)` (and `runLine` when non-null) and the link **See history** → `/focus/history`; no progress bar, no daily sentence, no card chrome, no heading with a count; when `!hasHistory`, nothing renders (the hero is the call to action); loading and error states are one-line (error: "We couldn't load your momentum." + Try again).
3. **Coming up:** unfinished assignments ordered past-due first (due ascending), then due ascending, null due last; capped at five via `limitRows` with the footer link **All assignments** → `/assignments` (always shown when ≥ 1 row); past-due rows carry the text badge **Past due** (text, never colour alone); rows are `DashboardAssignmentRow` and open details through the page's shared owner (D05-17); the heading is "Coming up" with no count; nothing renders when there are no unfinished assignments.
4. **Classes today:** one line "Classes today · 10:00 BIO 101 · 14:00 MATH 201" from `selectTodayClasses`, each class a link to its course (`event.link`); nothing renders when none. The live region's count sentence covers the plan's sessions, classes and coming-up rows (uncapped totals).
5. **Copy audit:** `expectNoForbiddenWords(container)` passes for Today in every combination of states the tests render (loading, empty, error, full); the helper's list is contracts.md § Copy rules; the **Past due** badge is allowed.

## Tests (TR-E16-01, TR-E16-05, TR-E16-06)

- `PlanNote.test.tsx`: renders with `rolledForwardCount: 2` (no "2" in text); absent with 0; link target.
- `MomentumRow.test.tsx`: parity — the sentence equals `weeklyLine(fixture)` (+ `runLine`); strip present and `aria-hidden`; no `%`; absent when `!hasHistory`; error → Try again refetches.
- `ComingUp.test.tsx`: order (past-due first), cap 5 + footer, badge text on past-due rows only, details callback, absent when empty, loading skeleton, error + retry.
- `ClassesToday.test.tsx`: format, links, absent when none.
- `TodayPage.test.tsx`: region order in the DOM; live-region sentence; copy audit across states; `PlanPage.test.tsx` loses the note assertions.
- `dashboardSelectors.test.ts` (now under `features/today`): a `selectComingUp(rows, now)` composite if introduced (D-B2), covering the null-due ordering.

## Technical notes

- **Inspected:** `TodayPlanCard.tsx` (badge "N min studied today" — stays the single place today's minutes show), `MomentumCard.tsx` (`MomentumBody` two-column layout to drop), `MomentumWeekStrip.tsx` (`compact` prop, sr-only `studiedOnSentence`), `momentumCopy.ts` (`dailyLine`, `weeklyLine`, `runLine`), `dashboardSelectors.ts` (`selectOverdueAssignments`, `selectUpcomingAssignments`, `limitRows`), `DashboardAssignmentRow.tsx`, `PlanPage.tsx:233-245`, `planHealthApi.ts` (shared RTK cache with the old view, `keepUnusedDataFor: 60`).
- **Proposed:** `selectComingUp(rows, now)` = `[...overdue, ...upcoming]` with the stated ordering, as a pure selector beside the two it composes; the badge uses `Badge variant="neutral"` with text — the refiner may pick another variant but never colour-only.
- **Copy:** the plan-note sentence is EP13E's verbatim (D-E11); the momentum sentences are EP13K's verbatim (D-K10 — the daily sentence is simply not rendered here).

### Decisions

| ID | Options considered | Recommended | Ruling |
|---|---|---|---|
| D-B1 | Plan-note link target: (a) `/plan` ("See your week"); (b) `/plan/proposal` directly | **(a)** — D16-18; an informational sentence must not launch a proposal | Ratified (user, 2026-11-17 — "ratify all") |
| D-B2 | Coming up ordering helper: (a) a new pure `selectComingUp` composing the two existing selectors; (b) inline in the component | **(a)** — testable without DOM; EP05A precedent | Ratified (user, 2026-11-17 — "ratify all") |
| D-B3 | Coming up loading/error: (a) one skeleton of three rows and one error line with Try again, the EP05B section pattern; (b) share the hero's states | **(a)** — the assignments query is independent of the plan query | Ratified (user, 2026-11-17 — "ratify all") |
| D-B4 | `MomentumCard`: (a) delete if the Focus-page celebration does not import it (it imports `momentumCopy`, not the card — verify); (b) keep unused | **(a)** — no dead components | Ratified (user, 2026-11-17 — "ratify all") |

## Definition of Done

1, 5, 6, 7, 8 (TR-E16-01/05/06). 2, 3, 4, 9 N/A. 10–11 via the EP16 combined review.

## Sizing

- **Outcome:** Today answers "am I keeping up / what's coming / what's on today" in three quiet regions that vanish when there is nothing to say.
- **Actual at closeout:** tbd.
- **Files:** `apps/web/src/features/today/ui/PlanNote.tsx`, `MomentumRow.tsx`, `ComingUp.tsx`, `ClassesToday.tsx` (new, + tests), `apps/web/src/features/today/model/dashboardSelectors.ts` (+ test, `selectComingUp`), `apps/web/src/features/today/api/planHealthApi.ts` (moved), `apps/web/src/pages/today/ui/TodayPage.tsx` (+ test), `apps/web/src/pages/plan/ui/PlanPage.tsx` (+ test, note removed), `apps/web/src/test/forbiddenWords.ts` (new), `apps/web/src/app/store/store.ts` (import path), possibly deletion of `features/momentum/ui/MomentumCard.tsx` (+ test).
- **Start context:** this story; contracts.md § Today region contract (rows 2–5), § Copy rules; `MomentumCard.tsx`, `dashboardSelectors.ts`, `PlanPage.tsx:233-245`.
- **Verification:** web typecheck/lint/test green; manual: a student with past-due and upcoming work sees one list with Past due rows first; a student with no history sees no momentum row.
- **Dependencies / exclusions:** EP16A. `/plan` rebuild → EP16C.
