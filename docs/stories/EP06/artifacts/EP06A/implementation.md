# EP06A implementation record

**Story:** [EP06A-study-preferences-shape-and-api.md](../../EP06A-study-preferences-shape-and-api.md)
**Implemented:** 2026-10-30 (single implementer pass; backend only — the `studyDefaults` shape, its validation and `GET/PUT /study-preferences`)
**Baseline HEAD before changes:** `e846176` (the plan-review pass-3 commit); the plan's own baseline is `9b1ec19`
**Code commit:** `7457a0a` — *feat(api): add the studyDefaults shape, its validation and GET/PUT /study-preferences (EP06A)* (the application code, the tests and the two module-list registrations); this record and the status updates are committed separately (the closeout commit).
**Parent:** [EP06 breakdown](../../README.md) — one combined parent review after EP06H.
**Scope:** the `studyDefaults` shape (D06-4), the defensive reader (D06-14), the domain module (D06-17) and the two study-preferences endpoints. **EP06B, EP06C, EP06D, EP06E…EP06H were not started** — no remaining-work read, no scheduling engine, no plan persistence/migration/plan API, no frontend, no change to `PATCH /users/me`'s free-form `preferences` bag, no `StudySession` aggregation, no calendar read-model change (D06-18 / seam V-05-1).

## Changed paths

Production:

- `apps/api/src/domain/study-planning/types.ts` (**new**) — the shared type `StudyPreferences` (`sessionLengthMinutes`, `minSessionMinutes`, `maxSessionMinutes`, `dailyCapMinutes`). Only EP06A's own type is declared; the engine's types (`SchedulableAssignment`, `WeeklyWindow`, `DatedInterval`, …) belong to EP06B/EP06C/EP06D and are not declared speculatively.
- `apps/api/src/domain/study-planning/preferences.ts` (**new**) — the single definition of the contract: `STUDY_PREFERENCE_KEYS`, `STUDY_PREFERENCE_DEFAULTS` (`60 / 15 / 120 / 240`), `STUDY_PREFERENCE_BOUNDS` (`5…480 / 5…480 / 5…480 / 5…1440`), `PREFERENCES_BAG_MAX_BYTES` (4096), `validateStudyPreferences(input)` (the per-field bounds + the two cross-field rules, returning the field-level `errors` map or `null`) and `readStudyPreferences(bag)` (the defensive reader). **Pure**: it imports nothing from `@nestjs/*`, nothing from Prisma, and reads no clock (D06-17).
- `apps/api/src/modules/study-plans/dto/update-study-preferences.dto.ts` (**new**) — `UpdateStudyPreferencesDto`: four optional integer fields with the per-field bounds; the cross-field rules live in the service because they need more than one field.
- `apps/api/src/modules/study-plans/study-plans.service.ts` (**new**) — `StudyPlansService.getPreferences` / `updatePreferences`: the projection (`toStudyPreferencesResponse`, exactly the four keys), the DTO re-validation for non-HTTP callers (`dtoErrors`/`throwFieldErrors`, the `availability` module's precedent), the merge onto the current **effective** values, the merged-value validation, the write as a merge **into** `preferences.studyDefaults`, the 4096-byte cap re-check on the resulting bag, and the scoped write (`updateMany` + `assertAffected`).
- `apps/api/src/modules/study-plans/study-plans.controller.ts` (**new**) — `@Controller('study-preferences')` with `@Get()` and `@Put()`; the principal is read with `@CurrentUser()` (never `@Req()`), and `UpdateStudyPreferencesDto` is the `@Body()` metatype so the global `FieldValidationPipe` applies.
- `apps/api/src/modules/study-plans/study-plans.module.ts` (**new**) — `StudyPlansModule` (the preferences half of the study-planning module; EP06B/EP06D extend it).
- `apps/api/src/app.module.ts` (modified) — registers `StudyPlansModule`.
- `apps/api/src/test/test-http.ts` (modified) — registers `StudyPlansModule` in the integration-spec module graph (both lists must gain the module, or the e2e specs cannot reach the routes).

Tests:

- `apps/api/src/domain/study-planning/preferences.spec.ts` (**new**) — 27 domain unit tests: the defaults and the bounds; step 1 (the per-field fallback for a null/absent/non-object bag, a missing key, a wrong type, an out-of-range value, the boundary values); step 2 (the inverted min/max pair); step 3 (the clamp in both directions); step 4 (the daily cap); the shared contract's **worked examples** (`60 / 90 / 120 / 240` → `90 / 90 / 120 / 240`; `60 / 300 / 200 / 240` → `200 / 200 / 200 / 240`; the stored 600 → the default 60; the stored cap 10 → 15); the **post-condition** over a fuzz of 31 shapes; the never-throws rule; and the cross-field validator (each broken rule rejected and named, the valid boundary combinations accepted, a partial input not reported for a rule it cannot evaluate).
- `apps/api/src/modules/study-plans/study-plans.service.spec.ts` (**new**) — 17 service unit tests (mocked PrismaService): the scoped read, the exact four keys and the absence of `userId`, the effective values, the malformed-bag read, the uniform 404 for a missing row, the merge onto the effective values, the complete four-key write, the bag's other keys preserved, the invalid merged value (session length and daily cap) with nothing written, the unknown field, the non-integer and the out-of-range value, the 4096-byte cap, the explicit `null` treated as omitted, the empty body, the vanished row (0 affected → the uniform 404) and the scoped `where`.
- `apps/api/src/modules/study-plans/study-plans-data-scoping.spec.ts` (**new**) — 5 integration tests (real database): each student reads their own effective defaults and never another student's; the projection exposes neither `userId` nor any student id; B's `PUT` leaves A's stored column byte-identical and A's `PUT` leaves B's byte-identical; 401 on both routes without a token.
- `apps/api/src/modules/study-plans/study-plans-e2e.spec.ts` (**new**) — 13 integration tests (real database, real HTTP): the journey (`GET` defaults → `PUT` a partial body → `GET` back → a second partial `PUT`); the bag's other keys surviving a `PUT`; the defensive read over HTTP (a malformed stored bag → the repaired effective values; a non-object `studyDefaults` → the defaults); the out-of-range value, the non-integer, the unknown field and the non-object body → 400 with a field-level `errors` map and nothing written; a broken cross-field combination on the merged values → 400; 401 on both routes.

Docs:

- `docs/stories/EP06/artifacts/EP06A/checkpoint.md`
- `docs/stories/EP06/artifacts/EP06A/implementation.md` (this file)
- `docs/stories/EP06/EP06A-study-preferences-shape-and-api.md` — `**Status:**` and the artifact pointers
- `docs/stories/EP06/README.md` — the execution queue row and the Active/Next substory fields

**No** migration, **no** schema change, **no** frontend change, **no** change to `PATCH /users/me` or to the users module's DTO/validators, **no** change to the ownership helper's header comment (that comment names the models EP06D reshapes, not `User`).

## AC outcomes

| AC | Outcome | Evidence |
|---|---|---|
| 1 The documented shape, bounds and defaults; the cross-field rules hold for **every** value the endpoint returns or accepts | **PASS.** `STUDY_PREFERENCE_DEFAULTS` = `60 / 15 / 120 / 240`; the bounds are `5…480 / 5…480 / 5…480 / 5…1440`. The reader's post-condition (every value in bounds, `min ≤ sessionLength ≤ max`, `dailyCap ≥ min`) is asserted over a fuzz of inputs; the merged-value validator rejects every broken rule. | `preferences.spec.ts` (defaults/bounds, the post-condition fuzz, the validator) |
| 2 `GET /study-preferences` returns exactly the four **effective** keys, never `userId` and never another bag key; the defaults with no stored bag | **PASS.** The projection returns exactly the four keys; the effective values come from the defensive reader; a student with no bag gets `60 / 15 / 120 / 240`. | `study-plans.service.spec.ts` (the four keys, the effective values, the malformed bag); `study-plans-e2e.spec.ts` (the journey's first case); `study-plans-data-scoping.spec.ts` (the exact key set, no student id in the payload) |
| 3 `PUT` accepts any subset, merges onto the current effective values, writes the **complete** four-key object; the bag's other keys survive byte-for-byte | **PASS.** The merge is `{ ...effective, ...clientSubset }`; the write is `{ ...currentBag, studyDefaults: merged }` — the other keys are copied unchanged. | `study-plans.service.spec.ts` (the merge, the complete write, the preserved keys); `study-plans-e2e.spec.ts` (the bag's other keys survive) |
| 4 An invalid merged value → a 400 with a field-level `errors` map naming each out-of-range value and each broken cross-field rule, and **nothing written** | **PASS.** The DTO's per-field rules produce the out-of-range/non-integer errors; the merged validator names the offending field for each broken cross-field rule; every failure path returns before the write (the service unit spec asserts `updateMany` was not called, the e2e spec asserts the stored column is unchanged). | `study-plans.service.spec.ts` (the merged-value 400s, nothing written); `study-plans-e2e.spec.ts` (the out-of-range and the cross-field 400s, nothing written) |
| 5 Unknown body fields → 400 by the global `FieldValidationPipe`; the service re-runs the DTO constraint set for non-HTTP callers | **PASS.** The `@Body()` metatype makes the global pipe (`whitelist` + `forbidNonWhitelisted`) reject `theme`/`userId`; the service's `dtoErrors` re-runs the same constraint set (`validateSync` with the same options) before it reads or writes anything. | `study-plans-e2e.spec.ts` (the unknown field and the non-object body → 400); `study-plans.service.spec.ts` (the DTO re-validation rejects an unknown field, a non-integer and an out-of-range value) |
| 6 A malformed stored bag never fails a read; the affected field falls back to its default in step 1, then the documented repair order re-establishes the cross-field rules; a field that needs no repair is returned unchanged | **PASS.** The reader is total (never throws) and each step is pinned separately; the repair is the only thing that changes another field. | `preferences.spec.ts` (steps 1–4, the worked examples, the fuzz); `study-plans-e2e.spec.ts` (the malformed stored bag over HTTP → the repaired values) |
| 7 Unit, data-scoping and e2e specs cover the bounds matrix, the cross-field rules, the merge, the defensive read (every repair step), the bag's other keys, the ownership scoping and the uniform 404/401 | **PASS.** 27 domain + 17 service + 5 data-scoping + 13 e2e = 62 new tests. The uniform 404 is pinned for the missing/vanished principal row (the routes are principal-scoped by construction — there is no id in the path or the body, so a "foreign record" cannot be named). | the four spec files; the verification table below |

## Verification

Working directory: `/Users/michaelrobert/Desktop/focus-app` for every command (the `pnpm --filter api …` invocations run the `apps/api` workspace scripts).

`DATABASE_URL` was **unset** in this shell, so every integration spec would have self-skipped (`describeIntegration = process.env.DATABASE_URL ? describe : describe.skip`) and the e2e/data-scoping evidence would have been vacuous. The machine's local PostgreSQL has a migrated `studypilot` database (13 migrations; `prisma migrate status` → "Database schema is up to date!"), so the runs below set `DATABASE_URL=postgresql://michaelrobert@localhost:5432/studypilot` — the local development database the repo's own `db:migrate` script targets. No `.env`/`.env.*` file was read, displayed or written.

| Command | cwd | Result | Tested state |
|---|---|---|---|
| `pnpm --filter api test -- study-plans` | repo root | **3 suites / 35 tests passed**, exit 0 | `e846176` + this child's code (the unit, data-scoping and e2e specs) |
| `pnpm --filter api test -- preferences` | repo root | **1 suite / 27 tests passed**, exit 0 | the domain unit spec |
| `pnpm --filter api test` | repo root | **53 suites / 1151 tests passed**, exit 0 | the whole API suite — including the users module's specs (`users-profile-integration.spec.ts`'s `studyDefaults` round-trip through `PATCH /users/me` stays green, D06-14) |
| `pnpm --filter api typecheck` | repo root | exit 0, no output | `tsc --noEmit` over `apps/api` |
| `pnpm --filter api lint` | repo root | exit 0, no output (`--max-warnings 0`) | `eslint` over `apps/api/src`; the Prettier rule is clean (checked again with `prettier --check` on the new files) |
| `pnpm --filter api test` (baseline, before any change) | repo root | 49 suites / 1089 tests passed, exit 0 | `e846176` — the pre-change baseline |

The integration specs were **executed**, not skipped (the database was reachable); the counts above include them.

**Final confirmation run.** All five commands above were re-run after both commits, at HEAD `4ea2b63` (the application code is byte-identical to `7457a0a`; only this child's docs were added on top): `-- study-plans` 3 suites / 35 tests, `-- preferences` 1 suite / 27 tests, the full suite 53 suites / 1151 tests, `typecheck` exit 0, `lint` exit 0. The working tree after the runs holds one path only — the pre-existing, unrelated `apps/api/tsconfig.json` (left modified and unstaged on purpose).

## Decisions followed

- **The reader's input is the whole `preferences` bag** (the child spec, implementation note 2): `readStudyPreferences(preferences)` narrows it to an object and reads the `studyDefaults` key from it. The bag's other keys are never read.
- **The reader's four ordered steps** are implemented exactly as the shared contract writes them (per-field fallback → inverted min/max repair → session-length clamp → daily-cap repair), and the two worked examples are pinned by tests.
- **The merge rule**: the current **effective** values (through the reader) + the client's subset → validate the merged result → write the complete four-key object into `preferences.studyDefaults`. A single-field update is therefore legal only against the stored values (the `availability` module's "the validation runs on the merged values" rule).
- **The write is a merge into the bag**, never a replacement of the `preferences` column: the service reads the current bag, replaces only the `studyDefaults` key and writes the whole column back (child spec, implementation note 4). The 4096-byte cap of the column is re-checked on the **resulting** bag.
- **The cross-field errors name the field the student can change**: a session length below the minimum or above the maximum is reported on `sessionLengthMinutes`; a daily cap below the minimum is reported on `dailyCapMinutes`.
- **The route paths are top-level** (`/study-preferences`), the `availability` module's precedent — not nested under `/users`.
- **The module lives at `modules/study-plans/`** (the child spec's choice) and ships only the preferences half; the domain module lives at `domain/study-planning/` (D06-17).
- **Ownership**: the `User` row *is* the principal's row (`User.id` is the userId — the model has no `userId` column, so the `ownedWhere` helper, which adds a `userId` column, does not apply to `User`), so the scoped where is `{ id: userId }`. The write is a scoped `updateMany` + `assertAffected(userId, count)`: 0 affected rows (the row vanished) is the uniform 404 `Resource not found` — never a 403, never a distinct message.
- **An explicit `null` is treated as omitted** (the DTO's `@IsOptional()` skips nulls) and an **empty body is an empty subset** — a legal request that re-writes the current effective values (the contract says "any subset of the four keys"; the `availability` module's "at least one field" rule belongs to its PATCH semantics, not to this PUT).
- **The validator evaluates a cross-field rule only when it can be evaluated** (all four values present and individually valid). The service always validates the merged, complete set, so every accepted request is checked against both rules.

## Findings and deviations

- **F-A-1 (resolved — interpretation, no deviation):** the child spec's implementation note 2 describes `readStudyPreferences` as taking "the whole `preferences` value", while the dispatch brief calls the parameter "bag". The two readings differ (the whole preferences bag vs. the `studyDefaults` object itself). The spec is the contract, so the reader takes the **whole preferences bag** and reads `studyDefaults` from it; the function's JSDoc and the unit spec pin that input shape.
- **F-A-2 (resolved):** `DATABASE_URL` is unset in the environment, so the integration specs would have self-skipped and the e2e/data-scoping evidence would have been vacuous. The runs above therefore set `DATABASE_URL` to the machine's local, already-migrated `studypilot` database. No secret file was read.
- **F-A-3 (resolved in the implementation):** the `preferences` column is capped at 4096 serialized bytes (SP-106, D106-5). Merging `studyDefaults` into a bag that is already near the cap could exceed it, so the cap is re-checked on the **resulting** bag and reported as a field-level 400 (`errors.preferences`) before any write. Pinned by a service unit test.
- **F-A-4 (recorded — not fixed; a cross-epic consequence of D06-14, for the coordinator):** `PATCH /users/me` writes the `preferences` column **verbatim** (`users.service.ts:97-99`), i.e. it **replaces** the column rather than merging into it. A student who saves study defaults through `PUT /study-preferences` and then PATCHes `/users/me` with any `preferences` bag therefore **loses** the saved `studyDefaults` (the column is replaced by the new bag). This is the second-writer residual risk D06-14 already records ("`PATCH /users/me` can write a `studyDefaults` that EP06's reader ignores field-by-field"), observed more sharply than the decision register states: the second writer does not merely change a field, it can remove the whole object. EP06's reader is defensive, so nothing breaks — the effective values fall back to the defaults and the student re-saves them in the preferences surface (EP06E) — and **EP06 does not change `PATCH /users/me`** (out of scope: narrowing it is explicitly excluded by the child spec and D06-14, and it would require changing EP01's `users-profile-integration.spec.ts:147-160`). **Owner: the coordinator** (a planner/EP01 decision, if a single writer is wanted). The e2e spec documents the real behaviour (`PATCH /users/me` replaces the column) so the next implementer is not surprised by it.
- **Findings/deviations otherwise: None.** No deviation from the child spec, the shared contract or the decision register; no change outside EP06A's scope.

## Status

Implemented — awaiting parent review. EP06A's artifacts: [checkpoint](./checkpoint.md) · [implementation record](./implementation.md).
