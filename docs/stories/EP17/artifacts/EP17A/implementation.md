# EP17A — Spread preferences contract — implementation record

**Implementer:** implementer session, 2026-11-19. **Branch:**
`hfi/9ae11317-13de-4365-8abb-4bf7e0e3c7f3/elm` (worktree), base `e2d9c3a`.

## Completed behavior

`spreadPercent` (▲ D-A1: default `70`, bounds `0…100`, integer, no
cross-field rule) now exists end to end in the study-preferences contract:
`STUDY_PREFERENCE_KEYS` / `STUDY_PREFERENCE_DEFAULTS` /
`STUDY_PREFERENCE_BOUNDS`, `validateStudyPreferences`,
`readStudyPreferences` (a step-1-only key, the `densityPercent` pattern),
the `StudyPreferences` domain type, `UpdateStudyPreferencesDto`,
`toStudyPreferencesResponse`, and (via the key-driven merge) both
`GET`/`PUT /study-preferences` routes. The web type mirror gains an
optional-safe `spreadPercent?: number` (D-A3 (a)). Per ▲ D17-2's ruling (a),
`weeklyGoalDays`'s documentation in `preferences.ts`, `types.ts`, the DTO
and the response projection now states it is a planning instruction as well
as the momentum yardstick; the momentum read is unchanged. No engine change,
no migration (▲ D17-5 (a)), no behaviour change for any student. R-EP17-06's
stale "four keys" comments (controller `:33-48`, projection `:190-193`) are
rewritten to describe the full contract key set.

## AC-by-AC outcome

- **EP17A-AC1 — met.** Key/default/bounds per contracts §2
  (`preferences.ts`); the validator rejects a non-integer
  (`spreadPercent must be an integer`) and an out-of-range value
  (`spreadPercent must be between 0 and 100`), and joins no cross-field
  rule. Tests: `preferences.spec.ts` "the EP17A spread lever" block;
  service-spec 400 cases.
- **EP17A-AC2 — met.** Stored in-bounds value returned; anything else falls
  back to `70`. Frozen pre-EP17 bag fixture (eight pre-EP17 keys, all
  off-default) reads back field-by-field identical to the recorded pre-EP17
  expectation, plus `spreadPercent: 70`; no-`studyDefaults`, `null`, array
  and string bags return the defaults without throwing. Tests:
  `preferences.spec.ts` "the frozen pre-EP17 legacy bag (TR-E17-03)".
- **EP17A-AC3 — met.** `GET` returns exactly the nine contract keys in the
  contract's order (unsorted key-order assertion), scoped to the principal
  (`@CurrentUser()` → `getPreferences(user.id)`, uniform 404 preserved);
  `PUT` with only `spreadPercent` leaves every other key and the bag's other
  top-level keys untouched; `PUT` without it leaves a stored value
  untouched; the maximal bag serializes well under
  `PREFERENCES_BAG_MAX_BYTES` (4096). Tests: `study-plans.service.spec.ts`
  EP17A block; `preferences.spec.ts` maximal-bag test.
- **EP17A-AC4 — met.** ▲ D17-2 (a) documented on `weeklyGoalDays` in
  `preferences.ts` (defaults comment), `types.ts`, the DTO and the
  projection comment (the response contract). The momentum read's use is
  confirmed unchanged by a new test in `momentum.spec.ts`
  ("weeklyGoalDays stays the momentum yardstick unchanged (EP17A-AC4)").

## Changed paths

- `apps/api/src/domain/study-planning/preferences.ts` — key, default `70`,
  bounds `0…100`, reader step-1 entry, doc updates.
- `apps/api/src/domain/study-planning/types.ts` — `spreadPercent: number`;
  `weeklyGoalDays` D17-2 (a) doc.
- `apps/api/src/modules/study-plans/dto/update-study-preferences.dto.ts` —
  `spreadPercent` decorators (D-A2 (a): defense in depth; `preferences.ts`
  remains the single definition).
- `apps/api/src/modules/study-plans/study-plans.service.ts` — projection
  line in contract order; R-EP17-06 comment rewrites; "four-key" method-doc
  fixes.
- `apps/api/src/modules/study-plans/study-plans.controller.ts` — R-EP17-06
  endpoint-comment rewrites (`:33-48`).
- `apps/web/src/entities/study-preferences/model/types.ts` —
  `spreadPercent?: number` (D-A3 (a)) + D17-2 (a)/EP17A doc.
- Tests: `preferences.spec.ts` (EP17A block + frozen legacy-bag fixture +
  maximal-bag cap + updated defaults/bounds expectations),
  `momentum.spec.ts` (AC-4), `study-plans.service.spec.ts` (EP17A block +
  key list), `study-plans-data-scoping.spec.ts` (key list + defaults —
  integration-gated ownership suite).
- Fixture-only type completions (`spreadPercent: 0`, unread until EP17B):
  `scheduler.spec.ts`, `identity-fixtures.ts`, `preferred.spec.ts`,
  `energy.spec.ts`, `catch-up.spec.ts`, `calibration.spec.ts`.

## Verification

All commands run from `/Users/michaelrobert/.cache/claude-hfi/-Users-michaelrobert-Desktop-focus-app/elm/apps/api`
(web commands from `../web`), at the final working tree (commit below).

| Command | Result |
|---|---|
| `pnpm test -- preferences.spec momentum.spec study-plans.service.spec` | PASS — 3 suites, **104 tests passed, 0 failed** |
| `pnpm test -- scheduler.spec identity.spec preferred.spec energy.spec catch-up.spec calibration.spec` | PASS — 6 suites, **159 tests passed** (identity snapshot byte-identical; the engine ignores the new key) |
| `pnpm typecheck` (api) | PASS |
| `pnpm lint` (api) | PASS (0 warnings) |
| `pnpm typecheck` (web) | PASS |
| `npx eslint src/entities/study-preferences/model/types.ts --max-warnings 0` (web) | PASS — see F-EP17A-01 for the full `pnpm lint` |

Test counts (this record is the only home): 104 in the three directly
targeted suites (preferences 47, momentum 15, study-plans service 42 — per
single-suite jest runs), 159 in the fixture-touched engine suites;
0 failures. The data-scoping and e2e integration suites are
database-gated (`describeIntegration`) and were not run locally; their
EP17A-relevant constants were updated and they compile under `pnpm
typecheck`.

## Deviations

None from the ACs. Out-of-AC fixture edits (adding `spreadPercent: 0` to six
engine spec/fixture preference literals) were required by the domain type
gaining a required field; the engine does not read the key, and the identity
snapshot is unchanged.

## Findings

- **F-EP17A-01** — source: `pnpm lint` in `apps/web` at closeout; paths:
  `apps/web/e2e/navigation.spec.ts:128`, `apps/web/e2e/plan-flow.spec.ts:732`,
  `apps/web/e2e/today.spec.ts:76,145`; issue: 4 pre-existing lint errors
  (3 prettier, 1 unused var) unrelated to EP17A — present on the base commit,
  none of the files touched by this story; disposition: reported, not fixed
  (outside EP17A's owned paths); owner: live session / EP17H (which owns the
  Playwright suites); closure evidence: pending.
