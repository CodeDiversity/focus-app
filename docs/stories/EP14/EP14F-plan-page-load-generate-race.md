# EP14F — Plan Page: a Late Saved-Plan Read Never Overrides a Newer Action

**Story ID:** EP14F
**Parent epic:** [EP14: Adaptive Scheduling Follow-ups](../../epics/EP14-adaptive-scheduling-follow-ups.md)
**Milestone:** proposed M7 (D14-2)
**Layer:** Frontend (one page, one test file)
**Status:** Ready — promoted from BL-14-08 (planner, 2026-11-16); no UI decisions (behaviour fix, no visual change)
**Dependencies:** none. Source: F-EP14C-03 (EP14C record), BL-14-08 ("before EP14D"). Unblocks EP14D-AC4.

## Plan at a glance

- **What this changes:** on `/plan`, the mount-time saved-plan read may no longer flip the page back to "No plan yet." after the student has already clicked "Generate plan"; a read that resolves after the student acted updates the saved plan data but never the page mode.
- **Why it improves it:** a student who acts quickly sees their preview vanish (product — reproduced 5/24 under load, F-EP14C-03); EP14D-AC4 needs all seven journeys reliably green, and this race is the last non-EP14D failure in the suite (code).
- **Decisions needing you:** none ▲; D-F1 ratifies by default (D15-17-style blanket ruling, user 2026-11-16 "ratify all decisions for the stories").
- **How to change this plan:** edit a Ruling cell below, or ask the planner for AC changes. AC text freezes when implementation starts; later asks become a follow-up story.

## Summary

`PlanPage.loadSaved` ends with `setMode(hasSessions(plan) ? 'saved' : 'initial')`
unconditionally. If "Generate plan" was clicked while that read was in
flight, the preview renders and is then overwritten by the late `'initial'`.
Fix the ordering, do not block the student.

## Scope

**In:** `apps/web/src/pages/plan/ui/PlanPage.tsx` (`loadSaved`, `handleGenerate`, the retry path), `PlanPage.test.tsx`; three full parallel E2E runs as evidence.
**Out:** any visual change, disabling "Generate plan" while loading (rejected, D-F1), the account-menu race (BL-14-07).

## Source requirement references

AC-E14-04 (E2E deterministic — product half of F-EP14C-03); TR-E14-07; DoD-1, DoD-5, DoD-8.

## Acceptance criteria

1. When the mount-time saved-plan read resolves **after** the student has started generating (or after a preview is showing), it stores the saved plan but does not change `mode`; the preview stays on screen. When it resolves **before** any action, behaviour is unchanged (`saved` when the plan has sessions, else `initial`).
2. The explicit retry after a failed saved-plan read ("Try again") still sets the mode from its result — a student-initiated read is not a late read.
3. `apps/web/e2e/adaptive-scheduling.spec.ts` journey 1 and `apps/web/e2e/study-plan.spec.ts` pass three consecutive full parallel runs with zero failures attributable to this race (EP14C's evidence standard); no journey is tuned to hide it.

## Tests (TR-E14-07)

- `PlanPage.test.tsx`: "a saved-plan read that resolves after Generate leaves the preview on screen" (deferred mock resolves after the preview renders → preview still present, no "No plan yet."); "a saved-plan read that resolves before any action sets saved/initial" (both branches); "Try again after a failed read sets the mode from the retry result".
- E2E: the three-run evidence in EP14F-AC3, recorded in `implementation.md` with per-run pass/fail counts.

## Technical notes

- **Inspected (2026-11-16):** `PlanPage.tsx:63` (`mode` state), `:91–103` (`loadSaved` — unconditional `setMode`), `:105–107` (mount effect), `:109–123` (`handleGenerate` sets `'preview'` on success), `:237` (retry button calls `loadSaved`); `PlanPage.test.tsx` has 15 cases incl. "reads the saved plan on mount" and "renders today's plan while the saved-plan read is still loading".
- **Proposed:** an `actedRef` (`useRef(false)`) set to `true` at the start of `handleGenerate`; `loadSaved` takes `{ commitMode }` — the mount call commits the mode only if `!actedRef.current` at resolution; the retry button passes `commitMode: true`. The in-flight guard pattern (`requestSeq`) already used by `CalendarPage`/`AvailabilityPage` is the precedent.

### Decisions

| ID | Options considered | Recommended | Ruling |
|---|---|---|---|
| D-F1 | (a) the late read commits data but not mode once the student has acted (ref guard); (b) disable "Generate plan" until the saved read settles; (c) cancel the read on Generate | **(a)** — never block the one next action (EP13E D-E10 spirit); (b) adds a dead button for ADHD users; (c) throws away a useful read | Proposed |

## Definition of Done

1, 5 (states unchanged, verified by the existing tests), 8 (TR-E14-07). 2/3/4/6/7/9 N/A. 10–11 via the EP14 parent review.

## Sizing

- **Outcome:** a fast "Generate plan" click is never undone by the page's own loading.
- **Actual at closeout:** tbd.
- **Files:** `apps/web/src/pages/plan/ui/PlanPage.tsx`, `apps/web/src/pages/plan/ui/PlanPage.test.tsx`.
- **Start context:** this story; F-EP14C-03 in `docs/stories/EP14/artifacts/EP14C/implementation.md`; `PlanPage.tsx:91–123`.
- **Verification:** `pnpm --filter @studypilot/web test -- PlanPage` green; `pnpm test:e2e` ×3 with the counts recorded.
- **Dependencies / exclusions:** none; BL-14-07 stays in the backlog.
