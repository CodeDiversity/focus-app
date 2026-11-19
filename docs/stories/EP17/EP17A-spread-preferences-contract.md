# EP17A — Spread preferences contract

**Story ID:** EP17A
**Epic:** [EP17](../../epics/EP17-adhd-friendly-pacing-and-plan-proposal.md)
**Milestone:** M10 (proposed, D17-1)
**Layer:** Backend (domain contract + API projection)
**Status:** Queued
**Dependencies:** none (first in the queue). ▲ D17-2 blocks the `weeklyGoalDays` half.

## Plan at a glance

- **What this changes:** the study-preferences contract gains the spread lever(s) — `spreadPercent` (new) and, under ▲ D17-2 option (a), the ruled meaning of the existing `weeklyGoalDays`. `STUDY_PREFERENCE_KEYS`, `STUDY_PREFERENCE_DEFAULTS`, `STUDY_PREFERENCE_BOUNDS`, `validateStudyPreferences`, `readStudyPreferences` (`apps/api/src/domain/study-planning/preferences.ts`) and `toStudyPreferencesResponse` (`study-plans.service.ts:194`) all learn the new key; `GET`/`PUT /study-preferences` carry it. No engine change yet, no migration.
- **Why it improves it:** nothing in the bag today expresses *pace* — every key is session shape or per-day volume (`preferences.ts:19-28`), which is the root cause of the front-loaded week. This story adds the vocabulary the rest of the epic speaks (product), and keeps the bag's additive-JSON discipline that EP13F and EP13K established, so no student's stored preferences break (code).
- **Decisions needing you:** ▲ D17-2 (what `weeklyGoalDays` means — epic register, still Proposed; it decides whether this story extends an existing key's meaning or adds a second one) and ▲ D17-5 (bag keys rather than columns). ▲ D-A1 below (the default value of `spreadPercent`).
- **How to change this plan:** edit a Ruling cell below; ask the planner for AC changes. AC text freezes when implementation starts; later asks become a follow-up story.

## Summary

Add the spread lever to the one module that defines the study-preferences
shape, and carry it through the validator, the defensive reader, the response
projection and the merge endpoint. The bag stays additive JSON inside
`User.preferences.studyDefaults`, so a bag written before EP17 reads back with
every existing key unchanged and the new key at its default. This story ships
no behaviour change for any student — it is the contract the engine stories
consume.

## Scope

**In:** `preferences.ts` (keys, defaults, bounds, validator, reader),
`update-study-preferences.dto.ts`, `toStudyPreferencesResponse`, the
`GET`/`PUT /study-preferences` handlers, the web type mirror for the
preferences payload, and the tests for all of it.

**Out:** reading the lever in the engine (EP17B/EP17C); feeding it to
`schedule` (EP17D); any UI (EP17G); any Prisma migration (▲ D17-5 (a)).

## Source requirement references

AC-E17-06, AC-E17-07; TR-E17-03; DoD-2, DoD-8, DoD-9.

## Acceptance criteria

1. `spreadPercent` exists in `STUDY_PREFERENCE_KEYS`,
   `STUDY_PREFERENCE_DEFAULTS` and `STUDY_PREFERENCE_BOUNDS` with the values
   of [contracts §2](./contracts.md#2-the-spread-preference-levers-ep17a-owns-the-definition);
   `validateStudyPreferences` rejects a non-integer and an out-of-range value
   with a field-level message naming the field and the rule, and takes part
   in no cross-field rule.
2. `readStudyPreferences` returns `spreadPercent` from a stored value inside
   its bounds and its default otherwise; a bag written before EP17 (the eight
   pre-EP17 keys, or no `studyDefaults` at all, or `null`) returns every
   pre-EP17 key byte-identically to the pre-EP17 reader, plus the new key at
   its default. The reader still never throws.
3. `GET /study-preferences` returns exactly the contract key set in the
   contract's order, scoped to `@CurrentUser()`; `PUT /study-preferences`
   still merges any subset — a body containing only `spreadPercent` leaves
   every other key untouched, and a body with no `spreadPercent` leaves a
   stored one untouched. The serialized bag stays under
   `PREFERENCES_BAG_MAX_BYTES`.
4. Under ▲ D17-2 option (a): `weeklyGoalDays`'s documentation in
   `preferences.ts` and in the response contract states that it is a planning
   instruction as well as the momentum yardstick, and the momentum read's
   existing use of the key is confirmed unchanged by a test. Under option (b)
   this AC instead adds `studyDaysPerWeek` with the same contract treatment
   as AC-1 and leaves `weeklyGoalDays`'s docs alone.

## Tests

- `preferences.spec.ts`: new key in bounds / out of bounds / float / string /
  boolean / missing (each falls back); the two cross-field rules still fire
  and still ignore the new key; validator returns `null` for a valid partial.
- **Legacy-bag test (TR-E17-03):** a frozen fixture of a pre-EP17 bag is read
  and compared field by field against the recorded pre-EP17 expectation; the
  new key equals its default. Negative: a bag whose `studyDefaults` is an
  array, a string and `null`.
- `study-plans.controller` / service tests: `GET` key set and order; `PUT`
  with only the new key; `PUT` with an invalid new key returns the field-level
  422/400 shape the existing endpoint uses; another student's bag is never
  read or written (ownership).
- Bag-size test: a maximal bag stays under the 4096-byte cap.

## Technical notes

- Inspected: `preferences.ts` — `STUDY_PREFERENCE_KEYS` `:19`,
  `STUDY_PREFERENCE_DEFAULTS` `:51` (the EP13F/EP13K comments `:50-62`
  document the additive precedent to follow), `STUDY_PREFERENCE_BOUNDS` `:70`,
  `CROSS_FIELD_KEYS` `:39` (the new key joins **none** of the cross-field
  rules, exactly like `breakMinutes`/`densityPercent`), `isValueInBounds`
  `:95`, `readStudyPreferences` `:196` (the four-step algorithm `:169-195` is
  contract; the new key is a step-1-only key, like `densityPercent`).
- Inspected: `toStudyPreferencesResponse` (`study-plans.service.ts:194-207`)
  — a literal projection; add one line in contract order.
- Inspected: `study-plans.controller.ts:27-44` — `GET`/`PUT
  /study-preferences`, PUT documented as a merge.
- **Proposed:** the default `70` (▲ D-A1). Rationale: `100` would be a
  behaviour change for every existing student on the first replan with no
  ruling of their own; `70` noticeably smooths a week while leaving the
  engine room to respect gaps, and the preset UI (EP17G) can offer the full
  range.
- Unverified: the exact DTO/validator decorators in
  `update-study-preferences.dto.ts` (file not read).

### Decisions

| ID | Options considered | Recommended | Ruling |
|---|---|---|---|
| ▲ D-A1 | Default `spreadPercent`: (a) `70` — spread by default, visibly different from today; (b) `0` — opt-in, nothing changes until a student chooses; (c) `100` | **(a)** — the epic exists because the default plan front-loads; shipping it off by default would leave the defect in place for every student who never opens Profile. (b) is the choice if you want zero change for existing students until they ask | Proposed |
| D-A2 | Where the key is validated: (a) in `preferences.ts` only, with the DTO re-checking as defense in depth (the existing `dtoErrors` precedent); (b) DTO only | **(a)** — `preferences.ts` is documented as the single definition of the shape (`:3-11`) and non-HTTP callers must be covered | Proposed |
| D-A3 | Web type mirror: (a) extend the existing shared preferences type so the compiler flags every unhandled site; (b) keep the web type at the pre-EP17 shape until EP17G | **(a)** — an additive optional-safe field costs nothing and surfaces the EP17G work | Proposed |

## Definition of Done

DoD-1 (ACs), DoD-2 (invalid input: bounds + type + cross-field), DoD-3
(ownership on both routes), DoD-4 (field-level error messages), DoD-8
(automated tests), DoD-9 (the contract change documented in
[contracts.md §2](./contracts.md#2-the-spread-preference-levers-ep17a-owns-the-definition)).
DoD-5/6/7 N/A — no UI. DoD-10/11 at the EP17 parent review.

## Sizing

- **Outcome:** the spread lever exists end to end in the preferences
  contract, backward-compatible with every stored bag.
- **Actual at closeout:** tbd.
- **Files:** `apps/api/src/domain/study-planning/preferences.ts`,
  `preferences.spec.ts`, `apps/api/src/domain/study-planning/types.ts`,
  `apps/api/src/modules/study-plans/dto/update-study-preferences.dto.ts`,
  `apps/api/src/modules/study-plans/study-plans.service.ts` (projection),
  its spec, the web preferences type mirror, and a **new** frozen pre-EP17
  bag fixture.
- **Start context:** this story, [contracts.md §1–§2](./contracts.md),
  `preferences.ts`, `preferences.spec.ts`,
  `study-plans.service.ts:180-210`.
- **Verification:** `pnpm --filter @studypilot/api test -- preferences` and
  the study-plans service/controller specs green; the legacy-bag test passes.
- **Dependencies / exclusions:** ▲ D17-2 decides AC-4's shape. Engine
  consumption is EP17B/EP17C; wiring is EP17D; UI is EP17G.
