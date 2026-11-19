# F-EP17C-02 — resolution: an unset `weeklyGoalDays` means unconstrained

**Finding:** [`../EP17C/implementation.md`](../EP17C/implementation.md)
(F-EP17C-02), the `weeklyGoalDays` twin of F-EP17B-03.
**Ruling:** user, 2026-11-19. **Resolved by:** the implementer, 2026-11-19,
in the commit immediately preceding EP17D's implementation (a separate,
self-contained correction — not part of EP17D's ACs).

## The problem

`readStudyPreferences` defaults `weeklyGoalDays` to `3`, and since EP17C
(rule 9b) that number *constrains the planner*. A student who has never
chosen anything therefore had their week silently squeezed into three study
days, with no UI explaining it until EP17G ships.

## The ruling, and why it is not a default bump

A student who has **never chosen a number** must be planned across the
**whole week** — effectively `weeklyGoalDays: 7`, i.e. unconstrained.

`STUDY_PREFERENCE_DEFAULTS.weeklyGoalDays` was deliberately **left at 3**:
since ▲ D17-2's ruling (a) the key carries two meanings, and the same
constant is EP13K's momentum yardstick (`momentum.ts`, read via
`study-sessions.service.ts:695`). Bumping it to 7 would have turned every
student's motivational goal into "study 7 days a week" — the opposite of the
ADHD-friendly intent — and changed EP13K semantics.

## What was implemented

The two meanings are separated by **provenance** (explicitly stored vs.
defaulted), read once, in the pure domain module that owns the contract:

- `apps/api/src/domain/study-planning/preferences.ts`
  - `UNSET_PLANNING_WEEKLY_GOAL_DAYS = 7` — the planning value of an
    unchosen key.
  - `hasStoredWeeklyGoalDays(bag)` — pure provenance read, using exactly the
    defensive reader's step-1 acceptance test, so "stored" means "a value
    `readStudyPreferences` would keep". Absent, wrong-typed and
    out-of-bounds all count as *not chosen*.
  - `readPlanningStudyPreferences(bag)` — `readStudyPreferences` with
    `weeklyGoalDays` replaced by `7` when the key was not chosen. Every
    other key is identical. The module stays pure (no clock, no randomness,
    no Nest, no Prisma).
- `apps/api/src/modules/study-plans/study-plans.service.ts`
  - `gatherPlanData` now returns **both** `preferences` (the stored/defaulted
    read — the projection and every student-visible value) and
    `planningPreferences` (the planning read).
  - `preview` and `catchUpPreview` hand `planningPreferences` to the engine;
    `toStudyPreferencesResponse(data.preferences)` is unchanged, so the
    payload's `preferences.weeklyGoalDays` still shows the momentum value.

Every other reader — `GET`/`PUT /study-preferences`, the merge validation,
`momentum` — keeps `readStudyPreferences`. No stored bag changes, no
migration, no route change.

## Evidence

- `apps/api/src/domain/study-planning/preferences.spec.ts` — 6 new tests:
  key absent → `7`; every stored value 1…7 honoured (3 → 3); invalid /
  out-of-bounds (`0, 8, -1, 3.5, '3', true, false, null, {}, []`) → `7` while
  `readStudyPreferences` still returns `3`; only `weeklyGoalDays` differs
  from the momentum read; never throws; **the yardstick default is still 3**.
- `apps/api/src/modules/study-plans/study-plans-pacing.service.spec.ts`
  (new) — 5 tests at the service boundary: a never-chosen student's preview
  spans more than three dates; the payload still reports
  `preferences.weeklyGoalDays: 3`; an explicitly stored `3` constrains the
  plan to at most three dates; an out-of-bounds stored `0` is unconstrained;
  `catchUpPreview` reads the same planning value.
- `apps/api/src/modules/study-sessions/study-sessions-momentum.service.spec.ts`
  — 1 added test extending the EP17A-era goal read: `goalDays` is `3` for a
  `null` bag, `{}`, `{ studyDefaults: {} }` and a bag with only
  `dailyGoalMinutes` — the momentum read is provably unchanged.
- **Negative control:** reverting the two engine-input lines to
  `data.preferences` fails 3 of the 5 service tests (and passes the two that
  pin the unchanged projection / the explicitly-stored case), so the tests
  bite on exactly the behaviour the ruling changed.

## Verification

| Command | cwd | Result |
|---|---|---|
| `npx jest` | `apps/api` | **57 suites, 1350 passed, 533 skipped, 0 failed** (baseline 56 / 1338 / 533 / 0; +1 suite, +12 tests — all new) |
| `pnpm typecheck` | `apps/api` | clean |
| `pnpm lint` | `apps/api` | clean, `--max-warnings 0` |
| `pnpm format` | `apps/api` | "All matched files use Prettier code style!" |

The frozen `pacing-baseline.snapshot.json` (19/19 at `spreadPercent 0`) and
EP15C's `identity.snapshot.json` are part of that suite and pass unchanged —
no domain behaviour changed, only which read the service hands the engine.

## Contracts follow-up (doc change needed — NOT made here)

The implementer does not edit `contracts.md`. **Requested wording change**,
for the planner:

> **§2**, the `weeklyGoalDays` row — the `Default` cell should distinguish
> the two readers: momentum default `3`; **planning default when the key was
> never stored: `7` (unconstrained)**. A note that the planning read is
> `readPlanningStudyPreferences` and that an invalid stored value is treated
> as unchosen for planning (while the momentum read still repairs it to `3`).
>
> **§4** — `usableDays(window)` reads the **planning** value of
> `weeklyGoalDays`; a student who never chose one has the whole window
> usable.

Until that lands, this note is the contract of record for the behaviour.

## Disposition

**Closed** for the silent-narrowing half. The ▲ D17-2 proviso half —
visibly surfacing the study-days control with its instruction meaning —
remains **open and owned by EP17G**; a student who *has* explicitly chosen a
number still has it instructing the planner without UI copy saying so.
