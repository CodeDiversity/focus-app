# EP17D — Service wiring and the pacing block in the proposal payload

**Story ID:** EP17D
**Epic:** [EP17](../../epics/EP17-adhd-friendly-pacing-and-plan-proposal.md)
**Milestone:** M10 (proposed, D17-1)
**Layer:** Backend (module + API contract)
**Status:** Queued
**Dependencies:** EP17A, EP17B, EP17C.

## Plan at a glance

- **What this changes:** `gatherPlanData` passes the spread levers into the engine, so a real student's "Plan my week" finally paces; and both proposal payloads (`PlanPreview` and `CatchUpPreview`) gain one additive `pacing` object — the effective spread value, the selected study days (placed-on or not) and the minutes per day — so the proposal surface can state what it did and the preset controls can show what is in effect.
- **Why it improves it:** without this story the engine work is dead code behind a service that still hands it the old input. With it, the plan a student sees is the paced plan, and the UI can say "spread across Mon, Wed, Fri" instead of leaving the student to count (product). One payload addition serves both EP17F's summary and EP17G's controls, so neither has to recompute the engine's decision client-side (code).
- **Decisions needing you:** none — ▲ D-D1 ratified (user, 2026-11-19); D-D2/D-D3 below are non-material and also ratified.
- **How to change this plan:** edit a Ruling cell below; ask the planner for AC changes. AC text freezes when implementation starts; later asks become a follow-up story.

## Summary

Three small, cross-cutting changes in the study-plans module: read the new
levers in `gatherPlanData`, include them in the `schedule({…})` input built by
`preview` and `catchUpPreview`, and project a `pacing` block onto both
responses. No route is added, removed or renamed; every field that exists
today keeps its name, type and position.

## Scope

**In:** `gatherPlanData`, `preview`, `catchUpPreview`, the `PlanPreview` /
`CatchUpPreview` response types on both sides of the wire, and their tests.

**Out:** the engine itself (EP17A–EP17C); writing preferences from the
proposal (EP17G uses the existing `PUT /study-preferences`); any UI.

## Source requirement references

AC-E17-08 (the API half), AC-E17-14 (no route added or removed); TR-E17-04;
DoD-1, DoD-3, DoD-8, DoD-9.

## Acceptance criteria

1. `gatherPlanData` returns the spread levers alongside the existing
   preferences, and both `preview` and `catchUpPreview` pass them into
   `schedule({…})`, so a student's saved spread preference changes the week
   they are proposed. A student who has never touched the preference gets the
   default from `readStudyPreferences`.
2. Both proposal payloads carry the additive `pacing` block of
   [contracts §5](./contracts.md#5-the-pacing-block-in-the-proposal-payload-ep17d-owns-it)
   — `spreadPercent`, `studyDays` (the §4 **selected** day set in date order,
   including selected days on which nothing was placed — R-EP17-05) and
   `perDayMinutes`. Every pre-EP17 field keeps its name, type and order;
   no field is removed; no route changes.
3. Both reads stay scoped to the authenticated student: `pacing` is derived
   only from that student's own preferences and that student's own run, and
   no other student's data can reach it (the existing `userId`-scoped
   `gatherPlanData` path is unchanged).
4. `pacing.perDayMinutes` agrees with the sessions in the same payload — for
   every date, the sum of that day's session durations equals the recorded
   value. A disagreement is a bug, not a rounding allowance.

## Tests

- Service test: a student with a non-default spread preference gets a
  different week than the same fixture at the default (EP17D-AC1).
- Service test: a student with no stored preference gets the default lever
  (EP17D-AC1, fallback).
- Contract test: the `preview` and `catch-up/preview` response shapes contain
  every pre-EP17 key unchanged plus `pacing`; a snapshot of the pre-EP17 key
  set is asserted so a later refactor cannot silently drop one (EP17D-AC2).
- Consistency test: `perDayMinutes` recomputed from `days[].sessions` equals
  the payload's block, on a fixture with an empty day and a multi-session day
  (EP17D-AC4).
- Ownership test: the endpoints are reached as student B while student A has
  a plan; B never sees A's `pacing` or sessions, and a missing/not-owned
  resource returns the uniform 404 (EP17D-AC3, DoD-3).
- Error path: an engine run that places nothing still returns a well-formed
  `pacing` block (empty `studyDays`, zeroed `perDayMinutes`), not `null`.

## Technical notes

- Inspected: `gatherPlanData` (`study-plans.service.ts:990`) already reads
  `readStudyPreferences(user.preferences)` and returns `preferences` in its
  result object (`:1104-1121`); `preview` (`:1123`) and `catchUpPreview`
  (`:1185`) both build the same `schedule({ days, assignments, dayBounds,
  blocked, classes, busy, preferred, preferences })` input
  (`:1125-1134`). If EP17B/EP17C read the levers off the existing
  `preferences` object, this story's engine-input change is **zero lines** —
  which is the recommendation (D-D3).
- Inspected: `preview` already builds `days: PlanPreviewDay[]` with a
  `targetMinutes` per day (`:1152-1157`) — `perDayMinutes` is the same number
  in a map, so EP17D-AC4 is cheap to satisfy and cheap to assert.
- Inspected: `toStudyPreferencesResponse` (`:194`) is the projection EP17A
  extended; `preview` already returns `preferences:
  toStudyPreferencesResponse(data.preferences)` (`:1178`), so the effective
  spread value is *already* on the wire after EP17A — `pacing.spreadPercent`
  is a convenience, and D-D2 asks whether it is worth duplicating.
- Unverified: `catchUpPreview`'s full return shape (read only to `:1200`);
  the implementer confirms the two payloads' shared projection before
  deciding where `pacing` is built.

### Decisions

| ID | Options considered | Recommended | Ruling |
|---|---|---|---|
| ▲ D-D1 | Add `pacing` to the proposal payloads: (a) yes — one additive object on both payloads; (b) no — let the client derive the day set and per-day minutes from `days[]` | **(a)** — the client cannot derive `studyDays` correctly: a selected day on which nothing was placed is indistinguishable from an unselected one, and EP17F's sentence ("spread across your 3 study days") would be wrong exactly when the week is light. ▲ because it changes a public contract, additively | Ratified (user, 2026-11-19) |
| D-D2 | `pacing.spreadPercent` duplicates `preferences.spreadPercent` already on the payload: (a) keep both — `pacing` is self-contained for the surface that renders it; (b) drop it and read `preferences` | **(a)** — one small duplication inside one response is cheaper than a UI that reads two unrelated fields to render one sentence; the consistency test pins them equal | Ratified (user, 2026-11-19) |
| D-D3 | How the engine gets the levers: (a) off the existing `preferences` object already in the engine input — no new input field; (b) a new top-level `pacing` input on `SchedulerInput` | **(a)** — the levers *are* study preferences, the bag is already passed whole, and (b) would add a second source of truth the pure module has to reconcile | Ratified (user, 2026-11-19) |

## Definition of Done

DoD-1 (ACs), DoD-3 (ownership on both reads), DoD-4 (existing error
behaviour unchanged), DoD-8 (automated tests), DoD-9 (the payload addition
documented in [contracts.md §5](./contracts.md#5-the-pacing-block-in-the-proposal-payload-ep17d-owns-it)).
DoD-2/5/6/7 N/A — no new input surface, no UI. DoD-10/11 at the parent
review.

## Sizing

- **Outcome:** the paced engine reaches real students, and the proposal
  payload says what the pacing did.
- **Actual at closeout:** tbd.
- **Files:** `apps/api/src/modules/study-plans/study-plans.service.ts`, its
  spec, the study-plans controller spec, the shared response types, and the
  web `entities/study-plan/model/types.ts` mirror.
- **Start context:** this story, [contracts.md §1 and §5](./contracts.md),
  `study-plans.service.ts:980-1200`, EP17B/EP17C implementation records.
- **Verification:** `pnpm --filter @studypilot/api test -- study-plans`
  green; the pre-EP17 key-set snapshot unchanged.
- **Dependencies / exclusions:** needs EP17A–EP17C. The UI consumes `pacing`
  in EP17F/EP17G.
